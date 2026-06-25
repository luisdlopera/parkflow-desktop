package com.parkflow.modules.cash.application.usecase;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.cash.application.port.in.CashSessionManagementUseCase;
import com.parkflow.modules.cash.domain.CashRegister;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.domain.CashSessionStatus;
import com.parkflow.modules.cash.dto.CashCloseRequest;
import com.parkflow.modules.cash.dto.CashCountRequest;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.common.dto.ParkingParametersData;
import com.parkflow.modules.settings.application.service.ParkingParametersService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class CashAutoCloseSchedulerTest {

  @Mock private CashSessionRepository cashSessionRepository;
  @Mock private CashSessionManagementUseCase cashSessionManagementService;
  @Mock private ParkingParametersService parkingParametersService;

  @InjectMocks private CashAutoCloseScheduler scheduler;

  @BeforeEach
  void setUp() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void autoCloseExpiredSessions_ShouldDoNothingWhenNoOpenSessions() {
    // Arrange
    when(cashSessionRepository.findByStatus(CashSessionStatus.OPEN)).thenReturn(List.of());

    // Act
    scheduler.autoCloseExpiredSessions();

    // Assert
    verify(parkingParametersService, never()).get(any());
    verify(cashSessionManagementService, never()).close(any(), any());
  }

  @Test
  void autoCloseExpiredSessions_ShouldDoNothingWhenNoParamsConfigured() {
    // Arrange
    CashSession session = mockSession("SiteA", OffsetDateTime.now().minusHours(10));
    when(cashSessionRepository.findByStatus(CashSessionStatus.OPEN)).thenReturn(List.of(session));
    when(parkingParametersService.get("SiteA")).thenReturn(null);

    // Act
    scheduler.autoCloseExpiredSessions();

    // Assert
    verify(cashSessionManagementService, never()).close(any(), any());
  }

  @Test
  void autoCloseExpiredSessions_ShouldDoNothingWhenNotExpired() {
    // Arrange
    CashSession session = mockSession("SiteA", OffsetDateTime.now().minusHours(2));
    when(cashSessionRepository.findByStatus(CashSessionStatus.OPEN)).thenReturn(List.of(session));
    
    ParkingParametersData params = new ParkingParametersData();
    params.setCashMaxSessionHours(5);
    when(parkingParametersService.get("SiteA")).thenReturn(params);

    // Act
    scheduler.autoCloseExpiredSessions();

    // Assert
    verify(cashSessionManagementService, never()).close(any(), any());
  }

  @Test
  void autoCloseExpiredSessions_ShouldCloseWhenExpired_AndNotCounted() {
    // Arrange
    CashSession session = mockSession("SiteA", OffsetDateTime.now().minusHours(10));
    // It's not counted because countedAt is null
    
    when(cashSessionRepository.findByStatus(CashSessionStatus.OPEN)).thenReturn(List.of(session));
    
    ParkingParametersData params = new ParkingParametersData();
    params.setCashMaxSessionHours(5);
    when(parkingParametersService.get("SiteA")).thenReturn(params);

    // Act
    scheduler.autoCloseExpiredSessions();

    // Assert
    verify(cashSessionManagementService).submitCount(eq(session.getId()), any(CashCountRequest.class));
    verify(cashSessionManagementService).close(eq(session.getId()), any(CashCloseRequest.class));
  }

  @Test
  void autoCloseExpiredSessions_ShouldCloseWhenExpired_AndAlreadyCounted() {
    // Arrange
    CashSession session = mockSession("SiteA", OffsetDateTime.now().minusHours(10));
    session.setCountedAt(OffsetDateTime.now()); // Already counted
    
    when(cashSessionRepository.findByStatus(CashSessionStatus.OPEN)).thenReturn(List.of(session));
    
    ParkingParametersData params = new ParkingParametersData();
    params.setCashMaxSessionHours(5);
    when(parkingParametersService.get("SiteA")).thenReturn(params);

    // Act
    scheduler.autoCloseExpiredSessions();

    // Assert
    verify(cashSessionManagementService, never()).submitCount(any(), any());
    verify(cashSessionManagementService).close(eq(session.getId()), any(CashCloseRequest.class));
  }

  private CashSession mockSession(String site, OffsetDateTime openedAt) {
    CashRegister register = new CashRegister();
    com.parkflow.modules.configuration.domain.ParkingSite siteRef = new com.parkflow.modules.configuration.domain.ParkingSite();
    siteRef.setCode(site);
    register.setSiteRef(siteRef);

    AppUser operator = new AppUser();
    operator.setId(UUID.randomUUID());
    operator.setEmail("test@test.com");

    CashSession session = new CashSession();
    session.setId(UUID.randomUUID());
    session.setCompanyId(UUID.randomUUID());
    session.setCashRegister(register);
    session.setOperator(operator);
    session.setOpenedAt(openedAt);
    return session;
  }
}
