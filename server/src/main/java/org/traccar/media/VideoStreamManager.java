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
package org.traccar.media;

import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;

import jakarta.inject.Inject;
import jakarta.inject.Provider;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.traccar.database.CommandsManager;
import org.traccar.model.Command;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Singleton
public class VideoStreamManager {

    private static final Logger LOGGER = LoggerFactory.getLogger(VideoStreamManager.class);

    private static final int MAX_SEGMENTS = 5;
    private static final long IDLE_TIMEOUT_MS = 30_000;
    private static final long SWEEP_INTERVAL_SECONDS = 10;

    private final Map<String, DeviceStream> streams = new ConcurrentHashMap<>();
    private final Map<String, Long> lastViewed = new ConcurrentHashMap<>();
    private final Provider<CommandsManager> commandsManager;

    @Inject
    public VideoStreamManager(Provider<CommandsManager> commandsManager) {
        this.commandsManager = commandsManager;
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "video-stream-idle");
            thread.setDaemon(true);
            return thread;
        });
        scheduler.scheduleWithFixedDelay(
                this::stopIdleStreams, SWEEP_INTERVAL_SECONDS, SWEEP_INTERVAL_SECONDS, TimeUnit.SECONDS);
    }

    private void touch(long deviceId, int channel) {
        lastViewed.put(deviceId + "_" + channel, System.currentTimeMillis());
    }

    private void stopIdleStreams() {
        long now = System.currentTimeMillis();
        for (Map.Entry<String, Long> entry : lastViewed.entrySet()) {
            if (now - entry.getValue() < IDLE_TIMEOUT_MS) {
                continue;
            }
            if (!lastViewed.remove(entry.getKey(), entry.getValue())) {
                continue; // viewed again in the meantime
            }
            try {
                String[] parts = entry.getKey().split("_");
                long deviceId = Long.parseLong(parts[0]);
                int channel = Integer.parseInt(parts[1]);
                Command command = new Command();
                command.setDeviceId(deviceId);
                command.setType(Command.TYPE_VIDEO_STOP);
                command.set(Command.KEY_INDEX, channel);
                commandsManager.get().sendCommand(command);
                removeStream(deviceId, channel);
            } catch (Exception e) {
                LOGGER.warn("Failed to stop idle video stream {}", entry.getKey(), e);
            }
        }
    }

    public void handleFrame(
            long deviceId, int channel, ByteBuf nalData, long timestamp, boolean isKeyFrame, int payloadType) {
        DeviceStream stream = streams.computeIfAbsent(deviceId + "_" + channel, k -> new DeviceStream());
        stream.addFrame(nalData, timestamp, isKeyFrame, payloadType);
    }

    public String getPlaylist(long deviceId, int channel) {
        touch(deviceId, channel);
        DeviceStream stream = streams.get(deviceId + "_" + channel);
        return stream != null ? stream.getPlaylist() : DeviceStream.EMPTY_PLAYLIST;
    }

    public void removeStream(long deviceId, int channel) {
        DeviceStream stream = streams.remove(deviceId + "_" + channel);
        if (stream != null) {
            stream.release();
        }
    }

    public ByteBuf getSegment(long deviceId, int channel, int index) {
        touch(deviceId, channel);
        DeviceStream stream = streams.get(deviceId + "_" + channel);
        return stream != null ? stream.getSegment(index) : null;
    }

    static class DeviceStream {

        private record Segment(ByteBuf data, long duration) { }

        private final VideoStreamWriter writer = new VideoStreamWriter();
        private final LinkedHashMap<Integer, Segment> segments = new LinkedHashMap<>();
        private ByteBuf currentSegment;
        private int segmentIndex;
        private long firstTimestamp;
        private long segmentTimestamp;
        private boolean released;

        synchronized void addFrame(ByteBuf nalData, long timestamp, boolean isKeyFrame, int payloadType) {
            if (released || (currentSegment == null && !isKeyFrame)) {
                return;
            }
            if (isKeyFrame && currentSegment != null && timestamp > segmentTimestamp) {
                finalizeSegment(timestamp);
            }

            if (currentSegment == null) {
                currentSegment = Unpooled.buffer();
                segmentTimestamp = timestamp;
                if (segmentIndex == 0) {
                    firstTimestamp = timestamp;
                }
            }

            writer.write(currentSegment, nalData, timestamp - firstTimestamp, isKeyFrame, payloadType);
        }

        private void finalizeSegment(long timestamp) {
            segments.put(segmentIndex++, new Segment(currentSegment, timestamp - segmentTimestamp));
            currentSegment = null;

            while (segments.size() > MAX_SEGMENTS) {
                Integer oldest = segments.keySet().iterator().next();
                segments.remove(oldest).data().release();
            }
        }

        synchronized void release() {
            released = true;
            if (currentSegment != null) {
                currentSegment.release();
                currentSegment = null;
            }
            for (Segment segment : segments.values()) {
                segment.data().release();
            }
            segments.clear();
        }

        static final String EMPTY_PLAYLIST =
                "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:5\n#EXT-X-MEDIA-SEQUENCE:0\n";

        synchronized String getPlaylist() {
            if (segments.isEmpty()) {
                return EMPTY_PLAYLIST;
            }

            int firstIndex = segments.keySet().iterator().next();

            StringBuilder sb = new StringBuilder();
            sb.append("#EXTM3U\n");
            sb.append("#EXT-X-VERSION:3\n");
            sb.append("#EXT-X-TARGETDURATION:5\n");
            sb.append("#EXT-X-MEDIA-SEQUENCE:").append(firstIndex).append("\n");

            for (Map.Entry<Integer, Segment> entry : segments.entrySet()) {
                sb.append("#EXTINF:").append(entry.getValue().duration() / 1000.0).append(",\n");
                sb.append(entry.getKey()).append(".ts\n");
            }

            return sb.toString();
        }

        synchronized ByteBuf getSegment(int index) {
            Segment segment = segments.get(index);
            return segment != null ? segment.data().retainedDuplicate() : null;
        }
    }

}
