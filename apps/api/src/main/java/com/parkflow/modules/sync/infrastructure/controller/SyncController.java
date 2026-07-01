package com.parkflow.modules.sync.infrastructure.controller;

import com.parkflow.modules.sync.dto.SyncEventResponse;
import com.parkflow.modules.sync.dto.SyncPushRequest;
import com.parkflow.modules.sync.dto.SyncReconcileRequest;
import com.parkflow.modules.sync.application.port.in.SyncUseCase;
import jakarta.validation.Valid;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@Tag(name = "Sync", description = "Sync endpoints")
@RequestMapping("/api/v1/sync")
@RequiredArgsConstructor
public class SyncController {
  private final SyncUseCase syncUseCase;

  @PostMapping("/push")
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('sync:push')")
  public SyncEventResponse push(@Valid @RequestBody SyncPushRequest request) {
    return syncUseCase.push(request);
  }

  @GetMapping("/pull")
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('sync:push')")
  public List<SyncEventResponse> pull(
      @RequestParam(required = false) OffsetDateTime after,
      @RequestParam(defaultValue = "100") int limit) {
    return syncUseCase.pull(after, limit);
  }

  @PostMapping("/reconcile")
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('sync:reconcile')")
  public List<SyncEventResponse> reconcile(@Valid @RequestBody SyncReconcileRequest request) {
    return syncUseCase.reconcile(request);
  }
}
