package com.parkflow.modules.configuration.application.port.in;

import com.parkflow.modules.configuration.dto.ThemeConfigurationRequest;
import com.parkflow.modules.configuration.dto.ThemeConfigurationResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface ThemeConfigurationUseCase {
  ThemeConfigurationResponse getByCompany(UUID companyId);
  ThemeConfigurationResponse createOrUpdate(UUID companyId, ThemeConfigurationRequest request);
  ThemeConfigurationResponse updateLogo(UUID companyId, MultipartFile file);
  ThemeConfigurationResponse updateFavicon(UUID companyId, MultipartFile file);
  ThemeConfigurationResponse removeLogo(UUID companyId);
  ThemeConfigurationResponse removeFavicon(UUID companyId);
}
