package com.parkflow.modules.parking.locker.infrastructure.controller;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.locker.dto.BatchLockerRequest;
import com.parkflow.modules.parking.locker.dto.LockerRequest;
import com.parkflow.modules.parking.locker.dto.LockerResponse;
import com.parkflow.modules.parking.locker.dto.PatchLockerRequest;
import com.parkflow.modules.parking.locker.application.port.in.LockerUseCase;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@SuppressWarnings("deprecation")
@RestController
@RequestMapping("/api/v1/lockers")
@RequiredArgsConstructor
public class LockerController {

  private final LockerUseCase lockerService;

  @GetMapping
  @PreAuthorize("hasAuthority('configuracion:editar') or hasAuthority('reportes:leer')")
  public ResponseEntity<List<LockerResponse>> listLockers() {
    UUID companyId = SecurityUtils.requireCompanyId();
    return ResponseEntity.ok(lockerService.listLockers(companyId));
  }

  @GetMapping("/available")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<List<LockerResponse>> listAvailableLockers() {
    UUID companyId = SecurityUtils.requireCompanyId();
    return ResponseEntity.ok(lockerService.listAvailableLockers(companyId));
  }

  @PostMapping
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ResponseEntity<LockerResponse> createLocker(
      @Valid @RequestBody LockerRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(lockerService.createLocker(request.code(), request.label()));
  }

  @PostMapping("/batch")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ResponseEntity<List<LockerResponse>> createBatch(
      @Valid @RequestBody BatchLockerRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(lockerService.createBatch(SecurityUtils.requireCompanyId(), request));
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ResponseEntity<LockerResponse> patchLocker(
      @PathVariable UUID id, @Valid @RequestBody PatchLockerRequest request) {
    return ResponseEntity.ok(lockerService.patchLocker(id, request));
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ResponseEntity<Void> deleteLocker(@PathVariable UUID id) {
    lockerService.deleteLocker(id);
    return ResponseEntity.noContent().build();
  }
}
