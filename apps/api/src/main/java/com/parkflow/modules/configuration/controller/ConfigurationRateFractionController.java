package com.parkflow.modules.configuration.controller;

import com.parkflow.modules.configuration.dto.RateFractionRequest;
import com.parkflow.modules.configuration.dto.RateFractionResponse;
import com.parkflow.modules.configuration.service.RateFractionService;
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

  private final RateFractionService rateFractionService;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<List<RateFractionResponse>> listByRate(@RequestParam UUID rateId) {
    return ResponseEntity.ok(rateFractionService.listByRate(rateId));
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<RateFractionResponse> get(@PathVariable UUID id) {
    return ResponseEntity.ok(rateFractionService.get(id));
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<RateFractionResponse> create(
      @RequestParam UUID rateId,
      @Valid @RequestBody RateFractionRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED).body(rateFractionService.create(rateId, req));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<RateFractionResponse> update(
      @PathVariable UUID id,
      @Valid @RequestBody RateFractionRequest req) {
    return ResponseEntity.ok(rateFractionService.update(id, req));
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    rateFractionService.delete(id);
    return ResponseEntity.noContent().build();
  }
}
