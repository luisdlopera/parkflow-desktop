package com.parkflow.modules.cash.infrastructure.persistence;

import com.parkflow.modules.cash.domain.CashRegister;
import com.parkflow.modules.cash.domain.repository.CashRegisterPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CashRegisterJpaAdapter implements CashRegisterPort {

    private final CashRegisterJpaRepository jpaRepository;

    @Override
    public Optional<CashRegister> findBySiteAndTerminal(String site, String terminal) {
        return jpaRepository.findBySiteAndTerminal(site, terminal);
    }

    @Override
    public List<CashRegister> findBySiteOrderByTerminalAsc(String site) {
        return jpaRepository.findBySiteOrderByTerminalAsc(site);
    }

    @Override
    public Page<CashRegister> findBySiteRef_Id(UUID siteId, Pageable pageable) {
        return jpaRepository.findBySiteRef_Id(siteId, pageable);
    }

    @Override
    public Page<CashRegister> search(UUID siteId, String q, Boolean active, Pageable pageable) {
        return jpaRepository.search(siteId, q, active, pageable);
    }

    @Override
    public CashRegister save(CashRegister register) {
        return jpaRepository.save(register);
    }

    @Override
    public Optional<CashRegister> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public void delete(CashRegister register) {
        jpaRepository.delete(register);
    }

    @Repository
    interface CashRegisterJpaRepository extends JpaRepository<CashRegister, UUID> {
        Optional<CashRegister> findBySiteAndTerminal(String site, String terminal);

        List<CashRegister> findBySiteOrderByTerminalAsc(String site);

        Page<CashRegister> findBySiteRef_Id(UUID siteId, Pageable pageable);

        @Query("""
            SELECT c
            FROM CashRegister c
            LEFT JOIN c.siteRef s
            LEFT JOIN c.printer p
            LEFT JOIN c.responsibleUser u
            WHERE (:siteId IS NULL OR s.id = :siteId)
              AND (:active IS NULL OR c.active = :active)
              AND (
                :q IS NULL
                OR LOWER(c.site) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(c.code, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(c.name, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(c.terminal, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(c.label, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(p.name, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(u.name, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
        Page<CashRegister> search(
            @Param("siteId") UUID siteId,
            @Param("q") String q,
            @Param("active") Boolean active,
            Pageable pageable);
    }
}
