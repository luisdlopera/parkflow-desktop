package com.parkflow.modules.licensing.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

class LicensedDeviceTest {

  @Test
  void recordHeartbeat_updates_lastSeen() {
    LicensedDevice d = new LicensedDevice();
    d.setHeartbeatCount(0L);
    d.setLastHeartbeatAt(OffsetDateTime.now().minusDays(1));
    d.recordHeartbeat();
    assertThat(d.getHeartbeatCount()).isGreaterThanOrEqualTo(1L);
    assertThat(d.getLastHeartbeatAt()).isAfter(OffsetDateTime.now().minusMinutes(1));
  }

  @Test
  void queue_and_clear_command_works() {
    LicensedDevice d = new LicensedDevice();
    d.queueCommand("REVOKE", "{}");
    assertThat(d.getPendingCommand()).isEqualTo("REVOKE");
    assertThat(d.getPendingCommandPayload()).isEqualTo("{}");
    d.clearCommand();
    assertThat(d.getPendingCommand()).isNull();
    assertThat(d.getCommandAcknowledged()).isTrue();
  }
}
