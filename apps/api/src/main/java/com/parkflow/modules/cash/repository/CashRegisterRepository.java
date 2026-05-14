package com.parkflow.modules.cash.repository;

import com.parkflow.modules.cash.domain.CashRegister;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CashRegisterRepository extends JpaRepository<CashRegister, UUID> {
  Optional<CashRegister> findBySiteAndTerminal(String site, String terminal);

  List<CashRegister> findBySiteOrderByTerminalAsc(String site);

  Page<CashRegister> findBySiteRef_Id(UUID siteId, Pageable pageable);

  @Query("""
      SELECT c
      FROM CashRegister c
      LEFT JOIN c.siteRef s
      LEFT JOIN c.printer p
      LEFT JOIN c.responsibleUser u
      WHERE (:siteId IS NULL OR s.id = :siteId)
        AND (:active IS NULL OR c.active = :active)
        AND (
          :q IS NULL
          OR LOWER(c.site) LIKE LOWER(CONCAT('%', :q, '%'))
          OR LOWER(COALESCE(c.code, '')) LIKE LOWER(CONCAT('%', :q, '%'))
          OR LOWER(COALESCE(c.name, '')) LIKE LOWER(CONCAT('%', :q, '%'))
          OR LOWER(COALESCE(c.terminal, '')) LIKE LOWER(CONCAT('%', :q, '%'))
          OR LOWER(COALESCE(c.label, '')) LIKE LOWER(CONCAT('%', :q, '%'))
          OR LOWER(COALESCE(p.name, '')) LIKE LOWER(CONCAT('%', :q, '%'))
          OR LOWER(COALESCE(u.name, '')) LIKE LOWER(CONCAT('%', :q, '%'))
        )
      """)
  Page<CashRegister> search(
      @Param("siteId") UUID siteId,
      @Param("q") String q,
      @Param("active") Boolean active,
      Pageable pageable);
}
