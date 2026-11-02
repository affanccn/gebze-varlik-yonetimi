package tr.gov.gebze.varlik.movement;

import jakarta.annotation.PostConstruct;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import tr.gov.gebze.varlik.asset.Asset;
import tr.gov.gebze.varlik.asset.AssetService;
import tr.gov.gebze.varlik.common.ApiException;

@Service
public class MaintenanceService {

    private final AssetService assetService;
    private final MovementService movementService;
    private final Map<Long, MaintenanceRecord> records = new ConcurrentHashMap<>();
    private final AtomicLong idGenerator = new AtomicLong(0);

    public MaintenanceService(AssetService assetService, MovementService movementService) {
        this.assetService = assetService;
        this.movementService = movementService;
    }

    @PostConstruct
    public void initDemoMaintenances() {
        seed(new MaintenanceRecord(
                idGenerator.incrementAndGet(),
                "DEMO-BKM-2026-001",
                3L,
                "DEMO-VRK-003",
                "Çok Fonksiyonlu Ağ Yazıcısı (Örnek Donanım)",
                "Periyodik Bakım & Onarım",
                "Yüksek",
                "Kurumsal Yazıcı Teknik Servis A.Ş. (Demo)",
                "Kağıt besleme merdanesi aşınması ve tambur ünitesi değişimi.",
                null,
                3450.0,
                "DEVAM_EDIYOR",
                "2026-10-28 11:45",
                null,
                "Sistem Yöneticisi (Demo)"
        ));
        seed(new MaintenanceRecord(
                idGenerator.incrementAndGet(),
                "DEMO-BKM-2026-002",
                9L,
                "DEMO-VRK-009",
                "Termal Saha Denetim Kamerası (Örnek Cihaz)",
                "Yıllık Kalibrasyon",
                "Normal",
                "Akredite Kalibrasyon Laboratuvarı (Demo)",
                "Yıllık kızılötesi sensör doğruluk kalibrasyonu ve batarya kapasite testi.",
                null,
                4200.0,
                "DEVAM_EDIYOR",
                "2026-10-31 10:15",
                null,
                "Taşınır Kayıt Yetkilisi (Demo)"
        ));
        seed(new MaintenanceRecord(
                idGenerator.incrementAndGet(),
                "DEMO-BKM-2026-003",
                7L,
                "DEMO-VRK-007",
                "Kesintisiz Güç Kaynağı UPS 20 kVA (Örnek Enerji)",
                "Periyodik Akü Kontrolü",
                "Normal",
                "Enerji Sistemleri Destek Ekibi (Demo)",
                "6 aylık periyodik akü grubu iç direnç ölçümü ve fan temizliği.",
                "Tüm akü blokları test edildi, voltaj değerleri nominal aralıkta.",
                1800.0,
                "TAMAMLANDI",
                "2026-10-14 09:00",
                "2026-10-15 11:00",
                "Sistem Yöneticisi (Demo)"
        ));
    }

    private void seed(MaintenanceRecord rec) {
        records.put(rec.id(), rec);
    }

    public List<MaintenanceRecord> findAll(Long assetId, String status) {
        return records.values().stream()
                .filter(r -> (assetId == null || r.assetId().equals(assetId))
                        && (status == null || status.isBlank() || r.status().equalsIgnoreCase(status.trim())))
                .sorted(Comparator.comparing(MaintenanceRecord::id).reversed())
                .toList();
    }

    public synchronized MaintenanceRecord createMaintenance(MaintenanceRequest req, String actorName) {
        if (req == null || req.assetId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bakım kaydı için varlık seçilmelidir.");
        }
        if (req.issueDescription() == null || req.issueDescription().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Arıza / bakım açıklaması zorunludur.");
        }

        Asset asset = assetService.findById(req.assetId());
        Long id = idGenerator.incrementAndGet();
        String orderNo = String.format("DEMO-BKM-2026-%03d", id);
        String mType = (req.maintenanceType() == null || req.maintenanceType().isBlank())
                ? "Arıza Onarım"
                : req.maintenanceType().trim();
        String priority = (req.priority() == null || req.priority().isBlank()) ? "Normal" : req.priority().trim();
        String vendor = (req.vendorOrTechnician() == null || req.vendorOrTechnician().isBlank())
                ? "Kurum İçi Teknik Atölye (Demo)"
                : req.vendorOrTechnician().trim();
        Double cost = (req.estimatedCost() == null || req.estimatedCost() < 0) ? 0.0 : req.estimatedCost();

        MaintenanceRecord created = new MaintenanceRecord(
                id,
                orderNo,
                asset.id(),
                asset.code(),
                asset.name(),
                mType,
                priority,
                vendor,
                req.issueDescription().trim(),
                null,
                cost,
                "DEVAM_EDIYOR",
                AssetService.nowFormatted(),
                null,
                actorName
        );
        records.put(id, created);

        Asset updatedAsset = assetService.updateOperationalStateAndCondition(
                asset.id(),
                asset.unit(),
                vendor,
                asset.assignee(),
                "Bakımda",
                "Onarım Gerekli"
        );

        movementService.recordSystemMovement(
                updatedAsset,
                "BAKIMA_GONDERIM",
                "Bakıma Gönderim (" + mType + ")",
                asset.unit(),
                asset.location(),
                asset.unit(),
                vendor,
                actorName,
                orderNo + " iş emri ile bakıma alındı: " + created.issueDescription()
        );

        return created;
    }

    public synchronized MaintenanceRecord completeMaintenance(
            Long id,
            MaintenanceCompleteRequest req,
            String actorName
    ) {
        MaintenanceRecord existing = records.get(id);
        if (existing == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Bakım kaydı bulunamadı (ID: " + id + ").");
        }
        if ("TAMAMLANDI".equalsIgnoreCase(existing.status())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bu bakım kaydı zaten tamamlanmış.");
        }

        String targetStatus = (req != null && req.targetStatus() != null && !req.targetStatus().isBlank())
                ? req.targetStatus().trim()
                : "Aktif";
        String targetCondition = (req != null && req.targetCondition() != null && !req.targetCondition().isBlank())
                ? req.targetCondition().trim()
                : "İyi";
        Double finalCost = (req != null && req.finalCost() != null && req.finalCost() >= 0)
                ? req.finalCost()
                : existing.cost();
        String resolution = (req != null && req.resolutionNote() != null && !req.resolutionNote().isBlank())
                ? req.resolutionNote().trim()
                : "Bakım ve kontroller tamamlandı, çalışır durumda teslim alındı.";

        MaintenanceRecord completed = new MaintenanceRecord(
                existing.id(),
                existing.orderNo(),
                existing.assetId(),
                existing.assetCode(),
                existing.assetName(),
                existing.maintenanceType(),
                existing.priority(),
                existing.vendorOrTechnician(),
                existing.issueDescription(),
                resolution,
                finalCost,
                "TAMAMLANDI",
                existing.startedAt(),
                AssetService.nowFormatted(),
                existing.createdBy()
        );
        records.put(id, completed);

        Asset asset = assetService.findById(existing.assetId());
        String returnLoc = (req != null && req.returnLocation() != null && !req.returnLocation().isBlank())
                ? req.returnLocation().trim()
                : asset.location();

        Asset updatedAsset = assetService.updateOperationalStateAndCondition(
                asset.id(),
                asset.unit(),
                returnLoc,
                asset.assignee(),
                targetStatus,
                targetCondition
        );

        movementService.recordSystemMovement(
                updatedAsset,
                "BAKIMDAN_DONUS",
                "Bakımdan Dönüş",
                asset.unit(),
                existing.vendorOrTechnician(),
                asset.unit(),
                returnLoc,
                actorName,
                existing.orderNo() + " bakımı tamamlandı (" + resolution + ")"
        );

        return completed;
    }
}

