package com.parkflow.modules.billing.application.port.in;

import com.parkflow.modules.billing.domain.enums.InvoiceStatus;
import com.parkflow.modules.billing.dto.CreateInvoiceRequest;
import com.parkflow.modules.billing.dto.InvoiceDashboardResponse;
import com.parkflow.modules.billing.dto.InvoiceResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.math.BigDecimal;
import java.util.UUID;


public interface InvoiceUseCase {
  InvoiceResponse createManualInvoice(UUID companyId, CreateInvoiceRequest request);
  void requestInvoiceFromPayment(UUID companyId, UUID sessionId, BigDecimal amount, UUID clientId);
  Page<InvoiceResponse> listInvoices(UUID companyId, InvoiceStatus status, String clientName, Pageable pageable);
  InvoiceResponse getInvoice(UUID id, UUID companyId);
  InvoiceResponse cancelInvoice(UUID id, UUID companyId, String reason);
  InvoiceDashboardResponse getDashboard(UUID companyId);
  byte[] getInvoicePdf(UUID invoiceId, UUID companyId);
}
