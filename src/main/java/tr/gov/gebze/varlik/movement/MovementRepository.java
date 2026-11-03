package tr.gov.gebze.varlik.movement;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tr.gov.gebze.varlik.security.TenantQueryScope;

@Repository
public class MovementRepository {

    private final JdbcClient jdbcClient;
    private final TenantQueryScope tenantQueryScope;

    public MovementRepository(JdbcClient jdbcClient, TenantQueryScope tenantQueryScope) {
        this.jdbcClient = jdbcClient;
        this.tenantQueryScope = tenantQueryScope;
    }

    public List<AssetMovement> findAll(Long assetId, String movementType) {
        StringBuilder sql = new StringBuilder("""
            SELECT m.id, m.asset_id, m.asset_code, m.asset_name, m.movement_type, m.type_label,
                   m.from_unit, m.from_location, m.to_unit, m.to_location, m.performed_by, m.note,
                   TO_CHAR(m.created_at, 'YYYY-MM-DD HH24:MI') AS ts
            FROM asset_movements m
            JOIN assets a ON m.asset_id = a.id
            WHERE a.is_deleted = 0
        """);

        sql.append(" AND ").append(tenantQueryScope.getAssetFilterClause("a"));

        List<Object> params = new ArrayList<>();

        if (assetId != null) {
            sql.append(" AND m.asset_id = ?");
            params.add(assetId);
        }

        if (movementType != null && !movementType.isBlank() && !"Tümü".equalsIgnoreCase(movementType)) {
            sql.append(" AND m.movement_type = ?");
            params.add(movementType.trim());
        }

        sql.append(" ORDER BY m.id DESC");

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

