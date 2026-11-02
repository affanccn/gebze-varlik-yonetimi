package tr.gov.gebze.varlik.asset;

public record Asset(
        Long id,
        String code,
        String tifCode,
        String barcode,
        String name,
        String category,
        String brandModel,
        String serialNumber,
        String unit,
        String location,
        String assignee,
        String status,
        String condition,
        String acquisitionDate,
        String warrantyEndDate,
        Double estimatedValue,
        String supplier,
        String notes,
        String updatedAt
) {
}
