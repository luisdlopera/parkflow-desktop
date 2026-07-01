package com.parkflow.modules.communication.infrastructure.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

@Builder
public record CommunicationStatsResponse(
    @JsonProperty("emailsSent") long emailsSent,
    @JsonProperty("smsSent") long smsSent,
    @JsonProperty("bulkEmailsSent") long bulkEmailsSent,
    @JsonProperty("lastEmailSentAt") String lastEmailSentAt,
    @JsonProperty("lastSmsSentAt") String lastSmsSentAt,
    @JsonProperty("lastBulkEmailSentAt") String lastBulkEmailSentAt,
    @JsonProperty("emailFailures") long emailFailures,
    @JsonProperty("smsFailures") long smsFailures,
    @JsonProperty("bulkEmailFailures") long bulkEmailFailures
) {
}
