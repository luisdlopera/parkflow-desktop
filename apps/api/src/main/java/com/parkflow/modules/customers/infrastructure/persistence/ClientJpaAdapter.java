package com.parkflow.modules.customers.infrastructure.persistence;

import com.parkflow.modules.customers.domain.Client;
import com.parkflow.modules.customers.domain.port.ClientPort;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class ClientJpaAdapter implements ClientPort {
  private final ClientJpaRepository repository;

  @Override
  public Client save(Client client) {
    return repository.save(client);
  }

  @Override
  public Optional<Client> findById(UUID id) {
    return repository.findById(id);
  }

  @Override
  public List<Client> findByCompanyId(UUID companyId) {
    return repository.findByCompanyId(companyId);
  }

  @Override
  public Optional<Client> findByDocumentAndCompanyId(String document, UUID companyId) {
    return repository.findByDocumentAndCompanyId(document, companyId);
  }

  @Override
  public void delete(UUID id) {
    repository.deleteById(id);
  }

  @Override
  public boolean existsByIdAndCompanyId(UUID id, UUID companyId) {
    return repository.existsByIdAndCompanyId(id, companyId);
  }

  @Override
  public long countActiveByCompanyId(UUID companyId) {
    return repository.countActiveByCompanyId(companyId);
  }
}
