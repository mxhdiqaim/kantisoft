import { useGetActivitiesQuery } from "@/store/slice";
import { Box, Chip, Grid, Typography } from "@mui/material";
import { useAppSelector } from "@/store";
import { selectCurrentUser } from "@/store/slice/auth-slice.ts";
import { UserRoleEnum } from "@/modules";
import { useMemo, useState } from "react";
import TableStyledBox from "@/shared/components/ui/data-grid-table/table-styled-box.tsx";
import { type GridColDef } from "@mui/x-data-grid";
import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import { parseApiErrorUtil } from "@/shared/utils/parse-api-error.util.ts";
import { useNotification } from "@/shared";
import DataGridTable from "@/shared/components/ui/data-grid-table";
import { getActionColor } from "@/shared/utils";
import { useMemoizedArray } from "@/hooks/use-memoized-array.ts";
import TableSearchActions from "@/shared/components/ui/data-grid-table/table-search-action.tsx";
import { useSearch } from "@/use-search.ts";
import { formatDateTimeCustom } from "@/shared/utils/get-relative-time.ts";
import { useTranslation } from "react-i18next";

const ActivityLogPage = () => {
    const { t } = useTranslation();
    const { error: errorMessage } = useNotification();
    const currentUser = useAppSelector(selectCurrentUser);

    // Pagination state
    const [page] = useState(0);
    const [rowsPerPage] = useState(20);

    const { data, isLoading, isError, error } = useGetActivitiesQuery({
        limit: rowsPerPage,
        offset: page * rowsPerPage,
    });

    const memoizedData = useMemoizedArray(data);

    const { searchControl, searchSubmit, handleSearch, filteredData } = useSearch({
        initialData: memoizedData,
        searchKeys: ["details", "userName", "userRole", "storeName", "action"],
    });

    const columns: GridColDef[] = useMemo(
        () => [
            {
                field: "createdAt",
                headerName: "Date",
                flex: 1,
                minWidth: 200,
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2">{formatDateTimeCustom(params.value)}</Typography>
                    </TableStyledBox>
                ),
            },
            {
                field: "details",
                headerName: "Details",
                flex: 1.5,
                minWidth: 450,
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2">{params.row.details}</Typography>
                    </TableStyledBox>
                ),
            },

            {
                field: "userName",
                headerName: "User",
                flex: 1,
                minWidth: 180,
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2">{params.row.userName}</Typography>
                    </TableStyledBox>
                ),
            },
            {
                field: "userRole",
                headerName: "Role",
                flex: 1,
                minWidth: 120,
                align: "center",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Chip
                            label={params.row.userRole}
                            size="medium"
                            sx={{ textTransform: "capitalize", textAlign: "left" }}
                        />
                    </TableStyledBox>
                ),
            },
            {
                field: "storeName",
                headerName: "Store",
                flex: 1,
                minWidth: 150,
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2">{params.row.storeName}</Typography>
                    </TableStyledBox>
                ),
            },
            {
                field: "entityType",
                headerName: "Entity Type",
                flex: 1,
                minWidth: 150,
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2">{t(params.row.entityType || "N/A")}</Typography>
                    </TableStyledBox>
                ),
            },
            {
                field: "action",
                headerName: "Action",
                flex: 1,
                headerAlign: "left",
                minWidth: 300,
                renderCell: (params) => (
                    <TableStyledBox>
                        <Chip
                            label={params.row.action.replace(/_/g, " ")}
                            color={getActionColor(params.row.action)}
                            size="medium"
                            sx={{ fontWeight: 600, textTransform: "capitalize" }}
                        />
                    </TableStyledBox>
                ),
            },
        ],
        [],
    );

    if (!currentUser || ![UserRoleEnum.MANAGER, UserRoleEnum.ADMIN].includes(currentUser.role)) {
        return (
            <Box sx={{ p: 4 }}>
                <Typography color="error">You do not have permission to view activity logs.</Typography>
            </Box>
        );
    }

    if (isError && !data) {
        const apiError = parseApiErrorUtil(error, "Failed to load users. Please try again later.");
        errorMessage(apiError.message);
        return <ApiErrorDisplay statusCode={apiError.statusCode} message={apiError.message} />;
    }

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                System Activities
            </Typography>
            <TableSearchActions
                searchControl={searchControl}
                searchSubmit={searchSubmit}
                handleSearch={handleSearch}
                placeholder={"Search by details, user, role, store, or action"}
            />
            <Grid container spacing={2}>
                <Grid size={12}>
                    <DataGridTable data={filteredData} columns={columns} loading={isLoading} />
                </Grid>
            </Grid>
        </Box>
    );
};

export default ActivityLogPage;
