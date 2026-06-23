package com.parkflow.modules.auth.security;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.licensing.enums.ModuleType;
import com.parkflow.modules.onboarding.application.service.FeatureAccessService;
import java.util.UUID;
import org.aspectj.lang.JoinPoint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

class ModuleAccessAspectTest {

  private FeatureAccessService featureAccessService;
  private ModuleAccessAspect aspect;

  @BeforeEach
  void setUp() {
    featureAccessService = mock(FeatureAccessService.class);
    aspect = new ModuleAccessAspect(featureAccessService);
  }

  @Test
  void checkModuleAccess_ShouldAllowIfNoModulesRequired() {
    JoinPoint jp = mock(JoinPoint.class);
    RequireModule rm = mock(RequireModule.class);
    when(rm.value()).thenReturn(new ModuleType[0]);

    try (MockedStatic<SecurityUtils> utils = Mockito.mockStatic(SecurityUtils.class)) {
      utils.when(SecurityUtils::requireCompanyId).thenReturn(UUID.randomUUID());
      assertDoesNotThrow(() -> aspect.checkModuleAccess(jp, rm));
    }
  }

  @Test
  void checkModuleAccess_ShouldAllowIfAnyRequiredModuleIsEnabled() {
    JoinPoint jp = mock(JoinPoint.class);
    RequireModule rm = mock(RequireModule.class);
    when(rm.value()).thenReturn(new ModuleType[] { ModuleType.CLOUD_SYNC, ModuleType.DASHBOARD });
    when(rm.requireAll()).thenReturn(false);

    UUID companyId = UUID.randomUUID();
    when(featureAccessService.isModuleEnabled(companyId, ModuleType.CLOUD_SYNC)).thenReturn(false);
    when(featureAccessService.isModuleEnabled(companyId, ModuleType.DASHBOARD)).thenReturn(true);

    try (MockedStatic<SecurityUtils> utils = Mockito.mockStatic(SecurityUtils.class)) {
      utils.when(SecurityUtils::requireCompanyId).thenReturn(companyId);
      assertDoesNotThrow(() -> aspect.checkModuleAccess(jp, rm));
    }
  }

  @Test
  void checkModuleAccess_ShouldThrowIfRequireAllAndOneDisabled() {
    JoinPoint jp = mock(JoinPoint.class);
    RequireModule rm = mock(RequireModule.class);
    when(rm.value()).thenReturn(new ModuleType[] { ModuleType.CLOUD_SYNC, ModuleType.DASHBOARD });
    when(rm.requireAll()).thenReturn(true);

    UUID companyId = UUID.randomUUID();
    when(featureAccessService.isModuleEnabled(companyId, ModuleType.CLOUD_SYNC)).thenReturn(true);
    when(featureAccessService.isModuleEnabled(companyId, ModuleType.DASHBOARD)).thenReturn(false);

    try (MockedStatic<SecurityUtils> utils = Mockito.mockStatic(SecurityUtils.class)) {
      utils.when(SecurityUtils::requireCompanyId).thenReturn(companyId);
      assertThrows(OperationException.class, () -> aspect.checkModuleAccess(jp, rm));
    }
  }
}
