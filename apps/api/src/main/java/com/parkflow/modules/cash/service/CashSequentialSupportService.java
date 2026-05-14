package com.parkflow.modules.cash.service;

import com.parkflow.modules.cash.domain.CashFeSequenceCounter;
import com.parkflow.modules.cash.repository.CashFeSequenceCounterRepository;
import com.parkflow.modules.settings.dto.ParkingParametersData;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Consecutivos soporte PSC / DIAN parametrizacion (sin CUFE automatizado hasta PSC).
 */
@Service
@RequiredArgsConstructor
public class CashSequentialSupportService {

  private static final Pattern NORMALIZE_WS = Pattern.compile("\\s+");
  private final CashFeSequenceCounterRepository sequenceRepository;

  @Transactional
  public String allocateIfEnabled(
      ParkingParametersData params,
      String siteKeyFromParametersRow,
      String registerTerminalRaw) {

    if (params == null || !Boolean.TRUE.equals(params.getCashFeSequentialEnabled())) {
      return null;
    }

    if (!StringUtils.hasText(siteKeyFromParametersRow)) {
      return null;
    }

    int digits =
        clampDigits(params.getCashFeSequenceDigits() != null ? params.getCashFeSequenceDigits() : 8);

    boolean perTerm = Boolean.TRUE.equals(params.getCashFeSequencePerTerminal());
    String terminalKey =
        perTerm && StringUtils.hasText(registerTerminalRaw)
            ? NORMALIZE_WS.matcher(registerTerminalRaw.trim()).replaceAll(" ")
            : "";

    String siteNormalized = NORMALIZE_WS.matcher(siteKeyFromParametersRow.trim()).replaceAll(" ");

    CashFeSequenceCounter row = resolveRowWithLock(siteNormalized, terminalKey);

    row.setLastValue(row.getLastValue() + 1);
    sequenceRepository.save(row);

    long n = row.getLastValue();
    String padded = String.format(Locale.ROOT, "%0" + digits + "d", n);

    String prefix =
        params.getDianInvoicePrefix() != null ? params.getDianInvoicePrefix().trim() : "";
    if (!StringUtils.hasText(prefix)) {
      return padded;
    }
    return prefix + "-" + padded;
  }

  private CashFeSequenceCounter resolveRowWithLock(String siteNormalized, String terminalKey) {

    Optional<CashFeSequenceCounter> first = sequenceRepository.lockBySiteAndTerminal(siteNormalized, terminalKey);
    if (first.isPresent()) {
      return first.get();
    }

    CashFeSequenceCounter newborn = CashFeSequenceCounter.newBlank(siteNormalized, terminalKey);

    try {
      return sequenceRepository.saveAndFlush(newborn);
    } catch (DataIntegrityViolationException e) {

      return sequenceRepository
          .lockBySiteAndTerminal(siteNormalized, terminalKey)
          .orElseThrow(() -> new IllegalStateException("No se inicializo correlativo FE soporte para sede"));
    }

  }

  private static int clampDigits(Integer d) {
    if (d == null) {
      return 8;
    }
    return Math.min(13, Math.max(6, d));
  }
}
