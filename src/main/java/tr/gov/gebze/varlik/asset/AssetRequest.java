package tr.gov.gebze.varlik.asset;

public record AssetRequest(
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
        // Hiyerarşik ve Fiziksel Lokasyon Kimlikleri
        Long departmentId,
        Long subUnitId,
        Long buildingId,
        Long floorId,
        Long roomId,
        Long categoryId
) {
    public AssetRequest(
            String code, String tifCode, String barcode, String name, String category,
            String brandModel, String serialNumber, String unit, String location,
            String assignee, String status, String condition, String acquisitionDate,
            String warrantyEndDate, Double estimatedValue, String supplier, String notes
    ) {
        this(
                code, tifCode, barcode, name, category, brandModel, serialNumber,
                unit, location, assignee, status, condition, acquisitionDate,
                warrantyEndDate, estimatedValue, supplier, notes,
                null, null, null, null, null, null
        );
    }
}
