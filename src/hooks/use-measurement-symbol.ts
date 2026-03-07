import {type Control, useWatch} from "react-hook-form";
import type {UnitOfMeasurementType} from "@/types/unit-of-measurement-types.ts";

export const useMeasurementSymbol = (
    control: Control<any>,
    measurements: UnitOfMeasurementType[],
    fieldName: string = "unitOfMeasurementId"
) => {
    const selectedUnitId = useWatch({
        control,
        name: fieldName,
    });

    const selectedUnit = measurements.find((u) => u.id === selectedUnitId);

    return selectedUnit ? selectedUnit.symbol || selectedUnit.name : "";
};
