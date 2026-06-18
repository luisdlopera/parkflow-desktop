package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.parking.operation.application.port.out.TicketPrefixPort;
import com.parkflow.modules.parking.operation.domain.TicketCounter;
import com.parkflow.modules.parking.operation.domain.repository.TicketCounterPort;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
class TicketNumberService {

  private final TicketCounterPort ticketCounterRepository;
  private final TicketPrefixPort ticketPrefixPort;

  String next(LocalDate date, Company company) {
    String key = date.format(DateTimeFormatter.BASIC_ISO_DATE);
    TicketCounter counter = ticketCounterRepository.findByIdForUpdate(key)
        .orElseGet(() -> {
          TicketCounter c = new TicketCounter();
          c.setCounterKey(key);
          c.setLastNumber(0);
          c.setCompanyId(company.getId());
          return c;
        });
    counter.setLastNumber(counter.getLastNumber() + 1);
    counter.setUpdatedAt(OffsetDateTime.now());
    ticketCounterRepository.save(counter);
    String prefix = ticketPrefixPort.resolvePrefix(company);
    return prefix + key + "-" + String.format("%06d", counter.getLastNumber());
  }
}
