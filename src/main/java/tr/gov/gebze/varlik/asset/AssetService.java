package tr.gov.gebze.varlik.asset;

import jakarta.annotation.PostConstruct;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import tr.gov.gebze.varlik.common.ApiException;

@Service
public class AssetService {

    private static final Locale TR_LOCALE = Locale.forLanguageTag("tr-TR");
    private static final DateTimeFormatter TS_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final Map<Long, Asset> assets = new ConcurrentHashMap<>();
    private final AtomicLong idGenerator = new AtomicLong(0);
    private final AtomicLong codeSequence = new AtomicLong(10);

    @PostConstruct
    public void initDemoData() {
        seed(new Asset(
                idGenerator.incrementAndGet(),
                "DEMO-VRK-001",
                "255.02.01.01",
                "GBZ-869020260001",
                "Taşınabilir İş İstasyonu (Örnek Cihaz A)",
                "Bilişim Ekipmanı",
                "ThinkBook Pro 16 G6 (Demo)",
                "SN-DEMO-900142",
                "Demo Birim A (Bilgi Sistemleri)",
                "Demo Yerleşke - A Blok Kat 2 Oda 204",
                "Örnek Sorumlu 1 (Demo Kayıt)",
                "Aktif",
                "Çok İyi",
                "2026-01-15",
                "2028-01-15",
                68500.0,
                "DMO (Devlet Malzeme Ofisi - Demo)",
                "Yazılım geliştirme ve sistem yönetimi için tahsis edilen kurgusal demo iş istasyonu.",
                "2026-10-12 09:30"
        ));
        seed(new Asset(
                idGenerator.incrementAndGet(),
                "DEMO-VRK-002",
                "255.03.01.04",
                "GBZ-869020260002",
                "Toplantı Masası 12 Kişilik (Örnek Mobilya)",
                "Ofis Mobilyası",
                "Modüler Konferans Serisi 360cm (Demo)",
                "SN-DEMO-440210",
                "Demo Birim B (İdari İşler)",
                "Demo Yerleşke - B Blok Kat 1 Toplantı Salonu",
                "Örnek Sorumlu 2 (Demo Kayıt)",
                "Aktif",
                "İyi",
                "2025-11-20",
                "2027-11-20",
                42000.0,
                "Açık İhale Alımı (Demo)",
                "Ortak toplantı salonu demirbaşı (kurgusal demo kaydı).",
                "2026-09-18 14:15"
        ));
        seed(new Asset(
                idGenerator.incrementAndGet(),
                "DEMO-VRK-003",
                "255.02.02.03",
                "GBZ-869020260003",
                "Çok Fonksiyonlu Ağ Yazıcısı (Örnek Donanım)",
                "Bilişim Ekipmanı",
                "LaserJet Kurumsal A3 MFP (Demo)",
                "SN-DEMO-771008",
                "Demo Birim C (Destek Hizmetleri)",
                "Teknik Servis / Bakım Atölyesi (Demo)",
                "Örnek Sorumlu 3 (Demo Kayıt)",
                "Bakımda",
                "Onarım Gerekli",
                "2024-06-10",
                "2026-11-15",
                54000.0,
                "DMO (Devlet Malzeme Ofisi - Demo)",
                "Periyodik tambur ve fırın ünitesi bakımında olan demo yazıcı.",
                "2026-10-28 11:45"
        ));
        seed(new Asset(
                idGenerator.incrementAndGet(),
                "DEMO-VRK-004",
                "253.03.05.02",
                "GBZ-869020260004",
                "Hassas GNSS Saha Ölçüm Cihazı (Örnek Ekipman)",
                "Teknik Cihaz",
                "GeoSurvey RTK GNSS Alıcı Seti (Demo)",
                "SN-DEMO-553901",
                "Demo Birim D (Saha Operasyon)",
                "Demo Depo Alanı - Raf Kodu D-12",
                "Atanmamış (Depo Sorumlusu - Demo)",
                "Depoda",
                "Çok İyi",
                "2026-03-04",
                "2029-03-04",
                145000.0,
                "Açık İhale Alımı (Demo)",
                "Harita ve saha ölçüm görevleri için zimmet atamasına hazır bekleyen demo teknik cihaz.",
                "2026-10-30 16:00"
        ));
        seed(new Asset(
                idGenerator.incrementAndGet(),
                "DEMO-VRK-005",
                "255.03.02.01",
                "GBZ-869020260005",
                "Çelik Evrak Dolabı Çift Kapaklı (Örnek Demirbaş)",
                "Ofis Mobilyası",
                "ÇelikArşiv Güvenlikli Dolap 195cm (Demo)",
                "SN-DEMO-310884",
                "Demo Birim B (İdari İşler)",
                "Demo Yerleşke - B Blok Arşiv Odası",
                "Örnek Sorumlu 4 (Demo Kayıt)",
                "Aktif",
                "İyi",
                "2025-08-01",
                "2027-08-01",
                14800.0,
                "Doğrudan Temin (Demo)",
                "Fiziki evrak arşivleme için kullanılan demo demirbaş dolap.",
                "2026-08-19 10:20"
        ));
        seed(new Asset(
                idGenerator.incrementAndGet(),
                "DEMO-VRK-006",
                "255.02.01.02",
                "GBZ-869020260006",
                "Veri Merkezi Raf Tipi Sunucu (Örnek Sunucu)",
                "Bilişim Ekipmanı",
                "PowerEdge Rack Server 2U (Demo)",
                "SN-DEMO-992011",
                "Demo Birim A (Bilgi Sistemleri)",
                "Demo Yerleşke - Sistem Odası Kabin R-02",
                "Örnek Sorumlu 1 (Demo Kayıt)",
                "Aktif",
                "Çok İyi",
                "2026-02-10",
                "2029-02-10",
                285000.0,
                "DMO (Devlet Malzeme Ofisi - Demo)",
                "Sanallaştırma kümesi için kullanılan demo sunucu donanımı.",
                "2026-10-05 15:20"
        ));
        seed(new Asset(
                idGenerator.incrementAndGet(),
                "DEMO-VRK-007",
                "253.04.02.01",
                "GBZ-869020260007",
                "Kesintisiz Güç Kaynağı UPS 20 kVA (Örnek Enerji)",
                "İklimlendirme & Enerji",
                "PowerGuard Online UPS 20kVA (Demo)",
                "SN-DEMO-612045",
                "Demo Birim C (Destek Hizmetleri)",
                "Demo Yerleşke - Zemin Kat Enerji Odası",
                "Örnek Sorumlu 6 (Demo Kayıt)",
                "Aktif",
                "İyi",
                "2024-09-12",
                "2026-11-25",
                118000.0,
                "Açık İhale Alımı (Demo)",
                "Sistem odası ve ağ omurgasını besleyen demo kesintisiz güç kaynağı.",
                "2026-10-15 11:00"
        ));
        seed(new Asset(
                idGenerator.incrementAndGet(),
                "DEMO-VRK-008",
                "255.04.01.05",
                "GBZ-869020260008",
                "4K Konferans Salonu Projeksiyon Sistemi (Örnek)",
                "Görsel & Ses Sistemi",
                "OptiView Lazer Projektör 6000 Lümen (Demo)",
                "SN-DEMO-834120",
                "Demo Birim E (Kültür ve Sosyal İşler)",
                "Demo Kültür Merkezi - Ana Konferans Salonu",
                "Örnek Sorumlu 7 (Demo Kayıt)",
                "Aktif",
                "Çok İyi",
                "2025-12-01",
                "2027-12-01",
                76000.0,
                "DMO (Devlet Malzeme Ofisi - Demo)",
                "Seminer ve meclis/salon sunumları için kurulu demo projeksiyon cihazı.",
                "2026-09-22 13:40"
        ));
        seed(new Asset(
                idGenerator.incrementAndGet(),
                "DEMO-VRK-009",
                "253.03.08.04",
                "GBZ-869020260009",
                "Termal Saha Denetim Kamerası (Örnek Cihaz)",
                "Teknik Cihaz",
                "ThermoScan Pro El Tipi Termal (Demo)",
                "SN-DEMO-704512",
                "Demo Birim D (Saha Operasyon)",
                "Kalibrasyon Laboratuvarı (Demo)",
                "Örnek Sorumlu 5 (Demo Kayıt)",
                "Bakımda",
                "Orta",
                "2024-03-18",
                "2026-03-18",
                92000.0,
                "Doğrudan Temin (Demo)",
                "Yıllık sensör kalibrasyonu ve batarya kontrolü yapılan demo termal kamera.",
                "2026-10-31 10:15"
        ));
        seed(new Asset(
                idGenerator.incrementAndGet(),
                "DEMO-VRK-010",
                "255.05.02.02",
                "GBZ-869020260010",
                "Plaka Tanıma ve Çevre Güvenlik Kamerası (Örnek)",
                "Güvenlik & Kamera Sistemi",
                "SafeCity IP Bullet PTZ Kamera (Demo)",
                "SN-DEMO-490811",
                "Demo Birim C (Destek Hizmetleri)",
                "Demo Depo Alanı - Raf Kodu G-04",
                "Atanmamış (Depo Sorumlusu - Demo)",
                "Depoda",
                "Çok İyi",
                "2026-07-19",
                "2028-07-19",
                31500.0,
                "DMO (Devlet Malzeme Ofisi - Demo)",
                "Yerleşke giriş kapısı montajı için depoda hazır bekleyen demo güvenlik kamerası.",
                "2026-10-29 17:10"
        ));
    }

    private void seed(Asset asset) {
        assets.put(asset.id(), asset);
    }

    public List<Asset> findAll(
            String query,
            String category,
            String unit,
            String status,
            String condition,
            String warrantyFilter,
            String sortBy
    ) {
        String q = normalize(query);
        Comparator<Asset> comparator = buildComparator(sortBy);

        return assets.values().stream()
                .filter(item -> {
                    boolean matchesQuery = q.isEmpty()
                            || normalize(item.code()).contains(q)
                            || normalize(item.tifCode()).contains(q)
                            || normalize(item.barcode()).contains(q)
                            || normalize(item.name()).contains(q)
                            || normalize(item.serialNumber()).contains(q)
                            || normalize(item.brandModel()).contains(q)
                            || normalize(item.assignee()).contains(q);
                    boolean matchesCategory = isBlank(category) || item.category().equalsIgnoreCase(category.trim());
                    boolean matchesUnit = isBlank(unit) || item.unit().equalsIgnoreCase(unit.trim());
                    boolean matchesStatus = isBlank(status) || item.status().equalsIgnoreCase(status.trim());
                    boolean matchesCondition = isBlank(condition) || item.condition().equalsIgnoreCase(condition.trim());
                    boolean matchesWarranty = matchesWarrantyFilter(item, warrantyFilter);
                    return matchesQuery && matchesCategory && matchesUnit && matchesStatus && matchesCondition && matchesWarranty;
                })
                .sorted(comparator)
                .toList();
    }

    private boolean matchesWarrantyFilter(Asset item, String warrantyFilter) {
        if (isBlank(warrantyFilter)) {
            return true;
        }
        LocalDate end = parseDateSafe(item.warrantyEndDate());
        if (end == null) {
            return false;
        }
        LocalDate today = LocalDate.now();
        if ("EXPIRED_OR_SOON".equalsIgnoreCase(warrantyFilter)) {
            return !end.isAfter(today.plusDays(90));
        }
        if ("ACTIVE".equalsIgnoreCase(warrantyFilter)) {
            return end.isAfter(today);
        }
        return true;
    }

    private Comparator<Asset> buildComparator(String sortBy) {
        if ("value_desc".equalsIgnoreCase(sortBy)) {
            return Comparator.comparing((Asset a) -> a.estimatedValue() == null ? 0.0 : a.estimatedValue()).reversed();
        }
        if ("value_asc".equalsIgnoreCase(sortBy)) {
            return Comparator.comparing(a -> a.estimatedValue() == null ? 0.0 : a.estimatedValue());
        }
        if ("date_desc".equalsIgnoreCase(sortBy)) {
            return Comparator.comparing((Asset a) -> a.acquisitionDate() == null ? "" : a.acquisitionDate()).reversed();
        }
        if ("name".equalsIgnoreCase(sortBy)) {
            return Comparator.comparing(Asset::name, String.CASE_INSENSITIVE_ORDER);
        }
        return Comparator.comparing(Asset::code);
    }

    public List<Asset> findAllRaw() {
        return assets.values().stream()
                .sorted(Comparator.comparing(Asset::code))
                .toList();
    }

    public Asset findById(Long id) {
        Asset asset = assets.get(id);
        if (asset == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Varlık kaydı bulunamadı (ID: " + id + ").");
        }
        return asset;
    }

    public Optional<Asset> findByCodeOrBarcodeOrSerial(String term) {
        if (isBlank(term)) {
            return Optional.empty();
        }
        String t = normalize(term);
        return assets.values().stream()
                .filter(a -> normalize(a.code()).equals(t)
                        || normalize(a.barcode()).equals(t)
                        || normalize(a.serialNumber()).equals(t))
                .findFirst();
    }

    public synchronized Asset create(AssetRequest req) {
        validateRequest(req);
        String code = isBlank(req.code()) ? generateNextCode() : req.code().trim().toUpperCase(Locale.ROOT);
        if (!code.startsWith("DEMO-")) {
            code = "DEMO-" + code;
        }
        String finalCode = code;
        boolean exists = assets.values().stream().anyMatch(a -> a.code().equalsIgnoreCase(finalCode));
        if (exists) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bu varlık kodu zaten kullanılıyor: " + finalCode);
        }

        Long id = idGenerator.incrementAndGet();
        String status = isBlank(req.status()) ? "Depoda" : req.status().trim();
        String condition = isBlank(req.condition()) ? "Çok İyi" : req.condition().trim();
        String assignee = isBlank(req.assignee()) ? "Atanmamış (Depo Sorumlusu - Demo)" : req.assignee().trim();
        String acqDate = isBlank(req.acquisitionDate()) ? LocalDate.now().toString() : req.acquisitionDate().trim();
        String warrantyDate = isBlank(req.warrantyEndDate())
                ? LocalDate.now().plusYears(2).toString()
                : req.warrantyEndDate().trim();
        String tifCode = isBlank(req.tifCode()) ? "255.02.01.01" : req.tifCode().trim();
        String barcode = isBlank(req.barcode()) ? String.format("GBZ-86902026%04d", id) : req.barcode().trim();
        Double val = (req.estimatedValue() == null || req.estimatedValue() < 0) ? 15000.0 : req.estimatedValue();
        String supplier = isBlank(req.supplier()) ? "DMO (Devlet Malzeme Ofisi - Demo)" : req.supplier().trim();

        Asset created = new Asset(
                id,
                finalCode,
                tifCode,
                barcode,
                req.name().trim(),
                req.category().trim(),
                isBlank(req.brandModel()) ? "Belirtilmedi (Demo)" : req.brandModel().trim(),
                isBlank(req.serialNumber()) ? "SN-DEMO-" + (100000 + id) : req.serialNumber().trim(),
                req.unit().trim(),
                req.location().trim(),
                assignee,
                status,
                condition,
                acqDate,
                warrantyDate,
                val,
                supplier,
                isBlank(req.notes()) ? "" : req.notes().trim(),
                nowFormatted()
        );
        assets.put(id, created);
        return created;
    }

    public synchronized Asset update(Long id, AssetRequest req) {
        Asset existing = findById(id);
        validateRequest(req);

        String code = isBlank(req.code()) ? existing.code() : req.code().trim().toUpperCase(Locale.ROOT);
        if (!code.startsWith("DEMO-")) {
            code = "DEMO-" + code;
        }
        String finalCode = code;
        boolean duplicate = assets.values().stream()
                .anyMatch(a -> !a.id().equals(id) && a.code().equalsIgnoreCase(finalCode));
        if (duplicate) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bu varlık kodu başka bir kayıtta kullanılıyor: " + finalCode);
        }

        Asset updated = new Asset(
                id,
                finalCode,
                isBlank(req.tifCode()) ? existing.tifCode() : req.tifCode().trim(),
                isBlank(req.barcode()) ? existing.barcode() : req.barcode().trim(),
                req.name().trim(),
                req.category().trim(),
                isBlank(req.brandModel()) ? existing.brandModel() : req.brandModel().trim(),
                isBlank(req.serialNumber()) ? existing.serialNumber() : req.serialNumber().trim(),
                req.unit().trim(),
                req.location().trim(),
                isBlank(req.assignee()) ? existing.assignee() : req.assignee().trim(),
                isBlank(req.status()) ? existing.status() : req.status().trim(),
                isBlank(req.condition()) ? existing.condition() : req.condition().trim(),
                isBlank(req.acquisitionDate()) ? existing.acquisitionDate() : req.acquisitionDate().trim(),
                isBlank(req.warrantyEndDate()) ? existing.warrantyEndDate() : req.warrantyEndDate().trim(),
                req.estimatedValue() == null ? existing.estimatedValue() : req.estimatedValue(),
                isBlank(req.supplier()) ? existing.supplier() : req.supplier().trim(),
                req.notes() == null ? existing.notes() : req.notes().trim(),
                nowFormatted()
        );
        assets.put(id, updated);
        return updated;
    }

    public synchronized Asset updateOperationalState(
            Long id,
            String newUnit,
            String newLocation,
            String newAssignee,
            String newStatus
    ) {
        return updateOperationalStateAndCondition(id, newUnit, newLocation, newAssignee, newStatus, null);
    }

    public synchronized Asset updateOperationalStateAndCondition(
            Long id,
            String newUnit,
            String newLocation,
            String newAssignee,
            String newStatus,
            String newCondition
    ) {
        Asset existing = findById(id);
        Asset updated = new Asset(
                existing.id(),
                existing.code(),
                existing.tifCode(),
                existing.barcode(),
                existing.name(),
                existing.category(),
                existing.brandModel(),
                existing.serialNumber(),
                isBlank(newUnit) ? existing.unit() : newUnit.trim(),
                isBlank(newLocation) ? existing.location() : newLocation.trim(),
                isBlank(newAssignee) ? existing.assignee() : newAssignee.trim(),
                isBlank(newStatus) ? existing.status() : newStatus.trim(),
                isBlank(newCondition) ? existing.condition() : newCondition.trim(),
                existing.acquisitionDate(),
                existing.warrantyEndDate(),
                existing.estimatedValue(),
                existing.supplier(),
                existing.notes(),
                nowFormatted()
        );
        assets.put(id, updated);
        return updated;
    }

    public synchronized Asset delete(Long id) {
        Asset existing = findById(id);
        assets.remove(id);
        return existing;
    }

    private void validateRequest(AssetRequest req) {
        if (req == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Varlık bilgileri boş olamaz.");
        }
        if (isBlank(req.name())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Varlık adı zorunludur.");
        }
        if (isBlank(req.category())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Kategori seçimi zorunludur.");
        }
        if (isBlank(req.unit())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Birim bilgisi zorunludur.");
        }
        if (isBlank(req.location())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Konum bilgisi zorunludur.");
        }
    }

    private String generateNextCode() {
        while (true) {
            long seq = codeSequence.incrementAndGet();
            String candidate = String.format("DEMO-VRK-%03d", seq);
            boolean exists = assets.values().stream().anyMatch(a -> a.code().equalsIgnoreCase(candidate));
            if (!exists) {
                return candidate;
            }
        }
    }

    public static LocalDate parseDateSafe(String dateStr) {
        if (isBlank(dateStr)) {
            return null;
        }
        try {
            return LocalDate.parse(dateStr.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private static boolean isBlank(String str) {
        return str == null || str.trim().isEmpty();
    }

    private static String normalize(String str) {
        return str == null ? "" : str.toLowerCase(TR_LOCALE).trim();
    }

    public static String nowFormatted() {
        return LocalDateTime.now().format(TS_FMT);
    }
}
