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
        String updatedAt,
        // Kurumsal ve Fiziksel Lokasyon Alanları
        Long departmentId,
        String departmentName,
        Long subUnitId,
        String subUnitName,
        Long buildingId,
        String buildingName,
        Long floorId,
        String floorName,
        Long roomId,
        String roomNumber,
        String roomName,
        String roomQrCode,
        Long categoryId,
        String categoryName,
        // Yaşam Döngüsü Alanı
        String lifecycleStatus
) {
    public Asset(
            Long id, String code, String tifCode, String barcode, String name,
            String category, String brandModel, String serialNumber, String unit,
            String location, String assignee, String status, String condition,
            String acquisitionDate, String warrantyEndDate, Double estimatedValue,
            String supplier, String notes, String updatedAt
    ) {
        this(
                id, code, tifCode, barcode, name, category, brandModel, serialNumber,
                unit, location, assignee, status, condition, acquisitionDate,
                warrantyEndDate, estimatedValue, supplier, notes, updatedAt,
                null, null, null, null, null, null, null, null, null, null, null, null, null, null,
                null
        );
    }

    public Asset(
            Long id, String code, String tifCode, String barcode, String name,
            String category, String brandModel, String serialNumber, String unit,
            String location, String assignee, String status, String condition,
            String acquisitionDate, String warrantyEndDate, Double estimatedValue,
            String supplier, String notes, String updatedAt,
            Long departmentId, String departmentName, Long subUnitId, String subUnitName,
            Long buildingId, String buildingName, Long floorId, String floorName,
            Long roomId, String roomNumber, String roomName, String roomQrCode,
            Long categoryId, String categoryName
    ) {
        this(
                id, code, tifCode, barcode, name, category, brandModel, serialNumber,
                unit, location, assignee, status, condition, acquisitionDate,
                warrantyEndDate, estimatedValue, supplier, notes, updatedAt,
                departmentId, departmentName, subUnitId, subUnitName,
                buildingId, buildingName, floorId, floorName,
                roomId, roomNumber, roomName, roomQrCode,
                categoryId, categoryName,
                null
        );
    }
}
