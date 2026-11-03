package tr.gov.gebze.varlik.enterprise;

public record StockItem(
        Long id,
        String itemCode,
        String itemName,
        String category,
        String warehouseName,
        Long buildingId,
        Long departmentId,
        Double currentQuantity,
        Double minThreshold,
        String unit,
        Double unitPrice,
        String status,
        String lastRestockedAt
) {}

