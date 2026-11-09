/*
 * Copyright 2016 - 2026 Anton Tananaev (anton@traccar.org)
 * Copyright 2017 - 2018 Andrey Kunitsyn (andrey@traccar.org)
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

import org.apache.velocity.VelocityContext;
import org.traccar.database.LocaleManager;
import org.traccar.helper.model.UserUtil;
import org.traccar.model.Device;
import org.traccar.model.Driver;
import org.traccar.model.Event;
import org.traccar.model.Geofence;
import org.traccar.model.Maintenance;
import org.traccar.model.Notification;
import org.traccar.model.Position;
import org.traccar.model.Server;
import org.traccar.model.User;
import org.traccar.session.cache.CacheManager;

import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TimeZone;

@Singleton
public class NotificationFormatter {

    private final LocaleManager localeManager;
    private final CacheManager cacheManager;
    private final TextTemplateFormatter textTemplateFormatter;
    private final CustomTemplateStore customTemplateStore;

    @Inject
    public NotificationFormatter(
            LocaleManager localeManager, CacheManager cacheManager, TextTemplateFormatter textTemplateFormatter,
            CustomTemplateStore customTemplateStore) {
        this.localeManager = localeManager;
        this.cacheManager = cacheManager;
        this.textTemplateFormatter = textTemplateFormatter;
        this.customTemplateStore = customTemplateStore;
    }

    private static String escapeHtml(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static String capitalize(String value) {
        return value.isEmpty() ? value : Character.toUpperCase(value.charAt(0)) + value.substring(1);
    }

    private static String formatSpeed(double knots, String unit) {
        if ("mph".equals(unit)) {
            return String.format("%.1f mph", knots * 1.15078);
        } else if ("kn".equals(unit)) {
            return String.format("%.1f kn", knots);
        }
        return String.format("%.1f km/h", knots * 1.852);
    }

    private static String replace(String text, Map<String, String> values) {
        String result = text;
        for (Map.Entry<String, String> entry : values.entrySet()) {
            result = result.replace("{" + entry.getKey() + "}", entry.getValue());
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private NotificationMessage formatCustom(
            Map<String, String> custom, VelocityContext context, Device device, Event event, Position position,
            boolean priority) {

        Map<String, String> translations = (Map<String, String>) context.get("translations");
        TimeZone timezone = (TimeZone) context.get("timezone");
        String webUrl = String.valueOf(context.get("webUrl"));
        Geofence geofence = (Geofence) context.get("geofence");

        String alarm = event.getString("alarm");
        String alarmText = "";
        if (alarm != null) {
            alarmText = translations != null
                    ? translations.getOrDefault("alarm" + capitalize(alarm), alarm) : alarm;
        }
        String eventText = translations != null
                ? translations.getOrDefault("event" + capitalize(event.getType()), event.getType())
                : event.getType();
        String time = timezone != null && event.getEventTime() != null
                ? DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(timezone.toZoneId())
                        .format(event.getEventTime().toInstant())
                : "";
        String address = "";
        String speed = "";
        if (position != null) {
            address = position.getAddress() != null
                    ? position.getAddress() : position.getLatitude() + ", " + position.getLongitude();
            speed = formatSpeed(position.getSpeed(), (String) context.get("speedUnit"));
        }
        String link = webUrl + "/event/" + event.getId();

        Map<String, String> plain = Map.of(
                "device", device != null ? String.valueOf(device.getName()) : "",
                "time", time,
                "address", address,
                "speed", speed,
                "geofence", geofence != null ? String.valueOf(geofence.getName()) : "",
                "alarm", alarmText,
                "event", eventText,
                "link", link);

        Map<String, String> html = new java.util.HashMap<>();
        plain.forEach((key, value) -> html.put(key, escapeHtml(value)));
        html.put("link", "<a href=\"" + escapeHtml(link) + "\">" + escapeHtml(link) + "</a>");

        String subject = replace(custom.get("subject"), plain).replace("\n", " ");
        String text = replace(custom.get("body"), plain);
        String body = "<!DOCTYPE html><html><body>"
                + replace(escapeHtml(custom.get("body")), html).replace("\n", "<br>")
                + "<br><br><a href=\"" + webUrl + "/settings/notifications?token=" + context.get("token") + "\">"
                + (translations != null ? translations.getOrDefault("sharedUnsubscribe", "Unsubscribe")
                        : "Unsubscribe") + "</a></body></html>";
        return new NotificationMessage(subject, text.replace("\n", " "), body, priority);
    }

    public NotificationMessage formatMessage(
            Notification notification, User user, Event event, Position position) {

        Server server = cacheManager.getServer();
        Device device = cacheManager.getObject(Device.class, event.getDeviceId());

        VelocityContext velocityContext = textTemplateFormatter.prepareContext(server, user);

        velocityContext.put("notification", notification);
        velocityContext.put("device", device);
        velocityContext.put("event", event);
        velocityContext.put("translations", localeManager.getBundle(UserUtil.getLanguage(server, user)));
        if (position != null) {
            velocityContext.put("position", position);
            velocityContext.put("speedUnit", UserUtil.getSpeedUnit(server, user));
            velocityContext.put("distanceUnit", UserUtil.getDistanceUnit(server, user));
            velocityContext.put("volumeUnit", UserUtil.getVolumeUnit(server, user));
        }
        if (event.getGeofenceId() != 0) {
            velocityContext.put("geofence", cacheManager.getObject(Geofence.class, event.getGeofenceId()));
        }
        if (event.getMaintenanceId() != 0) {
            velocityContext.put("maintenance", cacheManager.getObject(Maintenance.class, event.getMaintenanceId()));
        }
        String eventDriverUniqueId = event.getString(Position.KEY_DRIVER_UNIQUE_ID);
        String driverUniqueId = eventDriverUniqueId == null && position != null
                ? position.getString(Position.KEY_DRIVER_UNIQUE_ID) : eventDriverUniqueId;
        if (driverUniqueId != null) {
            velocityContext.put("driver", cacheManager.getDeviceObjects(device.getId(), Driver.class).stream()
                    .filter(driver -> driver.getUniqueId().equals(driverUniqueId)).findFirst().orElse(null));
        }

        boolean priority = notification != null && notification.getBoolean("priority");
        if (user != null && CustomTemplateStore.isValidName(event.getType())) {
            Map<String, String> custom = customTemplateStore.get(user.getId(), event.getType());
            if (custom != null && custom.get("subject") != null && custom.get("body") != null) {
                return formatCustom(custom, velocityContext, device, event, position, priority);
            }
        }
        return textTemplateFormatter.formatMessage(velocityContext, event.getType(), priority);
    }

}
