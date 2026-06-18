package com.parkflow.modules.parking.operation.infrastructure.persistence;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.onboarding.application.service.CompanySettingsService;
import com.parkflow.modules.parking.operation.application.port.out.TicketPrefixPort;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class CompanySettingsTicketPrefixAdapter implements TicketPrefixPort {

  private final CompanySettingsService companySettingsService;

  @Override
  public String resolvePrefix(Company company) {
    try {
      Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
      Object tickets = settings.get("tickets");
      if (tickets instanceof Map<?, ?> ticketsMap) {
        Object prefix = ticketsMap.get("ticketPrefix");
        if (prefix != null && !String.valueOf(prefix).isBlank()) {
          return String.valueOf(prefix);
        }
      }
      Object opConfig = settings.get("operationConfiguration");
      if (opConfig instanceof Map<?, ?> opMap) {
        Object prefix = opMap.get("ticketPrefix");
        if (prefix != null && !String.valueOf(prefix).isBlank()) {
          return String.valueOf(prefix);
        }
      }
    } catch (RuntimeException e) {
      log.warn("Could not resolve ticket prefix for company {}, using default. Reason: {}",
          company.getId(), e.getMessage());
    }
    return "T-";
  }
}
