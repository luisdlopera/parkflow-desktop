package com.parkflow.modules.configuration.infrastructure.persistence;

import com.parkflow.modules.configuration.domain.OperationalParameter;
import com.parkflow.modules.configuration.domain.repository.OperationalParameterPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OperationalParameterJpaAdapter implements OperationalParameterPort {

  private final OperationalParameterJpaRepository jpaRepository;

  @Override
  public Optional<OperationalParameter> findBySite_Id(UUID siteId) {
    return jpaRepository.findBySite_Id(siteId);
  }

  @Override
  public boolean existsBySite_Id(UUID siteId) {
    return jpaRepository.existsBySite_Id(siteId);
  }

  @Override
  public OperationalParameter save(OperationalParameter parameter) {
    return jpaRepository.save(parameter);
  }

  @Override
  public Optional<OperationalParameter> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Repository
  interface OperationalParameterJpaRepository extends JpaRepository<OperationalParameter, UUID> {
    Optional<OperationalParameter> findBySite_Id(UUID siteId);
    boolean existsBySite_Id(UUID siteId);
  }
}
