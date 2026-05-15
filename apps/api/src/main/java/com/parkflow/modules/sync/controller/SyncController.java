package com.parkflow.modules.sync.controller;

import com.parkflow.modules.sync.dto.SyncEventResponse;
import com.parkflow.modules.sync.dto.SyncPushRequest;
import com.parkflow.modules.sync.dto.SyncReconcileRequest;
import com.parkflow.modules.sync.application.port.in.SyncUseCase;
import jakarta.validation.Valid;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/sync")
@RequiredArgsConstructor
public class SyncController {
  private final SyncUseCase syncUseCase;

  @PostMapping("/push")
  @PreAuthorize("hasAuthority('sync:push')")
  public SyncEventResponse push(@Valid @RequestBody SyncPushRequest request) {
    return syncUseCase.push(request);
  }

  @GetMapping("/pull")
  @PreAuthorize("hasAuthority('sync:push')")
  public List<SyncEventResponse> pull(
      @RequestParam(required = false) OffsetDateTime after,
      @RequestParam(defaultValue = "100") int limit) {
    return syncUseCase.pull(after, limit);
  }

  @PostMapping("/reconcile")
  @PreAuthorize("hasAuthority('sync:reconcile')")
  public List<SyncEventResponse> reconcile(@Valid @RequestBody SyncReconcileRequest request) {
    return syncUseCase.reconcile(request);
  }
}
