package com.parkflow;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RootController {

  @GetMapping("/")
  public Map<String, String> root() {
    return Map.of(
        "message",
        "Parkflow API running",
        "status",
        "UP",
        "apiVersion",
        "v1",
        "health",
        "/actuator/health",
        "metrics",
        "/actuator/prometheus");
  }
}
