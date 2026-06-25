package com.parkflow.modules.billing.infrastructure.providers.alegra;

import com.parkflow.modules.billing.domain.Invoice;
import com.parkflow.modules.billing.domain.InvoiceItem;
import com.parkflow.modules.billing.domain.InvoiceProviderConfig;
import com.parkflow.modules.billing.dto.BillingCustomerDto;
import com.parkflow.modules.billing.infrastructure.providers.alegra.dto.AlegraContactDto;
import com.parkflow.modules.billing.infrastructure.providers.alegra.dto.AlegraInvoiceDto;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class AlegraMapper {

  private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

  public AlegraInvoiceDto toAlegraInvoice(Invoice invoice, String alegraContactId, InvoiceProviderConfig config) {
    List<AlegraInvoiceDto.ItemDto> items = invoice.getItems().stream()
        .map(this::toAlegraItem)
        .collect(Collectors.toList());

    return AlegraInvoiceDto.builder()
        .client(AlegraInvoiceDto.ClientRef.builder().id(alegraContactId).build())
        .items(items)
        .dueDate(invoice.getDueDate() != null ? invoice.getDueDate().format(DATE_FMT) : null)
        .currency(AlegraInvoiceDto.CurrencyDto.builder()
            .code(invoice.getCurrency())
            .exchangeRate(BigDecimal.ONE)
            .build())
        .build();
  }

  public AlegraContactDto toAlegraContact(BillingCustomerDto customer) {
    return AlegraContactDto.builder()
        .name(customer.getName())
        .email(customer.getEmail())
        .phonePrimary(customer.getPhone())
        .identification(customer.getDocument())
        .identificationObject(AlegraContactDto.IdentificationObject.builder()
            .type(customer.getDocumentType() != null ? customer.getDocumentType() : "NIT")
            .number(customer.getDocument())
            .build())
        .build();
  }

  private AlegraInvoiceDto.ItemDto toAlegraItem(InvoiceItem item) {
    return AlegraInvoiceDto.ItemDto.builder()
        .name(item.getDescription())
        .quantity(item.getQuantity())
        .price(item.getUnitPrice())
        .tax(List.of())
        .build();
  }
}
