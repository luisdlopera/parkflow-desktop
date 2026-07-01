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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/lockers")
@RequiredArgsConstructor
public class LockerController {


  private final LockerUseCase lockerService;

  @GetMapping
  @PreAuthorize("hasAuthority('configuracion:editar') or hasAuthority('reportes:leer')")
  public List<LockerResponse> listLockers() {
    UUID companyId = SecurityUtils.requireCompanyId();
    return lockerService.listLockers(companyId);
  }

  @GetMapping("/available")
  @PreAuthorize("isAuthenticated()")
  public List<LockerResponse> listAvailableLockers() {
    UUID companyId = SecurityUtils.requireCompanyId();
    return lockerService.listAvailableLockers(companyId);
  }

  @PostMapping
  @PreAuthorize("hasAuthority('configuracion:editar')")
  @ResponseStatus(HttpStatus.CREATED)
  public LockerResponse createLocker(
      @Valid @RequestBody LockerRequest request) {
    return lockerService.createLocker(request.code(), request.label());
  }

  @PostMapping("/batch")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  @ResponseStatus(HttpStatus.CREATED)
  public List<LockerResponse> createBatch(
      @Valid @RequestBody BatchLockerRequest request) {
    return lockerService.createBatch(SecurityUtils.requireCompanyId(), request);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public LockerResponse patchLocker(
      @PathVariable UUID id, @Valid @RequestBody PatchLockerRequest request) {
    return lockerService.patchLocker(id, request);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteLocker(@PathVariable UUID id) {
    lockerService.deleteLocker(id);
  }
}
