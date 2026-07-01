package com.parkflow.modules.billing.application.port.in;

import com.parkflow.modules.billing.domain.enums.InvoiceStatus;
import com.parkflow.modules.billing.dto.InvoiceDashboardResponse;
import com.parkflow.modules.billing.dto.InvoiceResponse;
import com.parkflow.modules.common.dto.PageResponse;
import org.springframework.data.domain.Pageable;
import java.util.UUID;


public interface InvoiceQueryUseCase {
  PageResponse<InvoiceResponse> listInvoices(UUID companyId, InvoiceStatus status, String clientName, Pageable pageable);
  InvoiceResponse getInvoice(UUID id, UUID companyId);
  InvoiceDashboardResponse getDashboard(UUID companyId);
  byte[] getInvoicePdf(UUID invoiceId, UUID companyId);
}
