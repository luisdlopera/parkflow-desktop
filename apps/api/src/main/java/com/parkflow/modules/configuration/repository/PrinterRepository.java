package com.parkflow.modules.configuration.repository;

import com.parkflow.modules.configuration.entity.Printer;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PrinterRepository extends JpaRepository<Printer, UUID> {

  Optional<Printer> findBySite_IdAndIsDefaultTrue(UUID siteId);

  List<Printer> findBySite_IdAndIsActiveTrue(UUID siteId);

  @Query("SELECT p FROM Printer p WHERE p.site.id = :siteId AND (:q IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))) AND (:active IS NULL OR p.isActive = :active)")
  Page<Printer> search(
      @Param("siteId") UUID siteId,
      @Param("q") String q,
      @Param("active") Boolean active,
      Pageable pageable);
}
