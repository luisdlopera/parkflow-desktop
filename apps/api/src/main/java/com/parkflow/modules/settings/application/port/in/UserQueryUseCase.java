package com.parkflow.modules.settings.application.port.in;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
import com.parkflow.modules.common.dto.UserAdminResponse;
import com.parkflow.modules.common.dto.PageResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

public interface UserQueryUseCase {
  PageResponse<UserAdminResponse> list(String q, Boolean active, UserRole role, Pageable pageable);
  UserAdminResponse get(UUID id);
}
