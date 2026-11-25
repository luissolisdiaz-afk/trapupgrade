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
package org.traccar.notificators;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.traccar.config.Keys;
import org.traccar.helper.WebHelper;
import org.traccar.model.Event;
import org.traccar.model.Position;
import org.traccar.model.Server;
import org.traccar.model.User;
import org.traccar.notification.MessageException;
import org.traccar.notification.NotificationFormatter;
import org.traccar.notification.NotificationMessage;
import org.traccar.session.cache.CacheManager;

import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import jakarta.ws.rs.client.Client;
import jakarta.ws.rs.client.Entity;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;

/**
 * Sends notifications through WhatsApp using a self-hosted Evolution API (v2) instance. The company number is the
 * Evolution instance; its address, API key and instance name are server attributes edited from the admin panel,
 * so changes apply without restarting. Each user receives the messages on the phone number of the user account.
 */
@Singleton
public class NotificatorEvolution extends Notificator {

    private final Client client;
    private final CacheManager cacheManager;

    public static class TextMessage {
        @JsonProperty("number")
        private String number;
        @JsonProperty("text")
        private String text;
    }

    @Inject
    public NotificatorEvolution(NotificationFormatter notificationFormatter, Client client, CacheManager cacheManager) {
        super(notificationFormatter);
        this.client = client;
        this.cacheManager = cacheManager;
    }

    public static boolean isConfigured(Server server) {
        return server != null
                && !server.getString(Keys.NOTIFICATOR_EVOLUTION_URL.getKey(), "").isBlank()
                && !server.getString(Keys.NOTIFICATOR_EVOLUTION_API_KEY.getKey(), "").isBlank()
                && !server.getString(Keys.NOTIFICATOR_EVOLUTION_INSTANCE.getKey(), "").isBlank();
    }

    /**
     * WhatsApp needs the full international number with digits only. Short local numbers get the configured country
     * code, so "9 1234 5678" becomes "56912345678" for Chile.
     */
    static String formatNumber(String phone, String countryCode) {
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.startsWith("00")) {
            digits = digits.substring(2);
        } else if (digits.length() <= 9 && countryCode != null && !countryCode.isBlank()
                && !phone.trim().startsWith("+")) {
            digits = countryCode.replaceAll("[^0-9]", "") + digits;
        }
        return digits;
    }

    @Override
    public CompletableFuture<Void> sendAsync(
            User user, NotificationMessage shortMessage, Event event, Position position) {

        boolean test = event != null && "test".equals(event.getType());

        String phone = user.getPhone();
        if (phone == null || phone.isBlank()) {
            if (test) {
                return CompletableFuture.failedFuture(
                        new MessageException("El usuario no tiene número de teléfono para WhatsApp"));
            }
            return CompletableFuture.completedFuture(null);
        }

        StringBuilder text = new StringBuilder(shortMessage.digest());
        if (position != null && (position.getLatitude() != 0 || position.getLongitude() != 0)) {
            text.append("\nhttps://maps.google.com/?q=")
                    .append(String.format(Locale.US, "%.6f,%.6f", position.getLatitude(), position.getLongitude()));
        }
        return sendText(phone, text.toString());
    }

    /**
     * Sends a plain text from the company WhatsApp number. Also used for the phone verification code.
     */
    public CompletableFuture<Void> sendText(String phone, String text) {
        Server server = cacheManager.getServer();
        if (!isConfigured(server)) {
            return CompletableFuture.failedFuture(
                    new MessageException("Falta configurar WhatsApp (Evolution API) en el servidor"));
        }

        String baseUrl = server.getString(Keys.NOTIFICATOR_EVOLUTION_URL.getKey()).trim().replaceAll("/+$", "");
        String apiKey = server.getString(Keys.NOTIFICATOR_EVOLUTION_API_KEY.getKey()).trim();
        String instance = server.getString(Keys.NOTIFICATOR_EVOLUTION_INSTANCE.getKey()).trim();
        String countryCode = server.getString(Keys.NOTIFICATOR_EVOLUTION_COUNTRY_CODE.getKey(), "56");

        TextMessage message = new TextMessage();
        message.number = formatNumber(phone, countryCode);
        message.text = text;

        String url = baseUrl + "/message/sendText/" + URLEncoder.encode(instance, StandardCharsets.UTF_8)
                .replace("+", "%20");
        var request = client.target(url).request().header("apikey", apiKey);
        return WebHelper.post(request, Entity.json(message), response -> {
            if (response.getStatus() / 100 != 2) {
                throw new MessageException(
                        "WhatsApp (Evolution API) respondió " + response.getStatus() + ": "
                        + response.readEntity(String.class));
            }
        });
    }

}
