package com.parkflow.modules.configuration.infrastructure.controller;

import com.parkflow.modules.configuration.application.port.in.ThemeConfigurationUseCase;
import com.parkflow.modules.configuration.dto.ThemeConfigurationRequest;
import com.parkflow.modules.configuration.dto.ThemeConfigurationResponse;
import jakarta.validation.Valid;
import com.parkflow.modules.auth.security.TenantContext;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.http.HttpStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.web.server.ResponseStatusException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.web.multipart.MultipartFile;

@RestController
@Tag(name = "ThemeConfiguration", description = "ThemeConfiguration endpoints")
@RequestMapping("/api/v1/configuration/theme")
@RequiredArgsConstructor
public class ThemeConfigurationController {

  private final ThemeConfigurationUseCase themeConfigurationUseCase;

  @GetMapping
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR','CAJERO')")
  public ThemeConfigurationResponse get() {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return themeConfigurationUseCase.getByCompany(companyId);
  }

  @PutMapping
  @Operation(summary = "PUT endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ThemeConfigurationResponse upsert(
      @Valid @RequestBody ThemeConfigurationRequest req) {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return themeConfigurationUseCase.createOrUpdate(companyId, req);
  }

  @PostMapping("/logo")
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ThemeConfigurationResponse uploadLogo(
      @RequestParam("file") MultipartFile file) {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return themeConfigurationUseCase.updateLogo(companyId, file);
  }

  @DeleteMapping("/logo")
  @Operation(summary = "DELETE endpoint")
  @ApiResponse(responseCode = "204", description = "Deleted")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "404", description = "Not Found")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ThemeConfigurationResponse removeLogo() {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return themeConfigurationUseCase.removeLogo(companyId);
  }

  @PostMapping("/favicon")
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ThemeConfigurationResponse uploadFavicon(
      @RequestParam("file") MultipartFile file) {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return themeConfigurationUseCase.updateFavicon(companyId, file);
  }

  @DeleteMapping("/favicon")
  @Operation(summary = "DELETE endpoint")
  @ApiResponse(responseCode = "204", description = "Deleted")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "404", description = "Not Found")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ThemeConfigurationResponse removeFavicon() {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return themeConfigurationUseCase.removeFavicon(companyId);
  }
}
