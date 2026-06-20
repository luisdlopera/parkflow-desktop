package com.parkflow.modules.licensing.application.service;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.Plan;
import com.parkflow.modules.licensing.domain.Subscription;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.licensing.domain.repository.PlanRepository;
import com.parkflow.modules.licensing.domain.repository.SubscriptionPort;
import com.parkflow.modules.licensing.dto.CreateSubscriptionRequest;
import com.parkflow.modules.licensing.dto.SubscriptionResponse;
import com.parkflow.modules.licensing.enums.SubscriptionStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionService {

  private final SubscriptionPort subscriptionPort;
  private final CompanyPort companyPort;
  private final PlanRepository planRepository;

  @Transactional(readOnly = true)
  public List<SubscriptionResponse> listByCompany(UUID companyId) {
    return subscriptionPort.findAllByCompanyId(companyId).stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public SubscriptionResponse getActive(UUID companyId) {
    return subscriptionPort.findActiveByCompanyId(companyId)
        .map(this::toResponse)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "SUBSCRIPTION_NOT_FOUND",
            "No hay suscripción activa para esta empresa"));
  }

  @Transactional
  public SubscriptionResponse create(UUID companyId, CreateSubscriptionRequest request) {
    Company company = companyPort.findById(companyId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "COMPANY_NOT_FOUND",
            "Empresa no encontrada"));
    Plan plan = planRepository.findById(request.planId())
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "PLAN_NOT_FOUND",
            "Plan no encontrado"));

    subscriptionPort.findActiveByCompanyId(companyId).ifPresent(existing -> {
      existing.setStatus(SubscriptionStatus.CANCELLED);
      subscriptionPort.save(existing);
      log.info("Cancelled previous active subscription {} for company {}", existing.getId(), companyId);
    });

    Subscription subscription = new Subscription();
    subscription.setCompany(company);
    subscription.setPlan(plan);
    subscription.setStatus(SubscriptionStatus.ACTIVE);
    subscription.setStartsAt(request.startsAt() != null ? request.startsAt() : OffsetDateTime.now());
    subscription.setEndsAt(request.endsAt());

    return toResponse(subscriptionPort.save(subscription));
  }

  @Transactional
  public SubscriptionResponse cancel(UUID companyId, UUID subscriptionId) {
    Subscription subscription = subscriptionPort.findById(subscriptionId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "SUBSCRIPTION_NOT_FOUND",
            "Suscripción no encontrada"));
    if (!subscription.getCompany().getId().equals(companyId)) {
      throw new OperationException(HttpStatus.FORBIDDEN, "ACCESS_DENIED",
          "La suscripción no pertenece a esta empresa");
    }
    subscription.setStatus(SubscriptionStatus.CANCELLED);
    return toResponse(subscriptionPort.save(subscription));
  }

  @Transactional
  public SubscriptionResponse suspend(UUID companyId, UUID subscriptionId) {
    Subscription subscription = subscriptionPort.findById(subscriptionId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "SUBSCRIPTION_NOT_FOUND",
            "Suscripción no encontrada"));
    if (!subscription.getCompany().getId().equals(companyId)) {
      throw new OperationException(HttpStatus.FORBIDDEN, "ACCESS_DENIED",
          "La suscripción no pertenece a esta empresa");
    }
    subscription.setStatus(SubscriptionStatus.SUSPENDED);
    return toResponse(subscriptionPort.save(subscription));
  }

  private SubscriptionResponse toResponse(Subscription s) {
    return new SubscriptionResponse(
        s.getId(),
        s.getCompany().getId(),
        s.getCompany().getName(),
        s.getPlan().getId(),
        s.getPlan().getName(),
        s.getPlan().getCode(),
        s.getStatus().name(),
        s.getStartsAt(),
        s.getEndsAt(),
        s.isActive(),
        s.getCreatedAt(),
        s.getUpdatedAt());
  }
}
