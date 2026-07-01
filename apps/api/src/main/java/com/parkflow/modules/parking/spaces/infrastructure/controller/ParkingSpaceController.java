package com.parkflow.modules.parking.spaces.infrastructure.controller;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.spaces.application.port.in.SpaceManagementUseCase;
import com.parkflow.modules.parking.spaces.application.port.in.SpaceQueryUseCase;
import com.parkflow.modules.parking.spaces.dto.PatchParkingSpaceRequest;
import com.parkflow.modules.parking.spaces.dto.ParkingSpaceDto;
import com.parkflow.modules.parking.spaces.dto.ParkingSpaceOccupancySummaryResponse;
import com.parkflow.modules.parking.spaces.dto.ResizeCapacityRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/parking-spaces")
@RequiredArgsConstructor
public class ParkingSpaceController {

  private final SpaceQueryUseCase spaceQueryService;
  private final SpaceManagementUseCase spaceManagementService;

  @GetMapping
  @PreAuthorize("hasAuthority('configuracion:editar') or hasAuthority('reportes:leer')")
  public List<ParkingSpaceDto> listSpaces(@RequestParam(required = false, defaultValue = "ACTIVE") String filter) {
    UUID companyId = SecurityUtils.requireCompanyId();
    return spaceQueryService.listSpaces(companyId, filter);
  }

  @GetMapping("/summary")
  @PreAuthorize("hasAuthority('configuracion:editar') or hasAuthority('reportes:leer')")
  public ParkingSpaceOccupancySummaryResponse summary() {
    UUID companyId = SecurityUtils.requireCompanyId();
    return spaceQueryService.getOccupancySummary(companyId);
  }

  @PutMapping("/capacity")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ParkingSpaceOccupancySummaryResponse resize(
      @Valid @RequestBody ResizeCapacityRequest request) {
    UUID companyId = SecurityUtils.requireCompanyId();
    return spaceManagementService.resizeCapacity(companyId, request.capacity());
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ParkingSpaceDto patch(
      @PathVariable UUID id, @Valid @RequestBody PatchParkingSpaceRequest request) {
    UUID companyId = SecurityUtils.requireCompanyId();
    return spaceManagementService.patchSpace(companyId, id, request.status(), request.label(), request.type());
  }
}
