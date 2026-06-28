package com.parkflow.modules.auth.domain.repository;

import com.parkflow.modules.auth.domain.RefreshTokenFamily;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenFamilyPort {
    RefreshTokenFamily save(RefreshTokenFamily family);
    Optional<RefreshTokenFamily> findById(UUID familyId);
    void delete(RefreshTokenFamily family);
}
