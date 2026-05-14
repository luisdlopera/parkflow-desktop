package com.parkflow.modules.cash.domain;

import java.io.Serializable;
import java.util.Objects;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CashFeSequencePk implements Serializable {
  private String siteCode;

  /** Vacio cuando el correlativo es unico por sede (sin particion por terminal). */
  private String terminal;

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    CashFeSequencePk that = (CashFeSequencePk) o;
    return Objects.equals(siteCode, that.siteCode) && Objects.equals(terminal, that.terminal);
  }

  @Override
  public int hashCode() {
    return Objects.hash(siteCode, terminal);
  }
}
