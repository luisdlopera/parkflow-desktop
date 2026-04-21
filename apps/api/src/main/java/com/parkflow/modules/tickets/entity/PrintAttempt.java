package com.parkflow.modules.tickets.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "print_attempts")
public class PrintAttempt {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "print_job_id")
  private PrintJob printJob;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private PrintJobStatus status;

  @Column(nullable = false, unique = true)
  private String attemptKey;

  @Column(columnDefinition = "TEXT")
  private String errorMessage;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();
}
