package com.parkflow.modules.parking.operation.domain.pricing;

import com.parkflow.modules.parking.operation.domain.Rate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Component;

/**
 * Evaluates whether a given moment falls inside a Rate's configured time window.
 *
 * The window is defined by Rate.windowStart and Rate.windowEnd (LocalTime).
 * Overnight windows (e.g. 22:00–06:00) are supported: when windowStart > windowEnd
 * the check wraps around midnight.
 *
 * If windowStart or windowEnd is null, the rate is considered always in-window.
 */
@Component
public class RateWindowResolver {

  public boolean isInWindow(Rate rate, OffsetDateTime moment) {
    LocalTime windowStart = rate.getWindowStart();
    LocalTime windowEnd = rate.getWindowEnd();

    if (windowStart == null || windowEnd == null) {
      return true;
    }

    LocalTime time = moment.toLocalTime();

    if (windowStart.isBefore(windowEnd) || windowStart.equals(windowEnd)) {
      // Same-day window: e.g. 08:00–20:00
      return !time.isBefore(windowStart) && !time.isAfter(windowEnd);
    } else {
      // Overnight window: e.g. 22:00–06:00
      return !time.isBefore(windowStart) || !time.isAfter(windowEnd);
    }
  }
}
