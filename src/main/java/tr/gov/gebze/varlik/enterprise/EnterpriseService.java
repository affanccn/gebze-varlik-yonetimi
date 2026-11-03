package tr.gov.gebze.varlik.enterprise;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EnterpriseService {

    private final EnterpriseRepository repository;

    public EnterpriseService(EnterpriseRepository repository) {
        this.repository = repository;
    }

    public List<StockItem> findAllStockItems(Long departmentId, String warehouse, String status) {
        return repository.findAllStockItems(departmentId, warehouse, status);
    }

    public List<StockTransaction> findStockTransactions(Long stockItemId) {
        return repository.findStockTransactions(stockItemId);
    }

    @Transactional
    public void addStockTransaction(Long stockItemId, String txType, Double quantity, Long deptId, String deptName, String recipient, String actor, String notes) {
        repository.addStockTransaction(stockItemId, txType, quantity, deptId, deptName, recipient, actor, notes);
        repository.logAction("STOK_HAREKETI", "STOCK", String.valueOf(stockItemId), actor, actor, "127.0.0.1",
                txType + " işlemi: " + quantity + " birim aktarıldı. Not: " + (notes != null ? notes : "-"));
    }

    public List<FleetVehicle> findAllVehicles(Long departmentId, String vehicleType, String status) {
        return repository.findAllVehicles(departmentId, vehicleType, status);
    }

    @Transactional
    public void updateVehicleStatus(Long id, String status, Integer km, String driver, String actor) {
        repository.updateVehicleStatus(id, status, km, driver);
        repository.logAction("ARAC_GUNCELLEME", "FLEET", String.valueOf(id), actor, actor, "127.0.0.1",
                "Araç durumu: " + status + ", KM: " + km + ", Sürücü: " + driver);
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
    public void recordAuditScan(Long auditId, String assetCode, String scannedLoc, String scannedBy) {
        repository.recordAuditScan(auditId, assetCode, scannedLoc, scannedBy);
        repository.logAction("SAYIM_TARA", "AUDIT", String.valueOf(auditId), scannedBy, scannedBy, "127.0.0.1",
                assetCode + " nolu varlık okutuldu. Konum: " + scannedLoc);
    }

    public List<AssetDocument> findAllDocuments(Long assetId, String docType) {
        return repository.findAllDocuments(assetId, docType);
    }

    public List<SystemAuditLog> findRecentAuditLogs(int limit) {
        return repository.findRecentAuditLogs(limit);
    }

    public List<SystemSetting> findAllSettings() {
        return repository.findAllSettings();
    }

    @Transactional
    public void updateSetting(String key, String val, String actor) {
        repository.updateSetting(key, val);
        repository.logAction("SISTEM_AYARI", "SETTING", key, actor, actor, "127.0.0.1",
                key + " parametresi güncellendi: " + val);
    }

    public List<DepreciationReportItem> calculateDepreciation() {
        return repository.calculateDepreciation();
    }

    public List<SystemAlert> calculateSystemAlerts() {
        return repository.calculateSystemAlerts();
    }
}

