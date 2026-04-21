package com.parkflow.modules.sync.controller;

import com.parkflow.modules.sync.dto.SyncEventResponse;
import com.parkflow.modules.sync.dto.SyncPushRequest;
import com.parkflow.modules.sync.dto.SyncReconcileRequest;
import com.parkflow.modules.sync.service.SyncService;
import jakarta.validation.Valid;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/sync")
public class SyncController {
  private final SyncService syncService;

  public SyncController(SyncService syncService) {
    this.syncService = syncService;
  }

  @PostMapping("/push")
  public SyncEventResponse push(@Valid @RequestBody SyncPushRequest request) {
    return syncService.push(request);
  }

  @GetMapping("/pull")
  public List<SyncEventResponse> pull(
      @RequestParam(required = false) OffsetDateTime after,
      @RequestParam(defaultValue = "100") int limit) {
    return syncService.pull(after, limit);
  }

  @PostMapping("/reconcile")
  public List<SyncEventResponse> reconcile(@Valid @RequestBody SyncReconcileRequest request) {
    return syncService.reconcile(request);
  }
}
