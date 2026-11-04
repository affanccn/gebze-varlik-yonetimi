package tr.gov.gebze.varlik.user;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;

public record UserResponse(
        Long id,
        String username,
        String fullName,
        String email,
        String role,
        String roleLabel,
        Long departmentId,
        String departmentName,
        Long personnelId,
        String personnelName,
        boolean mustChangePassword,
        boolean isActive,
        int failedAttempts,
        boolean isLocked,
        LocalDateTime lockedUntil,
        OffsetDateTime createdAt,
        String temporaryPassword
) {
}

