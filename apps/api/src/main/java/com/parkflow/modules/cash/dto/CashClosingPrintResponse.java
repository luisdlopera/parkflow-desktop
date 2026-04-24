package com.parkflow.modules.cash.dto;

import java.util.List;
import java.util.Map;

/** Payload alineado con TicketDocument + detailLines en el cliente. */
public record CashClosingPrintResponse(
    String documentType,
    Map<String, Object> ticketDocument,
    List<String> previewLines) {}
