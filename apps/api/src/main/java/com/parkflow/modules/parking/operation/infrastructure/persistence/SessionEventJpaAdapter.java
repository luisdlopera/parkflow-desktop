package com.parkflow.modules.parking.operation.infrastructure.persistence;

import com.parkflow.modules.parking.operation.domain.SessionEvent;
import com.parkflow.modules.parking.operation.domain.repository.SessionEventPort;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

@Component
@RequiredArgsConstructor
public class SessionEventJpaAdapter implements SessionEventPort {

  private final SessionEventJpaRepository jpaRepository;

  @Override
  public SessionEvent save(SessionEvent event) {
    return jpaRepository.save(event);
  }

  @Repository
  interface SessionEventJpaRepository extends JpaRepository<SessionEvent, UUID> {}
}
