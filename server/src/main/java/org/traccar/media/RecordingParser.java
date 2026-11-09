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
import org.traccar.helper.BcdUtil;
import org.traccar.helper.DateBuilder;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.TimeZone;

/**
 * Parser for the JT/T 1078 resource list (message 0x1205 body).
 */
public final class RecordingParser {

    public static final int ITEM_LENGTH = 28;

    private RecordingParser() {
    }

    private static Date readDate(ByteBuf buf, TimeZone timeZone) {
        return new DateBuilder(timeZone)
                .setYear(BcdUtil.readInteger(buf, 2))
                .setMonth(BcdUtil.readInteger(buf, 2))
                .setDay(BcdUtil.readInteger(buf, 2))
                .setHour(BcdUtil.readInteger(buf, 2))
                .setMinute(BcdUtil.readInteger(buf, 2))
                .setSecond(BcdUtil.readInteger(buf, 2))
                .getDate();
    }

    /**
     * Parses the body: response serial number (2), item count (4), then items of 28 bytes each: channel (1),
     * start time (6 BCD), end time (6 BCD), alarm flags (8), media type (1), stream type (1), storage type (1),
     * size (4). Truncated trailing items are ignored.
     */
    public static List<Recording> parse(ByteBuf buf, TimeZone timeZone) {
        List<Recording> result = new ArrayList<>();
        if (buf.readableBytes() < 6) {
            return result;
        }
        buf.readUnsignedShort(); // response serial number
        long count = buf.readUnsignedInt();
        while (result.size() < count && buf.readableBytes() >= ITEM_LENGTH) {
            int channel = buf.readUnsignedByte();
            Date start = readDate(buf, timeZone);
            Date end = readDate(buf, timeZone);
            buf.skipBytes(8); // alarm flags
            int mediaType = buf.readUnsignedByte();
            buf.readUnsignedByte(); // stream type
            buf.readUnsignedByte(); // storage type
            long size = buf.readUnsignedInt();
            result.add(new Recording(channel, start, end, size, mediaType));
        }
        return result;
    }

}
