package com.parkflow.modules.communication.application.usecase;

import com.parkflow.modules.communication.domain.repository.CommunicationSettingsPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.Map;
import java.util.HashMap;

@Service
@RequiredArgsConstructor
public class CommunicationStatsUseCase {

    private final CommunicationSettingsPort port;

    @Transactional(readOnly = true)
    public Map<String, Object> getStats(UUID companyId) {
        // Mocked implementation for now as the query requires joining logs.
        Map<String, Object> stats = new HashMap<>();
        stats.put("emailsSentToday", 0);
        stats.put("emailsFailedToday", 0);
        stats.put("smsSentToday", 0);
        stats.put("smsFailedToday", 0);
        stats.put("bulkSentToday", 0);
        return stats;
    }
}
