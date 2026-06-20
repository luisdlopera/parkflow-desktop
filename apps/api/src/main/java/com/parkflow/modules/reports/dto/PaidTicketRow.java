package com.parkflow.modules.reports.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record PaidTicketRow(
    String ticketNumber,
    String plate,
    String vehicleType,
    BigDecimal amount,
    String paymentMethod,
    OffsetDateTime paidAt,
    OffsetDateTime entryAt) {}
