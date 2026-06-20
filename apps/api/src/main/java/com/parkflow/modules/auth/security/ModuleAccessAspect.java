package com.parkflow.modules.auth.security;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.licensing.enums.ModuleType;
import com.parkflow.modules.onboarding.application.service.FeatureAccessService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Aspect
@Component
@RequiredArgsConstructor
public class ModuleAccessAspect {

  private final FeatureAccessService featureAccessService;

  @Before("@within(requireModule) || @annotation(requireModule)")
  public void checkModuleAccess(JoinPoint joinPoint, RequireModule requireModule) {
    if (requireModule == null) {
      // In case @within was matched but method doesn't have it, we need to extract from class
      requireModule = joinPoint.getTarget().getClass().getAnnotation(RequireModule.class);
    }
    
    if (requireModule == null) {
      return; // Should not happen with the pointcut, but safe check
    }

    UUID companyId = SecurityUtils.requireCompanyId();
    ModuleType[] requiredModules = requireModule.value();

    if (requiredModules.length == 0) {
      return;
    }

    boolean hasAccess = requireModule.requireAll();

    for (ModuleType module : requiredModules) {
      boolean isEnabled = featureAccessService.isModuleEnabled(companyId, module);
      
      if (requireModule.requireAll()) {
        if (!isEnabled) {
          hasAccess = false;
          break;
        }
      } else {
        if (isEnabled) {
          hasAccess = true;
          break;
        }
      }
    }

    if (!hasAccess) {
      throw new OperationException(
          HttpStatus.FORBIDDEN, 
          "El plan actual de la empresa no incluye acceso a este módulo: " + java.util.Arrays.toString(requiredModules)
      );
    }
  }
}
