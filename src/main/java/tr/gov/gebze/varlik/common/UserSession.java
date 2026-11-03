package tr.gov.gebze.varlik.common;

public record UserSession(
        String username,
        String fullName,
        String role,
        String roleLabel,
        String unit,
        boolean canWrite,
        boolean canDelete,
        String token,
        Long departmentId,
        Long personnelId,
        boolean mustChangePassword,
        String email
) {
    public UserSession(String username, String fullName, String role, String roleLabel, String unit, boolean canWrite, boolean canDelete, String token) {
        this(username, fullName, role, roleLabel, unit, canWrite, canDelete, token, null, null, false, null);
    }
}
