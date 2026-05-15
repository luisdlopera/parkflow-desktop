package com.parkflow.modules.parking.operation.domain.repository;

import com.parkflow.modules.parking.operation.domain.SessionEvent;

public interface SessionEventPort {
  SessionEvent save(SessionEvent event);
}
