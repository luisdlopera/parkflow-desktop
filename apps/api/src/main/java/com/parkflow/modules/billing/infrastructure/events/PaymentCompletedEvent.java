package com.parkflow.modules.billing.infrastructure.events;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Published when a parking session payment is completed.
 * Triggers async invoice generation if enabled for the company.
 */
@SuppressWarnings({"serial", "rawtypes", "deprecation", "unchecked", "removal"})
@Getter
public class PaymentCompletedEvent extends ApplicationEvent {

  private final UUID companyId;
  private final UUID sessionId;
  private final UUID clientId;
  private final BigDecimal amount;
  private final String currency;
  private final boolean requestInvoice;

  public PaymentCompletedEvent(
      Object source,
      UUID companyId,
      UUID sessionId,
      UUID clientId,
      BigDecimal amount,
      String currency,
      boolean requestInvoice) {
    super(source);
    this.companyId = companyId;
    this.sessionId = sessionId;
    this.clientId = clientId;
    this.amount = amount;
    this.currency = currency;
    this.requestInvoice = requestInvoice;
  }
}
