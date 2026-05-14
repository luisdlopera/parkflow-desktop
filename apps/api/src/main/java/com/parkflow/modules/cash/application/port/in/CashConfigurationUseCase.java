package com.parkflow.modules.cash.application.port.in;

import com.parkflow.modules.cash.dto.CashClosingPrintResponse;
import com.parkflow.modules.cash.dto.CashPolicyResponse;
import com.parkflow.modules.cash.dto.CashRegisterInfoResponse;

import java.util.List;
import java.util.UUID;

public interface CashConfigurationUseCase {
    CashPolicyResponse getPolicy(String site);
    List<CashRegisterInfoResponse> listRegisters(String site);
    CashClosingPrintResponse printClosing(UUID sessionId);
}
