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
import org.traccar.helper.WebHelper;
import org.traccar.model.Action;
import org.traccar.model.ObjectOperation;
import org.traccar.model.Server;
import org.traccar.model.User;
import org.traccar.session.cache.CacheManager;
import org.traccar.storage.StorageException;
import org.traccar.storage.query.Columns;
import org.traccar.storage.query.Condition;
import org.traccar.storage.query.Order;
import org.traccar.storage.query.Request;

import jakarta.inject.Inject;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Registro legal (Roadsafe): quién aceptó los términos y la política de privacidad, qué versión y cuándo,
 * y las solicitudes de baja del servicio. Cada registro se guarda en tc_actions (la misma tabla de
 * auditoría de Traccar), con la IP y el navegador, y no se puede editar ni borrar desde la API.
 */
@Path("legal")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class LegalResource extends BaseResource {

    public static final String ACTION_ACCEPT_TERMS = "acceptTerms";
    public static final String ACTION_CANCEL_SERVICE = "cancelService";

    private static final String DEFAULT_VERSION = "1";
    private static final int MAX_TEXT = 500;

    @Inject
    private CacheManager cacheManager;

    @Context
    private HttpServletRequest request;

    private static String limit(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.length() > MAX_TEXT ? trimmed.substring(0, MAX_TEXT) : trimmed;
    }

    private Action newAction(String type, long userId) {
        Action action = new Action();
        action.setAddress(WebHelper.retrieveRemoteAddress(request));
        action.setUserId(userId);
        action.setActionType(type);
        action.setObjectType("user");
        action.setObjectId(userId);
        action.set("userAgent", limit(request != null ? request.getHeader("User-Agent") : null));
        return action;
    }

    private Action store(Action action) throws StorageException {
        action.setId(storage.addObject(action, new Request(new Columns.Exclude("id"))));
        return action;
    }

    /**
     * Acepta la versión vigente de los términos y la política de privacidad. La versión vigente es el
     * atributo "termsVersion" del servidor (por defecto "1"); si el administrador la cambia, todos los
     * usuarios deben volver a aceptar.
     */
    @Path("terms")
    @POST
    public User acceptTerms(Map<String, String> body) throws Exception {
        long userId = getUserId();
        Server server = permissionsService.getServer();
        String current = server.getString("termsVersion", DEFAULT_VERSION);
        String version = body != null ? body.get("version") : null;
        if (version == null || !version.equals(current)) {
            throw new IllegalArgumentException("La versión de los términos cambió. Recarga la página.");
        }

        Action action = newAction(ACTION_ACCEPT_TERMS, userId);
        action.set("version", current);
        action.set("termsUrl", limit(server.getString("termsUrl")));
        action.set("privacyUrl", limit(server.getString("privacyUrl")));
        store(action);

        User user = storage.getObject(User.class, new Request(new Columns.All(), new Condition.Equals("id", userId)));
        user.set("termsAccepted", true);
        user.set("termsVersion", current);
        user.set("termsAcceptedTime", Instant.now().toString());
        storage.updateObject(user, new Request(
                new Columns.Include("attributes"), new Condition.Equals("id", userId)));
        cacheManager.invalidateObject(true, User.class, userId, ObjectOperation.UPDATE);
        return user;
    }

    /**
     * Solicitud de baja del servicio en un solo paso. Queda registrada con fecha, hora e IP; el número de
     * registro sirve como folio para el cliente.
     */
    @Path("cancel")
    @POST
    public Action cancelService(Map<String, String> body) throws StorageException {
        Action action = newAction(ACTION_CANCEL_SERVICE, getUserId());
        action.set("reason", limit(body != null ? body.get("reason") : null));
        return store(action);
    }

    /**
     * Historial legal de un usuario (aceptaciones y solicitudes de baja). Cada usuario ve el suyo; un
     * administrador o el gestor del usuario puede pedir el de otro con userId.
     */
    @Path("records")
    @GET
    public List<Action> records(@QueryParam("userId") long userId) throws StorageException {
        long targetId = userId > 0 ? userId : getUserId();
        if (targetId != getUserId()) {
            permissionsService.checkUser(getUserId(), targetId);
        }
        return storage.getObjects(Action.class, new Request(
                new Columns.All(),
                new Condition.And(
                        new Condition.Equals("userId", targetId),
                        new Condition.Or(
                                new Condition.Equals("actionType", ACTION_ACCEPT_TERMS),
                                new Condition.Equals("actionType", ACTION_CANCEL_SERVICE))),
                new Order("actionTime", true, 0)));
    }

}
