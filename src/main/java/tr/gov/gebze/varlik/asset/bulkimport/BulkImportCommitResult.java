package tr.gov.gebze.varlik.asset.bulkimport;

import java.util.List;

public record BulkImportCommitResult(
        String batchId,
        String fileName,
        int totalRows,
        int importedCount,
        int skippedCount,
        List<BulkImportError> errors,
        boolean success,
        String message
) {}
