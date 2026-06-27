package com.parkflow.modules.support.application.port.in;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

public interface SlaMonitoringUseCase {
  void checkSlaBreaches();
}
