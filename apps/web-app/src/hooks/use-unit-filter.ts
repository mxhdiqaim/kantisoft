import {useMemo} from "react";
import {type Control, useWatch} from "react-hook-form";
import {type UnitOfMeasurementType} from "@/types/unit-of-measurement-types";

interface Props {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    control: Control<any>;
    allUnits: UnitOfMeasurementType[] | undefined;
    selectedMaterialFamily: string | undefined;
}

export const useUnitFilter = ({control, allUnits, selectedMaterialFamily}: Props) => {
    // Watch the selected unit ID from the form
    const currentUnitId = useWatch({control, name: "unitOfMeasurementId"});

    // Extract and Normalise the required family
    const requiredFamily = useMemo(() => {
        return selectedMaterialFamily?.toLowerCase();
    }, [selectedMaterialFamily]);

    // Filter units to only show those in the same family
    const filteredUnits = useMemo(() => {
        if (!requiredFamily || !allUnits) return [];

        return allUnits.filter(
            (unit) => unit.unitOfMeasurementFamily?.toLowerCase() === requiredFamily
        );
    }, [requiredFamily, allUnits]);

    // Find the symbol of the currently selected unit for adornments
    const selectedUnitSymbol = useMemo(() => {
        if (!allUnits || !currentUnitId) return "";
        return allUnits.find((u) => u.id === currentUnitId)?.symbol || "";
    }, [currentUnitId, allUnits]);

    return {
        filteredUnits,
        selectedUnitSymbol,
        currentUnitId,
    };
};