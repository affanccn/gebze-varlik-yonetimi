package tr.gov.gebze.varlik.personnel.bulkimport;

public record PersonnelImportError(
        int rowNumber,
        String columnName,
        String message
) {}

