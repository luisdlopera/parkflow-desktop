package com.parkflow.modules.auth.security;

import java.util.regex.Pattern;

public final class PasswordPolicy {
  public static final String PASSWORD_REGEX = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!.])(?=\\S+$).{8,}$";
  public static final Pattern PASSWORD_PATTERN = Pattern.compile(PASSWORD_REGEX);

  private PasswordPolicy() {}

  public static boolean isValid(String password) {
    if (password == null) return false;
    return PASSWORD_PATTERN.matcher(password).matches();
  }
}
