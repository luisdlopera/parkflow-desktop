package com.parkflow.modules.cash.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "cash_fe_sequence")
@IdClass(CashFeSequencePk.class)
public class CashFeSequenceCounter implements Serializable {

  @Id
  @Column(name = "site_code", nullable = false, length = 80)
  private String siteCode;

  @Id
  @Column(nullable = false, length = 80)
  private String terminal = "";

  @Column(name = "last_value", nullable = false)
  private long lastValue;

  public static CashFeSequenceCounter newBlank(String site, String terminalOrEmpty) {
    CashFeSequenceCounter c = new CashFeSequenceCounter();
    c.setSiteCode(site);
    c.setTerminal(terminalOrEmpty != null ? terminalOrEmpty : "");
    c.setLastValue(0L);
    return c;
  }
}
