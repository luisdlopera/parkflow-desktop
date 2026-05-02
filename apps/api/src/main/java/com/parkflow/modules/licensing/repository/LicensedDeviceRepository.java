package com.parkflow.modules.licensing.repository;

import com.parkflow.modules.licensing.entity.Company;
import com.parkflow.modules.licensing.entity.LicensedDevice;
import com.parkflow.modules.licensing.enums.LicenseStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

/**
 * Repositorio para dispositivos licenciados.
 */
@Repository
public interface LicensedDeviceRepository extends JpaRepository<LicensedDevice, UUID> {

  Optional<LicensedDevice> findByDeviceFingerprint(String fingerprint);

  List<LicensedDevice> findByCompany(Company company);

  List<LicensedDevice> findByCompanyId(UUID companyId);

  List<LicensedDevice> findByStatus(LicenseStatus status);

  /**
   * Busca dispositivos que no han reportado heartbeat en X minutos.
   */
  @Query("SELECT d FROM LicensedDevice d WHERE d.lastHeartbeatAt < :since OR d.lastHeartbeatAt IS NULL")
  List<LicensedDevice> findInactiveSince(OffsetDateTime since);

  /**
   * Busca dispositivos con comandos pendientes no confirmados.
   */
  @Query("SELECT d FROM LicensedDevice d WHERE d.pendingCommand IS NOT NULL AND d.commandAcknowledged = false")
  List<LicensedDevice> findWithPendingCommands();

  /**
   * Cuenta dispositivos activos por empresa.
   */
  @Query("SELECT COUNT(d) FROM LicensedDevice d WHERE d.company.id = :companyId AND d.status = 'ACTIVE'")
  Long countActiveByCompanyId(UUID companyId);

  boolean existsByDeviceFingerprint(String fingerprint);

  Optional<LicensedDevice> findByCompanyIdAndDeviceFingerprint(UUID companyId, String fingerprint);
}
