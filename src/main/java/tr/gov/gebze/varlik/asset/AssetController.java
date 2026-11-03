package tr.gov.gebze.varlik.asset;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tr.gov.gebze.varlik.assignment.AssignmentService;
import tr.gov.gebze.varlik.common.ApiException;
import tr.gov.gebze.varlik.common.AuthService;
import tr.gov.gebze.varlik.common.UserSession;
import tr.gov.gebze.varlik.movement.MaintenanceService;
import tr.gov.gebze.varlik.movement.MovementService;

@RestController
@RequestMapping("/api/assets")
public class AssetController {

    private final AssetService assetService;
    private final MovementService movementService;
    private final AssignmentService assignmentService;
    private final MaintenanceService maintenanceService;
    private final AuthService authService;

    public AssetController(
            AssetService assetService,
            MovementService movementService,
            AssignmentService assignmentService,
            MaintenanceService maintenanceService,
            AuthService authService
    ) {
        this.assetService = assetService;
        this.movementService = movementService;
        this.assignmentService = assignmentService;
        this.maintenanceService = maintenanceService;
        this.authService = authService;
    }

    @GetMapping
    public List<Asset> listAssets(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String unit,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String condition,
            @RequestParam(required = false) String warrantyFilter,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long subUnitId,
            @RequestParam(required = false) Long buildingId,
            @RequestParam(required = false) Long floorId,
            @RequestParam(required = false) Long roomId,
            @RequestParam(required = false) Long categoryId
    ) {
        return assetService.findAllDetailed(
                query, category, unit, status, condition, warrantyFilter, sortBy,
                departmentId, subUnitId, buildingId, floorId, roomId, categoryId
        );
    }

    @GetMapping("/lookup")
    public Map<String, Object> lookupAsset(@RequestParam String term) {
        Asset asset = assetService.findByCodeOrBarcodeOrSerial(term)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "Girilen kod, barkod veya seri numarasına ait varlık bulunamadı: " + term
                ));
        return buildAssetDetailResponse(asset);
    }

    @GetMapping("/{id}")
    public Map<String, Object> getAssetDetail(@PathVariable Long id) {
        Asset asset = assetService.findById(id);
        return buildAssetDetailResponse(asset);
    }

    private Map<String, Object> buildAssetDetailResponse(Asset asset) {
        return Map.of(
                "asset", asset,
                "movements", movementService.findAll(asset.id(), null),
                "assignments", assignmentService.findAll(asset.id(), null),
                "maintenances", maintenanceService.findAll(asset.id(), null)
        );
    }

    @PostMapping
    public Asset createAsset(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody AssetRequest request
    ) {
        UserSession session = authService.requireWriteAccess(token);
        return assetService.create(request);
    }

    @PutMapping("/{id}")
    public Asset updateAsset(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody AssetRequest request
    ) {
        UserSession session = authService.requireWriteAccess(token);
        Asset before = assetService.findById(id);
        Asset updated = assetService.update(id, request);
        movementService.recordSystemMovement(
                updated,
                "BILGI_GUNCELLENDI",
                "Kayıt Güncelleme",
                before.unit(),
                before.location(),
                updated.unit(),
                updated.location(),
                session.fullName(),
                "Varlık kimlik/konum bilgileri güncellendi."
        );
        return updated;
    }

    public record TransferRequest(
            Long buildingId,
            Long floorId,
            Long roomId,
            Long departmentId,
            Long subUnitId,
            String note
    ) {}

    @PostMapping("/{id}/transfer")
    public Asset transferAsset(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody TransferRequest request
    ) {
        UserSession session = authService.requireWriteAccess(token);
        return assetService.transferLocation(
                id,
                request.buildingId(),
                request.floorId(),
                request.roomId(),
                request.departmentId(),
                request.subUnitId(),
                session.fullName(),
                request.note()
        );
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> deleteAsset(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Token", required = false) String token
    ) {
        UserSession session = authService.requireAdmin(token);
        Asset deleted = assetService.delete(id);
        movementService.recordSystemMovement(
                deleted,
                "HURDA_CIKIS",
                "Kayıt Pasifleştirme",
                deleted.unit(),
                deleted.location(),
                "Arşiv / Pasif",
                "Kayıt Dışı",
                session.fullName(),
                "Varlık sistemden pasife alındı (arşivlendi)."
        );
        return Map.of("success", true, "deletedId", id, "code", deleted.code());
    }
}
