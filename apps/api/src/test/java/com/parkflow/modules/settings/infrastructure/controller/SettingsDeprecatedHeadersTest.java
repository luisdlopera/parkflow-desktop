package com.parkflow.modules.settings.infrastructure.controller;

import com.parkflow.modules.common.dto.ParkingParametersData;
import com.parkflow.modules.common.interceptor.DeprecatedApiInterceptor;
import com.parkflow.modules.settings.application.port.in.ParkingParametersUseCase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class SettingsDeprecatedHeadersTest {

  @Mock
  private ParkingParametersUseCase parkingParametersUseCase;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    SettingsParametersController controller = new SettingsParametersController(parkingParametersUseCase);
    this.mockMvc = MockMvcBuilders.standaloneSetup(controller)
        .setMessageConverters(new MappingJackson2HttpMessageConverter())
        .addInterceptors(new DeprecatedApiInterceptor())
        .build();
  }

  @Test
  void shouldExposeDeprecationHeadersOnLegacySettingsControllers() throws Exception {
    ParkingParametersData data = new ParkingParametersData();
    data.setParkingName("Legacy Test");
    when(parkingParametersUseCase.get(null)).thenReturn(data);

    mockMvc.perform(get("/api/v1/settings/parameters"))
        .andExpect(status().isOk())
        .andExpect(header().string("Deprecation", "true"))
        .andExpect(header().string("X-Deprecated", "true"))
        .andExpect(header().exists("Sunset"))
        .andExpect(header().exists("Link"));
  }
}
