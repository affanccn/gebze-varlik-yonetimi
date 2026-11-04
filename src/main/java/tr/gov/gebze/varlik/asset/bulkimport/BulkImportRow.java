package tr.gov.gebze.varlik.asset.bulkimport;

public record BulkImportRow(
        int rowNumber,
        String code,
        String name,
        String categoryCode,
        String departmentCode,
        String roomQrCode,
        String barcode,
        String tifCode,
        String brandModel,
        String serialNumber,
        String acquisitionDate,
        String warrantyEndDate,
        Double estimatedValue,
        String supplier,
        String notes
) {}

