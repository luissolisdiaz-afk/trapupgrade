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
package org.traccar.notification;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import org.traccar.config.Config;
import org.traccar.config.Keys;

import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

/**
 * Per user notification texts written by the users themselves. They are plain text with {placeholders}, never
 * template code, so they are safe to be edited by regular users. When a user has no custom text for an event type,
 * the predefined template is used.
 */
@Singleton
public class CustomTemplateStore {

    public static final int MAX_LENGTH = 2000;

    private static final String SUFFIX = ".json";

    private final Path root;
    private final ObjectMapper objectMapper;

    @Inject
    public CustomTemplateStore(Config config, ObjectMapper objectMapper) {
        this.root = Paths.get(config.getString(Keys.TEMPLATES_ROOT), "custom");
        this.objectMapper = objectMapper;
    }

    public static boolean isValidName(String name) {
        return name != null && name.matches("^[A-Za-z]{1,40}$");
    }

    private Path file(long userId, String name) {
        if (!isValidName(name)) {
            throw new IllegalArgumentException("Invalid template name");
        }
        return root.resolve(Long.toString(userId)).resolve(name + SUFFIX);
    }

    public Map<String, String> get(long userId, String name) {
        Path file = file(userId, name);
        if (!Files.isRegularFile(file)) {
            return null;
        }
        try {
            return objectMapper.readValue(file.toFile(), new TypeReference<Map<String, String>>() { });
        } catch (IOException e) {
            return null;
        }
    }

    public Map<String, Map<String, String>> getAll(long userId) {
        Map<String, Map<String, String>> result = new HashMap<>();
        Path dir = root.resolve(Long.toString(userId));
        if (!Files.isDirectory(dir)) {
            return result;
        }
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(dir, "*" + SUFFIX)) {
            for (Path path : stream) {
                String fileName = path.getFileName().toString();
                String name = fileName.substring(0, fileName.length() - SUFFIX.length());
                if (isValidName(name)) {
                    Map<String, String> value = get(userId, name);
                    if (value != null) {
                        result.put(name, value);
                    }
                }
            }
        } catch (IOException e) {
            return result;
        }
        return result;
    }

    public void set(long userId, String name, String subject, String body) throws IOException {
        Path file = file(userId, name);
        Files.createDirectories(file.getParent());
        Map<String, String> value = new HashMap<>();
        value.put("subject", subject);
        value.put("body", body);
        objectMapper.writeValue(file.toFile(), value);
    }

    public void delete(long userId, String name) throws IOException {
        Files.deleteIfExists(file(userId, name));
    }

}
