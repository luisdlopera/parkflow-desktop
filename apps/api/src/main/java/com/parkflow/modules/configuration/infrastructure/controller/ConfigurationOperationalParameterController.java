package com.parkflow.modules.configuration.infrastructure.controller;

import com.parkflow.modules.configuration.application.port.in.OperationalParameterUseCase;
import com.parkflow.modules.configuration.dto.OperationalParameterRequest;
import com.parkflow.modules.configuration.dto.OperationalParameterResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/configuration/operational-parameters")
@RequiredArgsConstructor
public class ConfigurationOperationalParameterController {

  private final OperationalParameterUseCase operationalParameterUseCase;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public OperationalParameterResponse getBySite(@RequestParam UUID siteId) {
    return operationalParameterUseCase.getBySite(siteId);
  }

  @PutMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public OperationalParameterResponse createOrUpdate(
      @RequestParam UUID siteId,
      @Valid @RequestBody OperationalParameterRequest req) {
    return operationalParameterUseCase.createOrUpdate(siteId, req);
  }
}
