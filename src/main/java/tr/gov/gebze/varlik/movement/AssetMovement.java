package tr.gov.gebze.varlik.movement;

public record AssetMovement(
        Long id,
        Long assetId,
        String assetCode,
        String assetName,
        String type,
        String typeLabel,
        String fromUnit,
        String fromLocation,
        String toUnit,
        String toLocation,
        String performedBy,
        String note,
        String timestamp
) {
}

