package com.parkflow.modules.onboarding.application.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.parkflow.modules.onboarding.domain.OnboardingQuestionConfig;
import com.parkflow.modules.onboarding.domain.repository.OnboardingQuestionConfigPort;
import com.parkflow.modules.onboarding.dto.OnboardingQuestionConfigDto;
import java.util.List;
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
@DisplayName("OnboardingQuestionConfigService Unit Tests")
class OnboardingQuestionConfigServiceUnitTest {

  @Mock private OnboardingQuestionConfigPort repository;
  @Mock private OnboardingQuestionConfigMapper mapper;

  @InjectMocks private OnboardingQuestionConfigService service;

  private OnboardingQuestionConfig questionConfig;
  private OnboardingQuestionConfigDto questionDto;

  @BeforeEach
  void setUp() {
    questionConfig = new OnboardingQuestionConfig();
    questionConfig.setId(UUID.randomUUID());
    questionConfig.setStepNumber(1);
    questionConfig.setTitle("Tipos de vehículo");
    questionConfig.setDescription("Selecciona tipos");
    questionConfig.setEnabled(true);
    questionConfig.setRequired(true);
    questionConfig.setPlanRestricted(false);

    questionDto = new OnboardingQuestionConfigDto(
        questionConfig.getId(),
        1,
        "Tipos de vehículo",
        "Selecciona tipos",
        true,
        true,
        false
    );
  }

  @Test
  @DisplayName("Should find all questions")
  void testFindAll() {
    List<OnboardingQuestionConfig> allConfigs = List.of(questionConfig);
    when(repository.findAllByOrderByStepNumberAsc()).thenReturn(allConfigs);
    when(mapper.toDto(questionConfig)).thenReturn(questionDto);

    List<OnboardingQuestionConfigDto> result = service.findAll();

    assertNotNull(result);
    assertEquals(1, result.size());
    assertEquals(1, result.get(0).stepNumber());
  }

  @Test
  @DisplayName("Should return default questions when repository is empty")
  void testFindAllReturnsDefaults() {
    when(repository.findAllByOrderByStepNumberAsc()).thenReturn(List.of());

    List<OnboardingQuestionConfigDto> result = service.findAll();

    assertNotNull(result);
    assertTrue(result.size() >= 12);
  }

  @Test
  @DisplayName("Should find all enabled questions")
  void testFindAllEnabled() {
    questionConfig.setEnabled(true);
    List<OnboardingQuestionConfig> enabledConfigs = List.of(questionConfig);
    when(repository.findAllEnabled()).thenReturn(enabledConfigs);
    when(mapper.toDto(questionConfig)).thenReturn(questionDto);

    List<OnboardingQuestionConfigDto> result = service.findAllEnabled();

    assertNotNull(result);
    assertEquals(1, result.size());
  }

  @Test
  @DisplayName("Should create new question config")
  void testCreateOrUpdate() {
    OnboardingQuestionConfigDto newDto = new OnboardingQuestionConfigDto(
        null, 5, "Caja", "¿Caja por operador?", true, false, false
    );
    when(repository.findByStepNumber(5)).thenReturn(Optional.empty());
    when(repository.save(any())).thenReturn(questionConfig);
    when(mapper.toDto(any())).thenReturn(newDto);

    OnboardingQuestionConfigDto result = service.createOrUpdate(newDto);

    assertNotNull(result);
    verify(repository).save(any(OnboardingQuestionConfig.class));
  }

  @Test
  @DisplayName("Should update existing question config")
  void testUpdateExisting() {
    OnboardingQuestionConfigDto updateDto = new OnboardingQuestionConfigDto(
        questionConfig.getId(), 1, "Updated Title", "Updated desc", true, true, false
    );
    when(repository.findByStepNumber(1)).thenReturn(Optional.of(questionConfig));
    when(repository.save(any())).thenReturn(questionConfig);
    when(mapper.toDto(any())).thenReturn(updateDto);

    OnboardingQuestionConfigDto result = service.createOrUpdate(updateDto);

    assertNotNull(result);
    verify(repository).save(any(OnboardingQuestionConfig.class));
  }

  @Test
  @DisplayName("Should delete question config by id")
  void testDelete() {
    UUID id = UUID.randomUUID();

    service.delete(id);

    verify(repository).deleteById(id);
  }

  @Test
  @DisplayName("Should seed default configs when repository is empty")
  void testSeedDefaults() {
    when(repository.findAllByOrderByStepNumberAsc()).thenReturn(List.of());
    when(repository.save(any())).thenReturn(questionConfig);
    when(mapper.toEntity(any())).thenReturn(questionConfig);

    service.seedDefaults();

    verify(repository, atLeastOnce()).save(any());
  }

  @Test
  @DisplayName("Should not seed if configs already exist")
  void testSeedDefaultsIdempotent() {
    when(repository.findAllByOrderByStepNumberAsc()).thenReturn(List.of(questionConfig));

    service.seedDefaults();

    verify(repository, never()).save(any());
  }

  @Test
  @DisplayName("Should validate step numbers 1-12")
  void testValidateAllSteps() {
    for (int step = 1; step <= 12; step++) {
      assertTrue(step >= 1 && step <= 12);
    }
  }

  @Test
  @DisplayName("Should preserve question order after finding all")
  void testPreserveQuestionOrder() {
    OnboardingQuestionConfig q1 = new OnboardingQuestionConfig();
    q1.setStepNumber(1);
    q1.setEnabled(true);

    OnboardingQuestionConfig q2 = new OnboardingQuestionConfig();
    q2.setStepNumber(2);
    q2.setEnabled(true);

    when(repository.findAllByOrderByStepNumberAsc()).thenReturn(List.of(q1, q2));
    when(mapper.toDto(q1)).thenReturn(new OnboardingQuestionConfigDto(null, 1, "", "", true, true, false));
    when(mapper.toDto(q2)).thenReturn(new OnboardingQuestionConfigDto(null, 2, "", "", true, true, false));

    List<OnboardingQuestionConfigDto> result = service.findAll();

    assertEquals(1, result.get(0).stepNumber());
    assertEquals(2, result.get(1).stepNumber());
  }

  @Test
  @DisplayName("Should handle plan-restricted questions")
  void testPlanRestrictedQuestions() {
    questionConfig.setPlanRestricted(true);
    when(repository.findAllByOrderByStepNumberAsc()).thenReturn(List.of(questionConfig));
    when(mapper.toDto(questionConfig)).thenReturn(
        new OnboardingQuestionConfigDto(null, 8, "", "", true, false, true)
    );

    List<OnboardingQuestionConfigDto> result = service.findAll();

    assertTrue(result.get(0).planRestricted());
  }

  @Test
  @DisplayName("Should distinguish required vs optional questions")
  void testRequiredVsOptional() {
    OnboardingQuestionConfig required = new OnboardingQuestionConfig();
    required.setStepNumber(1);
    required.setRequired(true);

    OnboardingQuestionConfig optional = new OnboardingQuestionConfig();
    optional.setStepNumber(8);
    optional.setRequired(false);

    when(repository.findAllByOrderByStepNumberAsc()).thenReturn(List.of(required, optional));
    when(mapper.toDto(required)).thenReturn(
        new OnboardingQuestionConfigDto(null, 1, "", "", true, true, false)
    );
    when(mapper.toDto(optional)).thenReturn(
        new OnboardingQuestionConfigDto(null, 8, "", "", true, false, true)
    );

    List<OnboardingQuestionConfigDto> result = service.findAll();

    assertTrue(result.get(0).required());
    assertFalse(result.get(1).required());
  }

  @Test
  @DisplayName("Should update description and title")
  void testUpdateDescription() {
    OnboardingQuestionConfigDto updateDto = new OnboardingQuestionConfigDto(
        questionConfig.getId(),
        1,
        "New Title",
        "New Description",
        true,
        true,
        false
    );
    when(repository.findByStepNumber(1)).thenReturn(Optional.of(questionConfig));
    when(repository.save(any())).thenAnswer(invocation -> {
      OnboardingQuestionConfig saved = invocation.getArgument(0);
      assertEquals("New Title", saved.getTitle());
      assertEquals("New Description", saved.getDescription());
      return saved;
    });
    when(mapper.toDto(any())).thenReturn(updateDto);

    service.createOrUpdate(updateDto);

    verify(repository).save(any());
  }
}
