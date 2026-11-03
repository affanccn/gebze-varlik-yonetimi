package tr.gov.gebze.varlik.hierarchy;

public record AssetCategory(
        Long id,
        Long parentId,
        String code,
        String name,
        String icon,
        String description,
        Integer isActive,
        Long assetCount
) {
}

