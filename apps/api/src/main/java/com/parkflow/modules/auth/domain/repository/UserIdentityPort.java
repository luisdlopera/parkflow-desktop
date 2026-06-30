package com.parkflow.modules.auth.domain.repository;

import com.parkflow.modules.auth.domain.UserIdentity;

import java.util.Optional;
import java.util.UUID;

public interface UserIdentityPort {
    Optional<UserIdentity> findByProviderAndProviderUserId(String provider, String providerUserId);
    UserIdentity save(UserIdentity identity);
    void delete(UserIdentity identity);
}
