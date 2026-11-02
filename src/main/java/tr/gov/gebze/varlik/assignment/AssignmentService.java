package tr.gov.gebze.varlik.assignment;

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
import tr.gov.gebze.varlik.movement.MovementService;

@Service
public class AssignmentService {

    private final AssetService assetService;
    private final MovementService movementService;
    private final Map<Long, AssetAssignment> assignments = new ConcurrentHashMap<>();
    private final AtomicLong idGenerator = new AtomicLong(0);

    public AssignmentService(AssetService assetService, MovementService movementService) {
        this.assetService = assetService;
        this.movementService = movementService;
    }

    @PostConstruct
    public void initDemoAssignments() {
        seed(new AssetAssignment(
                idGenerator.incrementAndGet(),
                "DEMO-ZMT-2026-001",
                1L,
                "DEMO-VRK-001",
                "Taşınabilir İş İstasyonu (Örnek Cihaz A)",
                "Örnek Sorumlu 1 (Demo Kayıt)",
                "Yazılım Geliştirme Uzmanı (Demo)",
                "Demo Birim A (Bilgi Sistemleri)",
                "Demo Yerleşke - A Blok Kat 2 Oda 204",
                "AKTIF",
                "Taşınır Kayıt Yetkilisi (Demo)",
                "2026-10-12 09:30",
                null,
                null,
                "Proje geliştirme çalışmaları kapsamında zimmetlendi."
        ));
        seed(new AssetAssignment(
                idGenerator.incrementAndGet(),
                "DEMO-ZMT-2026-002",
                2L,
                "DEMO-VRK-002",
                "Toplantı Masası 12 Kişilik (Örnek Mobilya)",
                "Örnek Sorumlu 2 (Demo Kayıt)",
                "İdari Salon Sorumlusu (Demo)",
                "Demo Birim B (İdari İşler)",
                "Demo Yerleşke - B Blok Kat 1 Toplantı Salonu",
                "AKTIF",
                "Taşınır Kayıt Yetkilisi (Demo)",
                "2026-09-18 14:15",
                null,
                null,
                "Ortak alan demirbaş zimmet fişi."
        ));
        seed(new AssetAssignment(
                idGenerator.incrementAndGet(),
                "DEMO-ZMT-2026-003",
                5L,
                "DEMO-VRK-005",
                "Çelik Evrak Dolabı Çift Kapaklı (Örnek Demirbaş)",
                "Örnek Sorumlu 4 (Demo Kayıt)",
                "Arşiv Görevlisi (Demo)",
                "Demo Birim B (İdari İşler)",
                "Demo Yerleşke - B Blok Arşiv Odası",
                "AKTIF",
                "Taşınır Kayıt Yetkilisi (Demo)",
                "2025-08-19 10:20",
                null,
                null,
                "Birim arşiv sorumlusu zimmeti."
        ));
        seed(new AssetAssignment(
                idGenerator.incrementAndGet(),
                "DEMO-ZMT-2026-004",
                4L,
                "DEMO-VRK-004",
                "Saha Ölçüm Cihazı (Örnek Teknik Ekipman)",
                "Örnek Sorumlu 5 (Demo Kayıt)",
                "Saha Teknikeri (Demo)",
                "Demo Birim D (Saha Operasyon)",
                "Saha Görev Noktası 3 (Demo)",
                "IADE_EDILDI",
                "Taşınır Kayıt Yetkilisi (Demo)",
                "2026-09-01 08:30",
                "2026-10-30 16:00",
                "Saha ölçüm çalışması tamamlandı, sağlam olarak depoya iade alındı.",
                "Geçici saha görevi zimmeti."
        ));
    }

    private void seed(AssetAssignment assignment) {
        assignments.put(assignment.id(), assignment);
    }

    public List<AssetAssignment> findAll(Long assetId, String status) {
        return assignments.values().stream()
                .filter(a -> (assetId == null || a.assetId().equals(assetId))
                        && (status == null || status.isBlank() || a.status().equalsIgnoreCase(status.trim())))
                .sorted(Comparator.comparing(AssetAssignment::id).reversed())
                .toList();
    }

    public synchronized AssetAssignment assignAsset(AssignmentRequest req, String actorName) {
        if (req == null || req.assetId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Zimmetlenecek varlık seçilmelidir.");
        }
        if (req.assigneeName() == null || req.assigneeName().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Zimmetlenecek sorumlu kişi adı zorunludur.");
        }
        if (req.unit() == null || req.unit().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Zimmet birimi zorunludur.");
        }
        if (req.location() == null || req.location().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Zimmet konumu zorunludur.");
        }

        Asset asset = assetService.findById(req.assetId());
        String prevUnit = asset.unit();
        String prevLocation = asset.location();

        // Bu varlık üzerinde aktif bir zimmet varsa otomatik devir / iade olarak kapat
        assignments.values().stream()
                .filter(a -> a.assetId().equals(asset.id()) && "AKTIF".equalsIgnoreCase(a.status()))
                .forEach(active -> {
                    AssetAssignment closed = new AssetAssignment(
                            active.id(),
                            active.documentNo(),
                            active.assetId(),
                            active.assetCode(),
                            active.assetName(),
                            active.assigneeName(),
                            active.assigneeTitle(),
                            active.unit(),
                            active.location(),
                            "IADE_EDILDI",
                            active.assignedBy(),
                            active.assignedAt(),
                            AssetService.nowFormatted(),
                            "Yeni zimmet ataması (" + req.assigneeName().trim() + ") nedeniyle devredildi.",
                            active.note()
                    );
                    assignments.put(closed.id(), closed);
                });

        Long id = idGenerator.incrementAndGet();
        String docNo = String.format("DEMO-ZMT-2026-%03d", id);

        AssetAssignment created = new AssetAssignment(
                id,
                docNo,
                asset.id(),
                asset.code(),
                asset.name(),
                req.assigneeName().trim(),
                (req.assigneeTitle() == null || req.assigneeTitle().isBlank())
                        ? "Birim Görevlisi (Demo)"
                        : req.assigneeTitle().trim(),
                req.unit().trim(),
                req.location().trim(),
                "AKTIF",
                actorName,
                AssetService.nowFormatted(),
                null,
                null,
                req.note() == null ? "" : req.note().trim()
        );
        assignments.put(id, created);

        Asset updatedAsset = assetService.updateOperationalState(
                asset.id(),
                created.unit(),
                created.location(),
                created.assigneeName(),
                "Aktif"
        );

        movementService.recordSystemMovement(
                updatedAsset,
                "ZIMMET_ATAMA",
                "Zimmet Atama",
                prevUnit,
                prevLocation,
                created.unit(),
                created.location(),
                actorName,
                docNo + " fişi ile " + created.assigneeName() + " sorumlusuna zimmetlendi."
        );

        return created;
    }

    public synchronized AssetAssignment returnAssignment(Long assignmentId, AssignmentReturnRequest req, String actorName) {
        AssetAssignment existing = assignments.get(assignmentId);
        if (existing == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Zimmet kaydı bulunamadı (ID: " + assignmentId + ").");
        }
        if (!"AKTIF".equalsIgnoreCase(existing.status())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bu zimmet kaydı zaten iade edilmiş.");
        }

        String targetStatus = (req != null && req.targetStatus() != null && !req.targetStatus().isBlank())
                ? req.targetStatus().trim()
                : "Depoda";
        String returnLoc = (req != null && req.returnLocation() != null && !req.returnLocation().isBlank())
                ? req.returnLocation().trim()
                : "Demo Depo Alanı - Merkez İade Rafı";
        String returnNote = (req != null && req.returnNote() != null && !req.returnNote().isBlank())
                ? req.returnNote().trim()
                : "Zimmet iade alındı.";

        AssetAssignment updated = new AssetAssignment(
                existing.id(),
                existing.documentNo(),
                existing.assetId(),
                existing.assetCode(),
                existing.assetName(),
                existing.assigneeName(),
                existing.assigneeTitle(),
                existing.unit(),
                existing.location(),
                "IADE_EDILDI",
                existing.assignedBy(),
                existing.assignedAt(),
                AssetService.nowFormatted(),
                returnNote,
                existing.note()
        );
        assignments.put(assignmentId, updated);

        Asset asset = assetService.findById(existing.assetId());
        Asset updatedAsset = assetService.updateOperationalState(
                asset.id(),
                asset.unit(),
                returnLoc,
                "Atanmamış (Depo Sorumlusu - Demo)",
                targetStatus
        );

        movementService.recordSystemMovement(
                updatedAsset,
                "ZIMMET_IADE",
                "Zimmet İadesi",
                existing.unit(),
                existing.location(),
                asset.unit(),
                returnLoc,
                actorName,
                existing.documentNo() + " zimmeti " + existing.assigneeName() + " sorumlusundan iade alındı. (" + returnNote + ")"
        );

        return updated;
    }
}

