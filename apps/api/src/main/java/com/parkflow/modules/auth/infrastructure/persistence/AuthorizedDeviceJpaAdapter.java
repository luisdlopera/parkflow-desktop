package com.parkflow.modules.auth.infrastructure.persistence;

import com.parkflow.modules.auth.domain.AuthorizedDevice;
import com.parkflow.modules.auth.domain.repository.AuthorizedDevicePort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AuthorizedDeviceJpaAdapter implements AuthorizedDevicePort {

  private final AuthorizedDeviceJpaRepository jpaRepository;

  @Override
  public Optional<AuthorizedDevice> findByDeviceId(String deviceId) {
    return jpaRepository.findByDeviceId(deviceId);
  }

  @Override
  public List<AuthorizedDevice> findAll() {
    return jpaRepository.findAll();
  }

  @Override
  public AuthorizedDevice save(AuthorizedDevice device) {
    return jpaRepository.save(device);
  }

  @Override
  public Optional<AuthorizedDevice> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Repository
  interface AuthorizedDeviceJpaRepository extends JpaRepository<AuthorizedDevice, UUID> {
    Optional<AuthorizedDevice> findByDeviceId(String deviceId);
  }
}
