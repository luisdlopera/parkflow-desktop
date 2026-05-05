package com.parkflow.modules.cash.repository;

import com.parkflow.modules.cash.domain.CashRegister;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CashRegisterRepository extends JpaRepository<CashRegister, UUID> {
  Optional<CashRegister> findBySiteAndTerminal(String site, String terminal);

  List<CashRegister> findBySiteOrderByTerminalAsc(String site);

  Page<CashRegister> findBySiteRef_Id(UUID siteId, Pageable pageable);
}
