package com.parkflow.modules.common.utils;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

public final class CursorUtils {
    
    private CursorUtils() {}
    
    public static String encode(String raw) {
        if (raw == null) return null;
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }
    
    public static String decode(String encoded) {
        if (encoded == null || encoded.isBlank()) return null;
        try {
            byte[] decoded = Base64.getUrlDecoder().decode(encoded);
            return new String(decoded, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            return null; // Invalid cursor
        }
    }
}
