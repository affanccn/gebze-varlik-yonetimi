package tr.gov.gebze.varlik.enterprise;

import java.util.List;
import java.util.Map;

public record AuditReconciliationSummary(
        Long auditId,
        String auditCode,
        String title,
        int totalExpected,
        int totalScanned,
        int totalMatched,
        int totalDifferentLocation,
        int totalExcess,
        int totalMissing,
        double completionRate,
        List<Map<String, Object>> missingAssets
) {}

