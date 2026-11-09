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
package org.traccar.speedlimit;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Wraps another provider and caches results by location (about 11 meters grid) to avoid querying the external
 * service for every position. Missing limits are cached too, but network errors are not.
 */
public class CachingSpeedLimitProvider implements SpeedLimitProvider {

    private static final int MAX_ENTRIES = 50_000;
    private static final double GRID = 10_000; // 4 decimal places

    private record Entry(Double limit, long expires) {
    }

    private final SpeedLimitProvider delegate;
    private final long ttl;
    private final Map<Long, Entry> cache = new LinkedHashMap<>(1024, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<Long, Entry> eldest) {
            return size() > MAX_ENTRIES;
        }
    };

    public CachingSpeedLimitProvider(SpeedLimitProvider delegate, long ttl) {
        this.delegate = delegate;
        this.ttl = ttl;
    }

    private static long key(double latitude, double longitude) {
        long lat = Math.round(latitude * GRID);
        long lon = Math.round(longitude * GRID);
        return (lat << 32) ^ (lon & 0xffffffffL);
    }

    @Override
    public void getSpeedLimit(double latitude, double longitude, SpeedLimitProviderCallback callback) {
        long key = key(latitude, longitude);
        long now = System.currentTimeMillis();
        Entry entry;
        synchronized (cache) {
            entry = cache.get(key);
        }
        if (entry != null && entry.expires() > now) {
            if (entry.limit() != null) {
                callback.onSuccess(entry.limit());
            } else {
                callback.onFailure(new SpeedLimitException("Not found (cached)"));
            }
            return;
        }
        delegate.getSpeedLimit(latitude, longitude, new SpeedLimitProviderCallback() {
            @Override
            public void onSuccess(double speedLimit) {
                put(key, new Entry(speedLimit, System.currentTimeMillis() + ttl));
                callback.onSuccess(speedLimit);
            }

            @Override
            public void onFailure(Throwable e) {
                if (e instanceof SpeedLimitException) {
                    put(key, new Entry(null, System.currentTimeMillis() + ttl));
                }
                callback.onFailure(e);
            }
        });
    }

    private void put(long key, Entry entry) {
        synchronized (cache) {
            cache.put(key, entry);
        }
    }

}
