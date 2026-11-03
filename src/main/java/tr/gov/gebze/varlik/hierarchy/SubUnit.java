package tr.gov.gebze.varlik.hierarchy;

public record SubUnit(
        Long id,
        Long departmentId,
        String departmentName,
        Long parentUnitId,
        String code,
        String name,
        String unitType,
        String managerName,
        String phone,
        String description,
        Integer isActive,
        Long assetCount
) {
}

