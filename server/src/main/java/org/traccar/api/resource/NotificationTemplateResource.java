/*
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

import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.traccar.api.BaseResource;
import org.traccar.notification.CustomTemplateStore;

import java.io.IOException;
import java.util.Map;

/**
 * Notification texts customized by the current user. Without a custom text the predefined template is used.
 */
@Path("notificationtemplates")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class NotificationTemplateResource extends BaseResource {

    @Inject
    private CustomTemplateStore store;

    private static WebApplicationException badRequest(String message) {
        return new WebApplicationException(Response.status(Response.Status.BAD_REQUEST).entity(message).build());
    }

    @GET
    public Map<String, Map<String, String>> get() {
        return store.getAll(getUserId());
    }

    @PUT
    @Path("{name}")
    public Response put(@PathParam("name") String name, Map<String, String> body) {
        if (!CustomTemplateStore.isValidName(name)) {
            throw badRequest("Invalid name");
        }
        String subject = body != null ? body.get("subject") : null;
        String text = body != null ? body.get("body") : null;
        if (subject == null || text == null || subject.isBlank() || text.isBlank()) {
            throw badRequest("Subject and body are required");
        }
        if (subject.length() > CustomTemplateStore.MAX_LENGTH || text.length() > CustomTemplateStore.MAX_LENGTH) {
            throw badRequest("Text too long");
        }
        try {
            store.set(getUserId(), name, subject, text);
        } catch (IOException e) {
            throw new WebApplicationException(e);
        }
        return Response.noContent().build();
    }

    @DELETE
    @Path("{name}")
    public Response delete(@PathParam("name") String name) {
        if (!CustomTemplateStore.isValidName(name)) {
            throw badRequest("Invalid name");
        }
        try {
            store.delete(getUserId(), name);
        } catch (IOException e) {
            throw new WebApplicationException(e);
        }
        return Response.noContent().build();
    }

}
