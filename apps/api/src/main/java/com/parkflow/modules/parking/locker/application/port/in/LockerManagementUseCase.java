package com.parkflow.modules.parking.locker.application.port.in;

import com.parkflow.modules.parking.locker.dto.BatchLockerRequest;
import com.parkflow.modules.parking.locker.dto.LockerResponse;
import com.parkflow.modules.parking.locker.dto.PatchLockerRequest;
import java.util.List;
import java.util.UUID;


public interface LockerManagementUseCase {
  LockerResponse createLocker(String code, String label);
  List<LockerResponse> createBatch(UUID companyId, BatchLockerRequest request);
  LockerResponse patchLocker(UUID id, PatchLockerRequest request);
  void deleteLocker(UUID id);
}
