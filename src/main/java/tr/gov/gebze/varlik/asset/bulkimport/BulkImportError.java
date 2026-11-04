package tr.gov.gebze.varlik.asset.bulkimport;

public record BulkImportError(
        int rowNumber,
        String field,
        String value,
        String message
) {}
