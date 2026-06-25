package com.parkflow.modules.billing.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ProviderHealthResult {
  boolean healthy;
  String message;
  String providerVersion;

  public static ProviderHealthResult ok(String message) {
    return ProviderHealthResult.builder().healthy(true).message(message).build();
  }

  public static ProviderHealthResult fail(String message) {
    return ProviderHealthResult.builder().healthy(false).message(message).build();
  }
}
