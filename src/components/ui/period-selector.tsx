import {type Control, Controller, type FieldValues, type Path} from "react-hook-form";
import {Box, FormControl, InputAdornment, Typography} from "@mui/material";
import {StyledTextField} from "@/components/ui/index.tsx";
import {relativeTime} from "@/utils/get-relative-time.ts";
import StyledMenuItem from "@/components/ui/data-grid-table/table-style-menuitem.tsx";

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
                        <StyledMenuItem value={"today"} sx={{my: 0.5}}>Today</StyledMenuItem>
                        <StyledMenuItem value={"week"} sx={{my: 0.5}}>This Week</StyledMenuItem>
                        <StyledMenuItem value={"month"} sx={{my: 0.5}}>This Month</StyledMenuItem>
                        <StyledMenuItem value={"all-time"} sx={{my: 0.5}}>All Time</StyledMenuItem>
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
