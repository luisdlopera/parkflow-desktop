package com.parkflow.modules.licensing.dto;

import com.parkflow.modules.licensing.enums.RemoteCommand;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.Data;

/**
 * Request para enviar un comando remoto a un dispositivo.
 */
@Data
public class RemoteCommandRequest {

  @NotNull
  private UUID deviceId;

  @NotNull
  private RemoteCommand command;

  private String payload;

  private String reason;
}
