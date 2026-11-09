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

import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class CachingSpeedLimitProviderTest {

    private static double[] query(SpeedLimitProvider provider, double lat, double lon) {
        double[] result = {-1};
        provider.getSpeedLimit(lat, lon, new SpeedLimitProvider.SpeedLimitProviderCallback() {
            @Override
            public void onSuccess(double speedLimit) {
                result[0] = speedLimit;
            }

            @Override
            public void onFailure(Throwable e) {
                result[0] = -2;
            }
        });
        return result;
    }

    @Test
    public void testCachesFoundAndMissing() {
        AtomicInteger calls = new AtomicInteger();
        SpeedLimitProvider delegate = (lat, lon, callback) -> {
            calls.incrementAndGet();
            if (lat > 10) {
                callback.onSuccess(8.0);
            } else {
                callback.onFailure(new SpeedLimitException("Not found"));
            }
        };
        var provider = new CachingSpeedLimitProvider(delegate, 60_000);

        assertEquals(8.0, query(provider, 20.00001, 30.00001)[0]);
        assertEquals(8.0, query(provider, 20.00002, 30.00002)[0]);
        assertEquals(1, calls.get());

        assertEquals(-2, query(provider, 1.0, 1.0)[0]);
        assertEquals(-2, query(provider, 1.0, 1.0)[0]);
        assertEquals(2, calls.get());

        assertEquals(8.0, query(provider, 20.5, 30.5)[0]);
        assertEquals(3, calls.get());
    }

    @Test
    public void testDoesNotCacheNetworkErrors() {
        AtomicInteger calls = new AtomicInteger();
        SpeedLimitProvider delegate = (lat, lon, callback) -> {
            calls.incrementAndGet();
            callback.onFailure(new RuntimeException("timeout"));
        };
        var provider = new CachingSpeedLimitProvider(delegate, 60_000);
        query(provider, 5, 5);
        query(provider, 5, 5);
        assertTrue(calls.get() == 2);
    }

}
