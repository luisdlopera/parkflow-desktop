package com.parkflow.modules.parking.helmet.controller;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.helmet.dto.BatchHelmetLockerRequest;
import com.parkflow.modules.parking.helmet.dto.HelmetLockerRequest;
import com.parkflow.modules.parking.helmet.dto.HelmetLockerResponse;
import com.parkflow.modules.parking.helmet.dto.PatchHelmetLockerRequest;
import com.parkflow.modules.parking.helmet.service.HelmetLockerService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/helmet-lockers")
@RequiredArgsConstructor
public class HelmetLockerController {

  private final HelmetLockerService helmetLockerService;

  @GetMapping
  @PreAuthorize("hasAuthority('configuracion:editar') or hasAuthority('reportes:leer')")
  public ResponseEntity<List<HelmetLockerResponse>> listLockers() {
    UUID companyId = SecurityUtils.requireCompanyId();
    return ResponseEntity.ok(helmetLockerService.listLockers(companyId));
  }

  @GetMapping("/available")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<List<HelmetLockerResponse>> listAvailableLockers() {
    UUID companyId = SecurityUtils.requireCompanyId();
    return ResponseEntity.ok(helmetLockerService.listAvailableLockers(companyId));
  }

  @PostMapping
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ResponseEntity<HelmetLockerResponse> createLocker(
      @Valid @RequestBody HelmetLockerRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(helmetLockerService.createLocker(request.code(), request.label()));
  }

  @PostMapping("/batch")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ResponseEntity<List<HelmetLockerResponse>> createBatch(
      @Valid @RequestBody BatchHelmetLockerRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(helmetLockerService.createBatch(request));
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ResponseEntity<HelmetLockerResponse> patchLocker(
      @PathVariable UUID id, @Valid @RequestBody PatchHelmetLockerRequest request) {
    return ResponseEntity.ok(helmetLockerService.patchLocker(id, request));
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ResponseEntity<Void> deleteLocker(@PathVariable UUID id) {
    helmetLockerService.deleteLocker(id);
    return ResponseEntity.noContent().build();
  }
}
