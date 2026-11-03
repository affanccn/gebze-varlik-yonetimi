package tr.gov.gebze.varlik.personnel;

public record PersonnelRequest(
        String registrationNumber,
        String firstName,
        String lastName,
        String title,
        Long departmentId,
        Long subUnitId,
        Long roomId,
        String phone,
        String email
) {
}

