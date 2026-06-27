package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.onboarding.domain.OnboardingQuestionConfig;
import com.parkflow.modules.onboarding.domain.repository.OnboardingQuestionConfigPort;
import com.parkflow.modules.onboarding.dto.OnboardingQuestionConfigDto;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OnboardingQuestionConfigService {

  private final OnboardingQuestionConfigPort repository;

  private final OnboardingQuestionConfigMapper mapper;

  private static final List<OnboardingQuestionConfigDto> DEFAULT_QUESTIONS = List.of(
      new OnboardingQuestionConfigDto(null, 1, "Tipos de vehículo", "Selecciona los tipos de vehículos que recibe tu parqueadero y la custodia de cascos para motos", true, true, false),
      new OnboardingQuestionConfigDto(null, 2, "Capacidad", "Configura la capacidad total y por tipo de vehículo", true, true, false),
      new OnboardingQuestionConfigDto(null, 3, "Tarifas", "Configura el valor base y tarifas específicas por tipo", true, true, false),
      new OnboardingQuestionConfigDto(null, 4, "Configuración regional", "País, formato de placa y prefijo", true, true, false),
      new OnboardingQuestionConfigDto(null, 5, "Caja", "¿Manejas caja por operador?", true, false, false),
      new OnboardingQuestionConfigDto(null, 6, "Métodos de pago", "Selecciona los métodos de pago que aceptas", true, true, false),
      new OnboardingQuestionConfigDto(null, 7, "Tickets", "Configuración de impresión y tickets", true, false, false),
      new OnboardingQuestionConfigDto(null, 8, "Clientes y mensualidades", "¿Manejas clientes frecuentes o mensualidades?", true, false, true),
      new OnboardingQuestionConfigDto(null, 9, "Convenios", "¿Tienes convenios con empresas?", true, false, true),
      new OnboardingQuestionConfigDto(null, 10, "Sedes", "¿Varias sedes?", true, false, true),
      new OnboardingQuestionConfigDto(null, 11, "Roles y permisos", "Permisos avanzados", true, false, true),
      new OnboardingQuestionConfigDto(null, 12, "Auditoría", "Resumen y auditoría crítica", true, false, false)
  );

  @Transactional(readOnly = true)
  public List<OnboardingQuestionConfigDto> findAll() {
    List<OnboardingQuestionConfig> entities = repository.findAllByOrderByStepNumberAsc();
    if (entities.isEmpty()) {
      return DEFAULT_QUESTIONS;
    }
    return entities.stream().map(mapper::toDto).toList();
  }

  @Transactional(readOnly = true)
  public List<OnboardingQuestionConfigDto> findAllEnabled() {
    List<OnboardingQuestionConfig> entities = repository.findAllEnabled();
    if (entities.isEmpty()) {
      return DEFAULT_QUESTIONS.stream().filter(dto -> dto.enabled()).toList();
    }
    return entities.stream().filter(e -> e.isEnabled()).map(mapper::toDto).toList();
  }

  @Transactional
  public OnboardingQuestionConfigDto createOrUpdate(OnboardingQuestionConfigDto dto) {
    OnboardingQuestionConfig entity = repository.findByStepNumber(dto.stepNumber())
        .orElseGet(() -> {
          OnboardingQuestionConfig e = new OnboardingQuestionConfig();
          e.setStepNumber(dto.stepNumber());
          return e;
        });

    // Validación: No se puede desactivar una pregunta requerida
    if (entity.isRequired() && !dto.enabled()) {
      throw new OperationException(
          HttpStatus.CONFLICT,
          "REQUIRED_QUESTION_CANNOT_DISABLE",
          "Cannot disable required question at step " + dto.stepNumber()
      );
    }

    entity.setTitle(dto.title());
    entity.setDescription(dto.description());
    entity.setEnabled(dto.enabled());
    entity.setRequired(dto.required());
    entity.setPlanRestricted(dto.planRestricted());
    return mapper.toDto(repository.save(entity));
  }

  @Transactional
  public void delete(UUID id) {
    OnboardingQuestionConfig entity = repository.findById(id)
        .orElseThrow(() -> new OperationException(
            HttpStatus.NOT_FOUND,
            "QUESTION_NOT_FOUND",
            "Onboarding question not found: " + id
        ));

    // Validación: No se puede eliminar una pregunta requerida
    if (entity.isRequired()) {
      throw new OperationException(
          HttpStatus.CONFLICT,
          "REQUIRED_QUESTION_CANNOT_DELETE",
          "Cannot delete required question at step " + entity.getStepNumber()
      );
    }

    repository.deleteById(id);
  }

  @Transactional
  public void seedDefaults() {
    List<OnboardingQuestionConfig> existing = repository.findAllByOrderByStepNumberAsc();
    if (!existing.isEmpty()) {
      return;
    }
    for (OnboardingQuestionConfigDto dto : DEFAULT_QUESTIONS) {
      OnboardingQuestionConfig entity = mapper.toEntity(dto);
      repository.save(entity);
    }
  }
}
