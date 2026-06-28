package com.parkflow.modules.auth.infrastructure.persistence;

import com.parkflow.modules.auth.domain.RefreshTokenFamily;
import com.parkflow.modules.auth.domain.repository.RefreshTokenFamilyPort;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RefreshTokenFamilyJpaAdapter implements RefreshTokenFamilyPort {

    private final RefreshTokenFamilyJpaRepository repository;

    @Override
    public RefreshTokenFamily save(RefreshTokenFamily family) {
        return repository.save(family);
    }

    @Override
    public Optional<RefreshTokenFamily> findById(UUID familyId) {
        return repository.findById(familyId);
    }

    @Override
    public void delete(RefreshTokenFamily family) {
        repository.delete(family);
    }
}
