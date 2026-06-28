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

  /**
   * Checks if ANY part of the interval [entryAt, exitAt] overlaps with the
   * surcharge window. For overnight windows that wrap around midnight, this
   * detects cases where the stay crosses the window boundary.
   */
  public boolean overlapsWithWindow(Rate rate, OffsetDateTime entryAt, OffsetDateTime exitAt) {
    LocalTime windowStart = rate.getWindowStart();
    LocalTime windowEnd = rate.getWindowEnd();

    if (windowStart == null || windowEnd == null) {
      return true;
    }

    if (isInWindow(rate, entryAt) || isInWindow(rate, exitAt)) {
      return true;
    }

    LocalTime entryTime = entryAt.toLocalTime();
    LocalTime exitTime = exitAt.toLocalTime();

    if (windowStart.isBefore(windowEnd)) {
      return entryTime.isBefore(windowStart) && exitTime.isAfter(windowEnd);
    } else {
      return entryTime.isBefore(windowStart) && exitTime.isAfter(windowEnd);
    }
  }
}
