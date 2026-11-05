package tr.gov.gebze.varlik.personnel.bulkimport;

public record PersonnelImportRow(
        int rowNumber,
        String registrationNumber,
        String firstName,
        String lastName,
        String title,
        String departmentCode,
        String departmentName,
        String subUnitName,
        String roomNumber,
        String phone,
        String email,
        Long departmentId,
        Long subUnitId,
        Long roomId
) {}
