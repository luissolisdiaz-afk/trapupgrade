/*
 * Copyright 2018 - 2023 Anton Tananaev (anton@traccar.org)
 * Copyright 2018 Andrey Kunitsyn (andrey@traccar.org)
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
package org.traccar.notification;

import com.google.inject.Injector;
import org.traccar.config.Config;
import org.traccar.config.Keys;
import org.traccar.model.Typed;
import org.traccar.notificators.Notificator;
import org.traccar.notificators.NotificatorCommand;
import org.traccar.notificators.NotificatorEvolution;
import org.traccar.notificators.NotificatorFirebase;
import org.traccar.notificators.NotificatorMail;
import org.traccar.notificators.NotificatorPushover;
import org.traccar.notificators.NotificatorSms;
import org.traccar.notificators.NotificatorTelegram;
import org.traccar.notificators.NotificatorTraccar;
import org.traccar.notificators.NotificatorWeb;
import org.traccar.notificators.NotificatorWhatsapp;
import org.traccar.session.cache.CacheManager;

import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Singleton
public class NotificatorManager {

    /**
     * WhatsApp through Evolution API. It is enabled from the admin panel (server attributes), so it does not need
     * to be listed in notificator.types.
     */
    public static final String EVOLUTION = "evolution";

    private static final Map<String, Class<? extends Notificator>> NOTIFICATORS_ALL = Map.of(
            "command", NotificatorCommand.class,
            "web", NotificatorWeb.class,
            "mail", NotificatorMail.class,
            "sms", NotificatorSms.class,
            "firebase", NotificatorFirebase.class,
            "traccar", NotificatorTraccar.class,
            "telegram", NotificatorTelegram.class,
            "whatsapp", NotificatorWhatsapp.class,
            "pushover", NotificatorPushover.class,
            EVOLUTION, NotificatorEvolution.class);

    private final Injector injector;
    private final CacheManager cacheManager;

    private final Set<String> types = new HashSet<>();

    @Inject
    public NotificatorManager(Injector injector, Config config, CacheManager cacheManager) {
        this.injector = injector;
        this.cacheManager = cacheManager;
        String types = config.getString(Keys.NOTIFICATOR_TYPES);
        if (types != null) {
            this.types.addAll(Arrays.asList(types.split(",")));
        }
    }

    public Notificator getNotificator(String type) {
        var clazz = NOTIFICATORS_ALL.get(type);
        if (clazz != null && isEnabled(type)) {
            var notificator = injector.getInstance(clazz);
            if (notificator != null) {
                return notificator;
            }
        }
        throw new RuntimeException("Failed to get notificator " + type);
    }

    private boolean isEnabled(String type) {
        return types.contains(type)
                || EVOLUTION.equals(type) && NotificatorEvolution.isConfigured(cacheManager.getServer());
    }

    public Set<Typed> getAllNotificatorTypes() {
        Set<String> enabled = new HashSet<>(types);
        if (isEnabled(EVOLUTION)) {
            enabled.add(EVOLUTION);
        }
        return enabled.stream().map(Typed::new).collect(Collectors.toUnmodifiableSet());
    }

}
