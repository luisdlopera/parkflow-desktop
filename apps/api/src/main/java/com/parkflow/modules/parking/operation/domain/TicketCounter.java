package com.parkflow.modules.parking.operation.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "ticket_counter")
public class TicketCounter {
  @Id
  @Column(name = "counter_key")
  private String counterKey;

  @Column(nullable = false)
  private int lastNumber;

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();
}
