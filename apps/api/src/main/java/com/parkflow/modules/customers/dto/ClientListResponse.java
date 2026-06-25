package com.parkflow.modules.customers.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ClientListResponse {
  private List<ClientResponse> clients;
  private Long total;
  private int page;
  private int size;
}
