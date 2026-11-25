package org.traccar.protocol;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class Jt808AttachmentLimitsTest {

    @Test
    public void testWriteLimits(@TempDir Path directory) throws IOException {
        File file = directory.resolve("photo.jpg").toFile();
        assertTrue(Jt808AttachmentProtocolDecoder.isWriteAllowed(file, 0, 1024));
        assertFalse(Jt808AttachmentProtocolDecoder.isWriteAllowed(
                file, Jt808AttachmentProtocolDecoder.MAX_FILE_SIZE, 1));

        for (int i = 0; i < Jt808AttachmentProtocolDecoder.MAX_FILES_PER_ALARM; i++) {
            Files.createFile(directory.resolve("file" + i + ".jpg"));
        }
        assertFalse(Jt808AttachmentProtocolDecoder.isWriteAllowed(file, 0, 1024));
        assertTrue(Jt808AttachmentProtocolDecoder.isWriteAllowed(directory.resolve("file0.jpg").toFile(), 0, 1024));
    }

}
