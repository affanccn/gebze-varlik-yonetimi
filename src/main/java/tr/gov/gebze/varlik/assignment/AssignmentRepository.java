package tr.gov.gebze.varlik.assignment;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class AssignmentRepository {

    private final JdbcClient jdbcClient;

    public AssignmentRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<AssetAssignment> findAll(Long assetId, String status) {
        StringBuilder sql = new StringBuilder("""
            SELECT aa.id, aa.document_no, aa.asset_id, a.code AS asset_code, a.name AS asset_name,
                   aa.assignee_name, aa.assignee_title, aa.unit_name, aa.location_info, aa.status,
                   aa.assigned_by,
                   TO_CHAR(aa.assigned_at, 'YYYY-MM-DD HH24:MI') AS assigned_at_str,
                   TO_CHAR(aa.returned_at, 'YYYY-MM-DD HH24:MI') AS returned_at_str,
                   aa.return_note, aa.note
            FROM asset_assignments aa
            JOIN assets a ON aa.asset_id = a.id
            WHERE 1=1
        """);

        List<Object> params = new ArrayList<>();

        if (assetId != null) {
            sql.append(" AND aa.asset_id = ?");
            params.add(assetId);
        }

        if (status != null && !status.isBlank() && !"Tümü".equalsIgnoreCase(status)) {
            sql.append(" AND aa.status = ?");
            params.add(status.trim());
        }

        sql.append(" ORDER BY aa.id DESC");

        var spec = jdbcClient.sql(sql.toString());
        for (int i = 0; i < params.size(); i++) {
            spec = spec.param(params.get(i));
        }

        return spec.query(this::mapAssignment).list();
    }

    public Optional<AssetAssignment> findById(Long id) {
        String sql = """
            SELECT aa.id, aa.document_no, aa.asset_id, a.code AS asset_code, a.name AS asset_name,
                   aa.assignee_name, aa.assignee_title, aa.unit_name, aa.location_info, aa.status,
                   aa.assigned_by,
                   TO_CHAR(aa.assigned_at, 'YYYY-MM-DD HH24:MI') AS assigned_at_str,
                   TO_CHAR(aa.returned_at, 'YYYY-MM-DD HH24:MI') AS returned_at_str,
                   aa.return_note, aa.note
            FROM asset_assignments aa
            JOIN assets a ON aa.asset_id = a.id
            WHERE aa.id = :id
        """;
        return jdbcClient.sql(sql).param("id", id).query(this::mapAssignment).optional();
    }

    public void save(AssetAssignment a) {
        String sql = """
            INSERT INTO asset_assignments (
                document_no, asset_id, assignee_name, assignee_title, unit_name, location_info,
                status, assigned_by, assigned_at, note
            ) VALUES (
                :docNo, :assetId, :name, :title, :unit, :loc, :status, :assignedBy, CURRENT_TIMESTAMP, :note
            )
        """;
        jdbcClient.sql(sql)
                .param("docNo", a.documentNo())
                .param("assetId", a.assetId())
                .param("name", a.assigneeName())
                .param("title", a.assigneeTitle())
                .param("unit", a.unit())
                .param("loc", a.location())
                .param("status", a.status() == null ? "AKTIF" : a.status())
                .param("assignedBy", a.assignedBy())
                .param("note", a.note())
                .update();
    }

    public void returnAssignment(Long id, String returnNote) {
        String sql = """
            UPDATE asset_assignments SET
                status = 'IADE_EDILDI',
                returned_at = CURRENT_TIMESTAMP,
                return_note = :note
            WHERE id = :id
        """;
        jdbcClient.sql(sql).param("note", returnNote).param("id", id).update();
    }

    private AssetAssignment mapAssignment(ResultSet rs, int rowNum) throws SQLException {
        return new AssetAssignment(
                rs.getLong("id"),
                rs.getString("document_no"),
                rs.getLong("asset_id"),
                rs.getString("asset_code"),
                rs.getString("asset_name"),
                rs.getString("assignee_name"),
                rs.getString("assignee_title"),
                rs.getString("unit_name"),
                rs.getString("location_info"),
                rs.getString("status"),
                rs.getString("assigned_by"),
                rs.getString("assigned_at_str"),
                rs.getString("returned_at_str"),
                rs.getString("return_note"),
                rs.getString("note")
        );
    }
}

