package com.parkflow.modules.reports.dto;

import java.math.BigDecimal;

public record DailyOpsRow(
    String date,
    long entries,
    long exits,
    long lostTickets,
    BigDecimal cashTotal,
    BigDecimal cardTotal,
    BigDecimal transferTotal,
    BigDecimal otherTotal,
    BigDecimal grandTotal) {}
