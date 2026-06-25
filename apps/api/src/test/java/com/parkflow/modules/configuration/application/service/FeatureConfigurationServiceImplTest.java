package com.parkflow.modules.configuration.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.audit.application.service.AuditService;
import com.parkflow.modules.common.exception.domain.EntityNotFoundException;
import com.parkflow.modules.configuration.dto.FeatureConfigurationRequest;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.onboarding.application.service.CompanySettingsService;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
class FeatureConfigurationServiceImplTest {

  @Mock private CompanyPort companyRepository;
  @Mock private CompanySettingsService companySettingsService;
  @Mock private AuditService auditService;
  @Mock private ObjectMapper objectMapper;

  @InjectMocks private FeatureConfigurationServiceImpl service;

  private final UUID companyId = UUID.randomUUID();

  @Test
  void getFeatureConfiguration_Success() {
    Company c = new Company();
    c.setId(companyId);
    when(companyRepository.findById(companyId)).thenReturn(Optional.of(c));

    Map<String, Object> features = new LinkedHashMap<>();
    features.put("motorcycleParking", true);
    features.put("agreements", true);
    
    Map<String, Object> settings = new LinkedHashMap<>();
    settings.put("features", features);

    when(companySettingsService.getSettingsOrDefault(c)).thenReturn(settings);

    var res = service.getFeatureConfiguration(companyId);
    assertThat(res.getMotorcycleParking()).isTrue();
    assertThat(res.getAgreements()).isTrue();
    assertThat(res.getLockerControl()).isFalse(); // default false
  }

  @Test
  void getFeatureConfiguration_ThrowsIfNotFound() {
    when(companyRepository.findById(companyId)).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.getFeatureConfiguration(companyId))
        .isInstanceOf(EntityNotFoundException.class);
  }

  @Test
  void updateFeatureConfiguration_Success() throws Exception {
    Company c = new Company();
    c.setId(companyId);
    when(companyRepository.findById(companyId)).thenReturn(Optional.of(c));

    Map<String, Object> initialSettings = new LinkedHashMap<>();
    Map<String, Object> updatedSettings = new LinkedHashMap<>();
    Map<String, Object> updatedFeatures = new LinkedHashMap<>();
    updatedFeatures.put("agreements", true);
    updatedFeatures.put("motorcycleParking", false);
    updatedSettings.put("features", updatedFeatures);

    when(companySettingsService.getSettingsOrDefault(c)).thenReturn(initialSettings, updatedSettings);

    when(objectMapper.writeValueAsString(any())).thenReturn("{}");

    FeatureConfigurationRequest req = new FeatureConfigurationRequest();
    req.setAgreements(true);
    req.setMotorcycleParking(false);

    var res = service.updateFeatureConfiguration(companyId, req);

    verify(companySettingsService).upsertSettings(eq(c), any());
    verify(auditService).record(eq(AuditAction.CAMBIAR_CONFIGURACION), eq(companyId), any(), any(), any(), any());

    assertThat(res.getAgreements()).isTrue();
    assertThat(res.getMotorcycleParking()).isFalse();
  }
}
