package tr.gov.gebze.varlik.movement;

import jakarta.annotation.PostConstruct;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import tr.gov.gebze.varlik.asset.Asset;
import tr.gov.gebze.varlik.asset.AssetService;
import tr.gov.gebze.varlik.common.ApiException;

@Service
public class MovementService {

    private final AssetService assetService;
    private final List<AssetMovement> movements = new CopyOnWriteArrayList<>();
    private final AtomicLong idGenerator = new AtomicLong(0);

    public MovementService(AssetService assetService) {
        this.assetService = assetService;
    }

    @PostConstruct
    public void initDemoMovements() {
        movements.add(new AssetMovement(
                idGenerator.incrementAndGet(),
                1L,
                "DEMO-VRK-001",
                "Taşınabilir İş İstasyonu (Örnek Cihaz A)",
                "ZIMMET_ATAMA",
                "Zimmet Atama",
                "Demo Depo Alanı",
                "Merkez Depo",
                "Demo Birim A (Bilgi Sistemleri)",
                "Demo Yerleşke - A Blok Kat 2 Oda 204",
                "Taşınır Kayıt Yetkilisi (Demo)",
                "Örnek Sorumlu 1 adına ilk zimmet teslimi.",
                "2026-10-12 09:30"
        ));
        movements.add(new AssetMovement(
                idGenerator.incrementAndGet(),
                2L,
                "DEMO-VRK-002",
                "Toplantı Masası 12 Kişilik (Örnek Mobilya)",
                "TRANSFER",
                "Birim / Konum Transferi",
                "Demo Depo Alanı",
                "Mobilya Kabul Alanı",
                "Demo Birim B (İdari İşler)",
                "Demo Yerleşke - B Blok Kat 1 Toplantı Salonu",
                "Taşınır Kayıt Yetkilisi (Demo)",
                "Toplantı salonu kurulumu için yer değişikliği.",
                "2026-09-18 14:15"
        ));
        movements.add(new AssetMovement(
                idGenerator.incrementAndGet(),
                3L,
                "DEMO-VRK-003",
                "Çok Fonksiyonlu Ağ Yazıcısı (Örnek Donanım)",
                "BAKIMA_GONDERIM",
                "Bakıma Gönderim",
                "Demo Birim C (Destek Hizmetleri)",
                "Demo Yerleşke - A Blok Zemin Kat Koridor",
                "Demo Birim C (Destek Hizmetleri)",
                "Teknik Servis / Bakım Atölyesi (Demo)",
                "Sistem Yöneticisi (Demo)",
                "Periyodik bakım ve tambur değişimi için servise alındı.",
                "2026-10-28 11:45"
        ));
        movements.add(new AssetMovement(
                idGenerator.incrementAndGet(),
                4L,
                "DEMO-VRK-004",
                "Saha Ölçüm Cihazı (Örnek Teknik Ekipman)",
                "ILK_KAYIT",
                "Envanter Girişi",
                "Tedarik Kabul (Demo)",
                "Geçici Kabul Noktası",
                "Demo Birim D (Saha Operasyon)",
                "Demo Depo Alanı - Raf Kodu D-12",
                "Taşınır Kayıt Yetkilisi (Demo)",
                "Envantere ilk giriş ve depo rafına yerleştirme.",
                "2026-10-30 16:00"
        ));
    }

    public List<AssetMovement> findAll(Long assetId, String type) {
        return movements.stream()
                .filter(m -> (assetId == null || m.assetId().equals(assetId))
                        && (type == null || type.isBlank() || m.type().equalsIgnoreCase(type.trim())))
                .sorted(Comparator.comparing(AssetMovement::id).reversed())
                .toList();
    }

    public synchronized AssetMovement createOperationalMovement(MovementRequest req, String actorName) {
        if (req == null || req.assetId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Hareket kaydı için varlık seçilmelidir.");
        }
        if (req.type() == null || req.type().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Hareket türü seçilmelidir.");
        }

        Asset asset = assetService.findById(req.assetId());
        String type = req.type().trim().toUpperCase();
        String fromUnit = asset.unit();
        String fromLocation = asset.location();
        String targetUnit = (req.toUnit() == null || req.toUnit().isBlank()) ? asset.unit() : req.toUnit().trim();
        String targetLocation = (req.toLocation() == null || req.toLocation().isBlank()) ? asset.location() : req.toLocation().trim();
        String newStatus = asset.status();
        String newAssignee = asset.assignee();
        String typeLabel;

        switch (type) {
            case "TRANSFER" -> {
                typeLabel = "Birim / Konum Transferi";
                if (req.toLocation() == null || req.toLocation().isBlank()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Transfer işlemi için hedef konum belirtilmelidir.");
                }
            }
            case "BAKIMA_GONDERIM" -> {
                typeLabel = "Bakıma Gönderim";
                newStatus = "Bakımda";
                if (req.toLocation() == null || req.toLocation().isBlank()) {
                    targetLocation = "Teknik Bakım / Servis Alanı (Demo)";
                }
            }
            case "BAKIMDAN_DONUS" -> {
                typeLabel = "Bakımdan Dönüş";
                newStatus = newAssignee.toLowerCase().contains("atanmamış") ? "Depoda" : "Aktif";
            }
            case "DEPOYA_CEKME" -> {
                typeLabel = "Depoya Çekme";
                newStatus = "Depoda";
                newAssignee = "Atanmamış (Depo Sorumlusu - Demo)";
                if (req.toLocation() == null || req.toLocation().isBlank()) {
                    targetLocation = "Demo Depo Alanı - Merkez Raf";
                }
            }
            default -> typeLabel = "Operasyonel Hareket";
        }

        assetService.updateOperationalState(asset.id(), targetUnit, targetLocation, newAssignee, newStatus);

        AssetMovement movement = new AssetMovement(
                idGenerator.incrementAndGet(),
                asset.id(),
                asset.code(),
                asset.name(),
                type,
                typeLabel,
                fromUnit,
                fromLocation,
                targetUnit,
                targetLocation,
                actorName,
                req.note() == null ? "" : req.note().trim(),
                AssetService.nowFormatted()
        );
        movements.add(movement);
        return movement;
    }

    public AssetMovement recordSystemMovement(
            Asset asset,
            String type,
            String typeLabel,
            String fromUnit,
            String fromLocation,
            String toUnit,
            String toLocation,
            String actorName,
            String note
    ) {
        AssetMovement movement = new AssetMovement(
                idGenerator.incrementAndGet(),
                asset.id(),
                asset.code(),
                asset.name(),
                type,
                typeLabel,
                fromUnit,
                fromLocation,
                toUnit,
                toLocation,
                actorName,
                note == null ? "" : note,
                AssetService.nowFormatted()
        );
        movements.add(movement);
        return movement;
    }
}

