package com.parkflow.modules.cash.service;

import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.cash.application.service.CashSessionManagementService;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.domain.CashSessionStatus;
import com.parkflow.modules.cash.dto.CashCloseRequest;
import com.parkflow.modules.cash.dto.CashCountRequest;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.settings.application.service.ParkingParametersService;
import com.parkflow.modules.common.dto.ParkingParametersData;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CashAutoCloseScheduler {

    private final CashSessionRepository cashSessionRepository;
    private final CashSessionManagementService cashSessionManagementService;
    private final ParkingParametersService parkingParametersService;

    @Scheduled(cron = "0 0 * * * *") // Runs at the top of every hour
    @Transactional
    public void autoCloseExpiredSessions() {
        log.info("Starting auto-close expired cash sessions job...");
        
        List<CashSession> openSessions = cashSessionRepository.findByStatus(CashSessionStatus.OPEN);
        int closedCount = 0;
        
        for (CashSession session : openSessions) {
            try {
                String site = session.getCashRegister().getSite();
                if (site == null) site = "default";
                
                // Set Tenant context
                TenantContext.setTenantId(session.getCompanyId());
                
                ParkingParametersData params = parkingParametersService.get(site);
                Integer maxHours = params != null ? params.getCashMaxSessionHours() : null;
                
                if (maxHours != null && maxHours > 0) {
                    OffsetDateTime threshold = OffsetDateTime.now().minusHours(maxHours);
                    if (session.getOpenedAt().isBefore(threshold)) {
                        log.info("Session {} has exceeded {} hours. Auto-closing...", session.getId(), maxHours);
                        
                        // Impersonate the operator who opened the session to bypass security checks cleanly
                        AuthPrincipal principal = new AuthPrincipal(
                            session.getOperator().getId(),
                            session.getCompanyId(),
                            session.getOperator().getEmail(),
                            UserRole.SUPER_ADMIN.name(),
                            Collections.emptyList()
                        );
                        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(principal, null, principal.authorities());
                        SecurityContextHolder.getContext().setAuthentication(auth);
                        
                        // We must first count (archivar). The system expects a count before close.
                        // We will set 0 for all physical counts since it's an auto-close.
                        if (session.getCountedAt() == null) {
                            CashCountRequest countRequest = new CashCountRequest(
                                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                                "Auto-Arqueo por expiración de tiempo máximo de turno.",
                                null
                            );
                            cashSessionManagementService.submitCount(session.getId(), countRequest);
                        }
                        
                        CashCloseRequest closeRequest = new CashCloseRequest(
                            "Auto-Cierre por expiración de tiempo máximo de turno (" + maxHours + " horas).",
                            "SISTEMA",
                            null
                        );
                        cashSessionManagementService.close(session.getId(), closeRequest);
                        closedCount++;
                    }
                }
            } catch (Exception e) {
                log.error("Failed to auto-close session {}", session.getId(), e);
            } finally {
                SecurityContextHolder.clearContext();
                TenantContext.clear();
            }
        }
        
        log.info("Finished auto-close job. Sessions closed: {}", closedCount);
    }
}
