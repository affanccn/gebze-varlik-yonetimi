package tr.gov.gebze.varlik.user;

public record UserCreateRequest(
        String username,
        String fullName,
        String email,
        String role,
        Long departmentId,
        Long personnelId,
        String password
) {
}
