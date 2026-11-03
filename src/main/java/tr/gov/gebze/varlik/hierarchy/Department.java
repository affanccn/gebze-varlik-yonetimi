package tr.gov.gebze.varlik.hierarchy;

public record Department(
        Long id,
        String code,
        String name,
        String managerName,
        String phone,
        String email,
        Integer displayOrder,
        Integer isActive,
        Long assetCount
) {
    public Department withAssetCount(Long count) {
        return new Department(id, code, name, managerName, phone, email, displayOrder, isActive, count);
    }
}

