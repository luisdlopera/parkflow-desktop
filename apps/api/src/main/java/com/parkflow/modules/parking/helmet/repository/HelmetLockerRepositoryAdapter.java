package com.parkflow.modules.parking.helmet.repository;

import com.parkflow.modules.parking.helmet.domain.HelmetLocker;
import com.parkflow.modules.parking.helmet.domain.repository.HelmetLockerPort;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class HelmetLockerRepositoryAdapter implements HelmetLockerPort {

  private final HelmetLockerRepository repository;

  @Override
  public List<HelmetLocker> findByCompanyId(UUID companyId) {
    return repository.findByCompanyIdOrderByCodeAsc(companyId);
  }

  @Override
  public List<HelmetLocker> findActiveByCompanyId(UUID companyId) {
    return repository.findByCompanyIdAndIsActiveTrueOrderByCodeAsc(companyId);
  }

  @Override
  public Optional<HelmetLocker> findByIdAndCompanyId(UUID id, UUID companyId) {
    return repository.findByIdAndCompanyId(id, companyId);
  }

  @Override
  public HelmetLocker save(HelmetLocker locker) {
    return repository.save(locker);
  }

  @Override
  public void delete(HelmetLocker locker) {
    repository.delete(locker);
  }

  @Override
  public boolean existsByCompanyIdAndCode(UUID companyId, String code) {
    return repository.existsByCompanyIdAndCode(companyId, code);
  }
}
