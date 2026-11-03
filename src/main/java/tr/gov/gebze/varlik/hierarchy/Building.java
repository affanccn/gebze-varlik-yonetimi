package tr.gov.gebze.varlik.hierarchy;

public record Building(
        Long id,
        String code,
        String name,
        String buildingType,
        String address,
        String phone,
        Integer totalFloors,
        String description,
        Integer isActive,
        Long assetCount,
        Long roomCount
) {
}

