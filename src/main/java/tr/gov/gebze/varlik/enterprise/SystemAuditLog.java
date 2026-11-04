package tr.gov.gebze.varlik.enterprise;

public record SystemAuditLog(
        Long id,
        String actionType,
        String entityType,
        String entityId,
        String actorUsername,
        String actorName,
        String ipAddress,
        String description,
        String createdAt,
        String oldValueJson,
        String newValueJson
) {}

