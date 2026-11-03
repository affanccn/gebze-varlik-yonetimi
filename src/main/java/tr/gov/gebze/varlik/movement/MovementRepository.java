package tr.gov.gebze.varlik.movement;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class MovementRepository {

    private final JdbcClient jdbcClient;

    public MovementRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<AssetMovement> findAll(Long assetId, String movementType) {
        StringBuilder sql = new StringBuilder("""
            SELECT id, asset_id, asset_code, asset_name, movement_type, type_label,
                   from_unit, from_location, to_unit, to_location, performed_by, note,
                   TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS ts
            FROM asset_movements
            WHERE 1=1
        """);

        List<Object> params = new ArrayList<>();

        if (assetId != null) {
            sql.append(" AND asset_id = ?");
            params.add(assetId);
        }

        if (movementType != null && !movementType.isBlank() && !"Tümü".equalsIgnoreCase(movementType)) {
            sql.append(" AND movement_type = ?");
            params.add(movementType.trim());
        }

        sql.append(" ORDER BY id DESC");

        var spec = jdbcClient.sql(sql.toString());
        for (int i = 0; i < params.size(); i++) {
            spec = spec.param(params.get(i));
        }

        return spec.query(this::mapMovement).list();
    }

    public void save(AssetMovement m) {
        String sql = """
            INSERT INTO asset_movements (
                asset_id, asset_code, asset_name, movement_type, type_label,
                from_unit, from_location, to_unit, to_location, performed_by, note, created_at
            ) VALUES (
                :assetId, :code, :name, :type, :label,
                :fromUnit, :fromLoc, :toUnit, :toLoc, :perfBy, :note, CURRENT_TIMESTAMP
            )
        """;
        jdbcClient.sql(sql)
                .param("assetId", m.assetId())
                .param("code", m.assetCode())
                .param("name", m.assetName())
                .param("type", m.type())
                .param("label", m.typeLabel())
                .param("fromUnit", m.fromUnit())
                .param("fromLoc", m.fromLocation())
                .param("toUnit", m.toUnit())
                .param("toLoc", m.toLocation())
                .param("perfBy", m.performedBy())
                .param("note", m.note())
                .update();
    }

    private AssetMovement mapMovement(ResultSet rs, int rowNum) throws SQLException {
        return new AssetMovement(
                rs.getLong("id"),
                rs.getLong("asset_id"),
                rs.getString("asset_code"),
                rs.getString("asset_name"),
                rs.getString("movement_type"),
                rs.getString("type_label"),
                rs.getString("from_unit"),
                rs.getString("from_location"),
                rs.getString("to_unit"),
                rs.getString("to_location"),
                rs.getString("performed_by"),
                rs.getString("note"),
                rs.getString("ts")
        );
    }
}

