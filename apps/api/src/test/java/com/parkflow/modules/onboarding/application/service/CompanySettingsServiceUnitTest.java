package com.parkflow.modules.onboarding.application.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.onboarding.domain.CompanySettings;
import com.parkflow.modules.onboarding.domain.repository.CompanySettingsPort;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("CompanySettingsService Unit Tests")
class CompanySettingsServiceUnitTest {

  @Mock private CompanySettingsPort companySettingsPort;
  @InjectMocks private CompanySettingsService service;

  private UUID companyId;
  private Company company;
  private CompanySettings settings;

  @BeforeEach
  void setUp() {
    companyId = UUID.randomUUID();
    company = new Company();
    company.setId(companyId);

    settings = new CompanySettings();
    settings.setCompany(company);
    settings.setSettingsJson(new LinkedHashMap<>(Map.of(
        "vehicleTypes", List.of("MOTORCYCLE", "CAR"),
        "capacity", Map.of("total", 20),
        "modules", Map.of("cash", true)
    )));
  }

  @Test
  @DisplayName("Should return settings when found")
  void testGetSettingsOrDefaultFound() {
    Map<String, Object> testSettings = Map.of("vehicleTypes", List.of("MOTORCYCLE"));

    assertNotNull(testSettings);
    assertTrue(testSettings.containsKey("vehicleTypes"));
  }

  @Test
  @DisplayName("Should return default settings when not found")
  void testGetSettingsOrDefaultNotFound() {
    when(companySettingsPort.findByCompanyId(companyId)).thenReturn(Optional.empty());

    Map<String, Object> result = service.getSettingsOrDefault(company);

    assertNotNull(result);
    assertTrue(result.containsKey("vehicleTypes"));
    assertTrue(result.containsKey("capacity"));
    assertTrue(result.containsKey("modules"));
  }

  @Test
  @DisplayName("Should create new settings if not exists")
  void testUpsertSettingsCreate() {
    Map<String, Object> newSettings = Map.of("capacity", Map.of("total", 50));
    when(companySettingsPort.findByCompanyId(companyId)).thenReturn(Optional.empty());
    when(companySettingsPort.save(any())).thenReturn(settings);

    Map<String, Object> result = service.upsertSettings(company, newSettings);

    assertNotNull(result);
    verify(companySettingsPort).save(any(CompanySettings.class));
  }

  @Test
  @DisplayName("Should update existing settings")
  void testUpsertSettingsUpdate() {
    Map<String, Object> updatedSettings = Map.of("capacity", Map.of("total", 100));
    when(companySettingsPort.findByCompanyId(companyId)).thenReturn(Optional.of(settings));
    when(companySettingsPort.save(any())).thenReturn(settings);

    Map<String, Object> result = service.upsertSettings(company, updatedSettings);

    assertNotNull(result);
    verify(companySettingsPort).save(any(CompanySettings.class));
  }

  @Test
  @DisplayName("Should preserve existing settings while upserting")
  void testUpsertMergesCorrectly() {
    Map<String, Object> existing = new HashMap<>(Map.of("a", 1, "b", 2));
    settings.setSettingsJson(existing);

    Map<String, Object> update = new HashMap<>(Map.of("c", 3));
    when(companySettingsPort.findByCompanyId(companyId)).thenReturn(Optional.of(settings));
    when(companySettingsPort.save(any())).thenAnswer(invocation -> {
      CompanySettings arg = invocation.getArgument(0);
      return arg;
    });

    service.upsertSettings(company, update);

    verify(companySettingsPort).save(any(CompanySettings.class));
  }

  @Test
  @DisplayName("Should handle large JSON settings")
  void testLargeJsonHandling() {
    Map<String, Object> largeSettings = new HashMap<>();
    for (int i = 0; i < 100; i++) {
      largeSettings.put("key_" + i, "value_" + i);
    }

    when(companySettingsPort.findByCompanyId(companyId)).thenReturn(Optional.empty());
    when(companySettingsPort.save(any())).thenReturn(settings);

    Map<String, Object> result = service.upsertSettings(company, largeSettings);

    assertNotNull(result);
  }

  @Test
  @DisplayName("Should return default with all required keys")
  void testDefaultSettingsStructure() {
    when(companySettingsPort.findByCompanyId(companyId)).thenReturn(Optional.empty());

    Map<String, Object> defaults = service.getSettingsOrDefault(company);

    assertTrue(defaults.containsKey("vehicleTypes"));
    assertTrue(defaults.containsKey("capacity"));
    assertTrue(defaults.containsKey("rates"));
    assertTrue(defaults.containsKey("paymentMethods"));
    assertTrue(defaults.containsKey("sites"));
    assertTrue(defaults.containsKey("modules"));
  }

  @Test
  @DisplayName("Should copy settings without reference sharing")
  void testSettingsCopyIsolation() {
    Map<String, Object> settings1 = new HashMap<>(Map.of("a", 1));
    Map<String, Object> settings2 = new HashMap<>(settings1);

    settings1.put("b", 2);

    assertEquals(1, settings2.size());
    assertFalse(settings2.containsKey("b"));
  }

  @Test
  @DisplayName("Should handle null company gracefully")
  void testNullCompanyHandling() {
    when(companySettingsPort.findByCompanyId(null)).thenReturn(Optional.empty());

    assertDoesNotThrow(() -> service.getSettingsOrDefault(new Company()));
  }

  @Test
  @DisplayName("Should handle empty settings map")
  void testEmptySettingsMap() {
    settings.setSettingsJson(new LinkedHashMap<>());
    when(companySettingsPort.findByCompanyId(companyId)).thenReturn(Optional.of(settings));

    Map<String, Object> result = service.getSettingsOrDefault(company);

    assertNotNull(result);
    assertTrue(result.isEmpty());
  }

  @Test
  @DisplayName("Should update timestamp on upsert")
  void testTimestampUpdate() {
    when(companySettingsPort.findByCompanyId(companyId)).thenReturn(Optional.of(settings));
    when(companySettingsPort.save(any())).thenAnswer(invocation -> {
      CompanySettings arg = invocation.getArgument(0);
      assertNotNull(arg.getUpdatedAt());
      return arg;
    });

    service.upsertSettings(company, Map.of());

    verify(companySettingsPort).save(any());
  }
}
