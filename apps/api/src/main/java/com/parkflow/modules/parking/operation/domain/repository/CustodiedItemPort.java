package com.parkflow.modules.parking.operation.domain.repository;

import com.parkflow.modules.parking.operation.domain.CustodiedItem;
import com.parkflow.modules.parking.operation.domain.CustodiedItemStatus;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CustodiedItemPort {
  List<CustodiedItem> findBySession(ParkingSession session);
  List<CustodiedItem> findBySessionAndStatus(ParkingSession session, CustodiedItemStatus status);
  Optional<CustodiedItem> findById(UUID id);
  CustodiedItem save(CustodiedItem item);
  List<CustodiedItem> findBySessionAndItemType(ParkingSession session, String itemType);
  boolean existsActiveHelmetByIdentifierAndCompany(String identifier, UUID companyId);
  boolean existsActiveByLockerId(UUID lockerId);
}
