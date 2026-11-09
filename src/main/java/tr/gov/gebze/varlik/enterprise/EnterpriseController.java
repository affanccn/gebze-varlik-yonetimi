package tr.gov.gebze.varlik.enterprise;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import tr.gov.gebze.varlik.common.ApiException;
import tr.gov.gebze.varlik.common.AuthService;
import tr.gov.gebze.varlik.common.CursorResponse;
import tr.gov.gebze.varlik.common.PageResponse;
import tr.gov.gebze.varlik.common.UserSession;
import tr.gov.gebze.varlik.security.SecurityAuditService;
import tr.gov.gebze.varlik.security.TenantQueryScope;

@RestController
@RequestMapping("/api")
public class EnterpriseController {

    private final EnterpriseService enterpriseService;
    private final AuthService authService;
    private final TenantQueryScope tenantQueryScope;
    private final SecurityAuditService auditService;

    public EnterpriseController(EnterpriseService enterpriseService, AuthService authService, TenantQueryScope tenantQueryScope, SecurityAuditService auditService) {
        this.enterpriseService = enterpriseService;
        this.authService = authService;
        this.tenantQueryScope = tenantQueryScope;
        this.auditService = auditService;
    }

    // 1. DEPO & STOK
    @GetMapping("/stock")
    public PageResponse<StockItem> listStock(
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String warehouse,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        tenantQueryScope.enforceStaffModuleRestriction("stock");
        String searchQuery = (query != null && !query.isBlank()) ? query : q;
        String sortParam = (sortBy != null && !sortBy.isBlank()) ? sortBy : sort;
        return enterpriseService.findStockItemsPage(departmentId, warehouse, status, searchQuery, sortParam, page, size);
    }

    @PostMapping("/stock")
    public Map<String, Object> createStockItem(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody Map<String, Object> payload
    ) {
        tenantQueryScope.enforceStaffModuleRestriction("stock");
        UserSession session = authService.requireWriteAccess(token);

        if (payload == null || !payload.containsKey("itemCode") || !payload.containsKey("itemName")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Malzeme kodu ve adı zorunludur.");
        }

        String itemCode = payload.get("itemCode").toString().trim();
        String itemName = payload.get("itemName").toString().trim();
        if (itemCode.isBlank() || itemName.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Malzeme kodu ve adı boş bırakılamaz.");
        }

        String category = payload.getOrDefault("category", "Genel Sarf").toString();
        String warehouseName = payload.getOrDefault("warehouseName", "Ana Ambar").toString();
        String unit = payload.getOrDefault("unit", "Adet").toString();

        Long buildingId = payload.get("buildingId") != null && !payload.get("buildingId").toString().isBlank()
                ? Long.valueOf(payload.get("buildingId").toString()) : null;
        Long departmentId = payload.get("departmentId") != null && !payload.get("departmentId").toString().isBlank()
                ? Long.valueOf(payload.get("departmentId").toString()) : null;
        Double currentQuantity = payload.get("currentQuantity") != null && !payload.get("currentQuantity").toString().isBlank()
                ? Double.valueOf(payload.get("currentQuantity").toString()) : 0.0;
        Double minThreshold = payload.get("minThreshold") != null && !payload.get("minThreshold").toString().isBlank()
                ? Double.valueOf(payload.get("minThreshold").toString()) : 10.0;
        Double unitPrice = payload.get("unitPrice") != null && !payload.get("unitPrice").toString().isBlank()
                ? Double.valueOf(payload.get("unitPrice").toString()) : 0.0;

        Long newId = enterpriseService.createStockItem(
                itemCode, itemName, category, warehouseName, buildingId, departmentId,
                currentQuantity, minThreshold, unit, unitPrice, session.fullName()
        );

        return Map.of("status", "SUCCESS", "message", "Yeni stok kartı başarıyla oluşturuldu.", "id", newId);
    }

    @GetMapping("/stock/transactions")
    public CursorResponse<StockTransaction> listStockTransactions(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long stockItemId,
            @RequestParam(required = false) String txType
    ) {
        tenantQueryScope.enforceStaffModuleRestriction("stock");
        return enterpriseService.findStockTransactionsKeyset(cursor, size, stockItemId, txType);
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
    public PageResponse<FleetVehicle> listFleet(
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String vehicleType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        tenantQueryScope.enforceStaffModuleRestriction("fleet");
        String searchQuery = (query != null && !query.isBlank()) ? query : q;
        String sortParam = (sortBy != null && !sortBy.isBlank()) ? sortBy : sort;
        return enterpriseService.findVehiclesPage(departmentId, vehicleType, status, searchQuery, sortParam, page, size);
    }

    @PostMapping("/fleet/{id}/status")
    public Map<String, Object> updateFleetStatus(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload
    ) {
        tenantQueryScope.enforceStaffModuleRestriction("fleet");
        UserSession session = authService.requireWriteAccess(token);
        if (tenantQueryScope.isDeptManager()) {
            Long vehicleDeptId = enterpriseService.getVehicleDepartmentId(id);
            if (vehicleDeptId != null && !vehicleDeptId.equals(tenantQueryScope.getDepartmentId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Kendi müdürlüğünüz dışındaki aracı güncelleyemezsiniz.");
            }
        }
        String status = (String) payload.get("status");
        Integer km = payload.get("currentKm") != null ? Integer.valueOf(payload.get("currentKm").toString()) : null;
        String driver = (String) payload.get("assignedDriver");

        enterpriseService.updateVehicleStatus(id, status, km, driver, session.fullName());
        return Map.of("status", "SUCCESS", "message", "Araç bilgileri güncellendi.");
    }

    // 3. SATIN ALMA & TEDARİK
    @GetMapping("/procurement")
    public PageResponse<ProcurementOrder> listProcurement(
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        tenantQueryScope.enforceStaffModuleRestriction("procurement");
        String searchQuery = (query != null && !query.isBlank()) ? query : q;
        String sortParam = (sortBy != null && !sortBy.isBlank()) ? sortBy : sort;
        return enterpriseService.findProcurementOrdersPage(departmentId, status, searchQuery, sortParam, page, size);
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
        if (tenantQueryScope.isDeptManager()) {
            Long auditDeptId = enterpriseService.getAuditDepartmentId(id);
            if (auditDeptId != null && !auditDeptId.equals(tenantQueryScope.getDepartmentId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Kendi müdürlüğünüz dışındaki sayım detayını göremezsiniz.");
            }
        }
        return enterpriseService.findAuditScans(id);
    }

    @GetMapping("/audits/{id}/reconciliation")
    public AuditReconciliationSummary getAuditReconciliation(@PathVariable Long id) {
        tenantQueryScope.enforceStaffModuleRestriction("audits");
        if (tenantQueryScope.isDeptManager()) {
            Long auditDeptId = enterpriseService.getAuditDepartmentId(id);
            if (auditDeptId != null && !auditDeptId.equals(tenantQueryScope.getDepartmentId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Kendi müdürlüğünüz dışındaki sayım mutabakatını göremezsiniz.");
            }
        }
        return enterpriseService.getAuditReconciliation(id);
    }

    @PostMapping("/audits/{id}/scan")
    public AuditScanResult addAuditScan(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @PathVariable Long id,
            @RequestBody Map<String, String> payload
    ) {
        tenantQueryScope.enforceStaffModuleRestriction("audits");
        UserSession session = authService.requireWriteAccess(token);
        if (tenantQueryScope.isDeptManager()) {
            Long auditDeptId = enterpriseService.getAuditDepartmentId(id);
            if (auditDeptId != null && !auditDeptId.equals(tenantQueryScope.getDepartmentId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Kendi müdürlüğünüz dışındaki sayıma okutma yapamazsınız.");
            }
        }
        String assetCode = payload.get("assetCode");
        String location = payload.get("scannedLocation");

        return enterpriseService.recordAuditScan(id, assetCode, location, session.fullName());
    }

    // 5. BELGE & EVRAK
    @GetMapping("/documents")
    public PageResponse<AssetDocument> listDocuments(
            @RequestParam(required = false) Long assetId,
            @RequestParam(required = false) String documentType,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        String searchQuery = (query != null && !query.isBlank()) ? query : q;
        String sortParam = (sortBy != null && !sortBy.isBlank()) ? sortBy : sort;
        return enterpriseService.findDocumentsPage(assetId, documentType, searchQuery, sortParam, page, size);
    }

    // 6. DENETİM LOGLARI
    @GetMapping("/audit-logs")
    public CursorResponse<SystemAuditLog> listAuditLogs(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo
    ) {
        tenantQueryScope.enforceStaffModuleRestriction("audit-logs");
        return enterpriseService.findAuditLogsKeyset(cursor, size, actionType, actor, dateFrom, dateTo);
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

    // 8. AMORTİSMAN & KURUMSAL RAPORLAR
    @GetMapping("/reports/depreciation")
    public List<DepreciationReportItem> getDepreciationReport() {
        tenantQueryScope.enforceStaffModuleRestriction("reports/depreciation");
        return enterpriseService.calculateDepreciation();
    }

    @GetMapping("/reports/form13")
    public List<Form13ReportItem> getForm13Report(@RequestParam(required = false) Long departmentId) {
        tenantQueryScope.enforceStaffModuleRestriction("reports/form13");
        if (tenantQueryScope.isDeptManager()) {
            departmentId = tenantQueryScope.getDepartmentId();
        }
        return enterpriseService.generateForm13Report(departmentId);
    }

    @GetMapping("/reports/disposal")
    public List<DisposalReportItem> getDisposalReport() {
        tenantQueryScope.enforceStaffModuleRestriction("reports/disposal");
        return enterpriseService.generateDisposalReport();
    }

    @GetMapping("/reports/export")
    public void exportReport(
            HttpServletRequest request,
            HttpServletResponse response,
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestParam(defaultValue = "form13") String type,
            @RequestParam(required = false) Long departmentId
    ) throws IOException {
        tenantQueryScope.enforceStaffModuleRestriction("reports/export");
        if (tenantQueryScope.isDeptManager()) {
            departmentId = tenantQueryScope.getDepartmentId();
        }

        UserSession session = authService.requireSession(token);
        String username = session != null ? session.username() : "ANONYMOUS";
        String fullName = session != null ? session.fullName() : "Anonim";
        auditService.logAction("DATA_EXPORT", "REPORT", type, username, fullName,
                request != null ? request.getRemoteAddr() : "127.0.0.1",
                String.format("Kullanıcı '%s' tipindeki raporu dışa aktardı (Müdürlük: %s).", type, departmentId != null ? departmentId : "Tümü"));

        response.setContentType("text/csv; charset=UTF-8");
        OutputStream out = response.getOutputStream();
        // UTF-8 BOM
        out.write(0xEF);
        out.write(0xBB);
        out.write(0xBF);
        out.flush();

        PrintWriter writer = new PrintWriter(new OutputStreamWriter(out, StandardCharsets.UTF_8));

        if ("form13".equalsIgnoreCase(type)) {
            response.setHeader("Content-Disposition", "attachment; filename=\"Tasinir_Sayim_ve_Dokum_Cetveli_Form13.csv\"");
            writer.println("Tasınır Hesap Kodu;Varlık Kodu;Demirbaş Adı;Kategori;Müdürlük / Ambar;Konum;Miktar;Ölçü Birimi;Birim Değer (TL);Toplam Tutar (TL);Durum;Kondisyon");
            for (Form13ReportItem item : enterpriseService.generateForm13Report(departmentId)) {
                writer.println(String.format("%s;%s;\"%s\";\"%s\";\"%s\";\"%s\";%d;%s;%.2f;%.2f;%s;%s",
                        sanitizeCsvField(item.accountCode()), sanitizeCsvField(item.assetCode()),
                        sanitizeCsvField(item.assetName()),
                        sanitizeCsvField(item.category()),
                        sanitizeCsvField(item.departmentName()),
                        sanitizeCsvField(item.location()),
                        item.quantity(), item.unit(), item.unitPrice(), item.totalPrice(),
                        sanitizeCsvField(item.status()), sanitizeCsvField(item.conditionStatus())));
            }
        } else if ("disposal".equalsIgnoreCase(type)) {
            response.setHeader("Content-Disposition", "attachment; filename=\"Hurda_Terkin_ve_Zayiat_Raporu.csv\"");
            writer.println("Varlık Kodu;Demirbaş Adı;Kategori;Müdürlük;Durum;Edinim Bedeli (TL);Edinim Tarihi;Terkin Tarihi;Terkin Gerekçesi");
            for (DisposalReportItem item : enterpriseService.generateDisposalReport()) {
                writer.println(String.format("%s;\"%s\";\"%s\";\"%s\";%s;%.2f;%s;%s;\"%s\"",
                        sanitizeCsvField(item.assetCode()),
                        sanitizeCsvField(item.assetName()),
                        sanitizeCsvField(item.category()),
                        sanitizeCsvField(item.departmentName()),
                        sanitizeCsvField(item.lifecycleStatus()),
                        item.originalValue(),
                        item.acquisitionDate(),
                        item.disposalDate(),
                        sanitizeCsvField(item.disposalReason())));
            }
        } else {
            response.setHeader("Content-Disposition", "attachment; filename=\"Amortisman_ve_Defter_Degeri_Raporu.csv\"");
            writer.println("Varlık Kodu;Demirbaş Adı;Kategori;Müdürlük;Edinim Tarihi;İlk Bedel (TL);Faydalı Ömür (Yıl);Yıllık Oran;Birikmiş Amortisman (TL);Net Defter Değeri (TL);Durum");
            for (DepreciationReportItem item : enterpriseService.calculateDepreciation()) {
                writer.println(String.format("%s;\"%s\";\"%s\";\"%s\";%s;%.2f;%d;%.1f;%.2f;%.2f;%s",
                        sanitizeCsvField(item.assetCode()),
                        sanitizeCsvField(item.assetName()),
                        sanitizeCsvField(item.category()),
                        sanitizeCsvField(item.departmentName()),
                        item.acquisitionDate(),
                        item.originalValue(),
                        item.usefulLifeYears(),
                        item.annualDepreciationRate(),
                        item.accumulatedDepreciation(),
                        item.currentBookValue(),
                        sanitizeCsvField(item.status())));
            }
        }

        writer.flush();
    }

    private String sanitizeCsvField(String value) {
        if (value == null) return "";
        String sanitized = value;
        if (!sanitized.isEmpty()) {
            char first = sanitized.charAt(0);
            if (first == '=' || first == '+' || first == '-' || first == '@') {
                sanitized = "'" + sanitized;
            }
        }
        return sanitized.replace("\"", "\"\"");
    }

    // 9. OTOMATİK UYARILAR
    @GetMapping("/alerts")
    public List<SystemAlert> getAlerts() {
        return enterpriseService.calculateSystemAlerts();
    }
}

