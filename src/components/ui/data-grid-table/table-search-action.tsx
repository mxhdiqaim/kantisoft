import {type BaseSyntheticEvent} from "react";
import {Box, Grid, Skeleton, type SxProps, type Theme, useTheme} from "@mui/material";
import SearchField from "@/components/ui/search-field.tsx";
import type {Control} from "react-hook-form";
import CustomButton from "@/components/ui/button.tsx";
import {FileDownloadOutlined} from "@mui/icons-material";
import {UserRoleEnum} from "@/types/user-types.ts";
import {useAppSelector} from "@/store";
import {selectCurrentUser} from "@/store/slice/auth-slice.ts";
import TableStyledMenuItem from "@/components/ui/data-grid-table/table-style-menuitem.tsx";

interface Props {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    searchSubmit: (data: any) => (e?: BaseSyntheticEvent) => Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleSearch: (data: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    searchControl: Control<any>;
    onExportCsv?: () => void;
    onExportXlsx?: () => void;
    placeholder?: string;
    children?: React.ReactNode;
    sx?: SxProps<Theme>;
    loading?: boolean;
}

const TableSearchActions = ({
                                searchSubmit,
                                handleSearch,
                                searchControl,
                                onExportCsv,
                                onExportXlsx,
                                placeholder = "Search...",
                                children,
                                sx,
                                loading = false,
                            }: Props) => {
    const theme = useTheme();

    const currentUser = useAppSelector(selectCurrentUser);

    const handleCsvClick = () => {
        onExportCsv();
    };

    const handleXlsxClick = () => {
        onExportXlsx();
    };

    const showExport = onExportCsv && onExportXlsx;
    const canExport = [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN].includes(currentUser.role);

    if (loading) {
        return (
            <Grid container spacing={2} alignItems={"center"} sx={{my: 2, ...sx}}>
                <Grid size={12} mb={2}>
                    <Skeleton variant="rectangular" height={56}/>
                </Grid>
            </Grid>
        );
    }

    return (
        <Grid container spacing={2} alignItems={"center"} sx={{my: 2, ...sx}}>
            <Grid size={{xs: 12, md: 9}}>
                <Box sx={{display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap"}}>
                    <Box
                        component="form"
                        autoComplete="on"
                        onSubmit={searchSubmit(handleSearch)}
                        sx={{maxWidth: {xs: "100%", md: "80%"}, flexGrow: 1}}
                    >
                        <SearchField
                            name={"search"}
                            placeholder={placeholder}
                            control={searchControl}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    height: 40,
                                    borderRadius: theme.borderRadius.small,
                                },
                                width: "100%",
                            }}
                        />
                    </Box>
                </Box>
            </Grid>
            <Grid size={{xs: 12, md: 3}}>
                <Box sx={{display: "flex", justifyContent: {xs: "flex-start", md: "flex-end"}, gap: 1}}>
                    {(showExport && canExport) && (
                        <CustomButton
                            title={"Export"}
                            startIcon={<FileDownloadOutlined/>}
                            sx={{height: 40, width: 100}}
                            variant={"contained"}
                        >
                            <TableStyledMenuItem onClick={handleCsvClick}>Export as CSV</TableStyledMenuItem>
                            <TableStyledMenuItem onClick={handleXlsxClick}>Export as XLSX</TableStyledMenuItem>
                        </CustomButton>
                    )}
                    {children && <Box sx={{height: 35, width: {xs: 100, md: "auto"}}}>{children}</Box>}
                </Box>
            </Grid>
        </Grid>
    );
};

export default TableSearchActions;