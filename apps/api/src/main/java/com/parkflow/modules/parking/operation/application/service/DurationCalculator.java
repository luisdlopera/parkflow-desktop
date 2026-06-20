package com.parkflow.modules.parking.operation.application.service;

import java.time.Duration;
import java.time.OffsetDateTime;

public final class DurationCalculator {
  private DurationCalculator() {}

  public static DurationBreakdown calculate(OffsetDateTime entryAt, OffsetDateTime exitAt, int graceMinutes) {
    long seconds = Duration.between(entryAt, exitAt).toSeconds();
    long totalMinutes = Math.max(0, (long) Math.ceil(seconds / 60.0));
    long billableMinutes = Math.max(0, totalMinutes - Math.max(0, graceMinutes));

    long hours = totalMinutes / 60;
    long minutes = totalMinutes % 60;

    return new DurationBreakdown(totalMinutes, billableMinutes, hours + "h " + minutes + "m");
  }

  public record DurationBreakdown(long totalMinutes, long billableMinutes, String human) {}
}
