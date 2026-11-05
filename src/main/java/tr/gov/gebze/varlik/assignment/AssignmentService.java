package tr.gov.gebze.varlik.assignment;

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
import tr.gov.gebze.varlik.movement.MovementService;

@Service
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final AssetService assetService;
    private final MovementService movementService;
    private final AssetLifecycleService assetLifecycleService;

    public AssignmentService(
            AssignmentRepository assignmentRepository,
            @Lazy AssetService assetService,
            MovementService movementService,
            AssetLifecycleService assetLifecycleService
    ) {
        this.assignmentRepository = assignmentRepository;
        this.assetService = assetService;
        this.movementService = movementService;
        this.assetLifecycleService = assetLifecycleService;
    }

    public PageResponse<AssetAssignment> findPage(Long assetId, String status, String q, String sort, int page, int size) {
        return assignmentRepository.findPage(assetId, status, q, sort, page, size);
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

        // Bu varlık üzerinde aktif bir zimmet varsa iade/devir olarak kapat
        List<AssetAssignment> actives = assignmentRepository.findAll(asset.id(), "AKTIF");
        for (AssetAssignment active : actives) {
            assignmentRepository.returnAssignment(active.id(), "Yeni zimmet ataması (" + req.assigneeName().trim() + ") nedeniyle devredildi.");
        }

        String docNo = String.format("GBZ-ZMT-2026-%04d", System.currentTimeMillis() % 100000);

        // Yaşam döngüsü durum geçişi: ZIMMETLENDI
        assetLifecycleService.transitionState(asset.id(), AssetLifecycleStatus.ZIMMETLENDI, docNo + " fişi ile " + req.assigneeName().trim() + " adına zimmetlendi.", actorName);

        AssetAssignment created = new AssetAssignment(
                null,
                docNo,
                asset.id(),
                asset.code(),
                asset.name(),
                req.assigneeName().trim(),
                (req.assigneeTitle() == null || req.assigneeTitle().isBlank()) ? "Birim Görevlisi" : req.assigneeTitle().trim(),
                req.unit().trim(),
                req.location().trim(),
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
                req.unit().trim(),
                req.location().trim(),
                req.assigneeName().trim()
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
                docNo + " numaralı zimmet fişi ile " + req.assigneeName().trim() + " adına teslim edildi."
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
