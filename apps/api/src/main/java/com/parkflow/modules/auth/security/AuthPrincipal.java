package com.parkflow.modules.auth.security;

import java.util.Collection;
import java.util.UUID;
import org.springframework.security.core.GrantedAuthority;

public record AuthPrincipal(
    UUID userId,
    String email,
    String role,
    Collection<? extends GrantedAuthority> authorities) {}
