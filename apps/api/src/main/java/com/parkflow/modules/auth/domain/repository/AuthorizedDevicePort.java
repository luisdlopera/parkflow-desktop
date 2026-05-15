package com.parkflow.modules.auth.domain.repository;

import com.parkflow.modules.auth.domain.AuthorizedDevice;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AuthorizedDevicePort {
  Optional<AuthorizedDevice> findByDeviceId(String deviceId);
  List<AuthorizedDevice> findAll();
  AuthorizedDevice save(AuthorizedDevice device);
  Optional<AuthorizedDevice> findById(UUID id);
}
