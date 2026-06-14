package com.parkflow.modules.parking.operation.dto;

import java.util.List;

public record PaginatedResponse<T>(
    List<T> data,
    Meta meta
) {
  public record Meta(
      long total,
      int page,
      int limit,
      int totalPages
  ) {}
}
