package tr.gov.gebze.varlik.common;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tr.gov.gebze.varlik.movement.AssetMovement;
import tr.gov.gebze.varlik.movement.MovementRepository;
import tr.gov.gebze.varlik.security.TenantQueryScope;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final JdbcClient jdbcClient;
    private final MovementRepository movementRepository;
    private final TenantQueryScope tenantQueryScope;

    public DashboardController(JdbcClient jdbcClient, MovementRepository movementRepository, TenantQueryScope tenantQueryScope) {
        this.jdbcClient = jdbcClient;
        this.movementRepository = movementRepository;
        this.tenantQueryScope = tenantQueryScope;
    }

    @GetMapping
    public Map<String, Object> getSummary() {
        String assetScope = tenantQueryScope.getAssetFilterClause("a");

        // 1. ÖZET SAYILAR (TAMAMI ORACLE VERİTABANINDAN)
        long totalAssets = queryCount("SELECT COUNT(*) FROM assets a WHERE a.is_active = 1 AND a.is_deleted = 0 AND (" + assetScope + ")");
        long totalBuildings = queryCount("SELECT COUNT(*) FROM buildings WHERE is_active = 1");
        long totalDepartments = queryCount("SELECT COUNT(*) FROM departments WHERE is_active = 1");
        long totalSubUnits = queryCount("SELECT COUNT(*) FROM sub_units WHERE is_active = 1");
        long totalFloors = queryCount("SELECT COUNT(*) FROM floors WHERE is_active = 1");
        long totalRooms = queryCount("SELECT COUNT(*) FROM rooms WHERE is_active = 1");

        long activeCount = queryCount("SELECT COUNT(*) FROM assets a WHERE a.is_active = 1 AND a.is_deleted = 0 AND (a.status = 'Aktif' OR a.status = 'Zimmetli') AND (" + assetScope + ")");
        long inStorageCount = queryCount("SELECT COUNT(*) FROM assets a WHERE a.is_active = 1 AND a.is_deleted = 0 AND a.status = 'Depoda' AND (" + assetScope + ")");
        long maintenanceCount = queryCount("SELECT COUNT(*) FROM assets a WHERE a.is_active = 1 AND a.is_deleted = 0 AND a.status = 'Bakımda' AND (" + assetScope + ")");
        long inactiveCount = queryCount("SELECT COUNT(*) FROM assets a WHERE a.is_active = 1 AND a.is_deleted = 0 AND (a.status = 'Kullanım Dışı' OR a.status = 'Hurda') AND (" + assetScope + ")");

        Double totalEstimatedValue = jdbcClient.sql("SELECT COALESCE(SUM(a.estimated_value), 0) FROM assets a WHERE a.is_active = 1 AND a.is_deleted = 0 AND (" + assetScope + ")")
                .query(Double.class).single();

        // 2. MÜDÜRLÜKLER VE VARLIK DAĞILIMI
        String deptFilter = " 1=1 ";
        if (tenantQueryScope.isDeptManager()) {
            Long deptId = tenantQueryScope.getDepartmentId();
            deptFilter = " d.id = " + (deptId != null ? deptId : -1) + " ";
        } else if (tenantQueryScope.isStaff()) {
            Long persId = tenantQueryScope.getPersonnelId();
            deptFilter = " d.id IN (SELECT department_id FROM personnel WHERE id = " + (persId != null ? persId : -1) + ") ";
        }

        List<Map<String, Object>> departmentsSummary = jdbcClient.sql("""
            SELECT d.id, d.code, d.name,
                   COALESCE(
                       (SELECT p.full_name FROM personnel p WHERE p.department_id = d.id AND p.is_deleted = 0 AND p.is_active = 1 AND (LOWER(p.title) LIKE '%müdür%' OR LOWER(p.title) LIKE '%mudur%' OR LOWER(p.title) LIKE '%başkan%' OR LOWER(p.title) LIKE '%müşavir%') ORDER BY p.id FETCH FIRST 1 ROWS ONLY),
                       (SELECT p.full_name FROM personnel p WHERE p.department_id = d.id AND p.is_deleted = 0 AND p.is_active = 1 AND (LOWER(p.title) LIKE '%amir%' OR LOWER(p.title) LIKE '%şef%') ORDER BY p.id FETCH FIRST 1 ROWS ONLY),
                       d.manager_name
                   ) AS manager_name,
                   COUNT(a.id) AS total_count,
                   SUM(CASE WHEN a.status = 'Aktif' OR a.status = 'Zimmetli' THEN 1 ELSE 0 END) AS active_count,
                   SUM(CASE WHEN a.status = 'Depoda' THEN 1 ELSE 0 END) AS storage_count,
                   SUM(CASE WHEN a.status = 'Bakımda' THEN 1 ELSE 0 END) AS maintenance_count,
                   COALESCE(SUM(a.estimated_value), 0) AS total_value
            FROM departments d
            LEFT JOIN assets a ON a.department_id = d.id AND a.is_active = 1 AND a.is_deleted = 0 AND (""" + assetScope + """
            )
            WHERE d.is_active = 1 AND (""" + deptFilter + """
            )
            GROUP BY d.id, d.code, d.name, d.manager_name, d.display_order
            ORDER BY d.display_order ASC, d.id ASC
        """).query((rs, rowNum) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", rs.getLong("id"));
            m.put("code", rs.getString("code"));
            m.put("unit", rs.getString("name"));
            m.put("name", rs.getString("name"));
            m.put("managerName", rs.getString("manager_name"));
            m.put("totalCount", rs.getLong("total_count"));
            m.put("activeCount", rs.getLong("active_count"));
            m.put("storageCount", rs.getLong("storage_count"));
            m.put("maintenanceCount", rs.getLong("maintenance_count"));
            m.put("totalValue", rs.getDouble("total_value"));
            return m;
        }).list();

        // 3. BİNALARA GÖRE DAĞILIM
        List<Map<String, Object>> buildingsDistribution = jdbcClient.sql("""
            SELECT b.id, b.code, b.name, b.building_type,
                   COUNT(DISTINCT r.id) AS room_count,
                   COUNT(DISTINCT a.id) AS asset_count
            FROM buildings b
            LEFT JOIN rooms r ON r.building_id = b.id AND r.is_active = 1
            LEFT JOIN assets a ON a.building_id = b.id AND a.is_active = 1 AND a.is_deleted = 0 AND (""" + assetScope + """
            )
            WHERE b.is_active = 1
            GROUP BY b.id, b.code, b.name, b.building_type
            ORDER BY asset_count DESC, b.id ASC
        """).query((rs, rowNum) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", rs.getLong("id"));
            m.put("code", rs.getString("code"));
            m.put("name", rs.getString("name"));
            m.put("type", rs.getString("building_type"));
            m.put("roomCount", rs.getLong("room_count"));
            m.put("assetCount", rs.getLong("asset_count"));
            return m;
        }).list();

        // 4. KATEGORİLERE GÖRE DAĞILIM (16 ANA KATEGORİ)
        List<Map<String, Object>> categoriesDistribution = jdbcClient.sql("""
            SELECT c.id, c.code, c.name, c.icon,
                   COUNT(a.id) AS count,
                   COALESCE(SUM(a.estimated_value), 0) AS total_value
            FROM asset_categories c
            LEFT JOIN assets a ON (a.category_id = c.id OR a.category = c.name) AND a.is_active = 1 AND a.is_deleted = 0 AND (""" + assetScope + """
            )
            WHERE c.is_active = 1
            GROUP BY c.id, c.code, c.name, c.icon
            ORDER BY c.code ASC
        """).query((rs, rowNum) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", rs.getLong("id"));
            m.put("code", rs.getString("code"));
            m.put("name", rs.getString("name"));
            m.put("icon", rs.getString("icon") == null ? "category" : rs.getString("icon"));
            m.put("count", rs.getLong("count"));
            m.put("totalValue", rs.getDouble("total_value"));
            return m;
        }).list();

        // 5. DURUMLARA VE KONDİSYONA GÖRE DAĞILIM
        Map<String, Long> byStatus = new LinkedHashMap<>();
        jdbcClient.sql("SELECT a.status, COUNT(*) AS cnt FROM assets a WHERE a.is_active = 1 AND a.is_deleted = 0 AND (" + assetScope + ") GROUP BY a.status ORDER BY cnt DESC")
                .query((rs, r) -> byStatus.put(rs.getString("status"), rs.getLong("cnt"))).list();

        Map<String, Long> byCondition = new LinkedHashMap<>();
        jdbcClient.sql("SELECT a.condition_status, COUNT(*) AS cnt FROM assets a WHERE a.is_active = 1 AND a.is_deleted = 0 AND (" + assetScope + ") GROUP BY a.condition_status ORDER BY cnt DESC")
                .query((rs, r) -> byCondition.put(rs.getString("condition_status"), rs.getLong("cnt"))).list();

        // 5.1 YAŞAM DÖNGÜSÜ (11 DURUM) DAĞILIMI
        List<Map<String, Object>> lifecycleDistribution = jdbcClient.sql("""
            SELECT a.lifecycle_status, COUNT(*) AS cnt, COALESCE(SUM(a.estimated_value), 0) AS total_val
            FROM assets a
            WHERE a.is_deleted = 0 AND (""" + assetScope + """
            )
            GROUP BY a.lifecycle_status
            ORDER BY cnt DESC
        """).query((rs, rowNum) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("status", rs.getString("lifecycle_status"));
            m.put("count", rs.getLong("cnt"));
            m.put("totalValue", rs.getDouble("total_val"));
            return m;
        }).list();

        // 5.2 YILLIK EDİNİM TRENDİ (SON 10 YIL)
        List<Map<String, Object>> acquisitionTrends = jdbcClient.sql("""
            SELECT TO_CHAR(a.acquisition_date, 'YYYY') AS acq_year,
                   COUNT(*) AS asset_count,
                   COALESCE(SUM(a.estimated_value), 0) AS total_val
            FROM assets a
            WHERE a.is_deleted = 0 AND a.acquisition_date IS NOT NULL AND (""" + assetScope + """
            )
            GROUP BY TO_CHAR(a.acquisition_date, 'YYYY')
            ORDER BY acq_year ASC
        """).query((rs, rowNum) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("year", rs.getString("acq_year"));
            m.put("count", rs.getLong("asset_count"));
            m.put("totalValue", rs.getDouble("total_val"));
            return m;
        }).list();

        // 6. EN ÇOK DEMİRBAŞ BULUNAN ODALAR
        List<Map<String, Object>> topRooms = jdbcClient.sql("""
            SELECT r.id, r.room_number, r.name, r.room_type, b.name AS bld_name, COUNT(a.id) AS asset_count
            FROM rooms r
            JOIN buildings b ON r.building_id = b.id
            LEFT JOIN assets a ON a.room_id = r.id AND a.is_active = 1 AND a.is_deleted = 0 AND (""" + assetScope + """
            )
            WHERE r.is_active = 1
            GROUP BY r.id, r.room_number, r.name, r.room_type, b.name
            ORDER BY asset_count DESC
            FETCH FIRST 10 ROWS ONLY
        """).query((rs, rowNum) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("roomId", rs.getLong("id"));
            m.put("roomNumber", rs.getString("room_number"));
            m.put("roomName", rs.getString("name"));
            m.put("roomType", rs.getString("room_type"));
            m.put("buildingName", rs.getString("bld_name"));
            m.put("assetCount", rs.getLong("asset_count"));
            return m;
        }).list();

        // 7. GARANTİSİ BİTECEK / BİTMİŞ VARLIKLAR
        List<Map<String, Object>> warrantyAlerts = jdbcClient.sql("""
            SELECT a.id, a.code, a.name, a.unit_name, a.location_info,
                   TO_CHAR(a.warranty_end_date, 'YYYY-MM-DD') AS war_date
            FROM assets a
            WHERE a.is_active = 1 AND a.is_deleted = 0 AND (""" + assetScope + """
              ) AND a.warranty_end_date IS NOT NULL
              AND a.warranty_end_date <= (CURRENT_DATE + 90)
            ORDER BY a.warranty_end_date ASC
            FETCH FIRST 10 ROWS ONLY
        """).query((rs, rowNum) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", rs.getLong("id"));
            m.put("code", rs.getString("code"));
            m.put("name", rs.getString("name"));
            m.put("unit", rs.getString("unit_name") == null ? "" : rs.getString("unit_name"));
            m.put("location", rs.getString("location_info") == null ? "" : rs.getString("location_info"));
            m.put("warrantyEndDate", rs.getString("war_date") == null ? "" : rs.getString("war_date"));
            return m;
        }).list();

        // 8. BAKIM VE ONARIM BEKLEYENLER
        List<Map<String, Object>> conditionAlerts = jdbcClient.sql("""
            SELECT a.id, a.code, a.name, a.unit_name, a.location_info, a.condition_status
            FROM assets a
            WHERE a.is_active = 1 AND a.is_deleted = 0 AND (""" + assetScope + """
              ) AND (a.condition_status = 'Onarım Gerekli' OR a.condition_status = 'Orta')
            ORDER BY a.id DESC
            FETCH FIRST 10 ROWS ONLY
        """).query((rs, rowNum) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", rs.getLong("id"));
            m.put("code", rs.getString("code"));
            m.put("name", rs.getString("name"));
            m.put("unit", rs.getString("unit_name") == null ? "" : rs.getString("unit_name"));
            m.put("location", rs.getString("location_info") == null ? "" : rs.getString("location_info"));
            m.put("condition", rs.getString("condition_status") == null ? "" : rs.getString("condition_status"));
            return m;
        }).list();

        // 9. SON HAREKETLER
        List<AssetMovement> recentMovements = movementRepository.findAll(null, null).stream().limit(10).toList();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("totalAssets", totalAssets);
        response.put("totalBuildings", totalBuildings);
        response.put("totalDepartments", totalDepartments);
        response.put("totalSubUnits", totalSubUnits);
        response.put("totalFloors", totalFloors);
        response.put("totalRooms", totalRooms);
        response.put("activeCount", activeCount);
        response.put("inStorageCount", inStorageCount);
        response.put("maintenanceCount", maintenanceCount);
        response.put("inactiveCount", inactiveCount);
        response.put("totalEstimatedValue", totalEstimatedValue);

        // Grafikler ve Listeler
        response.put("byCategory", categoriesDistribution);
        response.put("byStatus", byStatus);
        response.put("byCondition", byCondition);
        response.put("lifecycleDistribution", lifecycleDistribution);
        response.put("acquisitionTrends", acquisitionTrends);
        response.put("unitSummaries", departmentsSummary);
        response.put("buildingsDistribution", buildingsDistribution);
        response.put("topRooms", topRooms);
        response.put("warrantyAlerts", warrantyAlerts);
        response.put("conditionAlerts", conditionAlerts);
        response.put("recentMovements", recentMovements);

        return response;
    }

    private long queryCount(String sql) {
        Long c = jdbcClient.sql(sql).query(Long.class).single();
        return c == null ? 0 : c;
    }
}
