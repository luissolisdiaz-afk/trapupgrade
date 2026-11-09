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

import jakarta.inject.Inject;
import jakarta.inject.Singleton;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Correlates recording list requests sent to devices with the asynchronous responses they send back.
 */
@Singleton
public class RecordingManager {

    private final Map<Long, CompletableFuture<List<Recording>>> pending = new ConcurrentHashMap<>();

    @Inject
    public RecordingManager() {
    }

    public CompletableFuture<List<Recording>> register(long deviceId) {
        CompletableFuture<List<Recording>> future = new CompletableFuture<>();
        CompletableFuture<List<Recording>> previous = pending.put(deviceId, future);
        if (previous != null) {
            previous.complete(List.of());
        }
        return future;
    }

    public void cancel(long deviceId, CompletableFuture<List<Recording>> future) {
        pending.remove(deviceId, future);
    }

    public void complete(long deviceId, List<Recording> recordings) {
        CompletableFuture<List<Recording>> future = pending.remove(deviceId);
        if (future != null) {
            future.complete(recordings);
        }
    }

}
