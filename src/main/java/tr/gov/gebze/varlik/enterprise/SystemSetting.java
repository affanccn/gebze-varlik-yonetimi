package tr.gov.gebze.varlik.enterprise;

public record SystemSetting(
        String paramKey,
        String paramValue,
        String paramGroup,
        String description,
        String updatedAt
) {}

