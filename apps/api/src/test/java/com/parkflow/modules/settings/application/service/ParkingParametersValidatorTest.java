package com.parkflow.modules.settings.application.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.common.dto.ParkingParametersData;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class ParkingParametersValidatorTest {

  @Test
  void validate_NullPayload() {
    List<String> errors = ParkingParametersValidator.validate(null);
    assertThat(errors).contains("payload requerido");
  }

  @Test
  void validate_MissingRequiredFields() {
    ParkingParametersData data = new ParkingParametersData();
    List<String> errors = ParkingParametersValidator.validate(data);
    assertThat(errors).contains(
        "nombre del parqueadero es obligatorio",
        "moneda es obligatoria",
        "zona horaria es obligatoria");
  }

  @Test
  void validate_ValidPayload() {
    ParkingParametersData data = new ParkingParametersData();
    data.setParkingName("Test Parking");
    data.setCurrency("COP");
    data.setTimeZone("America/Bogota");
    
    List<String> errors = ParkingParametersValidator.validate(data);
    assertThat(errors).isEmpty();
  }

  @Test
  void validate_LogoUrlInvalid() {
    ParkingParametersData data = new ParkingParametersData();
    data.setParkingName("P"); data.setCurrency("COP"); data.setTimeZone("TZ");
    
    data.setLogoUrl("ftp://logo.png");
    assertThat(ParkingParametersValidator.validate(data)).contains("logo debe iniciar en http(s):// o data:image/");
    
    data.setLogoUrl("http://logo.png");
    assertThat(ParkingParametersValidator.validate(data)).isEmpty();
    
    data.setLogoUrl("data:image/png;base64,...");
    assertThat(ParkingParametersValidator.validate(data)).isEmpty();

    data.setLogoUrl("A".repeat(501));
    assertThat(ParkingParametersValidator.validate(data)).contains("URL de logo demasiado larga");
  }

  @Test
  void validate_BrandColorInvalid() {
    ParkingParametersData data = new ParkingParametersData();
    data.setParkingName("P"); data.setCurrency("COP"); data.setTimeZone("TZ");
    
    data.setBrandColor("red");
    assertThat(ParkingParametersValidator.validate(data)).contains("color de marca debe ser hexadecimal, ej. #F97316");

    data.setBrandColor("#F97316");
    assertThat(ParkingParametersValidator.validate(data)).isEmpty();
  }

  @Test
  void validate_TaxInvalid() {
    ParkingParametersData data = new ParkingParametersData();
    data.setParkingName("P"); data.setCurrency("COP"); data.setTimeZone("TZ");
    
    data.setTaxName("A".repeat(41));
    assertThat(ParkingParametersValidator.validate(data)).contains("nombre de impuesto maximo 40 caracteres");
    
    data.setTaxRatePercent(new BigDecimal("-1"));
    assertThat(ParkingParametersValidator.validate(data)).contains("porcentaje de impuesto debe estar entre 0 y 100");

    data.setTaxRatePercent(new BigDecimal("101"));
    assertThat(ParkingParametersValidator.validate(data)).contains("porcentaje de impuesto debe estar entre 0 y 100");
  }

  @Test
  void validate_LostTicketPolicy() {
    ParkingParametersData data = new ParkingParametersData();
    data.setParkingName("P"); data.setCurrency("COP"); data.setTimeZone("TZ");
    
    data.setLostTicketPolicy("INVALID_POLICY");
    assertThat(ParkingParametersValidator.validate(data)).contains("politica de ticket perdido invalida; use: SURCHARGE_RATE, BLOCK_EXIT o SUPERVISOR_ONLY");

    data.setLostTicketPolicy("SURCHARGE_RATE");
    assertThat(ParkingParametersValidator.validate(data)).isEmpty();
  }

  @Test
  void validate_NumericLimits() {
    ParkingParametersData data = new ParkingParametersData();
    data.setParkingName("P"); data.setCurrency("COP"); data.setTimeZone("TZ");
    
    data.setGraceMinutesDefault(-1);
    assertThat(ParkingParametersValidator.validate(data)).contains("minutos de gracia no pueden ser negativos");

    data.setMaxReprints(-1);
    assertThat(ParkingParametersValidator.validate(data)).contains("maximo de reimpresiones invalido");

    data.setSyncIntervalSeconds(9);
    assertThat(ParkingParametersValidator.validate(data)).contains("intervalo de sincronizacion debe ser al menos 10 segundos");

    data.setPrintTimeoutSeconds(0);
    assertThat(ParkingParametersValidator.validate(data)).contains("tiempo de espera de impresion invalido");
  }

  @Test
  void validate_TextLengths() {
    ParkingParametersData data = new ParkingParametersData();
    data.setParkingName("P"); data.setCurrency("COP"); data.setTimeZone("TZ");

    data.setTicketHeaderMessage("A".repeat(501));
    assertThat(ParkingParametersValidator.validate(data)).contains("mensaje encabezado ticket maximo 500 caracteres");

    data.setTicketLegalMessage("A".repeat(1001));
    assertThat(ParkingParametersValidator.validate(data)).contains("mensaje legal ticket maximo 1000 caracteres");

    data.setTicketFooterMessage("A".repeat(501));
    assertThat(ParkingParametersValidator.validate(data)).contains("mensaje pie ticket maximo 500 caracteres");

    data.setOperationRulesMessage("A".repeat(1201));
    assertThat(ParkingParametersValidator.validate(data)).contains("reglas de operacion maximo 1200 caracteres");
  }

  @Test
  void validate_PaperWidthAndReprint() {
    ParkingParametersData data = new ParkingParametersData();
    data.setParkingName("P"); data.setCurrency("COP"); data.setTimeZone("TZ");

    data.setDefaultPaperWidthMm(50);
    assertThat(ParkingParametersValidator.validate(data)).contains("ancho de papel debe ser 58, 72 u 80 mm");

    data.setDefaultPaperWidthMm(58);
    assertThat(ParkingParametersValidator.validate(data)).isEmpty();

    data.setAllowReprint(true);
    data.setMaxReprints(0);
    assertThat(ParkingParametersValidator.validate(data)).contains("reimpresion permitida requiere maximo de reimpresiones mayor a 0");

    data.setDefaultPrinterName("Printer1");
    data.setDefaultPaperWidthMm(null);
    assertThat(ParkingParametersValidator.validate(data)).contains("defina ancho de papel cuando hay impresora por defecto");
  }

  @Test
  void validate_DianFields() {
    ParkingParametersData data = new ParkingParametersData();
    data.setParkingName("P"); data.setCurrency("COP"); data.setTimeZone("TZ");

    data.setCashOfflineMaxManualMovement(new BigDecimal("-1"));
    assertThat(ParkingParametersValidator.validate(data)).contains("tope de caja offline no puede ser negativo");

    data.setTaxId("1234567890123456");
    assertThat(ParkingParametersValidator.validate(data)).contains("NIT debe tener como maximo 15 caracteres");

    data.setTaxIdCheckDigit("123");
    assertThat(ParkingParametersValidator.validate(data)).contains("digito verificacion NIT invalido");

    data.setDianResolutionDate("2024/01/01");
    assertThat(ParkingParametersValidator.validate(data)).contains("fecha resolucion DIAN use formato YYYY-MM-DD");

    data.setDianTechnicalKey("A".repeat(501));
    assertThat(ParkingParametersValidator.validate(data)).contains("clave tecnica muy larga (max 500)");

    data.setDianInvoicePrefix("A".repeat(21));
    assertThat(ParkingParametersValidator.validate(data)).contains("prefijo FE maximo 20 caracteres");

    data.setDianResolutionNumber("A".repeat(41));
    assertThat(ParkingParametersValidator.validate(data)).contains("numero resolucion maximo 40 caracteres");

    data.setDianRangeFrom("A".repeat(31));
    assertThat(ParkingParametersValidator.validate(data)).contains("rango inicial invalido");

    data.setDianRangeTo("A".repeat(31));
    assertThat(ParkingParametersValidator.validate(data)).contains("rango final invalido");

    data.setBusinessLegalName("A".repeat(201));
    assertThat(ParkingParametersValidator.validate(data)).contains("razon social maximo 200 caracteres");
  }

  @Test
  void validate_Webhook() {
    ParkingParametersData data = new ParkingParametersData();
    data.setParkingName("P"); data.setCurrency("COP"); data.setTimeZone("TZ");

    data.setCashFeOutboundWebhookBearer("token");
    data.setCashFeOutboundWebhookUrl(null);
    assertThat(ParkingParametersValidator.validate(data)).contains("Bearer webhook requiere URL de webhook");

    data.setCashFeOutboundWebhookUrl("ftp://test");
    assertThat(ParkingParametersValidator.validate(data)).contains("URL webhook debe iniciar en http(s)://");

    data.setCashFeOutboundWebhookUrl("A".repeat(501));
    assertThat(ParkingParametersValidator.validate(data)).contains("URL webhook demasiado larga");

    data.setCashFeOutboundWebhookUrl("http://test");
    data.setCashFeOutboundWebhookBearer("A".repeat(2001));
    assertThat(ParkingParametersValidator.validate(data)).contains("bearer/token webhook demasiado largo");
  }

  @Test
  void validate_Sequential() {
    ParkingParametersData data = new ParkingParametersData();
    data.setParkingName("P"); data.setCurrency("COP"); data.setTimeZone("TZ");

    data.setCashFeSequentialEnabled(true);
    data.setCashFeSequenceDigits(5);
    assertThat(ParkingParametersValidator.validate(data)).contains("digitos correlativo FE soporte debe estar entre 6 y 13");
    
    data.setCashFeSequenceDigits(14);
    assertThat(ParkingParametersValidator.validate(data)).contains("digitos correlativo FE soporte debe estar entre 6 y 13");
    
    data.setCashFeSequenceDigits(8);
    assertThat(ParkingParametersValidator.validate(data)).isEmpty();
  }
}
