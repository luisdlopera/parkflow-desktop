package com.parkflow.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

  @Value("${app.uploads.dir:uploads}")
  private String uploadsDir;

  @Value("${app.uploads.base-url:/uploads}")
  private String uploadsBaseUrl;

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    String absoluteDir = Paths.get(uploadsDir).toAbsolutePath().normalize().toString();
    registry.addResourceHandler(uploadsBaseUrl + "/**")
        .addResourceLocations("file:" + absoluteDir + "/");
  }
}
