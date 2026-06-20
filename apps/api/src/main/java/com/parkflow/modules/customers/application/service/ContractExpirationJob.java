package com.parkflow.modules.customers.application.service;

import com.parkflow.modules.configuration.domain.ContractStatus;
import com.parkflow.modules.configuration.repository.MonthlyContractRepository;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContractExpirationJob {

  private final MonthlyContractRepository contractRepository;

  /**
   * Ejecuta todos los días a la medianoche.
   * Vence los contratos cuya fecha de fin haya pasado.
   */
  @Scheduled(cron = "0 0 0 * * ?")
  @Transactional
  public void expireContracts() {
    log.info("Iniciando tarea programada: Vencimiento de mensualidades");
    LocalDate today = LocalDate.now();
    int count = 0;
    
    // Obtenemos todos los contratos activos
    var activeContracts = contractRepository.findAll().stream()
        .filter(c -> c.getStatus() == ContractStatus.ACTIVE)
        .toList();

    for (var contract : activeContracts) {
      if (contract.getEndDate().isBefore(today)) {
        contract.setStatus(ContractStatus.EXPIRED);
        contractRepository.save(contract);
        log.info("Mensualidad vencida: id={}, client={}, endDate={}",
            contract.getId(), contract.getClient().getId(), contract.getEndDate());
        count++;
      }
    }

    log.info("Tarea de vencimiento finalizada. Contratos vencidos: {}", count);
  }
}
