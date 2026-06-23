package com.parkflow.modules.settings;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.common.dto.RateStatusRequest;
import com.parkflow.modules.common.dto.RateUpsertRequest;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.configuration.domain.service.RateDomainService;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.domain.repository.RatePort;
import com.parkflow.modules.settings.application.mapper.RateMapper;
import com.parkflow.modules.settings.application.service.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class SettingsRateServiceDelegatesTest {

  @Mock private RatePort rateRepository;
  @Mock private RateMapper rateMapper;
  @Mock private RateDomainService rateDomainService;
  @Mock private ParkingSitePort parkingSiteRepository;
  @Mock private SettingsAuditService settingsAuditService;
  @Mock private AuditPort globalAuditService;
  @Mock private ObjectMapper objectMapper;

  private CreateRateService createRateService;
//   private UpdateRateService updateRateService;
  private PatchRateStatusService patchRateStatusService;
  private ListRatesService listRatesService;
  private GetRateService getRateService;

  private final UUID companyId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    createRateService = new CreateRateService(rateRepository, rateMapper, rateDomainService, parkingSiteRepository, settingsAuditService, globalAuditService, objectMapper);
//     updateRateService = new UpdateRateService(rateRepository, rateMapper, rateDomainService, parkingSiteRepository, settingsAuditService, globalAuditService, objectMapper);
    patchRateStatusService = new PatchRateStatusService(rateRepository, rateMapper, rateDomainService, settingsAuditService, globalAuditService);
    listRatesService = new ListRatesService(rateRepository, rateMapper);
    getRateService = new GetRateService(rateRepository, rateMapper);

    AuthPrincipal principal = new AuthPrincipal(
        UUID.randomUUID(), companyId, "test@test.com", "ADMIN", List.of());
    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken(principal, null, principal.authorities()));
    TenantContext.setTenantId(companyId);
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    TenantContext.clear();
  }

  private RateUpsertRequest validReq() {
    return new RateUpsertRequest("Test", "CAR", null, RateType.HOURLY, BigDecimal.TEN, 0, 0, 60, com.parkflow.modules.configuration.domain.RoundingMode.UP, BigDecimal.ZERO, true, "S", null, BigDecimal.ZERO, 0, BigDecimal.ZERO, 0, null, null, null, false, BigDecimal.ZERO, false, BigDecimal.ZERO, null, null, null, null, null);
  }

  @Test
  void createSuccess() {
    when(rateMapper.fromRequest(any(), any())).thenReturn(new Rate());
    when(rateRepository.save(any())).thenAnswer(i -> {
      Rate r = i.getArgument(0);
      r.setId(UUID.randomUUID());
      r.setName("Test");
      return r;
    });

    com.parkflow.modules.common.dto.RateResponse mockedRes = org.mockito.Mockito.mock(com.parkflow.modules.common.dto.RateResponse.class);
    org.mockito.Mockito.lenient().when(mockedRes.name()).thenReturn("Test");
    when(rateMapper.toResponse(any())).thenReturn(mockedRes);

    var res = createRateService.create(validReq());
    assertThat(res.name()).isEqualTo("Test");
  }

  @Test
  void patchRateStatusSuccess() {
    UUID id = UUID.randomUUID();
    Rate existing = new Rate();
    existing.setId(id);
    existing.setCompanyId(companyId);
    when(rateRepository.findById(id)).thenReturn(Optional.of(existing));
    when(rateRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    com.parkflow.modules.common.dto.RateResponse mockedRes = org.mockito.Mockito.mock(com.parkflow.modules.common.dto.RateResponse.class);
    org.mockito.Mockito.lenient().when(rateMapper.toResponse(any())).thenReturn(mockedRes);

    patchRateStatusService.patchStatus(id, new RateStatusRequest(false));
    assertThat(existing.isActive()).isFalse();
    verify(rateRepository).save(existing);
  }

  @Test
  void getRateSuccess() {
    UUID id = UUID.randomUUID();
    Rate existing = new Rate();
    existing.setId(id);
    existing.setCompanyId(companyId);
    existing.setName("R1");
    when(rateRepository.findById(id)).thenReturn(Optional.of(existing));
    
    com.parkflow.modules.common.dto.RateResponse mockedRes = org.mockito.Mockito.mock(com.parkflow.modules.common.dto.RateResponse.class);
    org.mockito.Mockito.lenient().when(mockedRes.name()).thenReturn("R1");
    when(rateMapper.toResponse(any())).thenReturn(mockedRes);

    var res = getRateService.get(id);
    assertThat(res.name()).isEqualTo("R1");
  }

  @Test
  void listRatesSuccess() {
    when(rateRepository.search(any(), any(), any(), any(), any(), any())).thenReturn(org.springframework.data.domain.Page.empty());
    listRatesService.list("S", "R", true, null, null, org.springframework.data.domain.PageRequest.of(0, 10));
    verify(rateRepository).search(eq("S"), eq("R"), eq(true), eq(null), eq(companyId), any());
  }
}

