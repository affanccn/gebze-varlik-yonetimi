package tr.gov.gebze.varlik.hierarchy;

public record Room(
        Long id,
        Long buildingId,
        String buildingName,
        Long floorId,
        String floorName,
        String roomNumber,
        String name,
        String roomType,
        Long departmentId,
        String departmentName,
        Long subUnitId,
        String subUnitName,
        String responsiblePerson,
        Integer capacity,
        String qrCode,
        String description,
        Integer isActive,
        Long assetCount
) {
}

