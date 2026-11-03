package tr.gov.gebze.varlik.enterprise;

public record SystemAlert(
        String alertType,
        String severity,
        String title,
        String description,
        String entityId,
        String linkView,
        String dateInfo
) {}

