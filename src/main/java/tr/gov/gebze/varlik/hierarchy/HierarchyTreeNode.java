package tr.gov.gebze.varlik.hierarchy;

import java.util.List;
import java.util.Map;

public record HierarchyTreeNode(
        String id,
        String label,
        String type, // "MUNICIPALITY", "BUILDING", "FLOOR", "DEPARTMENT", "SUB_UNIT", "ROOM", "ASSET"
        String code,
        String description,
        String icon,
        Long count,
        Map<String, Object> metadata,
        List<HierarchyTreeNode> children
) {
}

