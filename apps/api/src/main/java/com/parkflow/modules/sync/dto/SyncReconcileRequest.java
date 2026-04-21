package com.parkflow.modules.sync.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

public record SyncReconcileRequest(@NotEmpty List<UUID> eventIds) {}
