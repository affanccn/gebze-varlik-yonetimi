package tr.gov.gebze.varlik.personnel.bulkimport;

public record PersonnelImportCommitResult(
        int insertedCount,
        int updatedCount,
        int totalProcessed
) {}

