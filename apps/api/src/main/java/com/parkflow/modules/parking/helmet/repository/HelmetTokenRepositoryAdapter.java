package com.parkflow.modules.parking.helmet.repository;

import com.parkflow.modules.parking.helmet.domain.HelmetToken;
import com.parkflow.modules.parking.helmet.domain.repository.HelmetTokenPort;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class HelmetTokenRepositoryAdapter implements HelmetTokenPort {

  private final HelmetTokenRepository repository;

  @Override
  public List<HelmetToken> findByCompanyId(UUID companyId) {
    return repository.findByCompanyIdOrderByCodeAsc(companyId);
  }

  @Override
  public List<HelmetToken> findActiveByCompanyId(UUID companyId) {
    return repository.findByCompanyIdAndIsActiveTrueOrderByCodeAsc(companyId);
  }

  @Override
  public Optional<HelmetToken> findByIdAndCompanyId(UUID id, UUID companyId) {
    return repository.findByIdAndCompanyId(id, companyId);
  }

  @Override
  public HelmetToken save(HelmetToken token) {
    return repository.save(token);
  }

  @Override
  public void delete(HelmetToken token) {
    repository.delete(token);
  }

  @Override
  public boolean existsByCompanyIdAndCode(UUID companyId, String code) {
    return repository.existsByCompanyIdAndCode(companyId, code);
  }
}
