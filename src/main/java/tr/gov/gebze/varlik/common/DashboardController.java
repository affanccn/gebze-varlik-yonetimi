package tr.gov.gebze.varlik.common;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tr.gov.gebze.varlik.asset.Asset;
import tr.gov.gebze.varlik.asset.AssetService;
import tr.gov.gebze.varlik.assignment.AssetAssignment;
import tr.gov.gebze.varlik.assignment.AssignmentService;
import tr.gov.gebze.varlik.movement.AssetMovement;
import tr.gov.gebze.varlik.movement.MaintenanceRecord;
import tr.gov.gebze.varlik.movement.MaintenanceService;
import tr.gov.gebze.varlik.movement.MovementService;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final AssetService assetService;
    private final MovementService movementService;
    private final AssignmentService assignmentService;
    private final MaintenanceService maintenanceService;

    public DashboardController(
            AssetService assetService,
            MovementService movementService,
            AssignmentService assignmentService,
            MaintenanceService maintenanceService
    ) {
        this.assetService = assetService;
        this.movementService = movementService;
        this.assignmentService = assignmentService;
        this.maintenanceService = maintenanceService;
    }

    @GetMapping
    public Map<String, Object> getSummary() {
        List<Asset> allAssets = assetService.findAllRaw();
        List<AssetMovement> allMovements = movementService.findAll(null, null);
        List<AssetAssignment> activeAssignments = assignmentService.findAll(null, "AKTIF");
        List<MaintenanceRecord> openMaintenances = maintenanceService.findAll(null, "DEVAM_EDIYOR");

        long activeCount = allAssets.stream().filter(a -> "Aktif".equalsIgnoreCase(a.status())).count();
        long inStorageCount = allAssets.stream().filter(a -> "Depoda".equalsIgnoreCase(a.status())).count();
        long maintenanceCount = allAssets.stream().filter(a -> "Bakımda".equalsIgnoreCase(a.status())).count();

        double totalEstimatedValue = allAssets.stream()
                .mapToDouble(a -> a.estimatedValue() == null ? 0.0 : a.estimatedValue())
                .sum();

        LocalDate today = LocalDate.now();
        List<Asset> warrantyAlerts = allAssets.stream()
                .filter(a -> {
                    LocalDate end = AssetService.parseDateSafe(a.warrantyEndDate());
                    return end != null && !end.isAfter(today.plusDays(90));
                })
                .toList();

        List<Asset> conditionAlerts = allAssets.stream()
                .filter(a -> "Orta".equalsIgnoreCase(a.condition()) || "Onarım Gerekli".equalsIgnoreCase(a.condition()))
                .toList();

        Map<String, Long> byCategory = allAssets.stream()
                .collect(Collectors.groupingBy(Asset::category, LinkedHashMap::new, Collectors.counting()));

        Map<String, Long> byUnit = allAssets.stream()
                .collect(Collectors.groupingBy(Asset::unit, LinkedHashMap::new, Collectors.counting()));

        Map<String, Long> byCondition = allAssets.stream()
                .collect(Collectors.groupingBy(Asset::condition, LinkedHashMap::new, Collectors.counting()));

        // Birim Bazlı Detaylı Envanter Özeti Tablosu
        Map<String, List<Asset>> groupedByUnit = allAssets.stream()
                .collect(Collectors.groupingBy(Asset::unit, LinkedHashMap::new, Collectors.toList()));

        List<Map<String, Object>> unitSummaries = new ArrayList<>();
        for (Map.Entry<String, List<Asset>> entry : groupedByUnit.entrySet()) {
            List<Asset> uAssets = entry.getValue();
            long uActive = uAssets.stream().filter(a -> "Aktif".equalsIgnoreCase(a.status())).count();
            long uStorage = uAssets.stream().filter(a -> "Depoda".equalsIgnoreCase(a.status())).count();
            long uMaint = uAssets.stream().filter(a -> "Bakımda".equalsIgnoreCase(a.status())).count();
            double uValue = uAssets.stream()
                    .mapToDouble(a -> a.estimatedValue() == null ? 0.0 : a.estimatedValue())
                    .sum();
            unitSummaries.add(Map.of(
                    "unit", entry.getKey(),
                    "totalCount", uAssets.size(),
                    "activeCount", uActive,
                    "storageCount", uStorage,
                    "maintenanceCount", uMaint,
                    "totalValue", uValue
            ));
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("totalAssets", allAssets.size());
        response.put("activeAssets", activeCount);
        response.put("storageAssets", inStorageCount);
        response.put("maintenanceAssets", maintenanceCount);
        response.put("totalEstimatedValue", totalEstimatedValue);
        response.put("activeAssignmentsCount", activeAssignments.size());
        response.put("openMaintenancesCount", openMaintenances.size());
        response.put("totalMovementsCount", allMovements.size());
        response.put("warrantyAlertsCount", warrantyAlerts.size());
        response.put("warrantyAlerts", warrantyAlerts);
        response.put("conditionAlerts", conditionAlerts);
        response.put("unitSummaries", unitSummaries);
        response.put("byCategory", byCategory);
        response.put("byUnit", byUnit);
        response.put("byCondition", byCondition);
        response.put("recentMovements", allMovements.stream().limit(7).toList());
        response.put("recentAssignments", activeAssignments.stream().limit(5).toList());
        return response;
    }
}
