package com.parkflow.modules.cash.application.port.in;

import com.parkflow.modules.cash.dto.CashSessionResponse;
import com.parkflow.modules.cash.dto.OpenCashRequest;
import com.parkflow.modules.cash.dto.CashCloseRequest;
import com.parkflow.modules.cash.dto.CashCountRequest;

import java.util.UUID;

public interface CashSessionManagementUseCase {
    CashSessionResponse open(OpenCashRequest request);
    CashSessionResponse submitCount(UUID sessionId, CashCountRequest request);
    CashSessionResponse close(UUID sessionId, CashCloseRequest request);
}
