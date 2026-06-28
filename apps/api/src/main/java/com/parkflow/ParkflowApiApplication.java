package com.parkflow;

import com.parkflow.config.CashModuleProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableJpaRepositories(considerNestedRepositories = true)
@EnableScheduling
@EnableConfigurationProperties(CashModuleProperties.class)
@org.springframework.scheduling.annotation.EnableAsync
@EnableRetry
public class ParkflowApiApplication {
  public static void main(String[] args) {
    SpringApplication.run(ParkflowApiApplication.class, args);
  }
}
