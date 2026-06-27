package com.parkflow.modules.parking.locker.application.port.in;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.locker.domain.Locker;
import com.parkflow.modules.parking.locker.domain.LockerStatus;
import com.parkflow.modules.parking.locker.application.port.out.LockerRepositoryPort;
import com.parkflow.modules.parking.locker.dto.BatchLockerRequest;
import com.parkflow.modules.parking.locker.dto.LockerResponse;
import com.parkflow.modules.parking.locker.dto.PatchLockerRequest;
import com.parkflow.modules.parking.operation.domain.CustodiedItemStatus;
import com.parkflow.modules.parking.operation.infrastructure.persistence.CustodiedItemRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

public interface LockerUseCase {
  List<LockerResponse> listLockers(UUID companyId);
  List<LockerResponse> listAvailableLockers(UUID companyId);
  LockerResponse createLocker(String code, String label);
  List<LockerResponse> createBatch(UUID companyId, BatchLockerRequest request);
  LockerResponse patchLocker(UUID id, PatchLockerRequest request);
  void deleteLocker(UUID id);
}
