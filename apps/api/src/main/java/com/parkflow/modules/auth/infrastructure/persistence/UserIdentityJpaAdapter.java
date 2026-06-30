package com.parkflow.modules.auth.infrastructure.persistence;

import com.parkflow.modules.auth.domain.UserIdentity;
import com.parkflow.modules.auth.domain.repository.UserIdentityPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class UserIdentityJpaAdapter implements UserIdentityPort {

    private final UserIdentityJpaRepository jpaRepository;

    @Override
    public Optional<UserIdentity> findByProviderAndProviderUserId(String provider, String providerUserId) {
        return jpaRepository.findByProviderAndProviderUserId(provider, providerUserId);
    }

    @Override
    public UserIdentity save(UserIdentity identity) {
        return jpaRepository.save(identity);
    }

    @Override
    public void delete(UserIdentity identity) {
        jpaRepository.delete(identity);
    }
}
