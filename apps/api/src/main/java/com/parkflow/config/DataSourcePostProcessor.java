package com.parkflow.config;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

@Component
public class DataSourcePostProcessor implements BeanPostProcessor {

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        if (bean instanceof DataSource && !(bean instanceof RlsDataSource)) {
            return new RlsDataSource((DataSource) bean);
        }
        return bean;
    }
}
