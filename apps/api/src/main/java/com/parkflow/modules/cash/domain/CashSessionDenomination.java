package com.parkflow.modules.cash.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Registro de una denominación de billete o moneda contada durante el arqueo de caja.
 * Permite trazabilidad contable completa y consultas analíticas por denominación.
 *
 * <p>La columna {@code subtotal} es generada por la base de datos como
 * {@code denomination * quantity}, garantizando consistencia sin lógica de aplicación.
 */
@Getter
@Setter
@Entity
@Table(
    name = "cash_session_denomination",
    indexes = {
        @Index(name = "idx_csd_cash_session_id", columnList = "cash_session_id"),
        @Index(name = "idx_csd_company_denomination", columnList = "company_id, denomination")
    }
)
public class CashSessionDenomination {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "company_id", nullable = false)
    private UUID companyId;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "cash_session_id", nullable = false)
    private CashSession cashSession;

    /**
     * Valor facial del billete o moneda (ej: 50000, 20000, 1000, 500).
     */
    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal denomination;

    /**
     * Cantidad de billetes/monedas de esta denominación.
     */
    @Column(nullable = false)
    private Integer quantity;

    /**
     * Subtotal calculado por la base de datos: denomination * quantity.
     * Columna GENERATED ALWAYS AS STORED — no debe ser modificada desde la aplicación.
     */
    @Column(nullable = false, precision = 14, scale = 2, insertable = false, updatable = false)
    private BigDecimal subtotal;

    @Column(nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
