package com.parkflow.modules.onboarding.infrastructure.controller;

import com.parkflow.modules.onboarding.application.service.OnboardingQuestionConfigService;
import com.parkflow.modules.onboarding.dto.OnboardingQuestionConfigDto;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
  public List<OnboardingQuestionConfigDto> list() {
    return service.findAll();
  }

  @GetMapping("/enabled")
  public List<OnboardingQuestionConfigDto> listEnabled() {
    return service.findAllEnabled();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public OnboardingQuestionConfigDto createOrUpdate(@RequestBody OnboardingQuestionConfigDto dto) {
    return service.createOrUpdate(dto);
  }

  @PutMapping("/batch")
  public List<OnboardingQuestionConfigDto> batchUpdate(@RequestBody List<OnboardingQuestionConfigDto> dtos) {
    List<OnboardingQuestionConfigDto> updated = dtos.stream().map(service::createOrUpdate).toList();
    return updated;
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    service.delete(id);
  }

  @PostMapping("/seed")
  @ResponseStatus(HttpStatus.OK)
  public void seed() {
    service.seedDefaults();
  }
}
