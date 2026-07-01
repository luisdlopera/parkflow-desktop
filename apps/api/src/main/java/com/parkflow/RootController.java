package com.parkflow;

import com.parkflow.dto.HealthResponse;
import com.parkflow.dto.RootResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RootController {

  @GetMapping("/")
  public RootResponse root() {
    return RootResponse.builder()
        .message("Parkflow API running")
        .status("UP")
        .apiVersion("v1")
        .health("/actuator/health")
        .metrics("/actuator/prometheus")
        .build();
  }

  @GetMapping("/api/v1/health")
  public HealthResponse health() {
    return new HealthResponse("UP");
  }
}
