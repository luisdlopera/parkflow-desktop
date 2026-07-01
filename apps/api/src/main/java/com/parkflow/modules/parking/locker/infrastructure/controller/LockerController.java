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
@Tag(name = "Locker", description = "Locker endpoints")
@RequestMapping("/api/v1/lockers")
@RequiredArgsConstructor
public class LockerController {


  private final LockerUseCase lockerService;

  @GetMapping
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('configuracion:editar') or hasAuthority('reportes:leer')")
  public List<LockerResponse> listLockers() {
    UUID companyId = SecurityUtils.requireCompanyId();
    return lockerService.listLockers(companyId);
  }

  @GetMapping("/available")
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("isAuthenticated()")
  public List<LockerResponse> listAvailableLockers() {
    UUID companyId = SecurityUtils.requireCompanyId();
    return lockerService.listAvailableLockers(companyId);
  }

  @PostMapping
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  @ResponseStatus(HttpStatus.CREATED)
  public LockerResponse createLocker(
      @Valid @RequestBody LockerRequest request) {
    return lockerService.createLocker(request.code(), request.label());
  }

  @PostMapping("/batch")
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  @ResponseStatus(HttpStatus.CREATED)
  public List<LockerResponse> createBatch(
      @Valid @RequestBody BatchLockerRequest request) {
    return lockerService.createBatch(SecurityUtils.requireCompanyId(), request);
  }

  @PatchMapping("/{id}")
  @Operation(summary = "PATCH endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public LockerResponse patchLocker(
      @PathVariable UUID id, @Valid @RequestBody PatchLockerRequest request) {
    return lockerService.patchLocker(id, request);
  }

  @DeleteMapping("/{id}")
  @Operation(summary = "DELETE endpoint")
  @ApiResponse(responseCode = "204", description = "Deleted")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "404", description = "Not Found")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteLocker(@PathVariable UUID id) {
    lockerService.deleteLocker(id);
  }
}
