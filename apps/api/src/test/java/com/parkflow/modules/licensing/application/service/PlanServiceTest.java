package com.parkflow.modules.licensing.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.licensing.domain.Plan;
import com.parkflow.modules.licensing.domain.repository.PlanRepository;
import com.parkflow.modules.licensing.dto.PlanRequest;
import com.parkflow.modules.licensing.dto.PlanResponse;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PlanServiceTest {

  @Mock private PlanRepository planRepository;
  private PlanService service;

  @BeforeEach
  void setUp() {
    service = new PlanService(planRepository, new ObjectMapper());
  }

  private Plan plan(String name, boolean active) {
    Plan p = new Plan();
    p.setId(UUID.randomUUID());
    p.setCode("PLAN_" + name.toUpperCase());
    p.setName(name);
    p.setMonthlyPrice(new BigDecimal("100"));
    p.setYearlyPrice(new BigDecimal("1000"));
    p.setActive(active);
    p.setFeatures("{\"reports\":true}");
    return p;
  }

  private PlanRequest req() {
    return new PlanRequest("Pro Plan", "desc", new BigDecimal("200"),
        new BigDecimal("2000"), true, Map.of("reports", true));
  }

  @Test
  void listPlans_includeDeletedWithActive() {
    when(planRepository.findAllByIsActive(true)).thenReturn(List.of(plan("A", true)));
    assertThat(service.listPlans(true, true)).hasSize(1);
  }

  @Test
  void listPlans_includeDeletedNoActive() {
    when(planRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(plan("A", true)));
    assertThat(service.listPlans(true, null)).hasSize(1);
  }

  @Test
  void listPlans_notDeletedWithActive() {
    when(planRepository.findAllActiveByDeletedAtIsNull(false))
        .thenReturn(List.of(plan("A", false)));
    assertThat(service.listPlans(false, false)).hasSize(1);
  }

  @Test
  void listPlans_notDeletedNoActive() {
    when(planRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc())
        .thenReturn(List.of(plan("A", true), plan("B", true)));
    assertThat(service.listPlans(false, null)).hasSize(2);
  }

  @Test
  void getPlan_returns() {
    Plan p = plan("Basic", true);
    when(planRepository.findById(p.getId())).thenReturn(Optional.of(p));
    PlanResponse resp = service.getPlan(p.getId());
    assertThat(resp.name()).isEqualTo("Basic");
    assertThat(resp.features()).containsKey("reports");
  }

  @Test
  void getPlan_throwsWhenMissing() {
    UUID id = UUID.randomUUID();
    when(planRepository.findById(id)).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.getPlan(id))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Plan no encontrado");
  }

  @Test
  void createPlan_generatesCode() {
    when(planRepository.existsByCode(any())).thenReturn(false);
    when(planRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    PlanResponse resp = service.createPlan(req());
    assertThat(resp.code()).startsWith("PLAN_PRO_PLAN");
  }

  @Test
  void createPlan_throwsWhenCodeExists() {
    when(planRepository.existsByCode(any())).thenReturn(true);
    assertThatThrownBy(() -> service.createPlan(req()))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Ya existe un plan");
  }

  @Test
  void createPlan_emptyFeaturesUsesDefault() {
    when(planRepository.existsByCode(any())).thenReturn(false);
    when(planRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    PlanRequest r = new PlanRequest("Free", null, BigDecimal.ZERO, BigDecimal.ZERO, true, Map.of());
    PlanResponse resp = service.createPlan(r);
    assertThat(resp.features()).isEmpty();
  }

  @Test
  void updatePlan_updates() {
    Plan p = plan("Old", true);
    when(planRepository.findById(p.getId())).thenReturn(Optional.of(p));
    when(planRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    PlanResponse resp = service.updatePlan(p.getId(), req());
    assertThat(resp.name()).isEqualTo("Pro Plan");
    assertThat(resp.monthlyPrice()).isEqualByComparingTo("200");
  }

  @Test
  void deletePlan_softDeletes() {
    Plan p = plan("ToDelete", false);
    when(planRepository.findById(p.getId())).thenReturn(Optional.of(p));
    when(planRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    service.deletePlan(p.getId());
    assertThat(p.getDeletedAt()).isNotNull();
  }

  @Test
  void deletePlan_throwsWhenAlreadyDeleted() {
    Plan p = plan("Gone", false);
    p.setDeletedAt(OffsetDateTime.now());
    when(planRepository.findById(p.getId())).thenReturn(Optional.of(p));
    assertThatThrownBy(() -> service.deletePlan(p.getId()))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("ya fue eliminado");
  }

  @Test
  void deletePlan_throwsWhenLastActive() {
    Plan p = plan("LastActive", true);
    when(planRepository.findById(p.getId())).thenReturn(Optional.of(p));
    when(planRepository.countByIsActiveTrueAndDeletedAtIsNull()).thenReturn(1L);
    assertThatThrownBy(() -> service.deletePlan(p.getId()))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("al menos un plan activo");
    verify(planRepository, never()).save(any());
  }

  @Test
  void togglePlan_activatesInactive() {
    Plan p = plan("Inactive", false);
    when(planRepository.findById(p.getId())).thenReturn(Optional.of(p));
    when(planRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    PlanResponse resp = service.togglePlan(p.getId());
    assertThat(resp.isActive()).isTrue();
  }

  @Test
  void togglePlan_throwsWhenDeactivatingLastActive() {
    Plan p = plan("OnlyActive", true);
    when(planRepository.findById(p.getId())).thenReturn(Optional.of(p));
    when(planRepository.countByIsActiveTrueAndDeletedAtIsNull()).thenReturn(1L);
    assertThatThrownBy(() -> service.togglePlan(p.getId()))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("al menos un plan activo");
  }

  @Test
  void duplicatePlan_createsCopy() {
    Plan src = plan("Origin", true);
    when(planRepository.findById(src.getId())).thenReturn(Optional.of(src));
    when(planRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    PlanResponse resp = service.duplicatePlan(src.getId());
    assertThat(resp.name()).isEqualTo("Origin (copia)");
    assertThat(resp.isActive()).isFalse();
  }
}
