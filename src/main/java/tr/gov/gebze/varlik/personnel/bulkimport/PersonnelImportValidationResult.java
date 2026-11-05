package tr.gov.gebze.varlik.personnel.bulkimport;

import java.util.List;

public record PersonnelImportValidationResult(
        int totalRows,
        int validRows,
        int errorRows,
        List<PersonnelImportError> errors,
        List<PersonnelImportRow> previewRows
) {}
