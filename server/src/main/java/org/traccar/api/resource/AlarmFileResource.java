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
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.traccar.api.BaseResource;
import org.traccar.database.MediaManager;
import org.traccar.media.AlarmClipConverter;
import org.traccar.model.Device;
import org.traccar.storage.StorageException;
import org.traccar.storage.query.Columns;
import org.traccar.storage.query.Condition;
import org.traccar.storage.query.Request;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Photos and video clips uploaded by dashcams for an alarm. Files are identified by the alarm label stored in the
 * position attribute alarmLabel. Raw H.264 clips are served as a short HLS playlist so browsers can play them.
 */
@Path("alarmfiles")
@Produces(MediaType.APPLICATION_JSON)
public class AlarmFileResource extends BaseResource {

    private static final Pattern LABEL = Pattern.compile("[0-9a-f]{32}");
    private static final Pattern NAME = Pattern.compile("[A-Za-z0-9._-]{1,80}");
    private static final long MAX_CLIP_SIZE = 64L * 1024 * 1024;

    public record AlarmFile(String name, String kind, long size) { }

    @Inject
    private MediaManager mediaManager;

    private File resolve(long deviceId, String label, String name) throws StorageException {
        checkCamerasEnabled();
        permissionsService.checkPermission(Device.class, getUserId(), deviceId);
        Device device = storage.getObject(Device.class, new Request(
                new Columns.Include("uniqueId"), new Condition.Equals("id", deviceId)));
        if (device == null || !LABEL.matcher(label).matches() || (name != null && !NAME.matcher(name).matches())) {
            throw new WebApplicationException(Response.Status.NOT_FOUND);
        }
        File file = mediaManager.resolveFile(
                device.getUniqueId(), "alarms/" + label + (name != null ? "/" + name : ""), false);
        if (file == null) {
            throw new WebApplicationException(Response.Status.NOT_FOUND);
        }
        return file;
    }

    private static String kind(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png")) {
            return "image";
        } else if (lower.endsWith(".h264") || lower.endsWith(".264") || lower.endsWith(".mp4")) {
            return "video";
        } else if (lower.endsWith(".wav")) {
            return "audio";
        }
        return "other";
    }

    @GET
    public Collection<AlarmFile> get(
            @QueryParam("deviceId") long deviceId,
            @QueryParam("label") String label) throws StorageException {

        File directory = resolve(deviceId, label, null);
        File[] files = directory.isDirectory() ? directory.listFiles(File::isFile) : null;
        var result = new ArrayList<AlarmFile>();
        if (files != null) {
            Arrays.sort(files, Comparator.comparing(File::getName));
            for (File file : files) {
                if (file.length() > 0) {
                    result.add(new AlarmFile(file.getName(), kind(file.getName()), file.length()));
                }
            }
        }
        return result;
    }

    @GET
    @Path("{deviceId}/{label}/{name}")
    public Response file(
            @PathParam("deviceId") long deviceId,
            @PathParam("label") String label,
            @PathParam("name") String name) throws StorageException {

        File file = resolve(deviceId, label, name);
        if (!file.isFile()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        String lower = name.toLowerCase(Locale.ROOT);
        String type = lower.endsWith(".png") ? "image/png"
                : lower.endsWith(".jpg") || lower.endsWith(".jpeg") ? "image/jpeg"
                : lower.endsWith(".wav") ? "audio/wav"
                : lower.endsWith(".mp4") ? "video/mp4" : "application/octet-stream";
        return Response.ok(file, type).build();
    }

    private AlarmClipConverter.Result convert(File file) {
        try {
            if (!file.isFile() || file.length() > MAX_CLIP_SIZE) {
                throw new WebApplicationException(Response.Status.NOT_FOUND);
            }
            return AlarmClipConverter.toTransportStream(Files.readAllBytes(file.toPath()));
        } catch (IOException e) {
            throw new WebApplicationException(Response.Status.INTERNAL_SERVER_ERROR);
        }
    }

    @GET
    @Path("{deviceId}/{label}/{name}/playlist.m3u8")
    public Response playlist(
            @PathParam("deviceId") long deviceId,
            @PathParam("label") String label,
            @PathParam("name") String name) throws StorageException {

        AlarmClipConverter.Result clip = convert(resolve(deviceId, label, name));
        double duration = clip.durationSeconds();
        String playlist = "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-PLAYLIST-TYPE:VOD\n"
                + "#EXT-X-TARGETDURATION:" + (int) Math.ceil(duration) + "\n#EXT-X-MEDIA-SEQUENCE:0\n"
                + String.format(Locale.ROOT, "#EXTINF:%.3f,\n", duration) + "video.ts\n#EXT-X-ENDLIST\n";
        return Response.ok(playlist, "application/vnd.apple.mpegurl").build();
    }

    @GET
    @Path("{deviceId}/{label}/{name}/video.ts")
    public Response transportStream(
            @PathParam("deviceId") long deviceId,
            @PathParam("label") String label,
            @PathParam("name") String name) throws StorageException {

        AlarmClipConverter.Result clip = convert(resolve(deviceId, label, name));
        return Response.ok(clip.data(), "video/mp2t").build();
    }

}
