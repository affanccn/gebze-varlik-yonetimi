package tr.gov.gebze.varlik.asset;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tr.gov.gebze.varlik.common.PageResponse;
import tr.gov.gebze.varlik.common.SortValidator;
import tr.gov.gebze.varlik.security.TenantQueryScope;

@Repository
public class AssetRepository {

    private final JdbcClient jdbcClient;
    private final TenantQueryScope tenantQueryScope;

    public AssetRepository(JdbcClient jdbcClient, TenantQueryScope tenantQueryScope) {
        this.jdbcClient = jdbcClient;
        this.tenantQueryScope = tenantQueryScope;
    }

    public PageResponse<Asset> findPage(
            String query,
            String category,
            String unit,
            String status,
            String condition,
            String warrantyFilter,
            String sortBy,
            Long departmentId,
            Long subUnitId,
            Long buildingId,
            Long floorId,
            Long roomId,
            Long categoryId,
            Long assignedPersonnelId,
            String lifecycleStatus,
            Boolean isActive,
            int page,
            int size
    ) {
        SortValidator.validatePagination(page, size);

        StringBuilder whereClause = new StringBuilder(" WHERE a.is_deleted = 0");
        List<Object> params = new ArrayList<>();

        whereClause.append(" AND ").append(tenantQueryScope.getAssetFilterClause("a"));

        if (isActive != null) {
            whereClause.append(" AND a.is_active = ?");
            params.add(isActive ? 1 : 0);
        }

        if (query != null && !query.isBlank()) {
            String q = "%" + query.trim() + "%";
            whereClause.append("""
                 AND (a.code LIKE ?
                   OR a.name LIKE ?
                   OR a.barcode LIKE ?
                   OR a.brand_model LIKE ?
                   OR a.serial_number LIKE ?
                   OR a.tif_code LIKE ?
                   OR d.name LIKE ?
                   OR b.name LIKE ?
                   OR r.name LIKE ?
                   OR r.room_number LIKE ?
                   OR c.name LIKE ?)
            """);
            for (int i = 0; i < 11; i++) {
                params.add(q);
            }
        }

        if (category != null && !category.isBlank() && !"Tümü".equalsIgnoreCase(category)) {
            String cat = category.trim();
            try {
                long catId = Long.parseLong(cat);
                whereClause.append(" AND (a.category_id = ? OR a.category = ?)");
                params.add(catId);
                params.add(cat);
            } catch (NumberFormatException e) {
                whereClause.append(" AND (c.name LIKE ? OR a.category LIKE ?)");
                params.add("%" + cat + "%");
                params.add("%" + cat + "%");
            }
        }

        if (unit != null && !unit.isBlank() && !"Tümü".equalsIgnoreCase(unit)) {
            whereClause.append(" AND (a.unit_name LIKE ? OR d.name LIKE ? OR s.name LIKE ?)");
            String u = "%" + unit.trim() + "%";
            params.add(u);
            params.add(u);
            params.add(u);
        }

        if (status != null && !status.isBlank() && !"Tümü".equalsIgnoreCase(status)) {
            whereClause.append(" AND a.status = ?");
            params.add(status.trim());
        }

        if (condition != null && !condition.isBlank() && !"Tümü".equalsIgnoreCase(condition)) {
            whereClause.append(" AND a.condition_status = ?");
            params.add(condition.trim());
        }

        if (warrantyFilter != null && !warrantyFilter.isBlank() && !"ALL".equalsIgnoreCase(warrantyFilter)) {
            if ("EXPIRED_OR_SOON".equalsIgnoreCase(warrantyFilter)) {
                whereClause.append(" AND (a.warranty_end_date IS NOT NULL AND a.warranty_end_date <= TRUNC(SYSDATE) + 90)");
            } else if ("ACTIVE".equalsIgnoreCase(warrantyFilter)) {
                whereClause.append(" AND (a.warranty_end_date IS NOT NULL AND a.warranty_end_date > TRUNC(SYSDATE))");
            }
        }

        if (departmentId != null) {
            whereClause.append(" AND a.department_id = ?");
            params.add(departmentId);
        }

        if (subUnitId != null) {
            whereClause.append(" AND a.sub_unit_id = ?");
            params.add(subUnitId);
        }

        if (buildingId != null) {
            whereClause.append(" AND a.building_id = ?");
            params.add(buildingId);
        }

        if (floorId != null) {
            whereClause.append(" AND a.floor_id = ?");
            params.add(floorId);
        }

        if (roomId != null) {
            whereClause.append(" AND a.room_id = ?");
            params.add(roomId);
        }

        if (categoryId != null) {
            whereClause.append(" AND a.category_id = ?");
            params.add(categoryId);
        }

        if (assignedPersonnelId != null) {
            whereClause.append("""
                 AND (
                     a.assignee_name = (SELECT p.full_name FROM personnel p WHERE p.id = ?)
                     OR EXISTS (
                         SELECT 1 FROM asset_assignments aa
                         WHERE aa.asset_id = a.id
                           AND aa.personnel_id = ?
                           AND aa.status = 'AKTIF'
                     )
                 )
            """);
            params.add(assignedPersonnelId);
            params.add(assignedPersonnelId);
        }

        if (lifecycleStatus != null && !lifecycleStatus.isBlank() && !"Tümü".equalsIgnoreCase(lifecycleStatus)) {
            whereClause.append(" AND a.lifecycle_status = ?");
            params.add(lifecycleStatus.trim());
        }

        String fromClause = """
            FROM assets a
            LEFT JOIN departments d ON a.department_id = d.id
            LEFT JOIN sub_units s ON a.sub_unit_id = s.id
            LEFT JOIN buildings b ON a.building_id = b.id
            LEFT JOIN floors f ON a.floor_id = f.id
            LEFT JOIN rooms r ON a.room_id = r.id
            LEFT JOIN asset_categories c ON a.category_id = c.id
        """;

        // Total count query (capped at 10001)
        String countSql = "SELECT COUNT(*) FROM (SELECT 1 " + fromClause + whereClause.toString() + " FETCH FIRST 10001 ROWS ONLY)";
        var countSpec = jdbcClient.sql(countSql);
        for (int i = 0; i < params.size(); i++) {
            countSpec = countSpec.param(i + 1, params.get(i));
        }
        Long totalCount = countSpec.query(Long.class).single();
        long total = totalCount != null ? totalCount : 0L;

        // Data query
        String orderBy = SortValidator.buildOrderBy(sortBy, SortValidator.ASSET_SORT_FIELDS, "a.id DESC", "a.id DESC");
        String dataSql = """
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
                   a.category_id, c.name AS cat_name,
                   a.lifecycle_status
        """ + fromClause + whereClause.toString() + " ORDER BY " + orderBy + " OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";

        List<Object> dataParams = new ArrayList<>(params);
        dataParams.add((long) page * size);
        dataParams.add(size);

        var dataSpec = jdbcClient.sql(dataSql);
        for (int i = 0; i < dataParams.size(); i++) {
            dataSpec = dataSpec.param(i + 1, dataParams.get(i));
        }
        List<Asset> items = dataSpec.query(this::mapAsset).list();

        return PageResponse.of(items, total, page, size);
    }

    public List<Asset> findAssetsForExport(
            String query,
            String category,
            String unit,
            String status,
            String condition,
            String warrantyFilter,
            String sortBy,
            Long departmentId,
            Long subUnitId,
            Long buildingId,
            Long floorId,
            Long roomId,
            Long categoryId,
            Long assignedPersonnelId,
            String lifecycleStatus,
            Boolean isActive
    ) {
        StringBuilder whereClause = new StringBuilder(" WHERE a.is_deleted = 0");
        List<Object> params = new ArrayList<>();

        whereClause.append(" AND ").append(tenantQueryScope.getAssetFilterClause("a"));

        if (isActive != null) {
            whereClause.append(" AND a.is_active = ?");
            params.add(isActive ? 1 : 0);
        }

        if (query != null && !query.isBlank()) {
            String q = "%" + query.trim() + "%";
            whereClause.append("""
                 AND (a.code LIKE ?
                   OR a.name LIKE ?
                   OR a.barcode LIKE ?
                   OR a.brand_model LIKE ?
                   OR a.serial_number LIKE ?
                   OR a.tif_code LIKE ?
                   OR d.name LIKE ?
                   OR b.name LIKE ?
                   OR r.name LIKE ?
                   OR r.room_number LIKE ?
                   OR c.name LIKE ?)
            """);
            for (int i = 0; i < 11; i++) {
                params.add(q);
            }
        }

        if (category != null && !category.isBlank() && !"Tümü".equalsIgnoreCase(category)) {
            String cat = category.trim();
            try {
                long catId = Long.parseLong(cat);
                whereClause.append(" AND (a.category_id = ? OR a.category = ?)");
                params.add(catId);
                params.add(cat);
            } catch (NumberFormatException e) {
                whereClause.append(" AND (c.name LIKE ? OR a.category LIKE ?)");
                params.add("%" + cat + "%");
                params.add("%" + cat + "%");
            }
        }

        if (unit != null && !unit.isBlank() && !"Tümü".equalsIgnoreCase(unit)) {
            whereClause.append(" AND (a.unit_name LIKE ? OR d.name LIKE ? OR s.name LIKE ?)");
            String u = "%" + unit.trim() + "%";
            params.add(u);
            params.add(u);
            params.add(u);
        }

        if (status != null && !status.isBlank() && !"Tümü".equalsIgnoreCase(status)) {
            whereClause.append(" AND a.status = ?");
            params.add(status.trim());
        }

        if (condition != null && !condition.isBlank() && !"Tümü".equalsIgnoreCase(condition)) {
            whereClause.append(" AND a.condition_status = ?");
            params.add(condition.trim());
        }

        if (warrantyFilter != null && !warrantyFilter.isBlank() && !"ALL".equalsIgnoreCase(warrantyFilter)) {
            if ("EXPIRED_OR_SOON".equalsIgnoreCase(warrantyFilter)) {
                whereClause.append(" AND (a.warranty_end_date IS NOT NULL AND a.warranty_end_date <= TRUNC(SYSDATE) + 90)");
            } else if ("ACTIVE".equalsIgnoreCase(warrantyFilter)) {
                whereClause.append(" AND (a.warranty_end_date IS NOT NULL AND a.warranty_end_date > TRUNC(SYSDATE))");
            }
        }

        if (departmentId != null) {
            whereClause.append(" AND a.department_id = ?");
            params.add(departmentId);
        }

        if (subUnitId != null) {
            whereClause.append(" AND a.sub_unit_id = ?");
            params.add(subUnitId);
        }

        if (buildingId != null) {
            whereClause.append(" AND a.building_id = ?");
            params.add(buildingId);
        }

        if (floorId != null) {
            whereClause.append(" AND a.floor_id = ?");
            params.add(floorId);
        }

        if (roomId != null) {
            whereClause.append(" AND a.room_id = ?");
            params.add(roomId);
        }

        if (categoryId != null) {
            whereClause.append(" AND a.category_id = ?");
            params.add(categoryId);
        }

        if (assignedPersonnelId != null) {
            whereClause.append("""
                 AND (
                     a.assignee_name = (SELECT p.full_name FROM personnel p WHERE p.id = ?)
                     OR EXISTS (
                         SELECT 1 FROM asset_assignments aa
                         WHERE aa.asset_id = a.id
                           AND aa.personnel_id = ?
                           AND aa.status = 'AKTIF'
                     )
                 )
            """);
            params.add(assignedPersonnelId);
            params.add(assignedPersonnelId);
        }

        if (lifecycleStatus != null && !lifecycleStatus.isBlank() && !"Tümü".equalsIgnoreCase(lifecycleStatus)) {
            whereClause.append(" AND a.lifecycle_status = ?");
            params.add(lifecycleStatus.trim());
        }

        String fromClause = """
            FROM assets a
            LEFT JOIN departments d ON a.department_id = d.id
            LEFT JOIN sub_units s ON a.sub_unit_id = s.id
            LEFT JOIN buildings b ON a.building_id = b.id
            LEFT JOIN floors f ON a.floor_id = f.id
            LEFT JOIN rooms r ON a.room_id = r.id
            LEFT JOIN asset_categories c ON a.category_id = c.id
        """;

        String orderBy = SortValidator.buildOrderBy(sortBy, SortValidator.ASSET_SORT_FIELDS, "a.id DESC", "a.id DESC");
        String dataSql = """
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
                   a.category_id, c.name AS cat_name,
                   a.lifecycle_status
        """ + fromClause + whereClause.toString() + " ORDER BY " + orderBy + " FETCH FIRST 5000 ROWS ONLY";

        var dataSpec = jdbcClient.sql(dataSql);
        for (int i = 0; i < params.size(); i++) {
            dataSpec = dataSpec.param(i + 1, params.get(i));
        }
        return dataSpec.query(this::mapAsset).list();
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
                   a.category_id, c.name AS cat_name,
                   a.lifecycle_status
            FROM assets a
            LEFT JOIN departments d ON a.department_id = d.id
            LEFT JOIN sub_units s ON a.sub_unit_id = s.id
            LEFT JOIN buildings b ON a.building_id = b.id
            LEFT JOIN floors f ON a.floor_id = f.id
            LEFT JOIN rooms r ON a.room_id = r.id
            LEFT JOIN asset_categories c ON a.category_id = c.id
            WHERE a.is_deleted = 0
        """);

        sql.append(" AND ").append(tenantQueryScope.getAssetFilterClause("a"));

        List<Object> params = new ArrayList<>();

        if (query != null && !query.isBlank()) {
            String q = "%" + query.trim() + "%";
            sql.append("""
                 AND (a.code LIKE ?
                   OR a.name LIKE ?
                   OR a.barcode LIKE ?
                   OR a.brand_model LIKE ?
                   OR a.serial_number LIKE ?
                   OR a.tif_code LIKE ?
                   OR d.name LIKE ?
                   OR b.name LIKE ?
                   OR r.name LIKE ?
                   OR r.room_number LIKE ?
                   OR c.name LIKE ?)
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
                sql.append("""
                     AND (c.name = ?
                       OR a.category = ?
                       OR c.name LIKE ?
                       OR a.category LIKE ?)
                """);
                params.add(cat);
                params.add(cat);
                params.add("%" + cat + "%");
                params.add("%" + cat + "%");
            }
        }

        if (unit != null && !unit.isBlank() && !"Tümü".equalsIgnoreCase(unit)) {
            sql.append(" AND (a.unit_name LIKE ? OR d.name LIKE ? OR s.name LIKE ?)");
            String u = "%" + unit.trim() + "%";
            params.add(u);
            params.add(u);
            params.add(u);
        }

        if (status != null && !status.isBlank() && !"Tümü".equalsIgnoreCase(status)) {
            String st = status.trim();
            sql.append(" AND (a.status = ? OR a.status LIKE ?)");
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

        var spec = jdbcClient.sql(sql.toString());
        for (int i = 0; i < params.size(); i++) {
            spec = spec.param(i + 1, params.get(i));
        }
        return spec.query(this::mapAsset).list();
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
                   a.category_id, c.name AS cat_name,
                   a.lifecycle_status
            FROM assets a
            LEFT JOIN departments d ON a.department_id = d.id
            LEFT JOIN sub_units s ON a.sub_unit_id = s.id
            LEFT JOIN buildings b ON a.building_id = b.id
            LEFT JOIN floors f ON a.floor_id = f.id
            LEFT JOIN rooms r ON a.room_id = r.id
            LEFT JOIN asset_categories c ON a.category_id = c.id
            WHERE a.id = :id AND a.is_deleted = 0
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
                   a.category_id, c.name AS cat_name,
                   a.lifecycle_status
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
        String lifecycle = a.lifecycleStatus() != null ? a.lifecycleStatus() : "KAYDEDILDI";
        String legacyStatus = a.status() != null ? a.status() : "Depoda";
        int isActive = 1;
        try {
            isActive = tr.gov.gebze.varlik.lifecycle.AssetLifecycleStatus.fromString(lifecycle).isActive() ? 1 : 0;
        } catch (Exception ignored) {}

        String sql = """
            INSERT INTO assets (
                code, tif_code, barcode, name, category, brand_model, serial_number,
                unit_name, location_info, assignee_name, status, condition_status,
                acquisition_date, warranty_end_date, estimated_value, supplier, notes,
                department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active, lifecycle_status
            ) VALUES (
                :code, :tifCode, :barcode, :name, :category, :brandModel, :serialNumber,
                :unitName, :locationInfo, :assigneeName, :status, :conditionStatus,
                CASE WHEN :acqDate IS NOT NULL THEN TO_DATE(:acqDate, 'YYYY-MM-DD') ELSE NULL END,
                CASE WHEN :warDate IS NOT NULL THEN TO_DATE(:warDate, 'YYYY-MM-DD') ELSE NULL END,
                :estValue, :supplier, :notes,
                :deptId, :subId, :bldId, :flrId, :roomId, :catId, :isActive, :lifecycleStatus
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
                .param("status", legacyStatus)
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
                .param("isActive", isActive)
                .param("lifecycleStatus", lifecycle)
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
            WHERE id = :id AND is_deleted = 0
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

    public void updateLocationAndAssignee(Long id, String assignee, String locationInfo, String unitName) {
        String sql = """
            UPDATE assets SET
                assignee_name = :assignee,
                location_info = COALESCE(:location, location_info),
                unit_name = COALESCE(:unit, unit_name),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id AND is_deleted = 0
        """;
        jdbcClient.sql(sql)
                .param("assignee", assignee)
                .param("location", locationInfo)
                .param("unit", unitName)
                .param("id", id)
                .update();
    }

    public void updateLocationAssigneeAndCondition(Long id, String assignee, String locationInfo, String unitName, String condition) {
        String sql = """
            UPDATE assets SET
                assignee_name = :assignee,
                location_info = COALESCE(:location, location_info),
                unit_name = COALESCE(:unit, unit_name),
                condition_status = COALESCE(:condition, condition_status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id AND is_deleted = 0
        """;
        jdbcClient.sql(sql)
                .param("assignee", assignee)
                .param("location", locationInfo)
                .param("unit", unitName)
                .param("condition", condition)
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
                department_id = COALESCE(CAST(:deptId AS NUMBER), department_id),
                sub_unit_id = COALESCE(CAST(:subId AS NUMBER), sub_unit_id),
                location_info = :locationInfo,
                unit_name = COALESCE(CAST(:unitName AS VARCHAR2(255)), unit_name),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id AND is_deleted = 0
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

    public void softDelete(Long id, String deletedBy) {
        jdbcClient.sql("UPDATE assets SET is_active = 0, is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = :deletedBy, updated_at = CURRENT_TIMESTAMP WHERE id = :id")
                .param("deletedBy", deletedBy != null ? deletedBy : "admin")
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
                rs.getString("cat_name"),
                rs.getString("lifecycle_status")
        );
    }
}

