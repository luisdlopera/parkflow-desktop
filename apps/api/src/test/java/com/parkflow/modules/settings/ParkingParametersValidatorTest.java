package com.parkflow.modules.settings;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.settings.dto.ParkingParametersData;
import com.parkflow.modules.settings.service.ParkingParametersValidator;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class ParkingParametersValidatorTest {

  @Test
  void rejectsNullPayload() {
    List<String> e = ParkingParametersValidator.validate(null);
    assertThat(e).isNotEmpty();
  }

  @Test
  void rejectsMissingRequiredFields() {
    ParkingParametersData d = new ParkingParametersData();
    List<String> e = ParkingParametersValidator.validate(d);
    assertThat(e)
        .anyMatch(s -> s.contains("nombre"))
        .anyMatch(s -> s.contains("moneda"))
        .anyMatch(s -> s.contains("zona horaria"));
  }

  @Test
  void rejectsInvalidPaperWidth() {
    ParkingParametersData d = fullValid();
    d.setDefaultPaperWidthMm(100);
    assertThat(ParkingParametersValidator.validate(d))
        .anyMatch(s -> s.toLowerCase().contains("ancho"));
  }

  @Test
  void rejectsPrinterWithoutPaperWidth() {
    ParkingParametersData d = fullValid();
    d.setDefaultPaperWidthMm(null);
    d.setDefaultPrinterName("USB001");
    assertThat(ParkingParametersValidator.validate(d))
        .anyMatch(s -> s.toLowerCase().contains("ancho"));
  }

  @Test
  void rejectsUnknownLostTicketPolicy() {
    ParkingParametersData d = fullValid();
    d.setLostTicketPolicy("INVALID");
    assertThat(ParkingParametersValidator.validate(d))
        .anyMatch(s -> s.toLowerCase().contains("ticket perdido"));
  }

  @Test
  void rejectsReprintWithZeroMax() {
    ParkingParametersData d = fullValid();
    d.setAllowReprint(true);
    d.setMaxReprints(0);
    assertThat(ParkingParametersValidator.validate(d))
        .anyMatch(s -> s.toLowerCase().contains("reimpres"));
  }

  @Test
  void rejectsInvalidBrandingAndTaxSettings() {
    ParkingParametersData d = fullValid();
    d.setLogoUrl("ftp://logo.png");
    d.setBrandColor("orange");
    d.setTaxRatePercent(new BigDecimal("101"));

    assertThat(ParkingParametersValidator.validate(d))
        .anyMatch(s -> s.toLowerCase().contains("logo"))
        .anyMatch(s -> s.toLowerCase().contains("marca"))
        .anyMatch(s -> s.toLowerCase().contains("impuesto"));
  }

  @Test
  void acceptsTicketMessagesAndOperationRules() {
    ParkingParametersData d = fullValid();
    d.setLogoUrl("https://example.com/logo.png");
    d.setBrandColor("#F97316");
    d.setTaxName("IVA");
    d.setTaxRatePercent(new BigDecimal("19"));
    d.setPricesIncludeTax(true);
    d.setTicketHeaderMessage("Bienvenido");
    d.setTicketLegalMessage("Contrato de parqueadero");
    d.setTicketFooterMessage("Gracias por su visita");
    d.setOperationRulesMessage("Conserve su ticket.");

    assertThat(ParkingParametersValidator.validate(d)).isEmpty();
  }

  private static ParkingParametersData fullValid() {
    ParkingParametersData d = new ParkingParametersData();
    d.setParkingName("Test");
    d.setCurrency("COP");
    d.setTimeZone("America/Bogota");
    d.setDefaultPaperWidthMm(80);
    d.setAllowReprint(false);
    return d;
  }
}
