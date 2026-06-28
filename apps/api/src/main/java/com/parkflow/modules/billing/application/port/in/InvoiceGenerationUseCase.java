package com.parkflow.modules.billing.application.port.in;

import com.parkflow.modules.billing.dto.CreateInvoiceRequest;
import com.parkflow.modules.billing.dto.InvoiceResponse;
import java.math.BigDecimal;
import java.util.UUID;


public interface InvoiceGenerationUseCase {
  InvoiceResponse createManualInvoice(UUID companyId, CreateInvoiceRequest request);
  void requestInvoiceFromPayment(UUID companyId, UUID sessionId, BigDecimal amount, UUID clientId);
  InvoiceResponse cancelInvoice(UUID id, UUID companyId, String reason);
}
