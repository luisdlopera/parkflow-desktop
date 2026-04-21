package com.parkflow.modules.devices.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "devices")
public class Device {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private DeviceProtocol protocol;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private DeviceConnectionType connectionType;

  private String usbPath;
  private String tcpHost;
  private Integer tcpPort;
  private String serialPort;
  private Integer baudRate;

  @Column(nullable = false)
  private boolean isEnabled = true;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();
}
