package com.parkflow.modules.parking.operation.repository;

import com.parkflow.modules.parking.operation.domain.SessionEvent;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionEventRepository extends JpaRepository<SessionEvent, UUID> {
}
