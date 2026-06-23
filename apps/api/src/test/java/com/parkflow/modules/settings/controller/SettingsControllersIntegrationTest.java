package com.parkflow.modules.settings.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.config.BaseIntegrationTest;
import com.parkflow.modules.common.dto.*;
import com.parkflow.modules.settings.application.service.ParkingParametersService;
import com.parkflow.modules.settings.application.service.SettingsRateService;
import com.parkflow.modules.settings.application.service.SettingsUserService;
import com.parkflow.modules.settings.application.service.SettingsVehicleTypeService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;

@DisplayName("SettingsControllers Integration Tests")
class SettingsControllersIntegrationTest extends BaseIntegrationTest {

  @MockBean private SettingsVehicleTypeService vehicleTypeUseCase;
  @MockBean private ParkingParametersService parkingParametersUseCase;
  @MockBean private SettingsUserService userManagementUseCase;
  @MockBean private SettingsRateService rateManagementUseCase;

  @Autowired private ObjectMapper objectMapper;

  // --- SettingsVehicleTypeController ---

  @Test
  @WithMockUser(roles = "ADMIN")
  void listVehicleTypes_ShouldReturnList() throws Exception {
    when(vehicleTypeUseCase.listAll()).thenReturn(List.of());

    mockMvc.perform(get("/api/v1/settings/vehicle-types"))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void createVehicleType_ShouldReturnCreated() throws Exception {
    when(vehicleTypeUseCase.create(any())).thenReturn(null);

    mockMvc.perform(post("/api/v1/settings/vehicle-types")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"code\": \"CAR\", \"name\": \"Car\"}"))
        .andExpect(status().isCreated());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void updateVehicleType_ShouldReturnOk() throws Exception {
    when(vehicleTypeUseCase.update(any(), any())).thenReturn(null);

    mockMvc.perform(put("/api/v1/settings/vehicle-types/" + UUID.randomUUID())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"code\": \"CAR\", \"name\": \"Car\"}"))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void deleteVehicleType_ShouldReturnNoContent() throws Exception {
    mockMvc.perform(delete("/api/v1/settings/vehicle-types/" + UUID.randomUUID()))
        .andExpect(status().isNoContent());
  }

  // --- SettingsParametersController ---

  @Test
  @WithMockUser(authorities = "configuracion:leer")
  void getParameters_ShouldReturnOk() throws Exception {
    when(parkingParametersUseCase.get(any())).thenReturn(new ParkingParametersData());

    mockMvc.perform(get("/api/v1/settings/parameters"))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "configuracion:editar")
  void putParameters_ShouldReturnOk() throws Exception {
    when(parkingParametersUseCase.put(any(), any())).thenReturn(new ParkingParametersData());

    mockMvc.perform(put("/api/v1/settings/parameters")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new ParkingParametersData())))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "configuracion:leer")
  void validateParameters_ShouldReturnOk() throws Exception {
    when(parkingParametersUseCase.validate(any())).thenReturn(new ParametersValidateResponse(true, List.of()));

    mockMvc.perform(post("/api/v1/settings/parameters/validate")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new ParkingParametersData())))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "configuracion:editar")
  void resetParameters_ShouldReturnOk() throws Exception {
    when(parkingParametersUseCase.reset(any())).thenReturn(new ParkingParametersData());

    mockMvc.perform(post("/api/v1/settings/parameters/reset"))
        .andExpect(status().isOk());
  }

  // --- SettingsUsersController ---

  @Test
  @WithMockUser(authorities = "usuarios:leer")
  void listUsers_ShouldReturnOk() throws Exception {
    when(userManagementUseCase.list(any(), any(), any(), any())).thenReturn(new SettingsPageResponse<>(List.of(), 0L, 0, 0, 0));

    mockMvc.perform(get("/api/v1/settings/users"))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "usuarios:leer")
  void getUser_ShouldReturnOk() throws Exception {
    when(userManagementUseCase.get(any())).thenReturn(null);

    mockMvc.perform(get("/api/v1/settings/users/" + UUID.randomUUID()))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "usuarios:editar")
  void createUser_ShouldReturnCreated() throws Exception {
    when(userManagementUseCase.create(any())).thenReturn(null);

    mockMvc.perform(post("/api/v1/settings/users")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\": \"Test\", \"email\": \"test@test.com\", \"role\": \"ADMIN\", \"initialPassword\": \"Password123!\"}"))
        .andExpect(status().isCreated());
  }

  @Test
  @WithMockUser(authorities = "usuarios:editar")
  void patchUser_ShouldReturnOk() throws Exception {
    when(userManagementUseCase.patch(any(), any())).thenReturn(null);

    mockMvc.perform(patch("/api/v1/settings/users/" + UUID.randomUUID())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "usuarios:editar")
  void patchUserStatus_ShouldReturnOk() throws Exception {
    UserStatusRequest req = new UserStatusRequest(true);
    when(userManagementUseCase.patchStatus(any(), any())).thenReturn(null);

    mockMvc.perform(patch("/api/v1/settings/users/" + UUID.randomUUID() + "/status")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "usuarios:editar")
  void resetPassword_ShouldReturnNoContent() throws Exception {
//     ResetPasswordRequest req = new ResetPasswordRequest("Pass123");

    mockMvc.perform(post("/api/v1/settings/users/" + UUID.randomUUID() + "/reset-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"newPassword\": \"Password123!\"}"))
        .andExpect(status().isNoContent());
  }

  // --- SettingsRatesController ---

  @Test
  @WithMockUser(authorities = "tarifas:leer")
  void listRates_ShouldReturnOk() throws Exception {
    when(rateManagementUseCase.list(any(), any(), any(), any(), any())).thenReturn(new SettingsPageResponse<>(List.of(), 0L, 0, 0, 0));

    mockMvc.perform(get("/api/v1/settings/rates"))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "tarifas:leer")
  void getRate_ShouldReturnOk() throws Exception {
    when(rateManagementUseCase.get(any())).thenReturn(null);

    mockMvc.perform(get("/api/v1/settings/rates/" + UUID.randomUUID()))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "tarifas:editar")
  void createRate_ShouldReturnCreated() throws Exception {
    when(rateManagementUseCase.create(any())).thenReturn(null);

    mockMvc.perform(post("/api/v1/settings/rates")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\": \"Rate\", \"rateType\": \"FLAT\", \"amount\": 10.0, \"fractionMinutes\": 1, \"roundingMode\": \"UP\", \"lostTicketSurcharge\": 0.0, \"site\": \"SITE\"}"))
        .andExpect(status().isCreated());
  }

  @Test
  @WithMockUser(authorities = "tarifas:editar")
  void updateRate_ShouldReturnOk() throws Exception {
    when(rateManagementUseCase.update(any(), any())).thenReturn(null);

    mockMvc.perform(patch("/api/v1/settings/rates/" + UUID.randomUUID())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\": \"Rate\", \"rateType\": \"FLAT\", \"amount\": 10.0, \"fractionMinutes\": 1, \"roundingMode\": \"UP\", \"lostTicketSurcharge\": 0.0, \"site\": \"SITE\"}"))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "tarifas:editar")
  void patchRateStatus_ShouldReturnOk() throws Exception {
    RateStatusRequest req = new RateStatusRequest(true);
    when(rateManagementUseCase.patchStatus(any(), any())).thenReturn(null);

    mockMvc.perform(patch("/api/v1/settings/rates/" + UUID.randomUUID() + "/status")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "tarifas:editar")
  void deleteRate_ShouldReturnNoContent() throws Exception {
    mockMvc.perform(delete("/api/v1/settings/rates/" + UUID.randomUUID()))
        .andExpect(status().isNoContent());
  }
}
