package tr.gov.gebze.varlik.asset;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tr.gov.gebze.varlik.common.ApiException;
import tr.gov.gebze.varlik.common.PageResponse;
import tr.gov.gebze.varlik.hierarchy.Building;
import tr.gov.gebze.varlik.hierarchy.Department;
import tr.gov.gebze.varlik.hierarchy.Floor;
import tr.gov.gebze.varlik.hierarchy.HierarchyRepository;
import tr.gov.gebze.varlik.hierarchy.Room;
import tr.gov.gebze.varlik.hierarchy.SubUnit;
import tr.gov.gebze.varlik.movement.AssetMovement;
import tr.gov.gebze.varlik.movement.MovementRepository;

@Service
public class AssetService {

    private static final Locale TR_LOCALE = Locale.forLanguageTag("tr-TR");
    private static final DateTimeFormatter TS_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final AssetRepository assetRepository;
    private final HierarchyRepository hierarchyRepository;
    private final MovementRepository movementRepository;

    public AssetService(
            AssetRepository assetRepository,
            HierarchyRepository hierarchyRepository,
            MovementRepository movementRepository
    ) {
        this.assetRepository = assetRepository;
        this.hierarchyRepository = hierarchyRepository;
        this.movementRepository = movementRepository;
    }

    public PageResponse<Asset> findPage(
            String query,
            String category,
            String unit,
            String status,
            String condition,
            String warrantyFilter,
            String sortBy,
            Long departmentId,
            Long subUnitId,
            Long buildingId,
            Long floorId,
            Long roomId,
            Long categoryId,
            Long assignedPersonnelId,
            String lifecycleStatus,
            Boolean isActive,
            int page,
            int size
    ) {
        return assetRepository.findPage(
                query, category, unit, status, condition, warrantyFilter, sortBy,
                departmentId, subUnitId, buildingId, floorId, roomId, categoryId, assignedPersonnelId,
                lifecycleStatus, isActive, page, size
        );
    }

    public void exportAssetsCsv(
            HttpServletResponse response,
            String query,
            String category,
            String unit,
            String status,
            String condition,
            String warrantyFilter,
            String sortBy,
            Long departmentId,
            Long subUnitId,
            Long buildingId,
            Long floorId,
            Long roomId,
            Long categoryId,
            Long assignedPersonnelId,
            String lifecycleStatus,
            Boolean isActive
    ) throws IOException {
        List<Asset> assets = assetRepository.findAssetsForExport(
                query, category, unit, status, condition, warrantyFilter, sortBy,
                departmentId, subUnitId, buildingId, floorId, roomId, categoryId,
                assignedPersonnelId, lifecycleStatus, isActive
        );

        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=\"varlik-envanteri.csv\"");

        OutputStream out = response.getOutputStream();
        out.write(0xEF);
        out.write(0xBB);
        out.write(0xBF);

        PrintWriter writer = new PrintWriter(new OutputStreamWriter(out, StandardCharsets.UTF_8));
        writer.println("ID,Varlık Kodu,Varlık Adı,Kategori,Müdürlük,Alt Birim,Bina,Kat,Oda,Durum,Yaşam Döngüsü,Kondisyon,Tahmini Değer (TL),Zimmetli Kişi,Barkod,Seri No,Marka/Model,Satın Alma Tarihi,Garanti Bitiş");

        for (Asset a : assets) {
            writer.println(String.join(",",
                    escapeCsv(String.valueOf(a.id())),
                    escapeCsv(a.code()),
                    escapeCsv(a.name()),
                    escapeCsv(a.category()),
                    escapeCsv(a.departmentName()),
                    escapeCsv(a.subUnitName()),
                    escapeCsv(a.buildingName()),
                    escapeCsv(a.floorName()),
                    escapeCsv(a.roomName() != null ? a.roomName() : a.roomNumber()),
                    escapeCsv(a.status()),
                    escapeCsv(a.lifecycleStatus()),
                    escapeCsv(a.condition()),
                    escapeCsv(a.estimatedValue() != null ? String.format(Locale.US, "%.2f", a.estimatedValue()) : "0.00"),
                    escapeCsv(a.assignee()),
                    escapeCsv(a.barcode()),
                    escapeCsv(a.serialNumber()),
                    escapeCsv(a.brandModel()),
                    escapeCsv(a.acquisitionDate()),
                    escapeCsv(a.warrantyEndDate())
            ));
        }
        writer.flush();
    }

    private String escapeCsv(String value) {
        if (value == null) return "\"\"";
        String sanitized = value;
        if (!sanitized.isEmpty()) {
            char first = sanitized.charAt(0);
            if (first == '=' || first == '+' || first == '-' || first == '@') {
                sanitized = "'" + sanitized;
            }
        }
        return "\"" + sanitized.replace("\"", "\"\"") + "\"";
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
        return findAllDetailed(query, category, unit, status, condition, warrantyFilter, sortBy, null, null, null, null, null, null);
    }

    public List<Asset> findAllDetailed(
            String query,
            String category,
            String unit,
            String status,
            String condition,
            String warrantyFilter,
            String sortBy,
            Long departmentId,
            Long subUnitId,
            Long buildingId,
            Long floorId,
            Long roomId,
            Long categoryId
    ) {
        List<Asset> list = assetRepository.findAll(
                query, category, unit, status,
                departmentId, subUnitId, buildingId, floorId, roomId, categoryId
        );

        if (condition != null && !condition.isBlank() && !"Tümü".equalsIgnoreCase(condition)) {
            list = list.stream().filter(a -> condition.equalsIgnoreCase(a.condition())).toList();
        }

        if (warrantyFilter != null && !warrantyFilter.isBlank() && !"ALL".equalsIgnoreCase(warrantyFilter)) {
            LocalDate today = LocalDate.now();
            list = list.stream().filter(a -> {
                LocalDate end = parseDateSafe(a.warrantyEndDate());
                if (end == null) return false;
                if ("EXPIRED_OR_SOON".equalsIgnoreCase(warrantyFilter)) {
                    return !end.isAfter(today.plusDays(90));
                }
                if ("ACTIVE".equalsIgnoreCase(warrantyFilter)) {
                    return end.isAfter(today);
                }
                return true;
            }).toList();
        }

        if (sortBy != null && !sortBy.isBlank()) {
            Comparator<Asset> comparator = buildComparator(sortBy);
            list = list.stream().sorted(comparator).toList();
        }

        return list;
    }

    public List<Asset> findAllRaw() {
        return assetRepository.findAll(null, null, null, null, null, null, null, null, null, null);
    }

    public Asset findById(Long id) {
        return assetRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Varlık kaydı bulunamadı (ID: " + id + ")."));
    }

    public Optional<Asset> findByCodeOrBarcodeOrSerial(String term) {
        if (isBlank(term)) {
            return Optional.empty();
        }
        Optional<Asset> byCode = assetRepository.findByCode(term);
        if (byCode.isPresent()) {
            return byCode;
        }
        return assetRepository.findAll(term, null, null, null, null, null, null, null, null, null).stream().findFirst();
    }

    @Transactional
    public Asset create(AssetRequest req) {
        validateRequest(req);

        String code = isBlank(req.code())
                ? String.format("GBZ-VRK-%04d", System.currentTimeMillis() % 100000)
                : req.code().trim().toUpperCase(Locale.ROOT);

        if (assetRepository.findByCode(code).isPresent()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bu varlık kodu zaten kullanılıyor: " + code);
        }

        // Lokasyon isimlerini ilişkilerden çek veya girileni koru
        String resolvedUnit = resolveUnitName(req.departmentId(), req.subUnitId(), req.unit());
        String resolvedLocation = resolveLocationInfo(req.buildingId(), req.floorId(), req.roomId(), req.location());

        String status = tr.gov.gebze.varlik.lifecycle.AssetLifecycleStatus.KAYDEDILDI.getLegacyStatus();
        String lifecycle = tr.gov.gebze.varlik.lifecycle.AssetLifecycleStatus.KAYDEDILDI.name();
        String condition = isBlank(req.condition()) ? "Çok İyi" : req.condition().trim();
        String assignee = isBlank(req.assignee()) ? "Atanmamış (Depo Sorumlusu)" : req.assignee().trim();
        String acqDate = isBlank(req.acquisitionDate()) ? LocalDate.now().toString() : req.acquisitionDate().trim();
        String warrantyDate = isBlank(req.warrantyEndDate()) ? LocalDate.now().plusYears(2).toString() : req.warrantyEndDate().trim();
        String tifCode = isBlank(req.tifCode()) ? "255.02.01.01" : req.tifCode().trim();
        String barcode = isBlank(req.barcode()) ? String.format("GBZ-86902026%04d", System.currentTimeMillis() % 10000) : req.barcode().trim();
        Double val = (req.estimatedValue() == null || req.estimatedValue() < 0) ? 0.0 : req.estimatedValue();

        Asset toSave = new Asset(
                null,
                code,
                tifCode,
                barcode,
                req.name().trim(),
                req.category().trim(),
                isBlank(req.brandModel()) ? "Belirtilmedi" : req.brandModel().trim(),
                isBlank(req.serialNumber()) ? "SN-" + System.currentTimeMillis() % 1000000 : req.serialNumber().trim(),
                resolvedUnit,
                resolvedLocation,
                assignee,
                status,
                condition,
                acqDate,
                warrantyDate,
                val,
                isBlank(req.supplier()) ? "DMO (Devlet Malzeme Ofisi)" : req.supplier().trim(),
                isBlank(req.notes()) ? "" : req.notes().trim(),
                nowFormatted(),
                req.departmentId(),
                null,
                req.subUnitId(),
                null,
                req.buildingId(),
                null,
                req.floorId(),
                null,
                req.roomId(),
                null,
                null,
                null,
                req.categoryId(),
                null,
                lifecycle
        );

        Long newId = assetRepository.save(toSave);

        // İlk envanter giriş hareketini kaydet
        movementRepository.save(new AssetMovement(
                null,
                newId,
                code,
                req.name().trim(),
                "ILK_KAYIT",
                "İlk Envanter Girişi",
                "-",
                "-",
                resolvedUnit,
                resolvedLocation,
                "Sistem Yöneticisi",
                "Yeni demirbaş kurumsal sisteme kaydedildi.",
                nowFormatted()
        ));

        return findById(newId);
    }

    @Transactional
    public Asset update(Long id, AssetRequest req) {
        Asset existing = findById(id);
        validateRequest(req);

        String code = isBlank(req.code()) ? existing.code() : req.code().trim().toUpperCase(Locale.ROOT);
        Optional<Asset> dup = assetRepository.findByCode(code);
        if (dup.isPresent() && !dup.get().id().equals(id)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bu varlık kodu başka bir kayıtta kullanılıyor: " + code);
        }

        String resolvedUnit = resolveUnitName(
                req.departmentId() != null ? req.departmentId() : existing.departmentId(),
                req.subUnitId() != null ? req.subUnitId() : existing.subUnitId(),
                req.unit() != null ? req.unit() : existing.unit()
        );
        String resolvedLocation = resolveLocationInfo(
                req.buildingId() != null ? req.buildingId() : existing.buildingId(),
                req.floorId() != null ? req.floorId() : existing.floorId(),
                req.roomId() != null ? req.roomId() : existing.roomId(),
                req.location() != null ? req.location() : existing.location()
        );

        Asset toUpdate = new Asset(
                id,
                code,
                isBlank(req.tifCode()) ? existing.tifCode() : req.tifCode().trim(),
                isBlank(req.barcode()) ? existing.barcode() : req.barcode().trim(),
                req.name().trim(),
                req.category().trim(),
                isBlank(req.brandModel()) ? existing.brandModel() : req.brandModel().trim(),
                isBlank(req.serialNumber()) ? existing.serialNumber() : req.serialNumber().trim(),
                resolvedUnit,
                resolvedLocation,
                isBlank(req.assignee()) ? existing.assignee() : req.assignee().trim(),
                existing.status(),
                isBlank(req.condition()) ? existing.condition() : req.condition().trim(),
                isBlank(req.acquisitionDate()) ? existing.acquisitionDate() : req.acquisitionDate().trim(),
                isBlank(req.warrantyEndDate()) ? existing.warrantyEndDate() : req.warrantyEndDate().trim(),
                req.estimatedValue() == null ? existing.estimatedValue() : req.estimatedValue(),
                isBlank(req.supplier()) ? existing.supplier() : req.supplier().trim(),
                req.notes() == null ? existing.notes() : req.notes().trim(),
                nowFormatted(),
                req.departmentId() != null ? req.departmentId() : existing.departmentId(),
                null,
                req.subUnitId() != null ? req.subUnitId() : existing.subUnitId(),
                null,
                req.buildingId() != null ? req.buildingId() : existing.buildingId(),
                null,
                req.floorId() != null ? req.floorId() : existing.floorId(),
                null,
                req.roomId() != null ? req.roomId() : existing.roomId(),
                null,
                null,
                null,
                req.categoryId() != null ? req.categoryId() : existing.categoryId(),
                null,
                existing.lifecycleStatus()
        );

        assetRepository.update(toUpdate);
        return findById(id);
    }

    @Transactional
    public Asset transferLocation(
            Long assetId,
            Long targetBuildingId,
            Long targetFloorId,
            Long targetRoomId,
            Long targetDeptId,
            Long targetSubUnitId,
            String performedBy,
            String note
    ) {
        Asset existing = findById(assetId);

        String fromLocation = existing.location();
        String fromUnit = existing.unit();

        String newLocation = resolveLocationInfo(targetBuildingId, targetFloorId, targetRoomId, null);
        String newUnit = resolveUnitName(targetDeptId, targetSubUnitId, existing.unit());

        assetRepository.updateLocation(
                assetId,
                targetBuildingId,
                targetFloorId,
                targetRoomId,
                targetDeptId,
                targetSubUnitId,
                newLocation,
                newUnit
        );

        // Lokasyon transfer hareketini kaydet
        movementRepository.save(new AssetMovement(
                null,
                assetId,
                existing.code(),
                existing.name(),
                "LOKASYON_TRANSFERI",
                "Lokasyon Transferi",
                fromUnit,
                fromLocation,
                newUnit,
                newLocation,
                isBlank(performedBy) ? "Taşınır Kayıt Yetkilisi" : performedBy.trim(),
                isBlank(note) ? "Oda/Bina transfer işlemi gerçekleştirildi." : note.trim(),
                nowFormatted()
        ));

        return findById(assetId);
    }

    @Transactional
    public Asset updateOperationalState(
            Long id,
            String newUnit,
            String newLocation,
            String newAssignee
    ) {
        Asset existing = findById(id);
        assetRepository.updateLocationAndAssignee(
                id,
                isBlank(newAssignee) ? existing.assignee() : newAssignee.trim(),
                isBlank(newLocation) ? existing.location() : newLocation.trim(),
                isBlank(newUnit) ? existing.unit() : newUnit.trim()
        );
        return findById(id);
    }

    @Transactional
    public Asset updateOperationalStateAndCondition(
            Long id,
            String newUnit,
            String newLocation,
            String newAssignee,
            String newCondition
    ) {
        Asset existing = findById(id);
        assetRepository.updateLocationAssigneeAndCondition(
                id,
                isBlank(newAssignee) ? existing.assignee() : newAssignee.trim(),
                isBlank(newLocation) ? existing.location() : newLocation.trim(),
                isBlank(newUnit) ? existing.unit() : newUnit.trim(),
                isBlank(newCondition) ? existing.condition() : newCondition.trim()
        );
        return findById(id);
    }

    @Transactional
    public Asset delete(Long id) {
        return delete(id, "admin");
    }

    @Transactional
    public Asset delete(Long id, String actorUsername) {
        Asset existing = findById(id);
        assetRepository.softDelete(id, actorUsername);
        return existing;
    }

    private String resolveUnitName(Long deptId, Long subId, String defaultVal) {
        if (deptId != null) {
            Optional<Department> d = hierarchyRepository.findDepartmentById(deptId);
            if (d.isPresent()) {
                if (subId != null) {
                    Optional<SubUnit> s = hierarchyRepository.findSubUnitById(subId);
                    if (s.isPresent()) {
                        return d.get().name() + " (" + s.get().name() + ")";
                    }
                }
                return d.get().name();
            }
        }
        return isBlank(defaultVal) ? "Genel Yönetim" : defaultVal.trim();
    }

    private String resolveLocationInfo(Long bldId, Long flrId, Long roomId, String defaultVal) {
        if (bldId != null) {
            Optional<Building> b = hierarchyRepository.findBuildingById(bldId);
            if (b.isPresent()) {
                StringBuilder sb = new StringBuilder(b.get().name());
                if (flrId != null) {
                    hierarchyRepository.findFloorsByBuilding(bldId).stream()
                            .filter(f -> f.id().equals(flrId))
                            .findFirst()
                            .ifPresent(f -> sb.append(" - ").append(f.floorName()));
                }
                if (roomId != null) {
                    hierarchyRepository.findRoomById(roomId)
                            .ifPresent(r -> sb.append(" - Oda ").append(r.roomNumber()).append(" (").append(r.name()).append(")"));
                }
                return sb.toString();
            }
        }
        return isBlank(defaultVal) ? "Ana Hizmet Binası" : defaultVal.trim();
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

    public static LocalDate parseDateSafe(String dateStr) {
        if (isBlank(dateStr)) return null;
        try {
            return LocalDate.parse(dateStr.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private static boolean isBlank(String str) {
        return str == null || str.trim().isEmpty();
    }

    public static String nowFormatted() {
        return LocalDateTime.now().format(TS_FMT);
    }
}
