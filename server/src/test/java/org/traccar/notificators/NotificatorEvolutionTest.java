package org.traccar.notificators;

import org.junit.jupiter.api.Test;
import org.traccar.model.Server;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class NotificatorEvolutionTest {

    @Test
    public void testFormatNumber() {
        assertEquals("56912345678", NotificatorEvolution.formatNumber("9 1234 5678", "56"));
        assertEquals("56912345678", NotificatorEvolution.formatNumber("+56 9 1234 5678", "56"));
        assertEquals("56912345678", NotificatorEvolution.formatNumber("0056912345678", "56"));
        assertEquals("56912345678", NotificatorEvolution.formatNumber("56912345678", "56"));
        assertEquals("5491123456789", NotificatorEvolution.formatNumber("+54 9 11 2345-6789", "56"));
        assertEquals("912345678", NotificatorEvolution.formatNumber("912345678", ""));
    }

    @Test
    public void testIsConfigured() {
        Server server = new Server();
        assertFalse(NotificatorEvolution.isConfigured(server));
        server.set("evolution.url", "https://wa.example.com");
        server.set("evolution.apiKey", "key");
        assertFalse(NotificatorEvolution.isConfigured(server));
        server.set("evolution.instance", "roadsafe");
        assertTrue(NotificatorEvolution.isConfigured(server));
    }

}
