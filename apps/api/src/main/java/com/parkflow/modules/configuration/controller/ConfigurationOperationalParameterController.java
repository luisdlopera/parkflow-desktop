package com.parkflow.modules.configuration.controller;

import com.parkflow.modules.configuration.dto.OperationalParameterRequest;
import com.parkflow.modules.configuration.dto.OperationalParameterResponse;
import com.parkflow.modules.configuration.service.OperationalParameterService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/configuration/operational-parameters")
@RequiredArgsConstructor
public class ConfigurationOperationalParameterController {

  private final OperationalParameterService operationalParameterService;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<OperationalParameterResponse> getBySite(@RequestParam UUID siteId) {
    return ResponseEntity.ok(operationalParameterService.getBySite(siteId));
  }

  @PutMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<OperationalParameterResponse> createOrUpdate(
      @RequestParam UUID siteId,
      @Valid @RequestBody OperationalParameterRequest req) {
    return ResponseEntity.ok(operationalParameterService.createOrUpdate(siteId, req));
  }
}
