package tr.gov.gebze.varlik.enterprise;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tr.gov.gebze.varlik.common.AuthService;
import tr.gov.gebze.varlik.common.UserSession;
import tr.gov.gebze.varlik.security.TenantQueryScope;

@RestController
@RequestMapping("/api")
public class EnterpriseController {

    private final EnterpriseService enterpriseService;
    private final AuthService authService;
    private final TenantQueryScope tenantQueryScope;

    public EnterpriseController(EnterpriseService enterpriseService, AuthService authService, TenantQueryScope tenantQueryScope) {
        this.enterpriseService = enterpriseService;
        this.authService = authService;
        this.tenantQueryScope = tenantQueryScope;
    }

    // 1. DEPO & STOK
    @GetMapping("/stock")
    public List<StockItem> listStock(
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String warehouse,
            @RequestParam(required = false) String status
    ) {
        tenantQueryScope.enforceStaffModuleRestriction("stock");
        return enterpriseService.findAllStockItems(departmentId, warehouse, status);
    }

    @GetMapping("/stock/transactions")
    public List<StockTransaction> listStockTransactions(@RequestParam(required = false) Long stockItemId) {
        tenantQueryScope.enforceStaffModuleRestriction("stock");
        return enterpriseService.findStockTransactions(stockItemId);
    }

    @PostMapping("/stock/transactions")
    public Map<String, Object> addStockTx(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody Map<String, Object> payload
    ) {
        tenantQueryScope.enforceStaffModuleRestriction("stock");
        UserSession session = authService.requireWriteAccess(token);
        Long itemId = Long.valueOf(payload.get("stockItemId").toString());
        String txType = (String) payload.get("txType");
        Double qty = Double.valueOf(payload.get("quantity").toString());
        Long deptId = payload.get("departmentId") != null ? Long.valueOf(payload.get("departmentId").toString()) : null;
        String deptName = (String) payload.get("departmentName");
        String recipient = (String) payload.get("recipientName");
        String notes = (String) payload.get("notes");

        enterpriseService.addStockTransaction(itemId, txType, qty, deptId, deptName, recipient, session.fullName(), notes);
        return Map.of("status", "SUCCESS", "message", "Stok hareketi başarıyla kaydedildi.");
    }

    // 2. ARAÇ & FİLO
    @GetMapping("/fleet")
    public List<FleetVehicle> listFleet(
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String vehicleType,
            @RequestParam(required = false) String status
    ) {
        tenantQueryScope.enforceStaffModuleRestriction("fleet");
        return enterpriseService.findAllVehicles(departmentId, vehicleType, status);
    }

    @PostMapping("/fleet/{id}/status")
    public Map<String, Object> updateFleetStatus(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload
    ) {
        tenantQueryScope.enforceStaffModuleRestriction("fleet");
        UserSession session = authService.requireWriteAccess(token);
        String status = (String) payload.get("status");
        Integer km = payload.get("currentKm") != null ? Integer.valueOf(payload.get("currentKm").toString()) : null;
        String driver = (String) payload.get("assignedDriver");

        enterpriseService.updateVehicleStatus(id, status, km, driver, session.fullName());
        return Map.of("status", "SUCCESS", "message", "Araç bilgileri güncellendi.");
    }

    // 3. SATIN ALMA & TEDARİK
    @GetMapping("/procurement")
    public List<ProcurementOrder> listProcurement(
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String status
    ) {
        tenantQueryScope.enforceStaffModuleRestriction("procurement");
        return enterpriseService.findAllProcurementOrders(departmentId, status);
    }

    // 4. SAYIM & ENVANTER
    @GetMapping("/audits")
    public List<InventoryAudit> listAudits() {
        tenantQueryScope.enforceStaffModuleRestriction("audits");
        return enterpriseService.findAllAudits();
    }

    @GetMapping("/audits/{id}/scans")
    public List<AuditScan> listAuditScans(@PathVariable Long id) {
        tenantQueryScope.enforceStaffModuleRestriction("audits");
        return enterpriseService.findAuditScans(id);
    }

    @PostMapping("/audits/{id}/scan")
    public Map<String, Object> addAuditScan(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @PathVariable Long id,
            @RequestBody Map<String, String> payload
    ) {
        tenantQueryScope.enforceStaffModuleRestriction("audits");
        UserSession session = authService.requireWriteAccess(token);
        String assetCode = payload.get("assetCode");
        String location = payload.get("scannedLocation");

        enterpriseService.recordAuditScan(id, assetCode, location, session.fullName());
        return Map.of("status", "SUCCESS", "message", "Varlık sayıma kaydedildi.");
    }

    // 5. BELGE & EVRAK
    @GetMapping("/documents")
    public List<AssetDocument> listDocuments(
            @RequestParam(required = false) Long assetId,
            @RequestParam(required = false) String documentType
    ) {
        return enterpriseService.findAllDocuments(assetId, documentType);
    }

    // 6. DENETİM LOGLARI
    @GetMapping("/audit-logs")
    public List<SystemAuditLog> listAuditLogs(@RequestParam(defaultValue = "50") int limit) {
        tenantQueryScope.enforceStaffModuleRestriction("audit-logs");
        return enterpriseService.findRecentAuditLogs(limit);
    }

    // 7. SİSTEM AYARLARI
    @GetMapping("/settings")
    public List<SystemSetting> listSettings() {
        return enterpriseService.findAllSettings();
    }

    @PostMapping("/settings")
    public Map<String, Object> updateSetting(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody Map<String, String> payload
    ) {
        UserSession session = authService.requireAdmin(token);
        String key = payload.get("paramKey");
        String val = payload.get("paramValue");
        enterpriseService.updateSetting(key, val, session.fullName());
        return Map.of("status", "SUCCESS", "message", "Ayar başarıyla güncellendi.");
    }

    // 8. AMORTİSMAN & RAPORLAR
    @GetMapping("/reports/depreciation")
    public List<DepreciationReportItem> getDepreciationReport() {
        tenantQueryScope.enforceStaffModuleRestriction("reports/depreciation");
        return enterpriseService.calculateDepreciation();
    }

    // 9. OTOMATİK UYARILAR
    @GetMapping("/alerts")
    public List<SystemAlert> getAlerts() {
        return enterpriseService.calculateSystemAlerts();
    }
}

