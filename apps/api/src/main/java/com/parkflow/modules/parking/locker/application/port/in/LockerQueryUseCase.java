package com.parkflow.modules.parking.locker.application.port.in;

import com.parkflow.modules.parking.locker.domain.Locker;
import com.parkflow.modules.parking.locker.domain.LockerStatus;
import com.parkflow.modules.parking.locker.application.port.out.LockerRepositoryPort;
import com.parkflow.modules.parking.locker.dto.LockerResponse;
import com.parkflow.modules.parking.operation.domain.CustodiedItemStatus;
import com.parkflow.modules.parking.operation.infrastructure.persistence.CustodiedItemRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

public interface LockerQueryUseCase {
  List<LockerResponse> listLockers(UUID companyId);
  List<LockerResponse> listAvailableLockers(UUID companyId);
}
