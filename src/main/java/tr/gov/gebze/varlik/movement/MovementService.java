package tr.gov.gebze.varlik.movement;

import java.util.List;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tr.gov.gebze.varlik.asset.Asset;
import tr.gov.gebze.varlik.asset.AssetService;
import tr.gov.gebze.varlik.common.ApiException;
import tr.gov.gebze.varlik.common.CursorResponse;
import tr.gov.gebze.varlik.common.SortValidator;
import tr.gov.gebze.varlik.lifecycle.AssetLifecycleService;
import tr.gov.gebze.varlik.lifecycle.AssetLifecycleStatus;

@Service
public class MovementService {

    private final MovementRepository movementRepository;
    private final AssetService assetService;
    private final AssetLifecycleService assetLifecycleService;

    public MovementService(
            MovementRepository movementRepository,
            @Lazy AssetService assetService,
            AssetLifecycleService assetLifecycleService
    ) {
        this.movementRepository = movementRepository;
        this.assetService = assetService;
        this.assetLifecycleService = assetLifecycleService;
    }

    public CursorResponse<AssetMovement> findMovementsKeyset(String cursor, int size, Long assetId, String type, String q) {
        Long cursorVal = SortValidator.validateCursor(cursor);
        SortValidator.validateCursorPagination(size);
        int fetchCount = size + 1;
        List<AssetMovement> list = movementRepository.findMovementsKeyset(cursorVal, fetchCount, assetId, type, q);
        boolean hasMore = list.size() > size;
        List<AssetMovement> items = hasMore ? list.subList(0, size) : list;
        String nextCursor = hasMore && !items.isEmpty() ? String.valueOf(items.get(items.size() - 1).id()) : null;
        return CursorResponse.of(items, nextCursor, hasMore, size);
    }

    public List<AssetMovement> findAll(Long assetId, String type) {
        return movementRepository.findAll(assetId, type);
    }

    @Transactional
    public AssetMovement createOperationalMovement(MovementRequest req, String actorName) {
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
        String newAssignee = asset.assignee();
        String typeLabel;

        switch (type) {
            case "TRANSFER" -> {
                typeLabel = "Birim / Konum Transferi";
                if (req.toLocation() == null || req.toLocation().isBlank()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Transfer işlemi için hedef konum belirtilmelidir.");
                }
                // Aynı-durum işlemi: validator çağrılmaz
                assetService.updateOperationalState(asset.id(), targetUnit, targetLocation, asset.assignee());
            }
            case "BAKIMA_GONDERIM" -> {
                typeLabel = "Bakıma Gönderim";
                if (req.toLocation() == null || req.toLocation().isBlank()) {
                    targetLocation = "Teknik Servis / Bakım Atölyesi";
                }
                assetLifecycleService.transitionState(asset.id(), AssetLifecycleStatus.BAKIMDA, req.note(), actorName);
                assetService.updateOperationalStateAndCondition(asset.id(), targetUnit, targetLocation, asset.assignee(), "Onarım Gerekli");
            }
            case "BAKIMDAN_DONUS" -> {
                typeLabel = "Bakımdan Dönüş";
                AssetLifecycleStatus target = (newAssignee != null && !newAssignee.toLowerCase().contains("atanmamış"))
                        ? AssetLifecycleStatus.ZIMMETLENDI
                        : AssetLifecycleStatus.KAYDEDILDI;
                assetLifecycleService.transitionState(asset.id(), target, req.note(), actorName);
                assetService.updateOperationalStateAndCondition(asset.id(), targetUnit, targetLocation, newAssignee, "Çok İyi");
            }
            case "DEPOYA_CEKME" -> {
                typeLabel = "Depoya Çekme";
                newAssignee = "Atanmamış (Depo Sorumlusu)";
                if (req.toLocation() == null || req.toLocation().isBlank()) {
                    targetLocation = "Merkez Depo ve Ambar Tesisleri";
                }
                assetLifecycleService.transitionState(asset.id(), AssetLifecycleStatus.KAYDEDILDI, req.note(), actorName);
                assetService.updateOperationalState(asset.id(), targetUnit, targetLocation, newAssignee);
            }
            default -> {
                typeLabel = "Operasyonel Hareket";
                assetService.updateOperationalState(asset.id(), targetUnit, targetLocation, asset.assignee());
            }
        }

        AssetMovement movement = new AssetMovement(
                null,
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
        movementRepository.save(movement);
        return movement;
    }

    @Transactional
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
                null,
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
        movementRepository.save(movement);
        return movement;
    }
}
