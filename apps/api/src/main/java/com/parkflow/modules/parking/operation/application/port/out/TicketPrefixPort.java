package com.parkflow.modules.parking.operation.application.port.out;

import com.parkflow.modules.licensing.domain.Company;

public interface TicketPrefixPort {
    String resolvePrefix(Company company);
}
