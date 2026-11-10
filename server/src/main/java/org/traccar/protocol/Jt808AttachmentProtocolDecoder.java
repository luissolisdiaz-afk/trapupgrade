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
import io.netty.buffer.ByteBufUtil;
import io.netty.buffer.Unpooled;
import io.netty.channel.Channel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.traccar.BaseProtocolDecoder;
import org.traccar.NetworkMessage;
import org.traccar.Protocol;
import org.traccar.helper.BitUtil;
import org.traccar.helper.Checksum;
import org.traccar.helper.StringUtil;
import org.traccar.session.DeviceSession;

import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.net.SocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

/**
 * Receives alarm attachments (JT/T 1078 / JSATL12 section 4): 0x1210 attachment list, 0x1211 file information,
 * file stream packets and 0x1212 completion. Files are stored in
 * media/{uniqueId}/alarms/{alarm identification as 32 hex characters}/{file name}.
 */
public class Jt808AttachmentProtocolDecoder extends BaseProtocolDecoder {

    private static final Logger LOGGER = LoggerFactory.getLogger(Jt808AttachmentProtocolDecoder.class);

    public static final int MSG_GENERAL_RESPONSE = 0x8001;
    public static final int MSG_ATTACHMENT_LIST = 0x1210;
    public static final int MSG_FILE_INFO = 0x1211;
    public static final int MSG_FILE_COMPLETE = 0x1212;
    public static final int MSG_FILE_COMPLETE_RESPONSE = 0x9212;

    private static final Pattern SAFE_NAME = Pattern.compile("[A-Za-z0-9._-]{1,80}");
    private static final Pattern LABEL = Pattern.compile("[0-9a-f]{32}");

    private String lastLabel;

    public Jt808AttachmentProtocolDecoder(Protocol protocol) {
        super(protocol);
    }

    static String extractLabel(String fileName) {
        // <type>_<channel>_<alarm type>_<serial>_<alarm number><suffix>, alarm number is 32 hex characters
        String[] parts = fileName.split("_");
        if (parts.length >= 5 && parts[4].length() >= 32) {
            String label = parts[4].substring(0, 32).toLowerCase();
            if (LABEL.matcher(label).matches()) {
                return label;
            }
        }
        return null;
    }

    private static String readName(ByteBuf buf, int length) {
        byte[] data = new byte[length];
        buf.readBytes(data);
        int end = 0;
        while (end < data.length && data[end] != 0) {
            end++;
        }
        return new String(data, 0, end, StandardCharsets.US_ASCII).trim();
    }

    private ByteBuf format(int type, ByteBuf id, Integer version, ByteBuf data) {
        ByteBuf buf = Unpooled.buffer();
        buf.writeByte(0x7e);
        buf.writeShort(type);
        int attribute = data.readableBytes();
        if (version != null) {
            attribute |= 0x4000;
        }
        buf.writeShort(attribute);
        if (version != null) {
            buf.writeByte(version);
        }
        buf.writeBytes(id, id.readerIndex(), id.readableBytes());
        buf.writeShort(0);
        buf.writeBytes(data);
        data.release();
        buf.writeByte(Checksum.xor(buf.nioBuffer(1, buf.readableBytes() - 1)));
        buf.writeByte(0x7e);
        return buf;
    }

    private void sendGeneralResponse(
            Channel channel, SocketAddress remoteAddress, ByteBuf id, Integer version, int type, int index) {
        if (channel != null) {
            ByteBuf response = Unpooled.buffer();
            response.writeShort(index);
            response.writeShort(type);
            response.writeByte(0); // success
            channel.writeAndFlush(new NetworkMessage(
                    format(MSG_GENERAL_RESPONSE, id, version, response), remoteAddress));
        }
    }

    private File resolve(DeviceSession deviceSession, String label, String name) {
        if (label == null || !SAFE_NAME.matcher(name).matches() || !getMediaManager().isEnabled()) {
            return null;
        }
        return getMediaManager().resolveFile(deviceSession.getUniqueId(), "alarms/" + label + "/" + name, true);
    }

    private DeviceSession findSession(Channel channel, SocketAddress remoteAddress, ByteBuf id) {
        String uniqueId = Jt808ProtocolDecoder.decodeId(id);
        String stripped = StringUtil.stripLeading('0', uniqueId);
        return uniqueId.equals(stripped)
                ? getDeviceSession(channel, remoteAddress, uniqueId)
                : getDeviceSession(channel, remoteAddress, stripped, uniqueId);
    }

    @Override
    protected Object decode(Channel channel, SocketAddress remoteAddress, Object msg) throws Exception {

        ByteBuf buf = (ByteBuf) msg;

        if (buf.getUnsignedByte(buf.readerIndex()) == 0x30) {
            decodeData(channel, remoteAddress, buf);
            return null;
        }

        buf.readUnsignedByte(); // delimiter
        int type = buf.readUnsignedShort();
        int attribute = buf.readUnsignedShort();
        int bodyLength = BitUtil.to(attribute, 10);
        Integer version = BitUtil.check(attribute, 14) ? (int) buf.readUnsignedByte() : null;
        ByteBuf id = buf.readSlice(version != null ? 10 : 6);
        int index = buf.readUnsignedShort();
        if (BitUtil.check(attribute, 13)) {
            buf.skipBytes(4); // packet count and number
        }
        if (buf.readableBytes() < bodyLength) {
            return null;
        }

        DeviceSession deviceSession = findSession(channel, remoteAddress, id);

        sendGeneralResponse(channel, remoteAddress, id, version, type, index);
        if (deviceSession == null) {
            return null;
        }

        switch (type) {
            case MSG_ATTACHMENT_LIST -> {
                buf.skipBytes(7); // terminal id
                lastLabel = ByteBufUtil.hexDump(buf.readSlice(16));
                buf.skipBytes(32); // alarm number
                buf.readUnsignedByte(); // information type
                int count = buf.readUnsignedByte();
                for (int i = 0; i < count && buf.readableBytes() > 5; i++) {
                    String name = readName(buf, buf.readUnsignedByte());
                    long size = buf.readUnsignedInt();
                    LOGGER.debug("Alarm attachment announced: {} ({} bytes)", name, size);
                }
            }
            case MSG_FILE_COMPLETE -> {
                String name = readName(buf, buf.readUnsignedByte());
                int fileType = buf.readUnsignedByte();
                long size = buf.readUnsignedInt();
                sendCompletion(channel, remoteAddress, id, version, deviceSession, name, fileType, size);
            }
            default -> { }
        }

        return null;
    }

    private void sendCompletion(
            Channel channel, SocketAddress remoteAddress, ByteBuf id, Integer version,
            DeviceSession deviceSession, String name, int fileType, long size) {
        if (channel == null) {
            return;
        }
        String label = extractLabel(name);
        File file = resolve(deviceSession, label != null ? label : lastLabel, name);
        long received = file != null && file.exists() ? file.length() : 0;
        boolean complete = received >= size;

        ByteBuf response = Unpooled.buffer();
        response.writeByte(name.length());
        response.writeCharSequence(name, StandardCharsets.US_ASCII);
        response.writeByte(fileType);
        response.writeByte(complete ? 0x00 : 0x01);
        if (complete) {
            response.writeByte(0);
        } else {
            response.writeByte(1);
            response.writeInt((int) received);
            response.writeInt((int) (size - received));
        }
        channel.writeAndFlush(new NetworkMessage(
                format(MSG_FILE_COMPLETE_RESPONSE, id, version, response), remoteAddress));
        if (complete) {
            LOGGER.info("Alarm attachment received: {} / {} ({} bytes)", deviceSession.getUniqueId(), name, size);
        }
    }

    private void decodeData(Channel channel, SocketAddress remoteAddress, ByteBuf buf) {
        buf.skipBytes(4); // magic
        String name = readName(buf, 50);
        long offset = buf.readUnsignedInt();
        long length = buf.readUnsignedInt();
        DeviceSession deviceSession = getDeviceSession(channel, remoteAddress);
        if (deviceSession == null || length > buf.readableBytes()) {
            return;
        }
        String label = extractLabel(name);
        File file = resolve(deviceSession, label != null ? label : lastLabel, name);
        if (file == null) {
            return;
        }
        try (RandomAccessFile output = new RandomAccessFile(file, "rw")) {
            output.seek(offset);
            byte[] data = new byte[(int) length];
            buf.readBytes(data);
            output.write(data);
        } catch (IOException e) {
            LOGGER.warn("Alarm attachment write error", e);
        }
    }

}
