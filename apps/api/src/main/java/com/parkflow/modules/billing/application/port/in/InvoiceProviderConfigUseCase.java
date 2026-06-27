package com.parkflow.modules.billing.application.port.in;

import com.parkflow.modules.billing.application.port.InvoiceProviderPort;
import com.parkflow.modules.billing.domain.InvoiceProviderConfig;
import com.parkflow.modules.billing.application.port.out.InvoiceProviderConfigPort;
import com.parkflow.modules.billing.dto.InvoiceProviderConfigRequest;
import com.parkflow.modules.billing.dto.InvoiceProviderConfigResponse;
import com.parkflow.modules.billing.dto.ProviderHealthResult;
import com.parkflow.modules.billing.infrastructure.security.EncryptionService;
import com.parkflow.modules.billing.infrastructure.validation.DIANResolutionValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

public interface InvoiceProviderConfigUseCase {
  InvoiceProviderConfigResponse createOrUpdate(UUID companyId, InvoiceProviderConfigRequest request);
  List<InvoiceProviderConfigResponse> listForCompany(UUID companyId);
  void deactivate(UUID id, UUID companyId);
  ProviderHealthResult testConnection(UUID id, UUID companyId);
}
