package com.parkflow.modules.configuration.infrastructure.persistence;

import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ParkingSiteJpaAdapter implements ParkingSitePort {

  private final ParkingSiteJpaRepository jpaRepository;

  @Override
  public Optional<ParkingSite> findByCode(String code) {
    return jpaRepository.findByCode(code);
  }

  @Override
  public Optional<ParkingSite> findByNameIgnoreCase(String name) {
    return jpaRepository.findByNameIgnoreCase(name);
  }

  @Override
  public Optional<ParkingSite> findByCodeOrNameForUpdate(String site) {
    return jpaRepository.findByCodeOrNameForUpdate(site);
  }

  @Override
  public boolean existsByCode(String code) {
    return jpaRepository.existsByCode(code);
  }

  @Override
  public Page<ParkingSite> search(UUID companyId, String q, Boolean active, Pageable pageable) {
    return jpaRepository.search(companyId, q, active, pageable);
  }

  @Override
  public ParkingSite save(ParkingSite site) {
    return jpaRepository.save(site);
  }

  @Override
  public Optional<ParkingSite> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Repository
  interface ParkingSiteJpaRepository extends JpaRepository<ParkingSite, UUID> {
    Optional<ParkingSite> findByCode(String code);

    Optional<ParkingSite> findByNameIgnoreCase(String name);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM ParkingSite s WHERE LOWER(s.code) = LOWER(:site) OR LOWER(s.name) = LOWER(:site)")
    Optional<ParkingSite> findByCodeOrNameForUpdate(@Param("site") String site);

    boolean existsByCode(String code);

    @Query("SELECT s FROM ParkingSite s WHERE s.company.id = :companyId AND (:q IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(s.code) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(s.city) LIKE LOWER(CONCAT('%', :q, '%'))) AND (:active IS NULL OR s.isActive = :active)")
    Page<ParkingSite> search(
        @Param("companyId") UUID companyId,
        @Param("q") String q,
        @Param("active") Boolean active,
        Pageable pageable);
  }
}
