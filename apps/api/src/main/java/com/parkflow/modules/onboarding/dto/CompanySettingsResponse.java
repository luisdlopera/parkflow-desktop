package com.parkflow.modules.onboarding.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import java.util.Map;

@Builder
public record CompanySettingsResponse(
    @JsonProperty("companyId") String companyId,
    @JsonProperty("companyName") String companyName,
    @JsonProperty("status") String status,
    @JsonProperty("country") String country,
    @JsonProperty("timezone") String timezone,
    @JsonProperty("currency") String currency,
    @JsonProperty("language") String language,
    @JsonProperty("features") Map<String, Boolean> features,
    @JsonProperty("modules") Map<String, Boolean> modules,
    @JsonProperty("customSettings") Map<String, Object> customSettings
) {
}
