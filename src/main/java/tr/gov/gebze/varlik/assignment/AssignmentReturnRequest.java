package tr.gov.gebze.varlik.assignment;

public record AssignmentReturnRequest(
        String targetStatus,
        String returnLocation,
        String returnNote
) {
}

