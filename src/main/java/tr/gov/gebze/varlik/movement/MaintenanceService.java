package tr.gov.gebze.varlik.movement;

import java.util.List;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tr.gov.gebze.varlik.asset.Asset;
import tr.gov.gebze.varlik.asset.AssetService;
import tr.gov.gebze.varlik.common.ApiException;
import tr.gov.gebze.varlik.common.PageResponse;
import tr.gov.gebze.varlik.lifecycle.AssetLifecycleService;
import tr.gov.gebze.varlik.lifecycle.AssetLifecycleStatus;

@Service
public class MaintenanceService {

    private final MaintenanceRepository maintenanceRepository;
    private final AssetService assetService;
    private final MovementService movementService;
    private final AssetLifecycleService assetLifecycleService;

    public MaintenanceService(
            MaintenanceRepository maintenanceRepository,
            @Lazy AssetService assetService,
            MovementService movementService,
            AssetLifecycleService assetLifecycleService
    ) {
        this.maintenanceRepository = maintenanceRepository;
        this.assetService = assetService;
        this.movementService = movementService;
        this.assetLifecycleService = assetLifecycleService;
    }

    public PageResponse<MaintenanceRecord> findPage(Long assetId, String status, String maintenanceType, String q, String sort, int page, int size) {
        return maintenanceRepository.findPage(assetId, status, maintenanceType, q, sort, page, size);
    }

    public List<MaintenanceRecord> findAll(Long assetId, String status) {
        return maintenanceRepository.findAll(assetId, status);
    }

    public MaintenanceRecord findById(Long id) {
        return maintenanceRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Bakım kaydı bulunamadı (ID: " + id + ")."));
    }

    @Transactional
    public MaintenanceRecord createMaintenance(MaintenanceRequest req, String actorName) {
        if (req == null || req.assetId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bakım kaydı için varlık seçilmelidir.");
        }
        if (req.issueDescription() == null || req.issueDescription().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Arıza / bakım açıklaması zorunludur.");
        }

        Asset asset = assetService.findById(req.assetId());
        String prevLocation = asset.location();
        String prevUnit = asset.unit();

        String orderNo = String.format("GBZ-BKM-2026-%04d", System.currentTimeMillis() % 100000);
        String maintType = (req.maintenanceType() == null || req.maintenanceType().isBlank()) ? "Arıza Onarım" : req.maintenanceType().trim();
        String priority = (req.priority() == null || req.priority().isBlank()) ? "Normal" : req.priority().trim();
        Double cost = (req.estimatedCost() == null || req.estimatedCost() < 0) ? 0.0 : req.estimatedCost();

        AssetLifecycleStatus prevLifecycle = AssetLifecycleStatus.fromString(
                asset.lifecycleStatus() != null ? asset.lifecycleStatus() : asset.status()
        );

        MaintenanceRecord created = new MaintenanceRecord(
                null,
                orderNo,
                asset.id(),
                asset.code(),
                asset.name(),
                maintType,
                priority,
                (req.vendorOrTechnician() == null || req.vendorOrTechnician().isBlank()) ? "Yetkili Teknik Servis" : req.vendorOrTechnician().trim(),
                req.issueDescription().trim(),
                null,
                cost,
                "DEVAM_EDIYOR",
                AssetService.nowFormatted(),
                null,
                actorName,
                prevLifecycle.name()
        );
        maintenanceRepository.save(created);

        // Yaşam döngüsü durum geçişi: BAKIMDA
        assetLifecycleService.transitionState(asset.id(), AssetLifecycleStatus.BAKIMDA, orderNo + " nolu iş emri ile bakıma alındı: " + req.issueDescription().trim(), actorName);

        String serviceLocation = "Teknik Servis / Bakım Atölyesi";
        Asset updatedAsset = assetService.updateOperationalStateAndCondition(
                asset.id(),
                prevUnit,
                serviceLocation,
                asset.assignee(),
                "Onarım Gerekli"
        );

        movementService.recordSystemMovement(
                updatedAsset,
                "BAKIMA_GONDERIM",
                "Bakıma Gönderim",
                prevUnit,
                prevLocation,
                prevUnit,
                serviceLocation,
                actorName,
                orderNo + " nolu iş emri ile bakıma alındı: " + req.issueDescription().trim()
        );

        return maintenanceRepository.findAll(asset.id(), "DEVAM_EDIYOR").stream().findFirst().orElse(created);
    }

    @Transactional
    public MaintenanceRecord completeMaintenance(Long maintenanceId, MaintenanceCompleteRequest req, String actorName) {
        MaintenanceRecord rec = findById(maintenanceId);
        if ("TAMAMLANDI".equalsIgnoreCase(rec.status())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bu bakım kaydı zaten tamamlanmış.");
        }

        Asset asset = assetService.findById(rec.assetId());
        String prevLocation = asset.location();
        String prevUnit = asset.unit();

        String resolution = (req == null || req.resolutionNote() == null || req.resolutionNote().isBlank())
                ? "Parça değişimi ve testleri tamamlandı, çalışır vaziyette teslim edildi."
                : req.resolutionNote().trim();

        Double cost = (req == null || req.finalCost() == null || req.finalCost() < 0) ? rec.cost() : req.finalCost();

        maintenanceRepository.complete(rec.id(), resolution, cost);

        // Önceki duruma dönüş: previous_lifecycle_status kontrol edilir
        AssetLifecycleStatus targetLifecycle;
        if (rec.previousLifecycleStatus() != null && !rec.previousLifecycleStatus().isBlank()) {
            targetLifecycle = AssetLifecycleStatus.fromString(rec.previousLifecycleStatus());
        } else {
            targetLifecycle = (asset.assignee() != null && !asset.assignee().toLowerCase().contains("atanmamış"))
                    ? AssetLifecycleStatus.ZIMMETLENDI
                    : AssetLifecycleStatus.KAYDEDILDI;
        }

        // Yaşam döngüsü durum geçişi: Önceki duruma dönüş
        assetLifecycleService.transitionState(asset.id(), targetLifecycle, rec.orderNo() + " nolu bakım tamamlandı: " + resolution, actorName);

        String targetCondition = (req != null && req.targetCondition() != null && !req.targetCondition().isBlank())
                ? req.targetCondition().trim()
                : "Çok İyi";

        String targetLocation = (req != null && req.returnLocation() != null && !req.returnLocation().isBlank())
                ? req.returnLocation().trim()
                : "Merkez Taşınır Ana Ambari";

        Asset updated = assetService.updateOperationalStateAndCondition(
                asset.id(),
                prevUnit,
                targetLocation,
                asset.assignee(),
                targetCondition
        );

        movementService.recordSystemMovement(
                updated,
                "BAKIMDAN_DONUS",
                "Bakımdan Dönüş",
                prevUnit,
                prevLocation,
                prevUnit,
                targetLocation,
                actorName,
                rec.orderNo() + " nolu bakım tamamlandı. Çözüm: " + resolution + " (Maliyet: " + cost + " TL)"
        );

        return findById(maintenanceId);
    }
}
