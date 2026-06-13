package com.parkflow.modules.onboarding.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "onboarding_question_config")
public class OnboardingQuestionConfig {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false, unique = true)
  private int stepNumber;

  @Column(nullable = false, length = 200)
  private String title;

  @Column(length = 500)
  private String description;

  @Column(nullable = false)
  private boolean enabled = true;

  @Column(nullable = false)
  private boolean required = false;

  @Column(nullable = false)
  private boolean planRestricted = false;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
