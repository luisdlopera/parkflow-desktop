package com.parkflow.modules.billing.infrastructure.events;

import com.parkflow.modules.billing.application.service.InvoiceGenerationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Listens to domain events and triggers async invoice generation.
 * Invoice generation never blocks the main parking/payment flow.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class InvoiceEventListener {

  private final InvoiceGenerationService invoiceGenerationService;

  /**
   * Trigger invoice when a parking payment is completed.
   * Published from parking.operation module when session is closed.
   */
  @EventListener
  public void onPaymentCompleted(PaymentCompletedEvent event) {
    log.info("[Billing] PaymentCompletedEvent received: session={} company={} amount={}",
        event.getSessionId(), event.getCompanyId(), event.getAmount());

    if (event.isRequestInvoice()) {
      invoiceGenerationService.requestInvoiceFromPayment(
          event.getCompanyId(),
          event.getSessionId(),
          event.getAmount(),
          event.getClientId()
      );
    }
  }
}
