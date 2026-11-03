package tr.gov.gebze.varlik.enterprise;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tr.gov.gebze.varlik.security.TenantQueryScope;

@Repository
public class EnterpriseRepository {

    private final JdbcClient jdbcClient;
    private final TenantQueryScope tenantQueryScope;

    public EnterpriseRepository(JdbcClient jdbcClient, TenantQueryScope tenantQueryScope) {
        this.jdbcClient = jdbcClient;
        this.tenantQueryScope = tenantQueryScope;
    }

    // ==========================================
    // 1. DEPO & STOK
    // ==========================================
    public List<StockItem> findAllStockItems(Long departmentId, String warehouse, String status) {
        StringBuilder sql = new StringBuilder("""
            SELECT id, item_code, item_name, category, warehouse_name, building_id, department_id,
                   current_quantity, min_threshold, unit, unit_price, status,
                   TO_CHAR(last_restocked_at, 'YYYY-MM-DD HH24:MI') AS last_restocked_at
            FROM stock_items
            WHERE 1=1
        """);
        sql.append(" AND ").append(tenantQueryScope.getStockItemFilterClause(null));
        List<Object> params = new ArrayList<>();
        if (departmentId != null) {
            sql.append(" AND department_id = ?");
            params.add(departmentId);
        }
        if (warehouse != null && !warehouse.isBlank()) {
            sql.append(" AND LOWER(warehouse_name) LIKE LOWER(?)");
            params.add("%" + warehouse.trim() + "%");
        }
        if (status != null && !status.isBlank()) {
            sql.append(" AND status = ?");
            params.add(status.trim());
        }
        sql.append(" ORDER BY status DESC, current_quantity ASC, item_name ASC");

        var spec = jdbcClient.sql(sql.toString());
        for (int i = 0; i < params.size(); i++) {
            spec = spec.param(i + 1, params.get(i));
        }
        return spec.query(this::mapStockItem).list();
    }

    private StockItem mapStockItem(ResultSet rs, int rowNum) throws SQLException {
        return new StockItem(
                rs.getLong("id"),
                rs.getString("item_code"),
                rs.getString("item_name"),
                rs.getString("category"),
                rs.getString("warehouse_name"),
                rs.getObject("building_id") != null ? rs.getLong("building_id") : null,
                rs.getObject("department_id") != null ? rs.getLong("department_id") : null,
                rs.getDouble("current_quantity"),
                rs.getDouble("min_threshold"),
                rs.getString("unit"),
                rs.getDouble("unit_price"),
                rs.getString("status"),
                rs.getString("last_restocked_at")
        );
    }

    public List<StockTransaction> findStockTransactions(Long stockItemId) {
        StringBuilder sql = new StringBuilder("""
            SELECT t.id, t.transaction_code, t.stock_item_id, s.item_name, t.tx_type, t.quantity, s.unit,
                   t.department_id, t.department_name, t.recipient_name, t.performed_by, t.notes,
                   TO_CHAR(t.tx_date, 'YYYY-MM-DD HH24:MI') AS tx_date
            FROM stock_transactions t
            JOIN stock_items s ON t.stock_item_id = s.id
            WHERE 1=1
        """);
        List<Object> params = new ArrayList<>();
        if (stockItemId != null) {
            sql.append(" AND t.stock_item_id = ?");
            params.add(stockItemId);
        }
        sql.append(" ORDER BY t.tx_date DESC, t.id DESC");

        var spec = jdbcClient.sql(sql.toString());
        for (int i = 0; i < params.size(); i++) {
            spec = spec.param(i + 1, params.get(i));
        }
        return spec.query((rs, rowNum) -> new StockTransaction(
                rs.getLong("id"),
                rs.getString("transaction_code"),
                rs.getLong("stock_item_id"),
                rs.getString("item_name"),
                rs.getString("tx_type"),
                rs.getDouble("quantity"),
                rs.getString("unit"),
                rs.getObject("department_id") != null ? rs.getLong("department_id") : null,
                rs.getString("department_name"),
                rs.getString("recipient_name"),
                rs.getString("performed_by"),
                rs.getString("notes"),
                rs.getString("tx_date")
        )).list();
    }

    public void addStockTransaction(Long stockItemId, String txType, Double quantity, Long deptId, String deptName, String recipient, String actor, String notes) {
        String txCode = "TX-STK-" + System.currentTimeMillis() % 1000000;
        jdbcClient.sql("""
            INSERT INTO stock_transactions (transaction_code, stock_item_id, tx_type, quantity, department_id, department_name, recipient_name, performed_by, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """)
        .param(1, txCode)
        .param(2, stockItemId)
        .param(3, txType)
        .param(4, quantity)
        .param(5, deptId)
        .param(6, deptName)
        .param(7, recipient)
        .param(8, actor)
        .param(9, notes)
        .update();

        // Stok miktarını ve durumunu güncelle
        double change = "CIKIS".equalsIgnoreCase(txType) ? -quantity : quantity;
        jdbcClient.sql("""
            UPDATE stock_items
            SET current_quantity = current_quantity + ?,
                status = CASE WHEN current_quantity + ? <= 0 THEN 'TUKENDI'
                              WHEN current_quantity + ? <= min_threshold THEN 'KRITIK'
                              ELSE 'NORMAL' END,
                last_restocked_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """)
        .param(1, change)
        .param(2, change)
        .param(3, change)
        .param(4, stockItemId)
        .update();
    }

    // ==========================================
    // 2. ARAÇ & FİLO VE İŞ MAKİNELERİ
    // ==========================================
    public List<FleetVehicle> findAllVehicles(Long departmentId, String vehicleType, String status) {
        StringBuilder sql = new StringBuilder("""
            SELECT id, plate_number, vehicle_code, vehicle_type, brand_model, model_year,
                   department_id, department_name, assigned_driver, current_km, fuel_type,
                   TO_CHAR(inspection_date, 'YYYY-MM-DD') AS inspection_date,
                   TO_CHAR(insurance_date, 'YYYY-MM-DD') AS insurance_date,
                   TO_CHAR(kasko_date, 'YYYY-MM-DD') AS kasko_date,
                   status, notes,
                   TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI') AS updated_at
            FROM fleet_vehicles
            WHERE 1=1
        """);
        sql.append(" AND ").append(tenantQueryScope.getFleetFilterClause(null));
        List<Object> params = new ArrayList<>();
        if (departmentId != null) {
            sql.append(" AND department_id = ?");
            params.add(departmentId);
        }
        if (vehicleType != null && !vehicleType.isBlank()) {
            sql.append(" AND vehicle_type = ?");
            params.add(vehicleType.trim());
        }
        if (status != null && !status.isBlank()) {
            sql.append(" AND status = ?");
            params.add(status.trim());
        }
        sql.append(" ORDER BY id ASC");

        var spec = jdbcClient.sql(sql.toString());
        for (int i = 0; i < params.size(); i++) {
            spec = spec.param(i + 1, params.get(i));
        }
        return spec.query(this::mapFleetVehicle).list();
    }

    private FleetVehicle mapFleetVehicle(ResultSet rs, int rowNum) throws SQLException {
        return new FleetVehicle(
                rs.getLong("id"),
                rs.getString("plate_number"),
                rs.getString("vehicle_code"),
                rs.getString("vehicle_type"),
                rs.getString("brand_model"),
                rs.getInt("model_year"),
                rs.getObject("department_id") != null ? rs.getLong("department_id") : null,
                rs.getString("department_name"),
                rs.getString("assigned_driver"),
                rs.getInt("current_km"),
                rs.getString("fuel_type"),
                rs.getString("inspection_date"),
                rs.getString("insurance_date"),
                rs.getString("kasko_date"),
                rs.getString("status"),
                rs.getString("notes"),
                rs.getString("updated_at")
        );
    }

    public void updateVehicleStatus(Long id, String status, Integer km, String driver) {
        jdbcClient.sql("""
            UPDATE fleet_vehicles
            SET status = ?, current_km = COALESCE(?, current_km), assigned_driver = COALESCE(?, assigned_driver), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """)
        .param(1, status)
        .param(2, km)
        .param(3, driver)
        .param(4, id)
        .update();
    }

    // ==========================================
    // 3. SATIN ALMA VE TEDARİK
    // ==========================================
    public List<ProcurementOrder> findAllProcurementOrders(Long departmentId, String status) {
        StringBuilder sql = new StringBuilder("""
            SELECT id, order_no, title, department_id, department_name, procurement_type,
                   supplier_name, estimated_budget, final_amount, status, requested_by,
                   TO_CHAR(order_date, 'YYYY-MM-DD') AS order_date,
                   TO_CHAR(delivery_date, 'YYYY-MM-DD') AS delivery_date,
                   description
            FROM procurement_orders
            WHERE 1=1
        """);
        sql.append(" AND ").append(tenantQueryScope.getProcurementFilterClause(null));
        List<Object> params = new ArrayList<>();
        if (departmentId != null) {
            sql.append(" AND department_id = ?");
            params.add(departmentId);
        }
        if (status != null && !status.isBlank()) {
            sql.append(" AND status = ?");
            params.add(status.trim());
        }
        sql.append(" ORDER BY order_date DESC, id DESC");

        var spec = jdbcClient.sql(sql.toString());
        for (int i = 0; i < params.size(); i++) {
            spec = spec.param(i + 1, params.get(i));
        }
        return spec.query((rs, rowNum) -> new ProcurementOrder(
                rs.getLong("id"),
                rs.getString("order_no"),
                rs.getString("title"),
                rs.getObject("department_id") != null ? rs.getLong("department_id") : null,
                rs.getString("department_name"),
                rs.getString("procurement_type"),
                rs.getString("supplier_name"),
                rs.getDouble("estimated_budget"),
                rs.getObject("final_amount") != null ? rs.getDouble("final_amount") : null,
                rs.getString("status"),
                rs.getString("requested_by"),
                rs.getString("order_date"),
                rs.getString("delivery_date"),
                rs.getString("description")
        )).list();
    }

    // ==========================================
    // 4. SAYIM VE ENVANTER KONTROLÜ
    // ==========================================
    public List<InventoryAudit> findAllAudits() {
        String filter = tenantQueryScope.getAuditFilterClause(null);
        return jdbcClient.sql("""
            SELECT id, audit_code, title, building_id, department_id, scope_description,
                   total_expected, total_scanned, total_missing, total_excess, status,
                   TO_CHAR(started_at, 'YYYY-MM-DD HH24:MI') AS started_at,
                   TO_CHAR(completed_at, 'YYYY-MM-DD HH24:MI') AS completed_at,
                   lead_auditor, notes
            FROM inventory_audits
            WHERE """ + filter + """
            ORDER BY started_at DESC, id DESC
        """).query((rs, rowNum) -> new InventoryAudit(
                rs.getLong("id"),
                rs.getString("audit_code"),
                rs.getString("title"),
                rs.getObject("building_id") != null ? rs.getLong("building_id") : null,
                rs.getObject("department_id") != null ? rs.getLong("department_id") : null,
                rs.getString("scope_description"),
                rs.getInt("total_expected"),
                rs.getInt("total_scanned"),
                rs.getInt("total_missing"),
                rs.getInt("total_excess"),
                rs.getString("status"),
                rs.getString("started_at"),
                rs.getString("completed_at"),
                rs.getString("lead_auditor"),
                rs.getString("notes")
        )).list();
    }

    public List<AuditScan> findAuditScans(Long auditId) {
        return jdbcClient.sql("""
            SELECT id, audit_id, asset_id, asset_code, asset_name, expected_location,
                   scanned_location, match_status,
                   TO_CHAR(scanned_at, 'YYYY-MM-DD HH24:MI') AS scanned_at,
                   scanned_by, notes
            FROM audit_scans
            WHERE audit_id = ?
            ORDER BY scanned_at DESC, id DESC
        """)
        .param(1, auditId)
        .query((rs, rowNum) -> new AuditScan(
                rs.getLong("id"),
                rs.getLong("audit_id"),
                rs.getObject("asset_id") != null ? rs.getLong("asset_id") : null,
                rs.getString("asset_code"),
                rs.getString("asset_name"),
                rs.getString("expected_location"),
                rs.getString("scanned_location"),
                rs.getString("match_status"),
                rs.getString("scanned_at"),
                rs.getString("scanned_by"),
                rs.getString("notes")
        )).list();
    }

    public void recordAuditScan(Long auditId, String assetCode, String scannedLoc, String scannedBy) {
        // Varlık bilgilerini çek
        var assetOpt = jdbcClient.sql("""
            SELECT id, code, name, location_info
            FROM assets
            WHERE code = ? OR barcode = ?
        """)
        .param(1, assetCode)
        .param(2, assetCode)
        .query((rs, rowNum) -> Map.of(
                "id", rs.getLong("id"),
                "code", rs.getString("code"),
                "name", rs.getString("name"),
                "loc", rs.getString("location_info")
        )).optional();

        if (assetOpt.isPresent()) {
            var a = assetOpt.get();
            String expLoc = (String) a.get("loc");
            boolean match = (scannedLoc == null || scannedLoc.isBlank() || expLoc.toLowerCase().contains(scannedLoc.toLowerCase()));
            String status = match ? "DOGRU_KONUM" : "FARKLI_KONUMDA";

            jdbcClient.sql("""
                INSERT INTO audit_scans (audit_id, asset_id, asset_code, asset_name, expected_location, scanned_location, match_status, scanned_by, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """)
            .param(1, auditId)
            .param(2, a.get("id"))
            .param(3, a.get("code"))
            .param(4, a.get("name"))
            .param(5, expLoc)
            .param(6, (scannedLoc != null && !scannedLoc.isBlank()) ? scannedLoc : expLoc)
            .param(7, status)
            .param(8, scannedBy)
            .param(9, match ? "Konum doğrulandı." : "Farklı oda/katta tespit edildi.")
            .update();

            jdbcClient.sql("UPDATE inventory_audits SET total_scanned = total_scanned + 1 WHERE id = ?")
            .param(1, auditId)
            .update();
        } else {
            jdbcClient.sql("""
                INSERT INTO audit_scans (audit_id, asset_code, asset_name, expected_location, scanned_location, match_status, scanned_by, notes)
                VALUES (?, ?, ?, 'Bilinmiyor', ?, 'FAZLA_KAYITSIZ', ?, 'Sistemde kayıtlı olmayan demirbaş tespit edildi.')
            """)
            .param(1, auditId)
            .param(2, assetCode)
            .param(3, "Kayıtsız / Fazla Varlık")
            .param(4, scannedLoc)
            .param(5, scannedBy)
            .update();

            jdbcClient.sql("UPDATE inventory_audits SET total_excess = total_excess + 1 WHERE id = ?")
            .param(1, auditId)
            .update();
        }
    }

    // ==========================================
    // 5. BELGE VE EVRAK YÖNETİMİ
    // ==========================================
    public List<AssetDocument> findAllDocuments(Long assetId, String docType) {
        StringBuilder sql = new StringBuilder("""
            SELECT d.id, d.doc_code, d.asset_id, d.asset_name, d.document_type, d.title, d.document_no,
                   d.file_name, d.file_size_kb, d.issued_by,
                   TO_CHAR(d.valid_until, 'YYYY-MM-DD') AS valid_until,
                   d.notes,
                   TO_CHAR(d.created_at, 'YYYY-MM-DD HH24:MI') AS created_at
            FROM asset_documents d
            LEFT JOIN assets a ON d.asset_id = a.id
            WHERE 1=1
        """);
        if (tenantQueryScope.isStaff()) {
            sql.append(" AND d.asset_id IS NOT NULL AND a.is_active = 1 AND a.is_deleted = 0 AND ").append(tenantQueryScope.getAssetFilterClause("a"));
        } else {
            sql.append(" AND (d.asset_id IS NULL OR (a.is_active = 1 AND a.is_deleted = 0 AND ").append(tenantQueryScope.getAssetFilterClause("a")).append("))");
        }
        List<Object> params = new ArrayList<>();
        if (assetId != null) {
            sql.append(" AND d.asset_id = ?");
            params.add(assetId);
        }
        if (docType != null && !docType.isBlank()) {
            sql.append(" AND d.document_type = ?");
            params.add(docType.trim());
        }
        sql.append(" ORDER BY d.created_at DESC, d.id DESC");

        var spec = jdbcClient.sql(sql.toString());
        for (int i = 0; i < params.size(); i++) {
            spec = spec.param(i + 1, params.get(i));
        }
        return spec.query((rs, rowNum) -> new AssetDocument(
                rs.getLong("id"),
                rs.getString("doc_code"),
                rs.getObject("asset_id") != null ? rs.getLong("asset_id") : null,
                rs.getString("asset_name"),
                rs.getString("document_type"),
                rs.getString("title"),
                rs.getString("document_no"),
                rs.getString("file_name"),
                rs.getInt("file_size_kb"),
                rs.getString("issued_by"),
                rs.getString("valid_until"),
                rs.getString("notes"),
                rs.getString("created_at")
        )).list();
    }

    // ==========================================
    // 6. DENETİM LOGLARI
    // ==========================================
    public List<SystemAuditLog> findRecentAuditLogs(int limit) {
        return jdbcClient.sql("""
            SELECT id, action_type, entity_type, entity_id, actor_username, actor_name,
                   ip_address, description,
                   TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
            FROM system_audit_logs
            ORDER BY created_at DESC, id DESC
            FETCH FIRST ? ROWS ONLY
        """)
        .param(1, limit)
        .query((rs, rowNum) -> new SystemAuditLog(
                rs.getLong("id"),
                rs.getString("action_type"),
                rs.getString("entity_type"),
                rs.getString("entity_id"),
                rs.getString("actor_username"),
                rs.getString("actor_name"),
                rs.getString("ip_address"),
                rs.getString("description"),
                rs.getString("created_at")
        )).list();
    }

    public void logAction(String actionType, String entityType, String entityId, String username, String fullName, String ip, String desc) {
        jdbcClient.sql("""
            INSERT INTO system_audit_logs (action_type, entity_type, entity_id, actor_username, actor_name, ip_address, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """)
        .param(1, actionType)
        .param(2, entityType)
        .param(3, entityId)
        .param(4, username)
        .param(5, fullName)
        .param(6, ip != null ? ip : "127.0.0.1")
        .param(7, desc)
        .update();
    }

    // ==========================================
    // 7. SİSTEM AYARLARI
    // ==========================================
    public List<SystemSetting> findAllSettings() {
        return jdbcClient.sql("""
            SELECT param_key, param_value, param_group, description,
                   TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI') AS updated_at
            FROM system_settings
            ORDER BY param_group ASC, param_key ASC
        """).query((rs, rowNum) -> new SystemSetting(
                rs.getString("param_key"),
                rs.getString("param_value"),
                rs.getString("param_group"),
                rs.getString("description"),
                rs.getString("updated_at")
        )).list();
    }

    public void updateSetting(String key, String val) {
        jdbcClient.sql("""
            UPDATE system_settings
            SET param_value = ?, updated_at = CURRENT_TIMESTAMP
            WHERE param_key = ?
        """)
        .param(1, val)
        .param(2, key)
        .update();
    }

    // ==========================================
    // 8. AMORTİSMAN & RAPORLAMA HESABI
    // ==========================================
    public List<DepreciationReportItem> calculateDepreciation() {
        String assetFilter = tenantQueryScope.getAssetFilterClause("a");
        return jdbcClient.sql("""
            SELECT a.id, a.code, a.name, a.category, COALESCE(d.name, a.unit_name) AS dept_name,
                   TO_CHAR(a.acquisition_date, 'YYYY-MM-DD') AS acq_date,
                   COALESCE(a.estimated_value, 0) AS est_value,
                   a.status
            FROM assets a
            LEFT JOIN departments d ON a.department_id = d.id
            WHERE a.status != 'Kullanım Dışı' AND a.is_active = 1 AND a.is_deleted = 0
              AND """ + assetFilter + """
            ORDER BY a.estimated_value DESC
        """).query((rs, rowNum) -> {
            long assetId = rs.getLong("id");
            String code = rs.getString("code");
            String name = rs.getString("name");
            String cat = rs.getString("category");
            String dept = rs.getString("dept_name");
            String acqDateStr = rs.getString("acq_date");
            double originalVal = rs.getDouble("est_value");
            String status = rs.getString("status");

            // Kategori bazlı faydalı ömür yılı
            int usefulLife = 5;
            if (cat.contains("Mobilya")) usefulLife = 10;
            else if (cat.contains("Araç") || cat.contains("Makine")) usefulLife = 8;
            else if (cat.contains("İklimlendirme") || cat.contains("Teknik")) usefulLife = 10;
            else if (cat.contains("Bilişim") || cat.contains("Elektronik")) usefulLife = 4;
            else if (cat.contains("Temizlik")) usefulLife = 5;

            double annualRate = Math.round((100.0 / usefulLife) * 10.0) / 10.0;

            // Yıl farkı hesaplama
            int yearsElapsed = 1;
            if (acqDateStr != null && acqDateStr.length() >= 4) {
                try {
                    int acqYear = Integer.parseInt(acqDateStr.substring(0, 4));
                    yearsElapsed = Math.max(1, 2026 - acqYear);
                } catch (Exception ignored) {}
            }

            double annualDepreciation = originalVal / usefulLife;
            double accumulated = Math.min(originalVal, Math.round(annualDepreciation * yearsElapsed));
            double currentBookValue = Math.max(0, originalVal - accumulated);

            return new DepreciationReportItem(
                    assetId,
                    code,
                    name,
                    cat,
                    dept,
                    acqDateStr != null ? acqDateStr : "2024-01-01",
                    originalVal,
                    usefulLife,
                    annualRate,
                    accumulated,
                    currentBookValue,
                    status
            );
        }).list();
    }

    // ==========================================
    // 9. OTOMATİK UYARILAR VE BİLDİRİMLER
    // ==========================================
    public List<SystemAlert> calculateSystemAlerts() {
        List<SystemAlert> alerts = new ArrayList<>();

        // 1. Kritik stok seviyesinin altına düşen malzemeler
        String stockFilter = tenantQueryScope.getStockItemFilterClause(null);
        jdbcClient.sql("""
            SELECT item_code, item_name, warehouse_name, current_quantity, min_threshold, unit
            FROM stock_items
            WHERE current_quantity <= min_threshold AND """ + stockFilter + """
        """).query((rs, rowNum) -> {
            alerts.add(new SystemAlert(
                    "STOCK_CRITICAL",
                    "CRITICAL",
                    "Kritik Stok Seviyesi: " + rs.getString("item_name"),
                    rs.getString("warehouse_name") + " bünyesinde kalan stok: " + rs.getDouble("current_quantity") + " " + rs.getString("unit") + " (Kritik Eşik: " + rs.getDouble("min_threshold") + ")",
                    rs.getString("item_code"),
                    "stock",
                    "Acil İkmal Gerekli"
            ));
            return null;
        }).list();

        // 2. Muayenesi yaklaşan veya geçmiş araçlar
        String fleetFilter = tenantQueryScope.getFleetFilterClause(null);
        jdbcClient.sql("""
            SELECT plate_number, vehicle_type, brand_model, department_name,
                   TO_CHAR(inspection_date, 'YYYY-MM-DD') AS insp_date,
                   ROUND(inspection_date - SYSDATE) AS days_left
            FROM fleet_vehicles
            WHERE inspection_date IS NOT NULL AND inspection_date <= SYSDATE + 45 AND """ + fleetFilter + """
        """).query((rs, rowNum) -> {
            int days = rs.getInt("days_left");
            String sev = days <= 0 ? "CRITICAL" : "WARNING";
            String title = (days <= 0 ? "Gecikmiş TÜVTÜRK Muayenesi: " : "Yaklaşan Muayene: ") + rs.getString("plate_number");
            alerts.add(new SystemAlert(
                    "FLEET_INSPECTION",
                    sev,
                    title,
                    rs.getString("brand_model") + " (" + rs.getString("department_name") + ") muayene tarihi: " + rs.getString("insp_date") + " (" + (days <= 0 ? Math.abs(days) + " gün gecikti!" : days + " gün kaldı") + ")",
                    rs.getString("plate_number"),
                    "fleet",
                    rs.getString("insp_date")
            ));
            return null;
        }).list();

        // 3. Devam eden bakım iş emirleri
        jdbcClient.sql("""
            SELECT m.order_no, a.name AS asset_name, m.priority, m.vendor_or_technician,
                   TO_CHAR(m.started_at, 'YYYY-MM-DD') AS start_date
            FROM asset_maintenances m
            JOIN assets a ON m.asset_id = a.id
            WHERE m.status = 'DEVAM_EDIYOR'
        """).query((rs, rowNum) -> {
            alerts.add(new SystemAlert(
                    "MAINTENANCE_DUE",
                    "WARNING",
                    "Devam Eden Bakım & Onarım: " + rs.getString("order_no"),
                    rs.getString("asset_name") + " — " + rs.getString("vendor_or_technician") + " servisinde işlemde.",
                    rs.getString("order_no"),
                    "maintenances",
                    rs.getString("start_date")
            ));
            return null;
        }).list();

        // 4. Garantisi 60 gün içinde bitecek yüksek değerli varlıklar
        jdbcClient.sql("""
            SELECT code, name, category, TO_CHAR(warranty_end_date, 'YYYY-MM-DD') AS war_date,
                   ROUND(warranty_end_date - SYSDATE) AS days_left
            FROM assets
            WHERE warranty_end_date IS NOT NULL AND warranty_end_date BETWEEN SYSDATE AND SYSDATE + 60
        """).query((rs, rowNum) -> {
            alerts.add(new SystemAlert(
                    "WARRANTY_EXPIRING",
                    "INFO",
                    "Garanti Süresi Bitiyor: " + rs.getString("code"),
                    rs.getString("name") + " (" + rs.getString("category") + ") garantisi " + rs.getInt("days_left") + " gün sonra sona erecek.",
                    rs.getString("code"),
                    "assets",
                    rs.getString("war_date")
            ));
            return null;
        }).list();

        return alerts;
    }
}
