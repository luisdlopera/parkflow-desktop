package com.parkflow.modules.settings.dto;

import java.util.List;
import org.springframework.data.domain.Page;

public record SettingsPageResponse<T>(
    List<T> content, long totalElements, int totalPages, int page, int size) {
  public static <T> SettingsPageResponse<T> of(Page<T> page) {
    return new SettingsPageResponse<>(
        page.getContent(),
        page.getTotalElements(),
        page.getTotalPages(),
        page.getNumber(),
        page.getSize());
  }
}
