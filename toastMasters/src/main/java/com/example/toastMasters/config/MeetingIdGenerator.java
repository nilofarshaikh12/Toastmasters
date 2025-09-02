package com.example.toastMasters.config;

import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.id.IdentifierGenerator;

import java.io.Serializable;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

public class MeetingIdGenerator implements IdentifierGenerator {

    @Override
    public Serializable generate(SharedSessionContractImplementor session, Object object) {
        String prefix = "M";
        String query = "SELECT meeting_id FROM meeting " +
                "ORDER BY CAST(SUBSTRING(meeting_id, 2) AS INTEGER) DESC LIMIT 1";

        try (Connection connection = session.getJdbcConnectionAccess().obtainConnection();
             Statement stmt = connection.createStatement();
             ResultSet rs = stmt.executeQuery(query)) {

            if (rs.next()) {
                String lastId = rs.getString(1); // e.g., M9
                int idNum = Integer.parseInt(lastId.substring(1)); // remove 'M'
                return prefix + (idNum + 1); // → M10
            } else {
                return prefix + "1"; // First entry → M1
            }

        } catch (Exception e) {
            throw new RuntimeException("Error generating Meeting ID", e);
        }
    }
}
