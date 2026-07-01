package com.parkflow.modules.cash.application.port.in;

import com.parkflow.modules.cash.dto.CashSessionResponse;
import com.parkflow.modules.common.dto.PageResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface CashSessionQueryUseCase {
    CashSessionResponse getSession(UUID sessionId);
    CashSessionResponse getCurrent(String site, String terminal);
    PageResponse<CashSessionResponse> listSessions(Pageable pageable);
}
