import {type Control, Controller, type FieldValues, type Path} from "react-hook-form";
import {Box, FormControl, InputAdornment, MenuItem} from "@mui/material";
import {StyledTextField} from "@/components/ui/index.tsx";

import Icon from "@/components/ui/icon.tsx";
import ArrowDownIconSvg from "@/assets/icons/arrow-down.svg";

type Props<T extends FieldValues> = {
    control: Control<T>;
    name: Path<T>;
};

const PeriodSelector = <T extends FieldValues>({control, name}: Props<T>) => (
    <Box
        sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
        }}
    >
        <Controller
            name={name}
            control={control}
            render={({field}) => (
                <FormControl>
                    <StyledTextField
                        {...field}
                        select
                        label="Period"
                        placeholder="Select Period"
                        SelectProps={{
                            IconComponent: () => null,
                            endAdornment: (
                                <InputAdornment position="end">
                                    <Icon
                                        src={ArrowDownIconSvg}
                                        alt={"Dropdown Arrow"}
                                        sx={{width: 15, height: 15}}
                                    />
                                </InputAdornment>
                            ),
                        }}
                    >
                        <MenuItem value={""} disabled>
                            Select Period
                        </MenuItem>
                        <MenuItem value={"today"}>Today</MenuItem>
                        <MenuItem value={"week"}>This Week</MenuItem>
                        <MenuItem value={"month"}>This Month</MenuItem>
                        <MenuItem value={"all-time"}>All Time</MenuItem>
                    </StyledTextField>
                </FormControl>
            )}
        />
    </Box>
);

export default PeriodSelector;
