package com.parkflow.modules.billing.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
public class InvoiceDashboardResponse {
  long totalIssued;
  long pendingDian;
  long rejected;
  long cancelled;
  BigDecimal totalAmountMonth;
  String currency;
}
