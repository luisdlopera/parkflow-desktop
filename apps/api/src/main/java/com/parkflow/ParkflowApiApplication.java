package com.parkflow;

import com.parkflow.config.CashModuleProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(CashModuleProperties.class)
public class ParkflowApiApplication {
  public static void main(String[] args) {
    SpringApplication.run(ParkflowApiApplication.class, args);
  }
}
