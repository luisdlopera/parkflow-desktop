package com.parkflow.modules.common.helper;

import java.security.SecureRandom;

public final class StringHelper {
    
    private static final SecureRandom RANDOM = new SecureRandom();
    
    private StringHelper() {}

    public static String generateOtp(int length) {
        StringBuilder otp = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            otp.append(RANDOM.nextInt(10));
        }
        return otp.toString();
    }

    public static String normalizePlate(String plate) {
        if (plate == null) return null;
        return plate.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
    }

    public static String safeTrim(String value) {
        return value == null ? null : value.trim();
    }
}
