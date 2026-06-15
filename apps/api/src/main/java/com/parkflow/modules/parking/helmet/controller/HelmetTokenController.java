package com.parkflow.modules.parking.helmet.controller;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.helmet.dto.BatchHelmetTokenRequest;
import com.parkflow.modules.parking.helmet.dto.HelmetTokenRequest;
import com.parkflow.modules.parking.helmet.dto.HelmetTokenResponse;
import com.parkflow.modules.parking.helmet.dto.PatchHelmetTokenRequest;
import com.parkflow.modules.parking.helmet.service.HelmetTokenService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/helmet-tokens")
@RequiredArgsConstructor
public class HelmetTokenController {

  private final HelmetTokenService helmetTokenService;

  @GetMapping
  @PreAuthorize("hasAuthority('configuracion:editar') or hasAuthority('reportes:leer')")
  public ResponseEntity<List<HelmetTokenResponse>> listTokens() {
    UUID companyId = SecurityUtils.requireCompanyId();
    return ResponseEntity.ok(helmetTokenService.listTokens(companyId));
  }

  @GetMapping("/available")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<List<HelmetTokenResponse>> listAvailableTokens() {
    UUID companyId = SecurityUtils.requireCompanyId();
    return ResponseEntity.ok(helmetTokenService.listAvailableTokens(companyId));
  }

  @PostMapping
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ResponseEntity<HelmetTokenResponse> createToken(
      @Valid @RequestBody HelmetTokenRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(helmetTokenService.createToken(request.code(), request.label()));
  }

  @PostMapping("/batch")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ResponseEntity<List<HelmetTokenResponse>> createBatch(
      @Valid @RequestBody BatchHelmetTokenRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(helmetTokenService.createBatch(request));
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ResponseEntity<HelmetTokenResponse> patchToken(
      @PathVariable UUID id, @Valid @RequestBody PatchHelmetTokenRequest request) {
    return ResponseEntity.ok(helmetTokenService.patchToken(id, request));
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ResponseEntity<Void> deleteToken(@PathVariable UUID id) {
    helmetTokenService.deleteToken(id);
    return ResponseEntity.noContent().build();
  }
}
