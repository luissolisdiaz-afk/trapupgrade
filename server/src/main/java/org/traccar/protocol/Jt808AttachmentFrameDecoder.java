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
package org.traccar.protocol;

import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import io.netty.channel.Channel;
import io.netty.channel.ChannelHandlerContext;
import org.traccar.BaseFrameDecoder;
import org.traccar.BaseProtocol;

/**
 * Splits the attachment connection stream into JT808 messages (delimited by 0x7e) and file stream packets (starting
 * with 0x30 0x31 0x63 0x64 and a length field).
 */
public class Jt808AttachmentFrameDecoder extends BaseFrameDecoder {

    static final int DATA_HEADER_LENGTH = 62;
    private static final int DATA_MAGIC = 0x30316364;

    public Jt808AttachmentFrameDecoder() {
        super(BaseProtocol.MAX_FRAME_LENGTH_LARGE);
    }

    @Override
    protected Object decode(
            ChannelHandlerContext ctx, Channel channel, ByteBuf buf) throws Exception {

        while (buf.isReadable()) {
            int b = buf.getUnsignedByte(buf.readerIndex());
            if (b == 0x7e) {
                break;
            }
            if (b == 0x30 && buf.readableBytes() >= 4 && buf.getInt(buf.readerIndex()) == DATA_MAGIC) {
                break;
            }
            buf.skipBytes(1);
        }

        if (buf.readableBytes() < 4) {
            return null;
        }

        if (buf.getUnsignedByte(buf.readerIndex()) == 0x30) {

            if (buf.readableBytes() < DATA_HEADER_LENGTH) {
                return null;
            }
            long length = buf.getUnsignedInt(buf.readerIndex() + 58);
            if (length > 1024 * 1024) {
                buf.skipBytes(4); // corrupted packet, resynchronize
                return null;
            }
            int total = DATA_HEADER_LENGTH + (int) length;
            if (buf.readableBytes() < total) {
                return null;
            }
            return buf.readRetainedSlice(total);

        }

        int index = buf.indexOf(buf.readerIndex() + 1, buf.writerIndex(), (byte) 0x7e);
        if (index < 0) {
            return null;
        }

        ByteBuf result = Unpooled.buffer(index + 1 - buf.readerIndex());
        while (buf.readerIndex() <= index) {
            int b = buf.readUnsignedByte();
            if (b == 0x7d && buf.readerIndex() <= index) {
                int ext = buf.readUnsignedByte();
                if (ext == 0x01) {
                    result.writeByte(0x7d);
                } else if (ext == 0x02) {
                    result.writeByte(0x7e);
                }
            } else {
                result.writeByte(b);
            }
        }
        return result;
    }

}
