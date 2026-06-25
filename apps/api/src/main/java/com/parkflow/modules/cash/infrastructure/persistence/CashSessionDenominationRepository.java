package com.parkflow.modules.cash.infrastructure.persistence;

import com.parkflow.modules.cash.domain.CashSessionDenomination;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CashSessionDenominationRepository
        extends JpaRepository<CashSessionDenomination, UUID> {

    /**
     * Carga las denominaciones de una sesión, ordenadas de mayor a menor valor facial.
     * Usado para mostrar el desglose en el comprobante de arqueo.
     */
    List<CashSessionDenomination> findByCashSession_IdOrderByDenominationDesc(UUID cashSessionId);

    /**
     * Elimina todas las denominaciones de una sesión antes de re-guardar.
     * Permite operaciones idempotentes en arqueos parciales.
     */
    @Modifying
    @Query("DELETE FROM CashSessionDenomination d WHERE d.cashSession.id = :sessionId")
    void deleteByCashSessionId(@Param("sessionId") UUID sessionId);
}
