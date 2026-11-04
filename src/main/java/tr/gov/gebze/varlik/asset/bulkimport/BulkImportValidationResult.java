package tr.gov.gebze.varlik.asset.bulkimport;

import java.util.List;

public record BulkImportValidationResult(
        String fileName,
        int totalRows,
        int validRowsCount,
        int invalidRowsCount,
        List<BulkImportError> errors,
        List<BulkImportRow> validRows
) {
    public boolean hasErrors() {
        return errors != null && !errors.isEmpty();
    }
}
