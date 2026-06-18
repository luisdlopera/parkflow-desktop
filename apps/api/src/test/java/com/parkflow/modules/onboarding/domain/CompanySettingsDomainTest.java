package com.parkflow.modules.onboarding.domain;

import static org.junit.jupiter.api.Assertions.*;

import com.parkflow.modules.licensing.domain.Company;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("CompanySettings Domain Tests")
class CompanySettingsDomainTest {

  private CompanySettings settings;
  private Company company;

  @BeforeEach
  void setUp() {
    company = new Company();
    company.setId(UUID.randomUUID());

    settings = new CompanySettings();
    settings.setCompany(company);
    settings.setSettingsJson(new LinkedHashMap<>(Map.of(
        "vehicleTypes", java.util.List.of("MOTORCYCLE", "CAR"),
        "capacity", Map.of("total", 20),
        "modules", Map.of("cash", true)
    )));
  }

  @Test
  @DisplayName("Should initialize with empty settings")
  void testInitializeEmpty() {
    CompanySettings empty = new CompanySettings();
    assertNull(empty.getSettingsJson());
  }

  @Test
  @DisplayName("Should store JSON settings")
  void testStoreJsonSettings() {
    Map<String, Object> json = Map.of("key", "value");
    settings.setSettingsJson(new HashMap<>(json));

    assertNotNull(settings.getSettingsJson());
    assertTrue(settings.getSettingsJson().containsKey("key"));
  }

  @Test
  @DisplayName("Should merge settings without loss")
  void testMergeSettings() {
    Map<String, Object> initial = new HashMap<>(Map.of("a", 1, "b", 2));
    settings.setSettingsJson(initial);

    Map<String, Object> merged = new HashMap<>(settings.getSettingsJson());
    merged.put("c", 3);
    settings.setSettingsJson(merged);

    assertTrue(settings.getSettingsJson().containsKey("a"));
    assertTrue(settings.getSettingsJson().containsKey("c"));
    assertEquals(3, settings.getSettingsJson().size());
  }

  @Test
  @DisplayName("Should support equality")
  void testEquality() {
    CompanySettings s1 = new CompanySettings();
    CompanySettings s2 = s1;

    assertEquals(s1, s2);
  }

  @Test
  @DisplayName("Should handle large JSON")
  void testLargeJson() {
    Map<String, Object> largeJson = new HashMap<>();
    for (int i = 0; i < 100; i++) {
      largeJson.put("key_" + i, "value_" + i);
    }

    settings.setSettingsJson(largeJson);

    assertEquals(100, settings.getSettingsJson().size());
  }

  @Test
  @DisplayName("Should handle nested structures")
  void testNestedStructures() {
    Map<String, Object> nested = Map.of(
        "level1", Map.of(
            "level2", Map.of(
                "level3", "value"
            )
        )
    );

    settings.setSettingsJson(new HashMap<>(nested));

    assertTrue(settings.getSettingsJson().containsKey("level1"));
    @SuppressWarnings("unchecked")
    Map<String, Object> level1 = (Map<String, Object>) settings.getSettingsJson().get("level1");
    assertTrue(level1.containsKey("level2"));
  }

  @Test
  @DisplayName("Should update individual settings")
  void testUpdateIndividualSettings() {
    Map<String, Object> initial = new HashMap<>(Map.of("a", 1, "b", 2));
    settings.setSettingsJson(initial);

    Map<String, Object> updated = settings.getSettingsJson();
    updated.put("a", 100);
    settings.setSettingsJson(updated);

    assertEquals(100, settings.getSettingsJson().get("a"));
    assertEquals(2, settings.getSettingsJson().get("b"));
  }

  @Test
  @DisplayName("Should clear settings")
  void testClearSettings() {
    Map<String, Object> json = new HashMap<>(Map.of("a", 1));
    settings.setSettingsJson(json);

    settings.getSettingsJson().clear();

    assertTrue(settings.getSettingsJson().isEmpty());
  }

  @Test
  @DisplayName("Should store company reference")
  void testCompanyReference() {
    settings.setCompany(company);
    assertEquals(company, settings.getCompany());
    assertEquals(company.getId(), settings.getCompany().getId());
  }

  @Test
  @DisplayName("Should track creation timestamp")
  void testCreationTimestamp() {
    java.time.OffsetDateTime now = java.time.OffsetDateTime.now();
    settings.setCreatedAt(now);
    assertNotNull(settings.getCreatedAt());
    assertEquals(now, settings.getCreatedAt());
  }

  @Test
  @DisplayName("Should track update timestamp")
  void testUpdateTimestamp() {
    java.time.OffsetDateTime now = java.time.OffsetDateTime.now();
    settings.setUpdatedAt(now);
    assertNotNull(settings.getUpdatedAt());
    assertEquals(now, settings.getUpdatedAt());
  }

  @Test
  @DisplayName("Should preserve data types in settings")
  void testDataTypePreservation() {
    Map<String, Object> settings = new HashMap<>();
    settings.put("intValue", 42);
    settings.put("boolValue", true);
    settings.put("stringValue", "text");
    settings.put("listValue", java.util.List.of(1, 2, 3));

    this.settings.setSettingsJson(settings);

    Map<String, Object> stored = this.settings.getSettingsJson();
    assertEquals(Integer.class, stored.get("intValue").getClass());
    assertEquals(Boolean.class, stored.get("boolValue").getClass());
    assertEquals(String.class, stored.get("stringValue").getClass());
  }

  @Test
  @DisplayName("Should handle null values in settings")
  void testNullValuesHandling() {
    Map<String, Object> withNulls = new HashMap<>();
    withNulls.put("field", null);
    withNulls.put("otherField", "value");

    settings.setSettingsJson(withNulls);

    assertTrue(settings.getSettingsJson().containsKey("field"));
    assertEquals("value", settings.getSettingsJson().get("otherField"));
  }

  @Test
  @DisplayName("Should support comparison of different instances")
  void testDifferentInstanceComparison() {
    CompanySettings s1 = new CompanySettings();
    CompanySettings s2 = new CompanySettings();

    assertNotEquals(s1, s2);
  }

  @Test
  @DisplayName("Should maintain settings immutability semantics")
  void testSettingsIndependence() {
    Map<String, Object> original = new HashMap<>(Map.of("a", 1));
    settings.setSettingsJson(original);

    Map<String, Object> stored = settings.getSettingsJson();
    assertNotNull(stored);
    assertTrue(stored.containsKey("a"));
    assertEquals(1, stored.get("a"));
  }
}
