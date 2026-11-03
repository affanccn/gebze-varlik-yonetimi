package tr.gov.gebze.varlik.personnel;

public record Personnel(
        Long id,
        String registrationNumber,
        String firstName,
        String lastName,
        String fullName,
        String title,
        Long departmentId,
        String departmentName,
        Long subUnitId,
        String subUnitName,
        Long roomId,
        String roomNumber,
        String roomName,
        String phone,
        String email,
        Integer isActive
) {
}

