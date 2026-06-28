package com.parkflow.modules.customers.domain.port;

import com.parkflow.modules.customers.domain.Client;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClientPort {
  Client save(Client client);

  Optional<Client> findById(UUID id);

  List<Client> findByCompanyId(UUID companyId);

  Optional<Client> findByDocumentAndCompanyId(String document, UUID companyId);
  Optional<Client> findFirstByCompanyIdAndDocument(UUID companyId, String document);
  Optional<Client> findFirstByCompanyIdAndNameIgnoreCase(UUID companyId, String name);

  void delete(UUID id);

  boolean existsByIdAndCompanyId(UUID id, UUID companyId);

  long countActiveByCompanyId(UUID companyId);
}
