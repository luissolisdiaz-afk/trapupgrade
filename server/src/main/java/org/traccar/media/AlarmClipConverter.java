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

import java.util.ArrayList;
import java.util.List;

/**
 * Converts a raw H.264 (Annex B) clip, as uploaded by dashcams for alarms, to an MPEG transport stream that browsers
 * can play through HLS.
 */
public final class AlarmClipConverter {

    public static final int FRAME_RATE = 25;
    private static final int H264_PAYLOAD_TYPE = 98;

    public record Result(byte[] data, int frames) {
        public double durationSeconds() {
            return Math.max(1.0, (double) frames / FRAME_RATE);
        }
    }

    private AlarmClipConverter() {
    }

    private static int nalType(byte[] data, int start) {
        return data[start] & 0x1f;
    }

    /**
     * Returns the index of the next start code at or after from (pointing to the first 0 of the 00 00 01 prefix), or
     * -1.
     */
    private static int findStartCode(byte[] data, int from) {
        for (int i = from; i + 3 <= data.length; i++) {
            if (data[i] == 0 && data[i + 1] == 0 && data[i + 2] == 1) {
                return i;
            }
        }
        return -1;
    }

    public static Result toTransportStream(byte[] data) {

        // split into NAL units: [start of start code, start of payload, end]
        List<int[]> nals = new ArrayList<>();
        int position = findStartCode(data, 0);
        while (position >= 0) {
            int payload = position + 3;
            int next = findStartCode(data, payload);
            int end = next >= 0 ? next : data.length;
            // trailing zero belongs to the next four byte start code
            while (end > payload && data[end - 1] == 0 && next >= 0) {
                end--;
            }
            if (payload < end) {
                nals.add(new int[] {position, payload, end});
            }
            position = next;
        }

        VideoStreamWriter writer = new VideoStreamWriter();
        ByteBuf output = Unpooled.buffer(data.length + data.length / 10);
        ByteBuf unit = Unpooled.buffer();
        boolean key = false;
        boolean hasVcl = false;
        int frames = 0;

        try {
            for (int[] nal : nals) {
                int type = nalType(data, nal[1]);
                boolean vcl = type == 1 || type == 5;
                boolean firstSlice = vcl && nal[1] + 1 < nal[2] && (data[nal[1] + 1] & 0x80) != 0;
                boolean startsUnit = type == 9 || type == 7 || type == 6 || firstSlice;

                if (hasVcl && startsUnit) {
                    // previous access unit is complete
                    writer.write(output, unit, (long) frames * 1000 / FRAME_RATE, key, H264_PAYLOAD_TYPE);
                    frames++;
                    unit.clear();
                    key = false;
                    hasVcl = false;
                }
                if (type == 9) {
                    continue; // access unit delimiter is added by the writer
                }
                unit.writeByte(0);
                unit.writeByte(0);
                unit.writeByte(0);
                unit.writeByte(1);
                unit.writeBytes(data, nal[1], nal[2] - nal[1]);
                if (vcl) {
                    hasVcl = true;
                    if (type == 5) {
                        key = true;
                    }
                }
            }
            if (hasVcl) {
                writer.write(output, unit, (long) frames * 1000 / FRAME_RATE, key, H264_PAYLOAD_TYPE);
                frames++;
            }

            byte[] result = new byte[output.readableBytes()];
            output.readBytes(result);
            return new Result(result, frames);
        } finally {
            unit.release();
            output.release();
        }
    }

}
