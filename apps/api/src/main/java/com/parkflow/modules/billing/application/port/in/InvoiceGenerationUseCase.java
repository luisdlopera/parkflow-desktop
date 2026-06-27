package com.parkflow.modules.billing.application.port.in;

import com.parkflow.modules.billing.application.port.InvoiceProviderPort;
import com.parkflow.modules.billing.domain.Invoice;
import com.parkflow.modules.billing.domain.InvoiceItem;
import com.parkflow.modules.billing.domain.InvoiceProviderConfig;
import com.parkflow.modules.billing.domain.InvoiceSyncLog;
import com.parkflow.modules.billing.domain.enums.InvoiceSourceType;
import com.parkflow.modules.billing.domain.enums.InvoiceStatus;
import com.parkflow.modules.billing.application.port.out.InvoicePort;
import com.parkflow.modules.billing.application.port.out.InvoiceSyncLogPort;
import com.parkflow.modules.billing.dto.CreateInvoiceRequest;
import com.parkflow.modules.billing.dto.ExternalInvoiceResult;
import com.parkflow.modules.billing.dto.InvoiceResponse;
import com.parkflow.modules.billing.infrastructure.security.EncryptionService;
import com.parkflow.modules.audit.application.service.CentralizedAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface InvoiceGenerationUseCase {
  InvoiceResponse createManualInvoice(UUID companyId, CreateInvoiceRequest request);
  void requestInvoiceFromPayment(UUID companyId, UUID sessionId, BigDecimal amount, UUID clientId);
  InvoiceResponse cancelInvoice(UUID id, UUID companyId, String reason);
}
