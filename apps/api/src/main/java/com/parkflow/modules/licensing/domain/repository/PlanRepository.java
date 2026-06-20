package com.parkflow.modules.licensing.domain.repository;

import com.parkflow.modules.licensing.domain.Plan;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlanRepository extends JpaRepository<Plan, UUID> {

  Optional<Plan> findByCode(String code);

  boolean existsByCode(String code);

  List<Plan> findAllByDeletedAtIsNullOrderByCreatedAtDesc();

  List<Plan> findAllByDeletedAtIsNotNullOrderByCreatedAtDesc();

  List<Plan> findAllByOrderByCreatedAtDesc();

  @Query("SELECT p FROM Plan p WHERE p.deletedAt IS NULL AND p.isActive = :active ORDER BY p.createdAt DESC")
  List<Plan> findAllActiveByDeletedAtIsNull(@Param("active") boolean active);

  long countByIsActiveTrueAndDeletedAtIsNull();

  @Query("SELECT p FROM Plan p WHERE p.deletedAt IS NULL AND p.id <> :id ORDER BY p.createdAt ASC")
  List<Plan> findAllOthersExcluding(@Param("id") UUID id);

  @Query("SELECT p FROM Plan p WHERE p.isActive = :active ORDER BY p.createdAt DESC")
  List<Plan> findAllByIsActive(@Param("active") boolean active);
}
