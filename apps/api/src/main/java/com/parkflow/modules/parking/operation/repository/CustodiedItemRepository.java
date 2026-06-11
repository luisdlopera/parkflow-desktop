package com.parkflow.modules.parking.operation.repository;

import com.parkflow.modules.parking.operation.domain.CustodiedItem;
import com.parkflow.modules.parking.operation.domain.CustodiedItemStatus;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustodiedItemRepository extends JpaRepository<CustodiedItem, UUID> {
  List<CustodiedItem> findBySessionOrderByCreatedAtAsc(ParkingSession session);
  List<CustodiedItem> findBySessionAndStatusOrderByCreatedAtAsc(ParkingSession session, CustodiedItemStatus status);
  List<CustodiedItem> findBySessionAndItemTypeOrderByCreatedAtAsc(ParkingSession session, String itemType);
}
