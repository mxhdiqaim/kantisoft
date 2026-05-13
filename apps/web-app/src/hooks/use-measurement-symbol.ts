import { type Control, type FieldValues, type Path, useWatch } from "react-hook-form";
import type {UnitOfMeasurementType} from "@/types/unit-of-measurement-types.ts";

export const useMeasurementSymbol = <T extends FieldValues>(
    control: Control<T>,
    measurements: UnitOfMeasurementType[],
    fieldName: Path<T> = "unitOfMeasurementId" as Path<T>,
) => {
    const selectedUnitId = useWatch({
        control,
        name: fieldName,
    });

    const selectedUnit = measurements.find((u) => u.id === selectedUnitId);

    return selectedUnit ? selectedUnit.symbol || selectedUnit.name : "";
};
