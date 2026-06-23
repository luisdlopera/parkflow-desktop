package com.parkflow.modules.settings.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.common.dto.ParametersValidateResponse;
import com.parkflow.modules.common.dto.ParkingParametersData;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.settings.domain.ParkingParameters;
import com.parkflow.modules.settings.domain.repository.ParkingParametersPort;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ParkingParametersServiceTest {

  @Mock private ParkingParametersPort repo;
  @Mock private SettingsAuditService settingsAuditService;
  @Mock private AuditPort globalAuditService;

  private ParkingParametersService service;

  @BeforeEach
  void setUp() {
    service = new ParkingParametersService(repo, settingsAuditService, new ObjectMapper(),
        globalAuditService);
  }

  @Test
  void get_returnsDefaultsWhenMissing() {
    when(repo.findBySiteCode("DEFAULT")).thenReturn(Optional.empty());
    ParkingParametersData data = service.get(null);
    assertThat(data.getParkingName()).isEqualTo("Parkflow");
    assertThat(data.getCurrency()).isEqualTo("COP");
  }

  @Test
  void get_returnsStoredData() {
    ParkingParameters row = new ParkingParameters();
    ParkingParametersData stored = new ParkingParametersData();
    stored.setParkingName("Custom");
    row.setData(stored);
    when(repo.findBySiteCode("SUR")).thenReturn(Optional.of(row));
    assertThat(service.get(" SUR ").getParkingName()).isEqualTo("Custom");
  }

  @Test
  void validate_returnsErrorsForInvalid() {
    ParkingParametersData invalid = new ParkingParametersData();
    ParametersValidateResponse resp = service.validate(invalid);
    assertThat(resp.ok()).isFalse();
    assertThat(resp.errors()).isNotEmpty();
  }

  @Test
  void validate_returnsValidForGoodData() {
    ParametersValidateResponse resp = service.validate(fullValid());
    assertThat(resp.ok()).isTrue();
  }

  @Test
  void put_createsNewAndMergesAllFields() {
    when(repo.findBySiteCode("DEFAULT")).thenReturn(Optional.empty());
    when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

    ParkingParametersData result = service.put(null, fullValid());

    assertThat(result.getParkingName()).isEqualTo("Mi Parqueadero");
    assertThat(result.getBusinessLegalName()).isEqualTo("Mi Parqueadero SAS");
    assertThat(result.getDianResolutionNumber()).isEqualTo("18760");
    verify(settingsAuditService).log(any(), any(), any());
    verify(globalAuditService).record(any(), any(), any(), any());
  }

  @Test
  void put_updatesExisting() {
    ParkingParameters row = new ParkingParameters();
    row.setData(service.get(null)); // defaults as existing
    when(repo.findBySiteCode("DEFAULT")).thenReturn(Optional.of(row));
    when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

    ParkingParametersData incoming = new ParkingParametersData();
    incoming.setParkingName("Nuevo Nombre");
    ParkingParametersData result = service.put("DEFAULT", incoming);

    assertThat(result.getParkingName()).isEqualTo("Nuevo Nombre");
    assertThat(result.getCurrency()).isEqualTo("COP"); // preserved from defaults
  }

  @Test
  void put_throwsWhenMergedInvalid() {
    when(repo.findBySiteCode("DEFAULT")).thenReturn(Optional.empty());
    ParkingParametersData incoming = new ParkingParametersData();
    incoming.setBrandColor("not-a-color");
    assertThatThrownBy(() -> service.put(null, incoming))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("color de marca");
  }

  @Test
  void reset_restoresDefaults() {
    ParkingParameters row = new ParkingParameters();
    ParkingParametersData stored = new ParkingParametersData();
    stored.setParkingName("Old");
    row.setData(stored);
    when(repo.findBySiteCode("DEFAULT")).thenReturn(Optional.of(row));
    when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

    ParkingParametersData result = service.reset(null);

    assertThat(result.getParkingName()).isEqualTo("Parkflow");
    verify(settingsAuditService).log(any(), any(), any());
  }

  @Test
  void reset_createsRowWhenMissing() {
    when(repo.findBySiteCode("SUR")).thenReturn(Optional.empty());
    when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
    ParkingParametersData result = service.reset("SUR");
    assertThat(result.getParkingName()).isEqualTo("Parkflow");
  }

  private ParkingParametersData fullValid() {
    ParkingParametersData d = new ParkingParametersData();
    d.setParkingName("Mi Parqueadero");
    d.setTaxId("900123456");
    d.setAddress("Calle 1");
    d.setPhone("3001234567");
    d.setSiteLabel("SUR");
    d.setCurrency("COP");
    d.setTimeZone("America/Bogota");
    d.setLogoUrl("https://example.com/logo.png");
    d.setBrandColor("#F97316");
    d.setTaxName("IVA");
    d.setTaxRatePercent(new BigDecimal("19"));
    d.setPricesIncludeTax(true);
    d.setGraceMinutesDefault(10);
    d.setLostTicketPolicy("BLOCK_EXIT");
    d.setAllowReprint(true);
    d.setMaxReprints(2);
    d.setTicketPrefix("PF");
    d.setTicketFormat("STANDARD");
    d.setDefaultPaperWidthMm(80);
    d.setDefaultPrinterName("EPSON");
    d.setOfflineModeEnabled(true);
    d.setSyncIntervalSeconds(120);
    d.setPrintTimeoutSeconds(30);
    d.setTicketHeaderMessage("Bienvenido");
    d.setTicketLegalMessage("Legal");
    d.setTicketFooterMessage("Gracias");
    d.setOperationRulesMessage("Reglas");
    d.setQrConfig("PLATE_AND_ENTRY_TIME");
    d.setManualExitAllowed(true);
    d.setAllowOfflineEntryExit(true);
    d.setPrintExitTicket(true);
    d.setCashRequireOpenForPayment(true);
    d.setCashOfflineCloseAllowed(false);
    d.setCashOfflineMaxManualMovement(new BigDecimal("50000"));
    d.setBusinessLegalName("Mi Parqueadero SAS");
    d.setTaxIdCheckDigit("7");
    d.setDianInvoicePrefix("FE");
    d.setDianResolutionNumber("18760");
    d.setDianResolutionDate("2026-01-01");
    d.setDianRangeFrom("1");
    d.setDianRangeTo("1000");
    d.setDianTechnicalKey("KEY");
    d.setCashFeSequentialEnabled(true);
    d.setCashFeSequencePerTerminal(true);
    d.setCashFeSequenceDigits(8);
    d.setCashFeOutboundWebhookUrl("https://hook.example.com");
    d.setCashFeOutboundWebhookBearer("token");
    return d;
  }
}
