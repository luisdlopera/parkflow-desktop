package com.parkflow.modules.configuration.infrastructure.controller;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.common.dto.VehicleTypeRequest;
import com.parkflow.modules.common.dto.VehicleTypeResponse;
import com.parkflow.modules.settings.application.port.in.CompanyVehicleTypeManagementUseCase;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
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
@Tag(name = "ConfigurationVehicleType", description = "ConfigurationVehicleType endpoints")
@RequestMapping("/api/v1/configuration/vehicle-types")
@RequiredArgsConstructor
public class ConfigurationVehicleTypeController {

  private final CompanyVehicleTypeManagementUseCase companyVehicleTypeManagement;

  @GetMapping
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR','CAJERO')")
  public List<VehicleTypeResponse> listAll() {
    UUID companyId = resolveCompanyId();
    return companyVehicleTypeManagement.listByCompany(companyId);
  }

  @PostMapping
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CREATED)
  public VehicleTypeResponse create(@RequestBody Map<String, String> body) {
    String code = body != null ? body.get("code") : null;
    if (code == null || code.isBlank()) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "El código del tipo de vehículo es requerido");
    }
    UUID companyId = resolveCompanyId();
    return companyVehicleTypeManagement.addTypeToCompany(companyId, code);
  }

  @PutMapping("/{id}")
  @Operation(summary = "PUT endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public VehicleTypeResponse update(
      @PathVariable UUID id,
      @Valid @RequestBody VehicleTypeRequest req) {
    return companyVehicleTypeManagement.updateCompanyType(id, req);
  }

  @DeleteMapping("/{id}")
  @Operation(summary = "DELETE endpoint")
  @ApiResponse(responseCode = "204", description = "Deleted")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "404", description = "Not Found")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    companyVehicleTypeManagement.removeCompanyType(id);
  }

  @PatchMapping("/{id}/status")
  @Operation(summary = "PATCH endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public void patchStatus(
      @PathVariable UUID id,
      @RequestParam boolean active) {
    companyVehicleTypeManagement.patchCompanyTypeStatus(id, active);
  }

  private UUID resolveCompanyId() {
    try {
      return SecurityUtils.requireCompanyId();
    } catch (Exception e) {
      throw new OperationException(HttpStatus.FORBIDDEN, "No se pudo determinar la empresa del usuario");
    }
  }
}
