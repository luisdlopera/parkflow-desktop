package com.parkflow.modules.parking.locker.infrastructure.persistence;

import com.parkflow.modules.parking.locker.application.port.out.LockerRepositoryPort;
import com.parkflow.modules.parking.locker.domain.Locker;
import com.parkflow.modules.parking.locker.domain.LockerStatus;
import com.parkflow.modules.parking.locker.domain.repository.LockerPort;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class LockerRepositoryAdapter implements LockerRepositoryPort, LockerPort {

  private final LockerRepository repository;

  @Override
  public List<Locker> findByCompanyId(UUID companyId) {
    return repository.findByCompanyIdOrderByCodeAsc(companyId);
  }

  @Override
  public List<Locker> findActiveByCompanyId(UUID companyId) {
    return repository.findByCompanyIdAndIsActiveTrueOrderByCodeAsc(companyId);
  }

  @Override
  public Optional<Locker> findByIdAndCompanyId(UUID id, UUID companyId) {
    return repository.findByIdAndCompanyId(id, companyId);
  }

  @Override
  public Optional<Locker> findByCompanyIdAndCode(UUID companyId, String code) {
    return repository.findByCompanyIdAndCode(companyId, code);
  }

  @Override
  public Locker save(Locker locker) {
    return repository.save(locker);
  }

  @Override
  public void delete(Locker locker) {
    repository.delete(locker);
  }

  @Override
  public boolean existsByCompanyIdAndCode(UUID companyId, String code) {
    return repository.existsByCompanyIdAndCode(companyId, code);
  }

  @Override
  public long countByCompanyIdAndStatus(UUID companyId, LockerStatus status) {
    return repository.countByCompanyIdAndStatus(companyId, status);
  }
}
