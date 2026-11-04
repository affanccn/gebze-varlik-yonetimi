package tr.gov.gebze.varlik.user;

public record UserResetPasswordResponse(
        String username,
        String temporaryPassword,
        String message
) {
}

