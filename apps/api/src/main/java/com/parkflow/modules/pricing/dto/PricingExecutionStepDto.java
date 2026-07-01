package com.parkflow.modules.pricing.dto;

public record PricingExecutionStepDto(
    String id,
    String label,
    String before,
    String after,
    boolean applied,
    String reason) {}
