package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.configuration.domain.Rate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;

public final class RateApplicability {
  private RateApplicability() {}

  /**
   * Whether an active rate applies at {@code at} in zone {@code zone} (franja horaria diaria +
   * vigencia programada opcional).
   */
  public static boolean isApplicable(Rate r, OffsetDateTime at, ZoneId zone) {
    if (r == null || at == null || zone == null) {
      return false;
    }
    if (!r.isActive()) {
      return false;
    }
    if (r.getScheduledActiveFrom() != null && at.isBefore(r.getScheduledActiveFrom())) {
      return false;
    }
    if (r.getScheduledActiveTo() != null && at.isAfter(r.getScheduledActiveTo())) {
      return false;
    }
    if (r.getWindowStart() != null && r.getWindowEnd() != null) {
      LocalTime lt = at.atZoneSameInstant(zone).toLocalTime();
      int s = r.getWindowStart().toSecondOfDay();
      int e = r.getWindowEnd().toSecondOfDay();
      int c = lt.toSecondOfDay();
      if (c < s || c >= e) {
        return false;
      }
    }
    return true;
  }
}
