package tr.gov.gebze.varlik.user;

public record UserUpdateRequest(
        String fullName,
        String email,
        String role,
        Long departmentId,
        Long personnelId,
        Boolean isActive
) {
}

