/*
 * Copyright 2026 Anton Tananaev (anton@traccar.org)
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

import jakarta.inject.Inject;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.traccar.api.BaseResource;
import org.traccar.database.CommandsManager;
import org.traccar.media.Recording;
import org.traccar.media.RecordingManager;
import org.traccar.model.Command;
import org.traccar.model.Device;
import org.traccar.storage.StorageException;

import java.time.Duration;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Recordings stored on a device (for example on a camera memory card). The list is requested from the device on
 * demand. Playback makes the device stream the selected range to the server, where it is exposed as HLS the same way
 * as live video: stream/{deviceId}/{channel}/live.m3u8.
 */
@Path("recordings")
@Produces(MediaType.APPLICATION_JSON)
public class RecordingResource extends BaseResource {

    private static final Duration MAX_RANGE = Duration.ofDays(7);
    private static final long TIMEOUT_SECONDS = 15;

    @Inject
    private CommandsManager commandsManager;

    @Inject
    private RecordingManager recordingManager;

    private Command createCommand(
            String type, long deviceId, int channel, Date from, Date to) throws StorageException {
        checkCamerasEnabled();
        permissionsService.checkPermission(Device.class, getUserId(), deviceId);
        if (channel < 1 || channel > 255) {
            throw new WebApplicationException(Response.status(Response.Status.BAD_REQUEST)
                    .entity("Invalid channel").build());
        }
        Command command = new Command();
        command.setDeviceId(deviceId);
        command.setType(type);
        command.set(Command.KEY_INDEX, channel);
        command.set(Command.KEY_NO_QUEUE, true);
        if (from != null && to != null) {
            if (!from.before(to) || Duration.between(from.toInstant(), to.toInstant()).compareTo(MAX_RANGE) > 0) {
                throw new WebApplicationException(Response.status(Response.Status.BAD_REQUEST)
                        .entity("Invalid time range").build());
            }
            command.set(Command.KEY_START_TIME, from.toInstant().toString());
            command.set(Command.KEY_END_TIME, to.toInstant().toString());
        }
        return command;
    }

    private void send(Command command) {
        try {
            commandsManager.sendCommand(command);
        } catch (Exception e) {
            throw new WebApplicationException(Response.status(Response.Status.CONFLICT)
                    .entity("Device is not connected or does not support recordings").build());
        }
    }

    @GET
    public Collection<Recording> get(
            @QueryParam("deviceId") long deviceId,
            @QueryParam("channel") int channel,
            @QueryParam("from") Date from,
            @QueryParam("to") Date to) throws StorageException {

        Command command = createCommand(Command.TYPE_VIDEO_QUERY, deviceId, channel, from, to);
        CompletableFuture<List<Recording>> future = recordingManager.register(deviceId);
        try {
            send(command);
            List<Recording> result = future.get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
            return result.stream().filter(recording -> recording.channel() == channel).toList();
        } catch (TimeoutException e) {
            throw new WebApplicationException(Response.status(Response.Status.GATEWAY_TIMEOUT)
                    .entity("Device did not respond").build());
        } catch (InterruptedException | ExecutionException e) {
            throw new WebApplicationException(Response.status(Response.Status.INTERNAL_SERVER_ERROR).build());
        } finally {
            recordingManager.cancel(deviceId, future);
        }
    }

    @POST
    @Path("playback")
    public Response playback(
            @QueryParam("deviceId") long deviceId,
            @QueryParam("channel") int channel,
            @QueryParam("from") Date from,
            @QueryParam("to") Date to) throws StorageException {

        send(createCommand(Command.TYPE_VIDEO_PLAYBACK, deviceId, channel, from, to));
        return Response.noContent().build();
    }

    @DELETE
    @Path("playback")
    public Response stop(
            @QueryParam("deviceId") long deviceId,
            @QueryParam("channel") int channel) throws StorageException {

        send(createCommand(Command.TYPE_VIDEO_PLAYBACK_STOP, deviceId, channel, null, null));
        return Response.noContent().build();
    }

}
