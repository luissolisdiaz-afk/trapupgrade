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
import io.netty.buffer.ByteBufUtil;
import io.netty.buffer.Unpooled;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.TimeZone;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class RecordingParserTest {

    private static void item(ByteBuf buf, int channel, String start, String end, long size) {
        buf.writeByte(channel);
        buf.writeBytes(ByteBufUtil.decodeHexDump(start));
        buf.writeBytes(ByteBufUtil.decodeHexDump(end));
        buf.writeLong(0);
        buf.writeByte(0);
        buf.writeByte(1);
        buf.writeByte(1);
        buf.writeInt((int) size);
    }

    @Test
    public void testParse() {
        ByteBuf buf = Unpooled.buffer();
        buf.writeShort(7);
        buf.writeInt(2);
        item(buf, 1, "261106100000", "261106100500", 1048576);
        item(buf, 2, "261106100500", "261106101000", 2097152);

        var result = RecordingParser.parse(buf, TimeZone.getTimeZone("UTC"));

        assertEquals(2, result.size());
        assertEquals(1, result.get(0).channel());
        assertEquals(Instant.parse("2026-11-06T10:00:00Z"), result.get(0).startTime().toInstant());
        assertEquals(Instant.parse("2026-11-06T10:05:00Z"), result.get(0).endTime().toInstant());
        assertEquals(1048576, result.get(0).size());
        assertEquals(2, result.get(1).channel());
    }

    @Test
    public void testTimeZoneAndTruncation() {
        ByteBuf buf = Unpooled.buffer();
        buf.writeShort(1);
        buf.writeInt(3); // claims 3 items but only one complete + partial
        item(buf, 1, "261106180000", "261106180500", 10);
        buf.writeBytes(new byte[10]);

        var result = RecordingParser.parse(buf, TimeZone.getTimeZone("GMT+8"));

        assertEquals(1, result.size());
        assertEquals(Instant.parse("2026-11-06T10:00:00Z"), result.get(0).startTime().toInstant());
        assertTrue(RecordingParser.parse(Unpooled.buffer(), TimeZone.getTimeZone("UTC")).isEmpty());
    }

}
