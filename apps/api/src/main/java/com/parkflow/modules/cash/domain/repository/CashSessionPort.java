package com.parkflow.modules.cash.domain.repository;

import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.domain.CashSessionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface CashSessionPort {
    Optional<CashSession> findByOpenIdempotencyKey(String key);
    Optional<CashSession> findByCloseIdempotencyKey(String key);
    Optional<CashSession> findByRegisterAndStatus(UUID registerId, CashSessionStatus status);
    Optional<CashSession> findOpenForSiteTerminal(String site, String terminal, CashSessionStatus status);
    Optional<CashSession> fetchForClosingWebhook(UUID id);
    long countByStatus(CashSessionStatus status);
    Page<CashSession> findAllByOrderByOpenedAtDesc(Pageable pageable);
    
    CashSession save(CashSession session);
    Optional<CashSession> findById(UUID id);
    void delete(CashSession session);
}
