package com.parkflow.modules.sync.application.port.in;

import com.parkflow.modules.sync.dto.SyncEventResponse;
import com.parkflow.modules.sync.dto.SyncPushRequest;
import com.parkflow.modules.sync.dto.SyncReconcileRequest;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.lang.Nullable;

public interface SyncUseCase {
    SyncEventResponse push(SyncPushRequest request);
    List<SyncEventResponse> pull(@Nullable OffsetDateTime after, int limit);
    List<SyncEventResponse> reconcile(SyncReconcileRequest request);
}
