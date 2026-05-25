package com.parkflow.modules.parking.spaces.controller;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.spaces.dto.PatchParkingSpaceRequest;
import com.parkflow.modules.parking.spaces.dto.ParkingSpaceDto;
import com.parkflow.modules.parking.spaces.dto.ParkingSpaceOccupancySummaryResponse;
import com.parkflow.modules.parking.spaces.dto.ResizeCapacityRequest;
import com.parkflow.modules.parking.spaces.service.ParkingSpaceService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/parking-spaces")
@RequiredArgsConstructor
public class ParkingSpaceController {

  private final ParkingSpaceService parkingSpaceService;

  @GetMapping
  @PreAuthorize("hasAuthority('configuracion:actualizar') or hasAuthority('reportes:leer')")
  public ResponseEntity<List<ParkingSpaceDto>> listSpaces() {
    UUID companyId = SecurityUtils.requireCompanyId();
    return ResponseEntity.ok(parkingSpaceService.listSpaces(companyId));
  }

  @GetMapping("/summary")
  @PreAuthorize("hasAuthority('configuracion:actualizar') or hasAuthority('reportes:leer')")
  public ResponseEntity<ParkingSpaceOccupancySummaryResponse> summary() {
    UUID companyId = SecurityUtils.requireCompanyId();
    return ResponseEntity.ok(parkingSpaceService.getOccupancySummary(companyId));
  }

  @PutMapping("/capacity")
  @PreAuthorize("hasAuthority('configuracion:actualizar')")
  public ResponseEntity<ParkingSpaceOccupancySummaryResponse> resize(
      @Valid @RequestBody ResizeCapacityRequest request) {
    UUID companyId = SecurityUtils.requireCompanyId();
    return ResponseEntity.ok(parkingSpaceService.resizeCapacity(companyId, request.capacity()));
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAuthority('configuracion:actualizar')")
  public ResponseEntity<ParkingSpaceDto> patch(
      @PathVariable UUID id, @Valid @RequestBody PatchParkingSpaceRequest request) {
    UUID companyId = SecurityUtils.requireCompanyId();
    return ResponseEntity.ok(
        parkingSpaceService.patchSpace(companyId, id, request.status(), request.label(), request.type()));
  }
}
