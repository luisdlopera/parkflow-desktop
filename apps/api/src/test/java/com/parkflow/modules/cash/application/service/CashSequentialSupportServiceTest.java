package com.parkflow.modules.cash.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.cash.domain.CashFeSequenceCounter;
import com.parkflow.modules.cash.repository.CashFeSequenceCounterRepository;
import com.parkflow.modules.common.dto.ParkingParametersData;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

@ExtendWith(MockitoExtension.class)
class CashSequentialSupportServiceTest {

  @Mock private CashFeSequenceCounterRepository sequenceRepository;

  @InjectMocks private CashSequentialSupportService service;

  @Test
  void allocateIfEnabled_ShouldReturnNullWhenParamsNull() {
    assertThat(service.allocateIfEnabled(null, "SiteA", "Term1")).isNull();
  }

  @Test
  void allocateIfEnabled_ShouldReturnNullWhenDisabled() {
    ParkingParametersData params = new ParkingParametersData();
    params.setCashFeSequentialEnabled(false);
    assertThat(service.allocateIfEnabled(params, "SiteA", "Term1")).isNull();
  }

  @Test
  void allocateIfEnabled_ShouldReturnNullWhenSiteEmpty() {
    ParkingParametersData params = new ParkingParametersData();
    params.setCashFeSequentialEnabled(true);
    assertThat(service.allocateIfEnabled(params, "", "Term1")).isNull();
    assertThat(service.allocateIfEnabled(params, null, "Term1")).isNull();
  }

  @Test
  void allocateIfEnabled_ShouldFormatSequenceWithPrefix() {
    // Arrange
    ParkingParametersData params = new ParkingParametersData();
    params.setCashFeSequentialEnabled(true);
    params.setCashFeSequenceDigits(6);
    params.setDianInvoicePrefix("INV");
    params.setCashFeSequencePerTerminal(false); // only by site

    CashFeSequenceCounter counter = new CashFeSequenceCounter();
    counter.setSiteCode("SiteA");
    counter.setTerminal("");
    counter.setLastValue(42L); // next will be 43

    when(sequenceRepository.lockBySiteAndTerminal("SiteA", "")).thenReturn(Optional.of(counter));

    // Act
    String sequence = service.allocateIfEnabled(params, "SiteA", "Term1");

    // Assert
    assertThat(sequence).isEqualTo("INV-000043");
    verify(sequenceRepository).save(counter);
    assertThat(counter.getLastValue()).isEqualTo(43L);
  }

  @Test
  void allocateIfEnabled_ShouldFormatSequenceWithoutPrefix() {
    // Arrange
    ParkingParametersData params = new ParkingParametersData();
    params.setCashFeSequentialEnabled(true);
    params.setCashFeSequenceDigits(8);
    params.setCashFeSequencePerTerminal(true);

    CashFeSequenceCounter counter = new CashFeSequenceCounter();
    counter.setSiteCode("SiteA");
    counter.setTerminal("Term1");
    counter.setLastValue(999L); // next will be 1000

    when(sequenceRepository.lockBySiteAndTerminal("SiteA", "Term1")).thenReturn(Optional.of(counter));

    // Act
    String sequence = service.allocateIfEnabled(params, "SiteA", "Term1");

    // Assert
    assertThat(sequence).isEqualTo("00001000"); // 8 digits
  }

  @Test
  void allocateIfEnabled_ShouldCreateNewbornIfNotFound() {
    // Arrange
    ParkingParametersData params = new ParkingParametersData();
    params.setCashFeSequentialEnabled(true);

    when(sequenceRepository.lockBySiteAndTerminal("SiteA", "")).thenReturn(Optional.empty());

    CashFeSequenceCounter savedCounter = new CashFeSequenceCounter();
    savedCounter.setSiteCode("SiteA");
    savedCounter.setTerminal("");
    savedCounter.setLastValue(0L);

    when(sequenceRepository.saveAndFlush(any(CashFeSequenceCounter.class))).thenReturn(savedCounter);

    // Act
    String sequence = service.allocateIfEnabled(params, "SiteA", "");

    // Assert
    assertThat(sequence).isEqualTo("00000001"); // default 8 digits, starts at 1
  }

  @Test
  void allocateIfEnabled_ShouldHandleDataIntegrityViolationAndRetry() {
    // Arrange
    ParkingParametersData params = new ParkingParametersData();
    params.setCashFeSequentialEnabled(true);

    when(sequenceRepository.lockBySiteAndTerminal("SiteA", ""))
        .thenReturn(Optional.empty()) // First attempt fails to find
        .thenReturn(Optional.of(CashFeSequenceCounter.newBlank("SiteA", ""))); // Second attempt finds it

    when(sequenceRepository.saveAndFlush(any(CashFeSequenceCounter.class)))
        .thenThrow(new DataIntegrityViolationException("Duplicate"));

    // Act
    String sequence = service.allocateIfEnabled(params, "SiteA", "");

    // Assert
    assertThat(sequence).isEqualTo("00000001");
  }

  @Test
  void allocateIfEnabled_ShouldThrowExceptionIfRetryFails() {
    // Arrange
    ParkingParametersData params = new ParkingParametersData();
    params.setCashFeSequentialEnabled(true);

    when(sequenceRepository.lockBySiteAndTerminal("SiteA", ""))
        .thenReturn(Optional.empty()) // First attempt fails
        .thenReturn(Optional.empty()); // Second attempt fails

    when(sequenceRepository.saveAndFlush(any(CashFeSequenceCounter.class)))
        .thenThrow(new DataIntegrityViolationException("Duplicate"));

    // Act & Assert
    assertThatThrownBy(() -> service.allocateIfEnabled(params, "SiteA", ""))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("No se inicializo correlativo");
  }
}
