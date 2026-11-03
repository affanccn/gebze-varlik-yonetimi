package tr.gov.gebze.varlik.hierarchy;

public record Floor(
        Long id,
        Long buildingId,
        String buildingName,
        String floorCode,
        String floorName,
        Integer floorOrder,
        String description,
        Integer isActive,
        Long roomCount,
        Long assetCount
) {
}

