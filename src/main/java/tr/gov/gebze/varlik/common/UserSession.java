package tr.gov.gebze.varlik.common;

public record UserSession(
        String username,
        String fullName,
        String role,
        String roleLabel,
        String unit,
        boolean canWrite,
        boolean canDelete,
        String token
) {
}

