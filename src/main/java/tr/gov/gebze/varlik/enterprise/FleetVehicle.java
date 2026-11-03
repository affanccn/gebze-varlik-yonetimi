package tr.gov.gebze.varlik.enterprise;

public record FleetVehicle(
        Long id,
        String plateNumber,
        String vehicleCode,
        String vehicleType,
        String brandModel,
        Integer modelYear,
        Long departmentId,
        String departmentName,
        String assignedDriver,
        Integer currentKm,
        String fuelType,
        String inspectionDate,
        String insuranceDate,
        String kaskoDate,
        String status,
        String notes,
        String updatedAt
) {}

