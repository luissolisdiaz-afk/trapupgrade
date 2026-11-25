/*
 * Copyright 2026 Roadsafe
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.traccar.api.resource;

import org.traccar.api.BaseResource;
import org.traccar.helper.LogAction;
import org.traccar.mail.MailManager;
import org.traccar.model.ObjectOperation;
import org.traccar.model.User;
import org.traccar.model.UserRestrictions;
import org.traccar.notificators.NotificatorEvolution;
import org.traccar.session.cache.CacheManager;
import org.traccar.storage.StorageException;
import org.traccar.storage.query.Columns;
import org.traccar.storage.query.Condition;
import org.traccar.storage.query.Request;

import jakarta.inject.Inject;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;

/**
 * Users change their own phone number with a verification code. Notifications (WhatsApp, SMS) are sent to this
 * number from the company accounts, so the number is only saved after the code is confirmed. The code goes by
 * WhatsApp to the new number when WhatsApp is configured (this proves the user has that phone); otherwise it goes by
 * email to the account.
 */
@Path("phone")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class PhoneResource extends BaseResource {

    static final long CODE_VALIDITY = 10 * 60 * 1000L;
    static final int MAX_ATTEMPTS = 5;
    static final int MAX_REQUESTS = 3;
    static final long REQUEST_WINDOW = 60 * 60 * 1000L;

    private static final SecureRandom RANDOM = new SecureRandom();

    record Pending(String phone, String code, long expires, int attempts) {
    }

    public record CodeRequest(String phone) {
    }

    public record CodeConfirmation(String code) {
    }

    public record CodeChannel(String channel) {
    }

    private static final Map<Long, Pending> PENDING = new ConcurrentHashMap<>();
    private static final Map<Long, long[]> REQUESTS = new ConcurrentHashMap<>();

    @Inject
    private NotificatorEvolution notificatorEvolution;

    @Inject
    private MailManager mailManager;

    @Inject
    private CacheManager cacheManager;

    @Inject
    private LogAction actionLogger;

    @Context
    private HttpServletRequest request;

    private static WebApplicationException badRequest(String message) {
        return new WebApplicationException(Response.status(Response.Status.BAD_REQUEST).entity(message).build());
    }

    /**
     * Keeps digits and a leading plus sign. Returns null when it does not look like a phone number.
     */
    static String normalize(String phone) {
        if (phone == null) {
            return null;
        }
        String trimmed = phone.trim();
        String digits = trimmed.replaceAll("[^0-9]", "");
        if (digits.length() < 8 || digits.length() > 15 || !trimmed.matches("[+0-9 ()-]+")) {
            return null;
        }
        return (trimmed.startsWith("+") ? "+" : "") + digits;
    }

    private static void checkRequestLimit(long userId) {
        long now = System.currentTimeMillis();
        long[] usage = REQUESTS.compute(userId, (id, value) -> {
            if (value == null || now - value[0] > REQUEST_WINDOW) {
                return new long[] {now, 1};
            }
            value[1]++;
            return value;
        });
        if (usage[1] > MAX_REQUESTS) {
            throw new SecurityException("Too many verification codes");
        }
    }

    private User getWritableUser() throws StorageException {
        User user = permissionsService.getUser(getUserId());
        if (user.getTemporary()) {
            throw new SecurityException("Temporary user");
        }
        permissionsService.checkRestriction(getUserId(), UserRestrictions::getReadonly);
        return user;
    }

    @POST
    @Path("code")
    public CodeChannel requestCode(CodeRequest body) throws StorageException, InterruptedException {
        User user = getWritableUser();
        String phone = normalize(body != null ? body.phone() : null);
        if (phone == null) {
            throw badRequest("Invalid phone number");
        }
        checkRequestLimit(user.getId());

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        String text = "Tu código Roadsafe para confirmar este teléfono es " + code
                + ". Vence en 10 minutos. Si no lo pediste, ignora este mensaje.";
        String channel;
        try {
            if (NotificatorEvolution.isConfigured(cacheManager.getServer())) {
                notificatorEvolution.sendText(phone, text).get();
                channel = "whatsapp";
            } else if (mailManager.getEmailEnabled()) {
                mailManager.sendMessage(user, true, "Código para cambiar tu teléfono",
                        "<p>" + text + "</p><p>Teléfono nuevo: " + phone + "</p>").get();
                channel = "email";
            } else {
                throw new WebApplicationException(Response.status(Response.Status.SERVICE_UNAVAILABLE)
                        .entity("Phone verification is not available").build());
            }
        } catch (ExecutionException e) {
            throw new WebApplicationException(Response.status(Response.Status.BAD_GATEWAY)
                    .entity("Failed to send verification code").build());
        }

        PENDING.put(user.getId(), new Pending(phone, code, System.currentTimeMillis() + CODE_VALIDITY, 0));
        return new CodeChannel(channel);
    }

    @POST
    @Path("confirm")
    public User confirm(CodeConfirmation body) throws Exception {
        User user = getWritableUser();
        String code = body != null && body.code() != null ? body.code().trim() : "";
        Pending pending = PENDING.computeIfPresent(user.getId(), (id, value) ->
                new Pending(value.phone(), value.code(), value.expires(), value.attempts() + 1));
        if (pending == null || pending.expires() < System.currentTimeMillis() || pending.attempts() > MAX_ATTEMPTS) {
            PENDING.remove(user.getId());
            throw badRequest("Invalid or expired code");
        }
        if (!MessageDigest.isEqual(
                pending.code().getBytes(StandardCharsets.US_ASCII), code.getBytes(StandardCharsets.US_ASCII))) {
            throw badRequest("Invalid or expired code");
        }
        PENDING.remove(user.getId());

        user.setPhone(pending.phone());
        storage.updateObject(user, new Request(
                new Columns.Include("phone"), new Condition.Equals("id", user.getId())));
        cacheManager.invalidateObject(true, User.class, user.getId(), ObjectOperation.UPDATE);
        actionLogger.edit(request, getUserId(), user);
        return user;
    }

}
