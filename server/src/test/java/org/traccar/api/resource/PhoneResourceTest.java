package org.traccar.api.resource;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

public class PhoneResourceTest {

    @Test
    public void testNormalize() {
        assertEquals("+56912345678", PhoneResource.normalize(" +56 9 1234 5678 "));
        assertEquals("912345678", PhoneResource.normalize("9 1234-5678"));
        assertNull(PhoneResource.normalize("1234"));
        assertNull(PhoneResource.normalize("9 1234 5678 ext"));
        assertNull(PhoneResource.normalize(null));
    }

}
