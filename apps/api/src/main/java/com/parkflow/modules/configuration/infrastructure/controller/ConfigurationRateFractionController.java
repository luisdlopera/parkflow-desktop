package com.parkflow.modules.configuration.infrastructure.controller;

import com.parkflow.modules.configuration.application.port.in.RateFractionUseCase;
import com.parkflow.modules.configuration.dto.RateFractionRequest;
import com.parkflow.modules.configuration.dto.RateFractionResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/configuration/rate-fractions")
@RequiredArgsConstructor
public class ConfigurationRateFractionController {

  private final RateFractionUseCase rateFractionUseCase;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public List<RateFractionResponse> listByRate(@RequestParam UUID rateId) {
    return rateFractionUseCase.listByRate(rateId);
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public RateFractionResponse get(@PathVariable UUID id) {
    return rateFractionUseCase.get(id);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CREATED)
  public RateFractionResponse create(
      @RequestParam UUID rateId,
      @Valid @RequestBody RateFractionRequest req) {
    return rateFractionUseCase.create(rateId, req);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public RateFractionResponse update(
      @PathVariable UUID id,
      @Valid @RequestBody RateFractionRequest req) {
    return rateFractionUseCase.update(id, req);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    rateFractionUseCase.delete(id);
  }
}
