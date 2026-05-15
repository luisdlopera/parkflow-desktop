package com.parkflow.modules.configuration.infrastructure.persistence;

import com.parkflow.modules.configuration.domain.Printer;
import com.parkflow.modules.configuration.domain.repository.PrinterPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PrinterJpaAdapter implements PrinterPort {

  private final PrinterJpaRepository jpaRepository;

  @Override
  public Optional<Printer> findBySite_IdAndIsDefaultTrue(UUID siteId) {
    return jpaRepository.findBySite_IdAndIsDefaultTrue(siteId);
  }

  @Override
  public List<Printer> findBySite_IdAndIsActiveTrue(UUID siteId) {
    return jpaRepository.findBySite_IdAndIsActiveTrue(siteId);
  }

  @Override
  public Page<Printer> search(UUID siteId, String q, Boolean active, Pageable pageable) {
    return jpaRepository.search(siteId, q, active, pageable);
  }

  @Override
  public Printer save(Printer printer) {
    return jpaRepository.save(printer);
  }

  @Override
  public Optional<Printer> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Repository
  interface PrinterJpaRepository extends JpaRepository<Printer, UUID> {
    Optional<Printer> findBySite_IdAndIsDefaultTrue(UUID siteId);

    List<Printer> findBySite_IdAndIsActiveTrue(UUID siteId);

    @Query("SELECT p FROM Printer p WHERE p.site.id = :siteId AND (:q IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))) AND (:active IS NULL OR p.isActive = :active)")
    Page<Printer> search(
        @Param("siteId") UUID siteId,
        @Param("q") String q,
        @Param("active") Boolean active,
        Pageable pageable);
  }
}
