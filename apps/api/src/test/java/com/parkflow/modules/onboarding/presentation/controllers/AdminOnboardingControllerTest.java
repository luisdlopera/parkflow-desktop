package com.parkflow.modules.onboarding.presentation.controllers;

import static org.junit.jupiter.api.Assertions.*;

import com.parkflow.modules.onboarding.dto.OnboardingQuestionConfigDto;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("AdminOnboardingController Tests")
class AdminOnboardingControllerTest {

  private OnboardingQuestionConfigDto questionDto;

  @BeforeEach
  void setUp() {
    questionDto = new OnboardingQuestionConfigDto(
        UUID.randomUUID(),
        1,
        "Tipos de vehículo",
        "Selecciona tipos de vehículos",
        true,
        true,
        false
    );
  }

  @Test
  @DisplayName("Should create question dto")
  void testCreateQuestionDto() {
    assertNotNull(questionDto);
    assertEquals(1, questionDto.stepNumber());
    assertTrue(questionDto.enabled());
    assertTrue(questionDto.required());
    assertFalse(questionDto.planRestricted());
  }

  @Test
  @DisplayName("Should create question for each step 1-12")
  void testQuestionsForAllSteps() {
    for (int step = 1; step <= 12; step++) {
      OnboardingQuestionConfigDto dto = new OnboardingQuestionConfigDto(
          UUID.randomUUID(),
          step,
          "Question " + step,
          "Description " + step,
          true,
          step <= 7,
          step > 7
      );

      assertEquals(step, dto.stepNumber());
    }
  }

  @Test
  @DisplayName("Should create enabled question")
  void testEnabledQuestion() {
    assertTrue(questionDto.enabled());
  }

  @Test
  @DisplayName("Should create required question")
  void testRequiredQuestion() {
    assertTrue(questionDto.required());
  }

  @Test
  @DisplayName("Should create optional question")
  void testOptionalQuestion() {
    OnboardingQuestionConfigDto optional = new OnboardingQuestionConfigDto(
        UUID.randomUUID(), 8, "Q8", "D8", true, false, true
    );

    assertFalse(optional.required());
    assertTrue(optional.planRestricted());
  }

  @Test
  @DisplayName("Should create plan restricted question")
  void testPlanRestrictedQuestion() {
    OnboardingQuestionConfigDto restricted = new OnboardingQuestionConfigDto(
        UUID.randomUUID(), 8, "Q8", "Plan restricted", true, false, true
    );

    assertTrue(restricted.planRestricted());
  }

  @Test
  @DisplayName("Should create question with custom title")
  void testCustomTitle() {
    String customTitle = "Custom Title";
    OnboardingQuestionConfigDto custom = new OnboardingQuestionConfigDto(
        UUID.randomUUID(), 1, customTitle, "Description", true, true, false
    );

    assertEquals(customTitle, custom.title());
  }

  @Test
  @DisplayName("Should create question list")
  void testQuestionList() {
    List<OnboardingQuestionConfigDto> questions = List.of(
        new OnboardingQuestionConfigDto(UUID.randomUUID(), 1, "Q1", "D1", true, true, false),
        new OnboardingQuestionConfigDto(UUID.randomUUID(), 2, "Q2", "D2", true, true, false),
        new OnboardingQuestionConfigDto(UUID.randomUUID(), 3, "Q3", "D3", true, true, false)
    );

    assertNotNull(questions);
    assertEquals(3, questions.size());
  }

  @Test
  @DisplayName("Should handle question with null id")
  void testQuestionWithNullId() {
    OnboardingQuestionConfigDto noId = new OnboardingQuestionConfigDto(
        null, 1, "Title", "Desc", true, true, false
    );

    assertNull(noId.id());
  }

  @Test
  @DisplayName("Should distinguish required vs optional")
  void testRequiredVsOptional() {
    OnboardingQuestionConfigDto required = new OnboardingQuestionConfigDto(
        UUID.randomUUID(), 1, "Required", "R", true, true, false
    );
    OnboardingQuestionConfigDto optional = new OnboardingQuestionConfigDto(
        UUID.randomUUID(), 8, "Optional", "O", true, false, true
    );

    assertTrue(required.required());
    assertFalse(optional.required());
  }

  @Test
  @DisplayName("Should create question with UUID")
  void testQuestionWithUUID() {
    UUID id = UUID.randomUUID();
    OnboardingQuestionConfigDto withId = new OnboardingQuestionConfigDto(
        id, 1, "Title", "Description", true, true, false
    );

    assertEquals(id, withId.id());
  }
}
