package tr.gov.gebze.varlik.assignment;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
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
import tr.gov.gebze.varlik.movement.MovementService;
import tr.gov.gebze.varlik.personnel.Personnel;
import tr.gov.gebze.varlik.personnel.PersonnelRepository;
import tr.gov.gebze.varlik.security.TenantQueryScope;

@Service
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final AssetService assetService;
    private final MovementService movementService;
    private final AssetLifecycleService assetLifecycleService;
    private final PersonnelRepository personnelRepository;
    private final TenantQueryScope tenantQueryScope;

    public AssignmentService(
            AssignmentRepository assignmentRepository,
            @Lazy AssetService assetService,
            MovementService movementService,
            AssetLifecycleService assetLifecycleService,
            PersonnelRepository personnelRepository,
            TenantQueryScope tenantQueryScope
    ) {
        this.assignmentRepository = assignmentRepository;
        this.assetService = assetService;
        this.movementService = movementService;
        this.assetLifecycleService = assetLifecycleService;
        this.personnelRepository = personnelRepository;
        this.tenantQueryScope = tenantQueryScope;
    }

    public PageResponse<AssetAssignment> findPage(Long assetId, Long personnelId, String status, String q, String sort, int page, int size) {
        return assignmentRepository.findPage(assetId, personnelId, status, q, sort, page, size);
    }

    public PageResponse<AssetAssignment> findPage(Long assetId, String status, String q, String sort, int page, int size) {
        return assignmentRepository.findPage(assetId, null, status, q, sort, page, size);
    }

    public List<AssetAssignment> findAll(Long assetId, String status) {
        return assignmentRepository.findAll(assetId, status);
    }

    public AssetAssignment findById(Long id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Zimmet kaydı bulunamadı (ID: " + id + ")."));
    }

    @Transactional
    public AssetAssignment assignAsset(AssignmentRequest req, String actorName) {
        if (req == null || req.assetId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Zimmetlenecek varlık seçilmelidir.");
        }

        Long resolvedPersonnelId = req.personnelId();
        String resolvedAssigneeName = req.assigneeName();
        String resolvedAssigneeTitle = req.assigneeTitle();
        String resolvedUnit = req.unit();
        String resolvedLocation = req.location();

        if (resolvedPersonnelId != null) {
            var personOpt = personnelRepository.findById(resolvedPersonnelId);
            if (personOpt.isEmpty()) {
                throw new ApiException(HttpStatus.NOT_FOUND, "Seçilen personel sistemde bulunamadı (ID: " + resolvedPersonnelId + ").");
            }
            Personnel person = personOpt.get();
            if (person.isActive() != null && person.isActive() == 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Pasif durumdaki personele zimmet atanamaz.");
            }
            if (tenantQueryScope.isDeptManager() && person.departmentId() != null) {
                if (!person.departmentId().equals(tenantQueryScope.getDepartmentId())) {
                    throw new ApiException(HttpStatus.FORBIDDEN, "Kendi müdürlüğünüz dışındaki bir personele zimmet atayamazsınız.");
                }
            }
            resolvedAssigneeName = person.fullName();
            if (resolvedAssigneeTitle == null || resolvedAssigneeTitle.isBlank()) {
                resolvedAssigneeTitle = person.title();
            }
            if (resolvedUnit == null || resolvedUnit.isBlank()) {
                resolvedUnit = person.departmentName();
            }
            if ((resolvedLocation == null || resolvedLocation.isBlank()) && person.roomName() != null) {
                resolvedLocation = person.roomName();
            }
        } else if (resolvedAssigneeName != null && !resolvedAssigneeName.isBlank()) {
            final Locale trLocale = Locale.forLanguageTag("tr-TR");
            final String nameToMatch = resolvedAssigneeName.trim();
            final String nameLower = nameToMatch.toLowerCase(trLocale);
            var matched = personnelRepository.findAll(null, null, nameToMatch);
            var exact = matched.stream()
                    .filter(p -> p.fullName() != null && p.fullName().trim().toLowerCase(trLocale).equals(nameLower))
                    .findFirst();
            if (exact.isPresent()) {
                Personnel person = exact.get();
                if (tenantQueryScope.isDeptManager() && person.departmentId() != null) {
                    if (!person.departmentId().equals(tenantQueryScope.getDepartmentId())) {
                        throw new ApiException(HttpStatus.FORBIDDEN, "Kendi müdürlüğünüz dışındaki bir personele zimmet atayamazsınız.");
                    }
                }
                resolvedPersonnelId = person.id();
                if (resolvedUnit == null || resolvedUnit.isBlank()) {
                    resolvedUnit = person.departmentName();
                }
            }
        }

        if (resolvedAssigneeName == null || resolvedAssigneeName.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Zimmetlenecek sorumlu kişi adı zorunludur.");
        }
        if (resolvedUnit == null || resolvedUnit.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Zimmet birimi zorunludur.");
        }
        if (resolvedLocation == null || resolvedLocation.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Zimmet konumu zorunludur.");
        }

        Asset asset = assetService.findById(req.assetId());
        String prevUnit = asset.unit();
        String prevLocation = asset.location();

        // Bu varlık üzerinde aktif bir zimmet varsa iade/devir olarak kapat
        List<AssetAssignment> actives = assignmentRepository.findAll(asset.id(), "AKTIF");
        for (AssetAssignment active : actives) {
            assignmentRepository.returnAssignment(active.id(), "Yeni zimmet ataması (" + resolvedAssigneeName.trim() + ") nedeniyle devredildi.");
        }

        String docNo = String.format("GBZ-ZMT-%d-%04d", LocalDate.now().getYear(), System.currentTimeMillis() % 100000);

        // Yaşam döngüsü durum geçişi: ZIMMETLENDI
        assetLifecycleService.transitionState(asset.id(), AssetLifecycleStatus.ZIMMETLENDI, docNo + " fişi ile " + resolvedAssigneeName.trim() + " adına zimmetlendi.", actorName);

        AssetAssignment created = new AssetAssignment(
                null,
                docNo,
                asset.id(),
                asset.code(),
                asset.name(),
                resolvedPersonnelId,
                resolvedAssigneeName.trim(),
                (resolvedAssigneeTitle == null || resolvedAssigneeTitle.isBlank()) ? "Birim Görevlisi" : resolvedAssigneeTitle.trim(),
                resolvedUnit.trim(),
                resolvedLocation.trim(),
                "AKTIF",
                actorName,
                AssetService.nowFormatted(),
                null,
                null,
                req.note() == null ? "" : req.note().trim()
        );
        assignmentRepository.save(created);

        Asset updatedAsset = assetService.updateOperationalState(
                asset.id(),
                resolvedUnit.trim(),
                resolvedLocation.trim(),
                resolvedAssigneeName.trim()
        );

        movementService.recordSystemMovement(
                updatedAsset,
                "ZIMMET_ATAMA",
                "Zimmet Atama",
                prevUnit,
                prevLocation,
                updatedAsset.unit(),
                updatedAsset.location(),
                actorName,
                docNo + " numaralı zimmet fişi ile " + resolvedAssigneeName.trim() + " adına teslim edildi."
        );

        return assignmentRepository.findAll(asset.id(), "AKTIF").stream().findFirst().orElse(created);
    }

    @Transactional
    public AssetAssignment returnAssignment(Long assignmentId, AssignmentReturnRequest req, String actorName) {
        AssetAssignment assignment = findById(assignmentId);
        if (!"AKTIF".equalsIgnoreCase(assignment.status())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Yalnızca aktif zimmetler iade alınabilir.");
        }

        Asset asset = assetService.findById(assignment.assetId());
        String prevUnit = asset.unit();
        String prevLocation = asset.location();

        String returnNote = (req == null || req.returnNote() == null || req.returnNote().isBlank())
                ? "Personel tarafından sağlam olarak birim ambarına iade edildi."
                : req.returnNote().trim();

        assignmentRepository.returnAssignment(assignment.id(), returnNote);

        // Yaşam döngüsü durum geçişi: KAYDEDILDI (Ambara iade)
        assetLifecycleService.transitionState(asset.id(), AssetLifecycleStatus.KAYDEDILDI, assignment.documentNo() + " fişi ile ambara iade alındı: " + returnNote, actorName);

        String targetLocation = (req != null && req.returnLocation() != null && !req.returnLocation().isBlank())
                ? req.returnLocation().trim()
                : "Merkez Taşınır Ana Ambari";

        String targetUnit = "Destek Hizmetleri Müdürlüğü (Taşınır Kayıt ve Kontrol)";
        String targetCondition = asset.condition();

        Asset updated = assetService.updateOperationalStateAndCondition(
                asset.id(),
                targetUnit,
                targetLocation,
                "Atanmamış (Depo Sorumlusu)",
                targetCondition
        );

        movementService.recordSystemMovement(
                updated,
                "ZIMMET_IADE",
                "Zimmet İade",
                prevUnit,
                prevLocation,
                targetUnit,
                targetLocation,
                actorName,
                assignment.documentNo() + " nolu zimmet iade alındı. Durum: " + targetCondition + ". Not: " + returnNote
        );

        return findById(assignmentId);
    }
}
