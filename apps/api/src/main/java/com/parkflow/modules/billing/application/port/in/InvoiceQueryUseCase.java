package com.parkflow.modules.billing.application.port.in;

import com.parkflow.modules.billing.application.port.InvoiceProviderPort;
import com.parkflow.modules.billing.domain.Invoice;
import com.parkflow.modules.billing.domain.InvoiceProviderConfig;
import com.parkflow.modules.billing.domain.enums.InvoiceStatus;
import com.parkflow.modules.billing.application.port.out.InvoicePort;
import com.parkflow.modules.billing.dto.InvoiceDashboardResponse;
import com.parkflow.modules.billing.dto.InvoiceResponse;
import com.parkflow.modules.billing.infrastructure.security.EncryptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

public interface InvoiceQueryUseCase {
  Page<InvoiceResponse> listInvoices(UUID companyId, InvoiceStatus status, String clientName, Pageable pageable);
  InvoiceResponse getInvoice(UUID id, UUID companyId);
  InvoiceDashboardResponse getDashboard(UUID companyId);
  byte[] getInvoicePdf(UUID invoiceId, UUID companyId);
}
