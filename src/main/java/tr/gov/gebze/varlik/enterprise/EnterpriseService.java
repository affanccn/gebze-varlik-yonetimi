package tr.gov.gebze.varlik.enterprise;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tr.gov.gebze.varlik.common.CursorResponse;
import tr.gov.gebze.varlik.common.PageResponse;
import tr.gov.gebze.varlik.common.SortValidator;
import tr.gov.gebze.varlik.security.SecurityAuditService;

@Service
public class EnterpriseService {

    private final EnterpriseRepository repository;

    public EnterpriseService(EnterpriseRepository repository) {
        this.repository = repository;
    }

    public PageResponse<StockItem> findStockItemsPage(Long departmentId, String warehouse, String status, String q, String sort, int page, int size) {
        return repository.findStockItemsPage(departmentId, warehouse, status, q, sort, page, size);
    }

    public List<StockItem> findAllStockItems(Long departmentId, String warehouse, String status) {
        return repository.findAllStockItems(departmentId, warehouse, status);
    }

    public CursorResponse<StockTransaction> findStockTransactionsKeyset(String cursor, int size, Long stockItemId, String txType) {
        Long cursorVal = SortValidator.validateCursor(cursor);
        SortValidator.validateCursorPagination(size);
        int fetchCount = size + 1;
        List<StockTransaction> list = repository.findStockTransactionsKeyset(cursorVal, fetchCount, stockItemId, txType);
        boolean hasMore = list.size() > size;
        List<StockTransaction> items = hasMore ? list.subList(0, size) : list;
        String nextCursor = hasMore && !items.isEmpty() ? String.valueOf(items.get(items.size() - 1).id()) : null;
        return CursorResponse.of(items, nextCursor, hasMore, size);
    }

    public List<StockTransaction> findStockTransactions(Long stockItemId) {
        return repository.findStockTransactions(stockItemId);
    }

    @Transactional
    public void addStockTransaction(Long stockItemId, String txType, Double quantity, Long deptId, String deptName, String recipient, String actor, String notes) {
        repository.addStockTransaction(stockItemId, txType, quantity, deptId, deptName, recipient, actor, notes);
        repository.logAction("STOK_HAREKETI", "STOCK", String.valueOf(stockItemId), actor, actor, SecurityAuditService.resolveCurrentClientIp(),
                txType + " işlemi: " + quantity + " birim aktarıldı. Not: " + (notes != null ? notes : "-"));
    }

    public PageResponse<FleetVehicle> findVehiclesPage(Long departmentId, String vehicleType, String status, String q, String sort, int page, int size) {
        return repository.findVehiclesPage(departmentId, vehicleType, status, q, sort, page, size);
    }

    public List<FleetVehicle> findAllVehicles(Long departmentId, String vehicleType, String status) {
        return repository.findAllVehicles(departmentId, vehicleType, status);
    }

    @Transactional
    public void updateVehicleStatus(Long id, String status, Integer km, String driver, String actor) {
        repository.updateVehicleStatus(id, status, km, driver);
        repository.logAction("ARAC_GUNCELLEME", "FLEET", String.valueOf(id), actor, actor, SecurityAuditService.resolveCurrentClientIp(),
                "Araç durumu: " + status + ", KM: " + km + ", Sürücü: " + driver);
    }

    public PageResponse<ProcurementOrder> findProcurementOrdersPage(Long departmentId, String status, String q, String sort, int page, int size) {
        return repository.findProcurementOrdersPage(departmentId, status, q, sort, page, size);
    }

    public List<ProcurementOrder> findAllProcurementOrders(Long departmentId, String status) {
        return repository.findAllProcurementOrders(departmentId, status);
    }

    public List<InventoryAudit> findAllAudits() {
        return repository.findAllAudits();
    }

    public List<AuditScan> findAuditScans(Long auditId) {
        return repository.findAuditScans(auditId);
    }

    @Transactional
    public AuditScanResult recordAuditScan(Long auditId, String assetCode, String scannedLoc, String scannedBy) {
        AuditScanResult result = repository.recordAuditScan(auditId, assetCode, scannedLoc, scannedBy);
        repository.logAction("SAYIM_TARA", "AUDIT", String.valueOf(auditId), scannedBy, scannedBy, SecurityAuditService.resolveCurrentClientIp(),
                assetCode + " nolu varlık okutuldu (" + result.matchStatus() + "). Konum: " + scannedLoc);
        return result;
    }

    public AuditReconciliationSummary getAuditReconciliation(Long auditId) {
        return repository.getAuditReconciliation(auditId);
    }

    public PageResponse<AssetDocument> findDocumentsPage(Long assetId, String docType, String q, String sort, int page, int size) {
        return repository.findDocumentsPage(assetId, docType, q, sort, page, size);
    }

    public List<AssetDocument> findAllDocuments(Long assetId, String docType) {
        return repository.findAllDocuments(assetId, docType);
    }

    public CursorResponse<SystemAuditLog> findAuditLogsKeyset(String cursor, int size, String actionType, String actor, String dateFrom, String dateTo) {
        Long cursorVal = SortValidator.validateCursor(cursor);
        SortValidator.validateCursorPagination(size);
        int fetchCount = size + 1;
        List<SystemAuditLog> list = repository.findAuditLogsKeyset(cursorVal, fetchCount, actionType, actor, dateFrom, dateTo);
        boolean hasMore = list.size() > size;
        List<SystemAuditLog> items = hasMore ? list.subList(0, size) : list;
        String nextCursor = hasMore && !items.isEmpty() ? String.valueOf(items.get(items.size() - 1).id()) : null;
        return CursorResponse.of(items, nextCursor, hasMore, size);
    }

    public List<SystemAuditLog> findRecentAuditLogs(int limit) {
        return repository.findRecentAuditLogs(limit);
    }

    public Long getVehicleDepartmentId(Long vehicleId) {
        return repository.getVehicleDepartmentId(vehicleId).orElse(null);
    }

    public Long getAuditDepartmentId(Long auditId) {
        return repository.getAuditDepartmentId(auditId).orElse(null);
    }

    public List<SystemSetting> findAllSettings() {
        return repository.findAllSettings();
    }

    @Transactional
    public void updateSetting(String key, String val, String actor) {
        repository.updateSetting(key, val);
        repository.logAction("SISTEM_AYARI", "SETTING", key, actor, actor, SecurityAuditService.resolveCurrentClientIp(),
                key + " parametresi güncellendi: " + val);
    }

    public List<DepreciationReportItem> calculateDepreciation() {
        return repository.calculateDepreciation();
    }

    public List<Form13ReportItem> generateForm13Report(Long departmentId) {
        return repository.generateForm13Report(departmentId);
    }

    public List<DisposalReportItem> generateDisposalReport() {
        return repository.generateDisposalReport();
    }

    public List<SystemAlert> calculateSystemAlerts() {
        return repository.calculateSystemAlerts();
    }
}

