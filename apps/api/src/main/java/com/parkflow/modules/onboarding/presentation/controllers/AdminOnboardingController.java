package com.parkflow.modules.onboarding.presentation.controllers;

import com.parkflow.modules.onboarding.application.service.OnboardingQuestionConfigService;
import com.parkflow.modules.onboarding.dto.OnboardingQuestionConfigDto;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/onboarding-questions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminOnboardingController {

  private final OnboardingQuestionConfigService service;

  @jakarta.annotation.PostConstruct
  public void init() {
    org.slf4j.LoggerFactory.getLogger(getClass()).info("AdminOnboardingController initialized");
  }

  @GetMapping
  public ResponseEntity<List<OnboardingQuestionConfigDto>> list() {
    return ResponseEntity.ok(service.findAll());
  }

  @GetMapping("/enabled")
  public ResponseEntity<List<OnboardingQuestionConfigDto>> listEnabled() {
    return ResponseEntity.ok(service.findAllEnabled());
  }

  @PostMapping
  public ResponseEntity<OnboardingQuestionConfigDto> createOrUpdate(@RequestBody OnboardingQuestionConfigDto dto) {
    return ResponseEntity.status(HttpStatus.CREATED).body(service.createOrUpdate(dto));
  }

  @PutMapping("/batch")
  public ResponseEntity<List<OnboardingQuestionConfigDto>> batchUpdate(@RequestBody List<OnboardingQuestionConfigDto> dtos) {
    List<OnboardingQuestionConfigDto> updated = dtos.stream().map(service::createOrUpdate).toList();
    return ResponseEntity.ok(updated);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    service.delete(id);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/seed")
  public ResponseEntity<Void> seed() {
    service.seedDefaults();
    return ResponseEntity.ok().build();
  }
}
