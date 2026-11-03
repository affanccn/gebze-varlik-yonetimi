package tr.gov.gebze.varlik.asset;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tr.gov.gebze.varlik.security.TenantQueryScope;

@Repository
public class AssetRepository {

    private final JdbcClient jdbcClient;
    private final TenantQueryScope tenantQueryScope;

    public AssetRepository(JdbcClient jdbcClient, TenantQueryScope tenantQueryScope) {
        this.jdbcClient = jdbcClient;
        this.tenantQueryScope = tenantQueryScope;
    }

    public List<Asset> findAll(
            String query,
            String category,
            String unit,
            String status,
            Long departmentId,
            Long subUnitId,
            Long buildingId,
            Long floorId,
            Long roomId,
            Long categoryId
    ) {
        StringBuilder sql = new StringBuilder("""
            SELECT a.id, a.code, a.tif_code, a.barcode, a.name, a.category, a.brand_model, a.serial_number,
                   a.unit_name, a.location_info, a.assignee_name, a.status, a.condition_status,
                   TO_CHAR(a.acquisition_date, 'YYYY-MM-DD') AS acq_date,
                   TO_CHAR(a.warranty_end_date, 'YYYY-MM-DD') AS war_date,
                   a.estimated_value, a.supplier, a.notes,
                   TO_CHAR(a.updated_at, 'YYYY-MM-DD HH24:MI') AS upd_at,
                   a.department_id, d.name AS dept_name,
                   a.sub_unit_id, s.name AS sub_name,
                   a.building_id, b.name AS bld_name,
                   a.floor_id, f.floor_name,
                   a.room_id, r.room_number, r.name AS room_name, r.qr_code AS room_qr,
                   a.category_id, c.name AS cat_name
            FROM assets a
            LEFT JOIN departments d ON a.department_id = d.id
            LEFT JOIN sub_units s ON a.sub_unit_id = s.id
            LEFT JOIN buildings b ON a.building_id = b.id
            LEFT JOIN floors f ON a.floor_id = f.id
            LEFT JOIN rooms r ON a.room_id = r.id
            LEFT JOIN asset_categories c ON a.category_id = c.id
            WHERE a.is_active = 1 AND a.is_deleted = 0
        """);

        sql.append(" AND ").append(tenantQueryScope.getAssetFilterClause("a"));

        List<Object> params = new ArrayList<>();

        if (query != null && !query.isBlank()) {
            String q = "%" + query.trim() + "%";
            sql.append("""
                 AND (LOWER(a.code) LIKE LOWER(?)
                   OR LOWER(a.name) LIKE LOWER(?)
                   OR LOWER(a.barcode) LIKE LOWER(?)
                   OR LOWER(a.brand_model) LIKE LOWER(?)
                   OR LOWER(a.serial_number) LIKE LOWER(?)
                   OR LOWER(a.tif_code) LIKE LOWER(?)
                   OR LOWER(d.name) LIKE LOWER(?)
                   OR LOWER(b.name) LIKE LOWER(?)
                   OR LOWER(r.name) LIKE LOWER(?)
                   OR LOWER(r.room_number) LIKE LOWER(?)
                   OR LOWER(c.name) LIKE LOWER(?))
            """);
            for (int i = 0; i < 11; i++) {
                params.add(q);
            }
        }

        if (category != null && !category.isBlank() && !"Tümü".equalsIgnoreCase(category)) {
            String cat = category.trim();
            try {
                long catId = Long.parseLong(cat);
                sql.append(" AND (a.category_id = ? OR a.category = ?)");
                params.add(catId);
                params.add(cat);
            } catch (NumberFormatException e) {
                String base = cat.replaceAll("(?i)(lar|ler|sı|si|ı|i)$", "");
                sql.append("""
                     AND (c.name = ?
                       OR a.category = ?
                       OR LOWER(c.name) LIKE LOWER(?)
                       OR LOWER(a.category) LIKE LOWER(?))
                """);
                params.add(cat);
                params.add(cat);
                params.add("%" + base + "%");
                params.add("%" + base + "%");
            }
        }

        if (unit != null && !unit.isBlank() && !"Tümü".equalsIgnoreCase(unit)) {
            sql.append(" AND (a.unit_name LIKE ? OR LOWER(d.name) LIKE LOWER(?) OR LOWER(s.name) LIKE LOWER(?))");
            String u = "%" + unit.trim() + "%";
            params.add("%" + unit.trim() + "%");
            params.add(u);
            params.add(u);
        }

        if (status != null && !status.isBlank() && !"Tümü".equalsIgnoreCase(status)) {
            String st = status.trim();
            sql.append(" AND (a.status = ? OR LOWER(a.status) = LOWER(?) OR LOWER(a.status) LIKE LOWER(?))");
            params.add(st);
            params.add(st);
            params.add("%" + st + "%");
        }

        if (departmentId != null) {
            sql.append(" AND a.department_id = ?");
            params.add(departmentId);
        }

        if (subUnitId != null) {
            sql.append(" AND a.sub_unit_id = ?");
            params.add(subUnitId);
        }

        if (buildingId != null) {
            sql.append(" AND a.building_id = ?");
            params.add(buildingId);
        }

        if (floorId != null) {
            sql.append(" AND a.floor_id = ?");
            params.add(floorId);
        }

        if (roomId != null) {
            sql.append(" AND a.room_id = ?");
            params.add(roomId);
        }

        if (categoryId != null) {
            sql.append(" AND a.category_id = ?");
            params.add(categoryId);
        }

        sql.append(" ORDER BY a.id DESC");

        return jdbcClient.sql(sql.toString())
                .params(params)
                .query(this::mapAsset)
                .list();
    }

    public Optional<Asset> findById(Long id) {
        String sql = """
            SELECT a.id, a.code, a.tif_code, a.barcode, a.name, a.category, a.brand_model, a.serial_number,
                   a.unit_name, a.location_info, a.assignee_name, a.status, a.condition_status,
                   TO_CHAR(a.acquisition_date, 'YYYY-MM-DD') AS acq_date,
                   TO_CHAR(a.warranty_end_date, 'YYYY-MM-DD') AS war_date,
                   a.estimated_value, a.supplier, a.notes,
                   TO_CHAR(a.updated_at, 'YYYY-MM-DD HH24:MI') AS upd_at,
                   a.department_id, d.name AS dept_name,
                   a.sub_unit_id, s.name AS sub_name,
                   a.building_id, b.name AS bld_name,
                   a.floor_id, f.floor_name,
                   a.room_id, r.room_number, r.name AS room_name, r.qr_code AS room_qr,
                   a.category_id, c.name AS cat_name
            FROM assets a
            LEFT JOIN departments d ON a.department_id = d.id
            LEFT JOIN sub_units s ON a.sub_unit_id = s.id
            LEFT JOIN buildings b ON a.building_id = b.id
            LEFT JOIN floors f ON a.floor_id = f.id
            LEFT JOIN rooms r ON a.room_id = r.id
            LEFT JOIN asset_categories c ON a.category_id = c.id
            WHERE a.id = :id AND a.is_active = 1 AND a.is_deleted = 0
        """;
        return jdbcClient.sql(sql).param("id", id).query(this::mapAsset).optional();
    }

    public Optional<Asset> findByCode(String code) {
        String sql = """
            SELECT a.id, a.code, a.tif_code, a.barcode, a.name, a.category, a.brand_model, a.serial_number,
                   a.unit_name, a.location_info, a.assignee_name, a.status, a.condition_status,
                   TO_CHAR(a.acquisition_date, 'YYYY-MM-DD') AS acq_date,
                   TO_CHAR(a.warranty_end_date, 'YYYY-MM-DD') AS war_date,
                   a.estimated_value, a.supplier, a.notes,
                   TO_CHAR(a.updated_at, 'YYYY-MM-DD HH24:MI') AS upd_at,
                   a.department_id, d.name AS dept_name,
                   a.sub_unit_id, s.name AS sub_name,
                   a.building_id, b.name AS bld_name,
                   a.floor_id, f.floor_name,
                   a.room_id, r.room_number, r.name AS room_name, r.qr_code AS room_qr,
                   a.category_id, c.name AS cat_name
            FROM assets a
            LEFT JOIN departments d ON a.department_id = d.id
            LEFT JOIN sub_units s ON a.sub_unit_id = s.id
            LEFT JOIN buildings b ON a.building_id = b.id
            LEFT JOIN floors f ON a.floor_id = f.id
            LEFT JOIN rooms r ON a.room_id = r.id
            LEFT JOIN asset_categories c ON a.category_id = c.id
            WHERE UPPER(a.code) = UPPER(:code) AND a.is_active = 1 AND a.is_deleted = 0
        """;
        return jdbcClient.sql(sql).param("code", code).query(this::mapAsset).optional();
    }

    public List<Asset> findByRoomId(Long roomId) {
        return findAll(null, null, null, null, null, null, null, null, roomId, null);
    }

    public Long save(Asset a) {
        String sql = """
            INSERT INTO assets (
                code, tif_code, barcode, name, category, brand_model, serial_number,
                unit_name, location_info, assignee_name, status, condition_status,
                acquisition_date, warranty_end_date, estimated_value, supplier, notes,
                department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
            ) VALUES (
                :code, :tifCode, :barcode, :name, :category, :brandModel, :serialNumber,
                :unitName, :locationInfo, :assigneeName, :status, :conditionStatus,
                CASE WHEN :acqDate IS NOT NULL THEN TO_DATE(:acqDate, 'YYYY-MM-DD') ELSE NULL END,
                CASE WHEN :warDate IS NOT NULL THEN TO_DATE(:warDate, 'YYYY-MM-DD') ELSE NULL END,
                :estValue, :supplier, :notes,
                :deptId, :subId, :bldId, :flrId, :roomId, :catId, 1
            )
        """;
        jdbcClient.sql(sql)
                .param("code", a.code())
                .param("tifCode", a.tifCode())
                .param("barcode", a.barcode())
                .param("name", a.name())
                .param("category", a.category())
                .param("brandModel", a.brandModel())
                .param("serialNumber", a.serialNumber())
                .param("unitName", a.unit() == null ? "" : a.unit())
                .param("locationInfo", a.location() == null ? "" : a.location())
                .param("assigneeName", a.assignee())
                .param("status", a.status() == null ? "Aktif" : a.status())
                .param("conditionStatus", a.condition() == null ? "Çok İyi" : a.condition())
                .param("acqDate", a.acquisitionDate())
                .param("warDate", a.warrantyEndDate())
                .param("estValue", a.estimatedValue() == null ? 0.0 : a.estimatedValue())
                .param("supplier", a.supplier())
                .param("notes", a.notes())
                .param("deptId", a.departmentId())
                .param("subId", a.subUnitId())
                .param("bldId", a.buildingId())
                .param("flrId", a.floorId())
                .param("roomId", a.roomId())
                .param("catId", a.categoryId())
                .update();

        return jdbcClient.sql("SELECT id FROM assets WHERE code = :code")
                .param("code", a.code())
                .query(Long.class).single();
    }

    public void update(Asset a) {
        String sql = """
            UPDATE assets SET
                tif_code = :tifCode,
                barcode = :barcode,
                name = :name,
                category = :category,
                brand_model = :brandModel,
                serial_number = :serialNumber,
                unit_name = :unitName,
                location_info = :locationInfo,
                assignee_name = :assigneeName,
                status = :status,
                condition_status = :conditionStatus,
                acquisition_date = CASE WHEN :acqDate IS NOT NULL THEN TO_DATE(:acqDate, 'YYYY-MM-DD') ELSE NULL END,
                warranty_end_date = CASE WHEN :warDate IS NOT NULL THEN TO_DATE(:warDate, 'YYYY-MM-DD') ELSE NULL END,
                estimated_value = :estValue,
                supplier = :supplier,
                notes = :notes,
                department_id = :deptId,
                sub_unit_id = :subId,
                building_id = :bldId,
                floor_id = :flrId,
                room_id = :roomId,
                category_id = :catId,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """;
        jdbcClient.sql(sql)
                .param("tifCode", a.tifCode())
                .param("barcode", a.barcode())
                .param("name", a.name())
                .param("category", a.category())
                .param("brandModel", a.brandModel())
                .param("serialNumber", a.serialNumber())
                .param("unitName", a.unit() == null ? "" : a.unit())
                .param("locationInfo", a.location() == null ? "" : a.location())
                .param("assigneeName", a.assignee())
                .param("status", a.status())
                .param("conditionStatus", a.condition())
                .param("acqDate", a.acquisitionDate())
                .param("warDate", a.warrantyEndDate())
                .param("estValue", a.estimatedValue() == null ? 0.0 : a.estimatedValue())
                .param("supplier", a.supplier())
                .param("notes", a.notes())
                .param("deptId", a.departmentId())
                .param("subId", a.subUnitId())
                .param("bldId", a.buildingId())
                .param("flrId", a.floorId())
                .param("roomId", a.roomId())
                .param("catId", a.categoryId())
                .param("id", a.id())
                .update();
    }

    public void updateStatusAndAssignee(Long id, String status, String assignee, String locationInfo, String unitName) {
        String sql = """
            UPDATE assets SET
                status = :status,
                assignee_name = :assignee,
                location_info = COALESCE(:location, location_info),
                unit_name = COALESCE(:unit, unit_name),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """;
        jdbcClient.sql(sql)
                .param("status", status)
                .param("assignee", assignee)
                .param("location", locationInfo)
                .param("unit", unitName)
                .param("id", id)
                .update();
    }

    public void updateLocation(
            Long id,
            Long buildingId,
            Long floorId,
            Long roomId,
            Long deptId,
            Long subUnitId,
            String locationInfo,
            String unitName
    ) {
        String sql = """
            UPDATE assets SET
                building_id = :bldId,
                floor_id = :flrId,
                room_id = :roomId,
                department_id = COALESCE(:deptId, department_id),
                sub_unit_id = COALESCE(:subId, sub_unit_id),
                location_info = :locationInfo,
                unit_name = COALESCE(:unitName, unit_name),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """;
        jdbcClient.sql(sql)
                .param("bldId", buildingId)
                .param("flrId", floorId)
                .param("roomId", roomId)
                .param("deptId", deptId)
                .param("subId", subUnitId)
                .param("locationInfo", locationInfo)
                .param("unitName", unitName)
                .param("id", id)
                .update();
    }

    public void softDelete(Long id) {
        jdbcClient.sql("UPDATE assets SET is_active = 0, is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = :id")
                .param("id", id)
                .update();
    }

    private Asset mapAsset(ResultSet rs, int rowNum) throws SQLException {
        return new Asset(
                rs.getLong("id"),
                rs.getString("code"),
                rs.getString("tif_code"),
                rs.getString("barcode"),
                rs.getString("name"),
                rs.getString("category"),
                rs.getString("brand_model"),
                rs.getString("serial_number"),
                rs.getString("unit_name"),
                rs.getString("location_info"),
                rs.getString("assignee_name"),
                rs.getString("status"),
                rs.getString("condition_status"),
                rs.getString("acq_date"),
                rs.getString("war_date"),
                rs.getObject("estimated_value") == null ? 0.0 : rs.getDouble("estimated_value"),
                rs.getString("supplier"),
                rs.getString("notes"),
                rs.getString("upd_at"),
                rs.getObject("department_id") == null ? null : rs.getLong("department_id"),
                rs.getString("dept_name"),
                rs.getObject("sub_unit_id") == null ? null : rs.getLong("sub_unit_id"),
                rs.getString("sub_name"),
                rs.getObject("building_id") == null ? null : rs.getLong("building_id"),
                rs.getString("bld_name"),
                rs.getObject("floor_id") == null ? null : rs.getLong("floor_id"),
                rs.getString("floor_name"),
                rs.getObject("room_id") == null ? null : rs.getLong("room_id"),
                rs.getString("room_number"),
                rs.getString("room_name"),
                rs.getString("room_qr"),
                rs.getObject("category_id") == null ? null : rs.getLong("category_id"),
                rs.getString("cat_name")
        );
    }
}

