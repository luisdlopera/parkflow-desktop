package com.parkflow.modules.parking.locker.application.port.in;

import com.parkflow.modules.parking.locker.dto.LockerResponse;
import java.util.List;
import java.util.UUID;


public interface LockerQueryUseCase {
  List<LockerResponse> listLockers(UUID companyId);
  List<LockerResponse> listAvailableLockers(UUID companyId);
}
