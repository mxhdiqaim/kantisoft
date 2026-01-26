import {type Control, Controller, type FieldValues, type Path} from "react-hook-form";
import {Box, FormControl, InputAdornment, MenuItem, Typography} from "@mui/material";
import {StyledTextField} from "@/components/ui/index.tsx";
import {relativeTime} from "@/utils/get-relative-time.ts";

import Icon from "@/components/ui/icon.tsx";
import ArrowDownIconSvg from "@/assets/icons/arrow-down.svg";

type Props<T extends FieldValues> = {
    control: Control<T>;
    name: Path<T>;
    lastFetched?: Date | null;
};

const PeriodSelector = <T extends FieldValues>({control, name, lastFetched}: Props<T>) => (
    <Box>
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
        <Box sx={{display: "flex", justifyContent: "flex-end"}}>
            <Typography
                variant="h6"
                component="span"
                color="text.secondary"
                align="right"
                mb={1}
                sx={{
                    fontWeight: 400,
                    textAlign: "right",
                }}
            >
                {lastFetched ? `${relativeTime(lastFetched)}` : "Fetching data..."}
            </Typography>
        </Box>
    </Box>
);

export default PeriodSelector;
