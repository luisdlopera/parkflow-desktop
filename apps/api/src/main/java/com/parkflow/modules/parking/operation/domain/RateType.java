package com.parkflow.modules.parking.operation.domain;

public enum RateType {
  PER_MINUTE,
  HOURLY,
  DAILY,
  FLAT,
  /** Stepped pricing: different rates apply for each configured time range (RateFraction). */
  FRACTIONAL
}
