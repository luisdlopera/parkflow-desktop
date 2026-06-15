package com.parkflow.modules.parking.operation.repository;

import com.parkflow.modules.parking.operation.domain.CustodiedItem;
import com.parkflow.modules.parking.operation.domain.CustodiedItemStatus;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustodiedItemRepository extends JpaRepository<CustodiedItem, UUID> {
  List<CustodiedItem> findBySessionOrderByCreatedAtAsc(ParkingSession session);
  List<CustodiedItem> findBySessionAndStatusOrderByCreatedAtAsc(ParkingSession session, CustodiedItemStatus status);
  List<CustodiedItem> findBySessionAndItemTypeOrderByCreatedAtAsc(ParkingSession session, String itemType);

  @Query("SELECT COUNT(i) > 0 FROM CustodiedItem i WHERE i.itemType = 'HELMET' AND i.status = 'RECEIVED' AND i.identifier = :identifier AND i.companyId = :companyId")
  boolean existsActiveHelmetByIdentifierAndCompany(@Param("identifier") String identifier, @Param("companyId") UUID companyId);

  boolean existsByTokenIdAndStatus(UUID tokenId, CustodiedItemStatus status);
}
