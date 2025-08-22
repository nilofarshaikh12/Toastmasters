package com.example.toastMasters.config;

import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.id.IdentifierGenerator;
import java.io.Serializable;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

public class RoleIdGenerator implements IdentifierGenerator {

    @Override
    public Serializable generate(SharedSessionContractImplementor session, Object object) {
        String prefix = "R";

        // This query finds the highest numeric value from all existing IDs.
        String query = "SELECT MAX(CAST(SUBSTRING(role_id FROM 2) AS INTEGER)) FROM roles";

        try (Connection connection = session.getJdbcConnectionAccess().obtainConnection();
             Statement stmt = connection.createStatement();
             ResultSet rs = stmt.executeQuery(query)) {

            int nextId = 1;
            if (rs.next()) {
                // Get the maximum number. If no records exist, rs.getObject(1) will be null.
                Object maxIdObj = rs.getObject(1);
                if (maxIdObj != null) {
                    nextId = (int) maxIdObj + 1;
                }
            }
            // Pad the number with leading zeros if needed to maintain a consistent format.
            String formattedId = String.format("%02d", nextId);
            return prefix + formattedId; // e.g., R01, R02, ..., R10

        } catch (Exception e) {
            throw new RuntimeException("Error generating Role ID", e);
        }
    }
}