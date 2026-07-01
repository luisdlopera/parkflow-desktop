package com.parkflow.modules.onboarding.infrastructure.controller;

import com.parkflow.modules.onboarding.application.service.OnboardingQuestionConfigService;
import com.parkflow.modules.onboarding.dto.OnboardingQuestionConfigDto;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.http.HttpStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@Tag(name = "AdminOnboarding", description = "AdminOnboarding endpoints")
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
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public List<OnboardingQuestionConfigDto> list() {
    return service.findAll();
  }

  @GetMapping("/enabled")
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public List<OnboardingQuestionConfigDto> listEnabled() {
    return service.findAllEnabled();
  }

  @PostMapping
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ResponseStatus(HttpStatus.CREATED)
  public OnboardingQuestionConfigDto createOrUpdate(@RequestBody OnboardingQuestionConfigDto dto) {
    return service.createOrUpdate(dto);
  }

  @PutMapping("/batch")
  @Operation(summary = "PUT endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public List<OnboardingQuestionConfigDto> batchUpdate(@RequestBody List<OnboardingQuestionConfigDto> dtos) {
    List<OnboardingQuestionConfigDto> updated = dtos.stream().map(service::createOrUpdate).toList();
    return updated;
  }

  @DeleteMapping("/{id}")
  @Operation(summary = "DELETE endpoint")
  @ApiResponse(responseCode = "204", description = "Deleted")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "404", description = "Not Found")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    service.delete(id);
  }

  @PostMapping("/seed")
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ResponseStatus(HttpStatus.OK)
  public void seed() {
    service.seedDefaults();
  }
}
