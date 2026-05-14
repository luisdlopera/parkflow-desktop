package com.parkflow.modules.configuration.controller;

import com.parkflow.modules.configuration.application.port.in.RateFractionUseCase;
import com.parkflow.modules.configuration.dto.RateFractionRequest;
import com.parkflow.modules.configuration.dto.RateFractionResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/configuration/rate-fractions")
@RequiredArgsConstructor
public class ConfigurationRateFractionController {

  private final RateFractionUseCase rateFractionUseCase;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<List<RateFractionResponse>> listByRate(@RequestParam UUID rateId) {
    return ResponseEntity.ok(rateFractionUseCase.listByRate(rateId));
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<RateFractionResponse> get(@PathVariable UUID id) {
    return ResponseEntity.ok(rateFractionUseCase.get(id));
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<RateFractionResponse> create(
      @RequestParam UUID rateId,
      @Valid @RequestBody RateFractionRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED).body(rateFractionUseCase.create(rateId, req));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<RateFractionResponse> update(
      @PathVariable UUID id,
      @Valid @RequestBody RateFractionRequest req) {
    return ResponseEntity.ok(rateFractionUseCase.update(id, req));
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    rateFractionUseCase.delete(id);
    return ResponseEntity.noContent().build();
  }
}
