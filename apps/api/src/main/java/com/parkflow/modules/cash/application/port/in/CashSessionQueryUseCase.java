package com.parkflow.modules.cash.application.port.in;

import com.parkflow.modules.cash.dto.CashSessionResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface CashSessionQueryUseCase {
    CashSessionResponse getSession(UUID sessionId);
    CashSessionResponse getCurrent(String site, String terminal);
    Page<CashSessionResponse> listSessions(Pageable pageable);
}
