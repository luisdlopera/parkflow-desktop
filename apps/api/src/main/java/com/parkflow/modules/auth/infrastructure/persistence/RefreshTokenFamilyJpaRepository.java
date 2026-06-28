package com.parkflow.modules.auth.infrastructure.persistence;

import com.parkflow.modules.auth.domain.RefreshTokenFamily;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenFamilyJpaRepository extends JpaRepository<RefreshTokenFamily, UUID> {
}
