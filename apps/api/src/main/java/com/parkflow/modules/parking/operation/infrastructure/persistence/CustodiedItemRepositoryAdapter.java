package com.parkflow.modules.parking.operation.infrastructure.persistence;

import com.parkflow.modules.parking.operation.domain.CustodiedItem;
import com.parkflow.modules.parking.operation.domain.CustodiedItemStatus;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.application.port.out.CustodiedItemPort;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CustodiedItemRepositoryAdapter implements CustodiedItemPort {

  private final CustodiedItemRepository repository;

  @Override
  public List<CustodiedItem> findBySession(ParkingSession session) {
    return repository.findBySessionOrderByCreatedAtAsc(session);
  }

  @Override
  public List<CustodiedItem> findBySessionAndStatus(ParkingSession session, CustodiedItemStatus status) {
    return repository.findBySessionAndStatusOrderByCreatedAtAsc(session, status);
  }

  @Override
  public Optional<CustodiedItem> findById(UUID id) {
    return repository.findById(id);
  }

  @Override
  public CustodiedItem save(CustodiedItem item) {
    return repository.save(item);
  }

  @Override
  public List<CustodiedItem> findBySessionAndItemType(ParkingSession session, String itemType) {
    return repository.findBySessionAndItemTypeOrderByCreatedAtAsc(session, itemType);
  }

  @Override
  public boolean existsActiveHelmetByIdentifierAndCompany(String identifier, UUID companyId) {
    return repository.existsActiveHelmetByIdentifierAndCompany(identifier, companyId);
  }

  @Override
  public boolean existsActiveByLockerId(UUID lockerId) {
    return repository.existsByLockerIdAndStatus(lockerId, CustodiedItemStatus.RECEIVED);
  }
}
