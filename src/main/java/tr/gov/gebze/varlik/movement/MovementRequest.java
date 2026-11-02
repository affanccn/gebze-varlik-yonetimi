package tr.gov.gebze.varlik.movement;

public record MovementRequest(
        Long assetId,
        String type,
        String toUnit,
        String toLocation,
        String note
) {
}

