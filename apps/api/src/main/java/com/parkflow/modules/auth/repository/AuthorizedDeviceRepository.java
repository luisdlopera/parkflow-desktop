package com.parkflow.modules.auth.repository;

import com.parkflow.modules.auth.entity.AuthorizedDevice;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthorizedDeviceRepository extends JpaRepository<AuthorizedDevice, UUID> {
  Optional<AuthorizedDevice> findByDeviceId(String deviceId);
}
