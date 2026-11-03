package tr.gov.gebze.varlik.movement;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class MaintenanceRepository {

    private final JdbcClient jdbcClient;

    public MaintenanceRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<MaintenanceRecord> findAll(Long assetId, String status) {
        StringBuilder sql = new StringBuilder("""
            SELECT m.id, m.order_no, m.asset_id, a.code AS asset_code, a.name AS asset_name,
                   m.maintenance_type, m.priority, m.vendor_or_technician, m.issue_description,
                   m.resolution_note, m.cost, m.status,
                   TO_CHAR(m.started_at, 'YYYY-MM-DD HH24:MI') AS started_at_str,
                   TO_CHAR(m.completed_at, 'YYYY-MM-DD HH24:MI') AS completed_at_str,
                   m.created_by
            FROM asset_maintenances m
            JOIN assets a ON m.asset_id = a.id
            WHERE 1=1
        """);

        List<Object> params = new ArrayList<>();

        if (assetId != null) {
            sql.append(" AND m.asset_id = ?");
            params.add(assetId);
        }

        if (status != null && !status.isBlank() && !"Tümü".equalsIgnoreCase(status)) {
            sql.append(" AND m.status = ?");
            params.add(status.trim());
        }

        sql.append(" ORDER BY m.id DESC");

        var spec = jdbcClient.sql(sql.toString());
        for (int i = 0; i < params.size(); i++) {
            spec = spec.param(params.get(i));
        }

        return spec.query(this::mapRecord).list();
    }

    public Optional<MaintenanceRecord> findById(Long id) {
        String sql = """
            SELECT m.id, m.order_no, m.asset_id, a.code AS asset_code, a.name AS asset_name,
                   m.maintenance_type, m.priority, m.vendor_or_technician, m.issue_description,
                   m.resolution_note, m.cost, m.status,
                   TO_CHAR(m.started_at, 'YYYY-MM-DD HH24:MI') AS started_at_str,
                   TO_CHAR(m.completed_at, 'YYYY-MM-DD HH24:MI') AS completed_at_str,
                   m.created_by
            FROM asset_maintenances m
            JOIN assets a ON m.asset_id = a.id
            WHERE m.id = :id
        """;
        return jdbcClient.sql(sql).param("id", id).query(this::mapRecord).optional();
    }

    public void save(MaintenanceRecord m) {
        String sql = """
            INSERT INTO asset_maintenances (
                order_no, asset_id, maintenance_type, priority, vendor_or_technician,
                issue_description, cost, status, started_at, created_by
            ) VALUES (
                :orderNo, :assetId, :type, :priority, :vendor,
                :issue, :cost, :status, CURRENT_TIMESTAMP, :createdBy
            )
        """;
        jdbcClient.sql(sql)
                .param("orderNo", m.orderNo())
                .param("assetId", m.assetId())
                .param("type", m.maintenanceType())
                .param("priority", m.priority())
                .param("vendor", m.vendorOrTechnician())
                .param("issue", m.issueDescription())
                .param("cost", m.cost() == null ? 0.0 : m.cost())
                .param("status", m.status() == null ? "DEVAM_EDIYOR" : m.status())
                .param("createdBy", m.createdBy())
                .update();
    }

    public void complete(Long id, String resolutionNote, Double cost) {
        String sql = """
            UPDATE asset_maintenances SET
                status = 'TAMAMLANDI',
                resolution_note = :resNote,
                cost = COALESCE(:cost, cost),
                completed_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """;
        jdbcClient.sql(sql)
                .param("resNote", resolutionNote)
                .param("cost", cost)
                .param("id", id)
                .update();
    }

    private MaintenanceRecord mapRecord(ResultSet rs, int rowNum) throws SQLException {
        return new MaintenanceRecord(
                rs.getLong("id"),
                rs.getString("order_no"),
                rs.getLong("asset_id"),
                rs.getString("asset_code"),
                rs.getString("asset_name"),
                rs.getString("maintenance_type"),
                rs.getString("priority"),
                rs.getString("vendor_or_technician"),
                rs.getString("issue_description"),
                rs.getString("resolution_note"),
                rs.getObject("cost") == null ? 0.0 : rs.getDouble("cost"),
                rs.getString("status"),
                rs.getString("started_at_str"),
                rs.getString("completed_at_str"),
                rs.getString("created_by")
        );
    }
}

