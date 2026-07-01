package com.parkflow.config;

import com.parkflow.modules.auth.security.TenantContext;
import org.springframework.jdbc.datasource.DelegatingDataSource;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;

public class RlsDataSource extends DelegatingDataSource {

    public RlsDataSource(DataSource targetDataSource) {
        super(targetDataSource);
    }

    @Override
    public Connection getConnection() throws SQLException {
        Connection connection = super.getConnection();
        setTenantId(connection);
        return connection;
    }

    @Override
    public Connection getConnection(String username, String password) throws SQLException {
        Connection connection = super.getConnection(username, password);
        setTenantId(connection);
        return connection;
    }

    private void setTenantId(Connection connection) throws SQLException {
        // Skip RLS for H2 in-memory test database
        if (connection.getMetaData().getDatabaseProductName().equalsIgnoreCase("H2")) {
            return;
        }
        
        UUID tenantId = TenantContext.getTenantId();
        try (Statement stmt = connection.createStatement()) {
            if (tenantId != null) {
                stmt.execute("SET app.tenant_id = '" + tenantId.toString() + "'");
            } else {
                stmt.execute("SET app.tenant_id = ''");
            }
        }
    }
}
