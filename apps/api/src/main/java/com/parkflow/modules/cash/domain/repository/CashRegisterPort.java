package com.parkflow.modules.cash.domain.repository;

import com.parkflow.modules.cash.domain.CashRegister;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CashRegisterPort {
    Optional<CashRegister> findBySiteAndTerminal(String site, String terminal);
    List<CashRegister> findBySiteOrderByTerminalAsc(String site);
    Page<CashRegister> findBySiteRef_Id(UUID siteId, Pageable pageable);
    Page<CashRegister> search(UUID siteId, String q, Boolean active, Pageable pageable);
    
    CashRegister save(CashRegister register);
    Optional<CashRegister> findById(UUID id);
    void delete(CashRegister register);
}
