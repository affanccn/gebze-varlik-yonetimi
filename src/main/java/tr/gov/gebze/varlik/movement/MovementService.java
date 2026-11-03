package tr.gov.gebze.varlik.movement;

import java.util.List;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tr.gov.gebze.varlik.asset.Asset;
import tr.gov.gebze.varlik.asset.AssetService;
import tr.gov.gebze.varlik.common.ApiException;

@Service
public class MovementService {

    private final MovementRepository movementRepository;
    private final AssetService assetService;

    public MovementService(MovementRepository movementRepository, @Lazy AssetService assetService) {
        this.movementRepository = movementRepository;
        this.assetService = assetService;
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
                    targetLocation = "Teknik Servis / Bakım Atölyesi";
                }
            }
            case "BAKIMDAN_DONUS" -> {
                typeLabel = "Bakımdan Dönüş";
                newStatus = (newAssignee != null && newAssignee.toLowerCase().contains("atanmamış")) ? "Depoda" : "Aktif";
            }
            case "DEPOYA_CEKME" -> {
                typeLabel = "Depoya Çekme";
                newStatus = "Depoda";
                newAssignee = "Atanmamış (Depo Sorumlusu)";
                if (req.toLocation() == null || req.toLocation().isBlank()) {
                    targetLocation = "Merkez Depo ve Ambar Tesisleri";
                }
            }
            default -> typeLabel = "Operasyonel Hareket";
        }

        assetService.updateOperationalState(asset.id(), targetUnit, targetLocation, newAssignee, newStatus);

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
