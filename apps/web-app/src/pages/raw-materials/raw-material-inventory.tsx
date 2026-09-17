import { Box, Chip, Grid, Tooltip, Typography, useTheme } from "@mui/material";
import { useGetAllRawMaterialInventoryQuery } from "@/store/slice";
import RawMaterialInventoryForm from "@/components/raw-material/raw-material-inventory-form.tsx";
import { type MouseEvent, useCallback, useMemo, useState } from "react";
import { useSearch } from "@/use-search.ts";
import { useMemoizedArray } from "@/hooks/use-memoized-array.ts";
import type { GridColDef } from "@mui/x-data-grid";
import {
    StyledBoxTable,
    CustomButton,
    SearchActionTable,
    getInventoryStatusChipColor,
    DataGridTable,
} from "@/shared/components";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import TableStyledMenuItem from "@/shared/components/ui/table/table-style-menuitem.tsx";
import { camelCaseToTitleCase, formatNumber, parseApiError, formatRelativeDateTime } from "@/shared/utils";
import type { GetRawMaterialInventoryStockType } from "@/types/raw-material-types.ts";
import InventoryDetailsDrawer from "@/components/raw-material/inventory-details-drawer.tsx";
import RawMaterialStockInDrawer from "@/components/raw-material/raw-material-stock-in-drawer.tsx";
import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";

import AddIcon from "@mui/icons-material/Add";

const RawMaterialInventory = () => {
    const theme = useTheme();

    const { data, isLoading, isFetching, isError, error } = useGetAllRawMaterialInventoryQuery();
    const memoizedInventoryData = useMemoizedArray(data);

    const [formModalOpen, setFormModalOpen] = useState(false);
    const [openInventoryDetailDrawer, setOpenInventoryDetailDrawer] = useState(false);
    const [openStockInDrawer, setOpenStockInDrawer] = useState(false);
    const [selectedRow, setSelectedRow] = useState<GetRawMaterialInventoryStockType | null>(null);

    const { searchControl, searchSubmit, handleSearch, filteredData } = useSearch({
        initialData: memoizedInventoryData,
        searchKeys: ["rawMaterialName", "status", "latestUnitPrice", "storeName"],
    });

    const handleMenuClick = (_event: MouseEvent<HTMLElement>, row: GetRawMaterialInventoryStockType) => {
        setSelectedRow(row);
    };

    const handleCloseFormModal = () => {
        setFormModalOpen(false);
        setSelectedRow(null);
    };

    const handleOpenFormModal = () => {
        setFormModalOpen(true);
    };

    const handleStockInDrawerClose = useCallback(() => {
        setOpenStockInDrawer(false);
    }, []);

    const columns: GridColDef[] = useMemo(
        () => [
            {
                flex: 1,
                field: "rawMaterialName",
                headerName: "Raw Material",
                minWidth: 180,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2" fontWeight="500">
                            {params.value}
                        </Typography>
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "quantity",
                headerName: "Quantity",
                minWidth: 100,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => {
                    const symbol = params.row.unitOfMeasurement.symbol;

                    return (
                        <StyledBoxTable>
                            <Typography variant="body2">{formatNumber(params.value)}</Typography>
                            <Typography variant="body2">({symbol})</Typography>
                        </StyledBoxTable>
                    );
                },
            },
            // {
            //     flex: 1,
            //     field: "unitOfMeasurement",
            //     headerName: "Measurement Unit",
            //     minWidth: 180,
            //     cellClassName: "capitalize-cell",
            //     align: "left",
            //     headerAlign: "left",
            //     renderCell: (params) => {
            //         const name = params.value.name;
            //         const symbol = params.value.symbol;
            //         return (
            //             <TableStyledBox>
            //                 <Typography variant="body2" textTransform={"capitalize"}>{name}</Typography>
            //                 <Typography variant="body2">({symbol})</Typography>
            //             </TableStyledBox>
            //         )
            //     },
            // },
            {
                flex: 1,
                field: "minStockLevel",
                headerName: "Min Stock",
                minWidth: 120,
                cellClassName: "capitalize-cell",
                align: "left",
                headerAlign: "left",
                renderCell: (params) => {
                    const symbol = params.row.unitOfMeasurement.symbol;

                    return (
                        <StyledBoxTable>
                            <Typography variant="body2">{formatNumber(params.value)}</Typography>
                            <Typography variant="body2">({symbol})</Typography>
                        </StyledBoxTable>
                    );
                },
            },
            {
                flex: 1,
                field: "status",
                headerName: "Status",
                minWidth: 120,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Chip
                            label={camelCaseToTitleCase(params.value)}
                            color={getInventoryStatusChipColor(params.value ?? "")}
                            size="small"
                            sx={{ textTransform: "capitalize" }}
                        />
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "storeName",
                headerName: "Store",
                minWidth: 150,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2">{params.value}</Typography>
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "lastModified",
                headerName: "Last Modified",
                minWidth: 150,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2">{formatRelativeDateTime(params.value)}</Typography>
                    </StyledBoxTable>
                ),
            },
            {
                field: "actions",
                headerName: "",
                width: 60,
                align: "center",
                headerAlign: "center",
                sortable: false,
                renderCell: (params) => (
                    <CustomButton
                        variant={"text"}
                        sx={{
                            borderRadius: "10px",
                            color: theme.palette.text.primary,
                        }}
                        onClick={(e) => handleMenuClick(e, params.row)}
                        startIcon={
                            <Tooltip title="More Actions" placement={"top"}>
                                <MoreVertIcon />
                            </Tooltip>
                        }
                    >
                        <TableStyledMenuItem
                            onClick={() => setOpenInventoryDetailDrawer(true)}
                            sx={{ borderRadius: theme.borderRadius.small, mx: 1 }}
                        >
                            View
                        </TableStyledMenuItem>
                        <TableStyledMenuItem
                            onClick={handleOpenFormModal}
                            sx={{ borderRadius: theme.borderRadius.small, mx: 1 }}
                        >
                            Edit Min Stock
                        </TableStyledMenuItem>
                        <TableStyledMenuItem
                            onClick={() => setOpenStockInDrawer(true)}
                            sx={{ borderRadius: theme.borderRadius.small, mx: 1 }}
                        >
                            Stock In
                        </TableStyledMenuItem>

                        {/*<TableStyledMenuItem*/}
                        {/*    // onClick={() => setDeleteModalOpen(true)}*/}
                        {/*    disabled*/}
                        {/*    sx={{*/}
                        {/*        mt: 1,*/}
                        {/*        mx: 1,*/}
                        {/*        border: `1px solid ${theme.palette.error.main}`,*/}
                        {/*        borderRadius: theme.borderRadius.small,*/}
                        {/*        color: theme.palette.error.main,*/}
                        {/*    }}*/}
                        {/*>*/}
                        {/*    Delete*/}
                        {/*</TableStyledMenuItem>*/}
                    </CustomButton>
                ),
            },
        ],
        [],
    );

    if (isError) {
        const apiError = parseApiError(error, `Failed to Inventory.`);
        return <ApiErrorDisplay statusCode={apiError.statusCode} message={apiError.message} />;
    }

    return (
        <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                <Typography variant="h4" component="h1">
                    Inventory
                </Typography>
                <CustomButton
                    title={"Inventory"}
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenFormModal}
                />
            </Box>

            <SearchActionTable
                searchControl={searchControl}
                searchSubmit={searchSubmit}
                handleSearch={handleSearch}
                placeholder={"Search Raw Material Inventory..."}
            />

            <Grid container spacing={2}>
                <Grid size={12}>
                    <DataGridTable data={filteredData} columns={columns} loading={isLoading || isFetching} />
                </Grid>
            </Grid>

            {selectedRow?.rawMaterialId && (
                <InventoryDetailsDrawer
                    open={openInventoryDetailDrawer}
                    onOpen={() => setOpenInventoryDetailDrawer(true)}
                    onClose={() => setOpenInventoryDetailDrawer(false)}
                    rawMaterialId={selectedRow?.rawMaterialId as string}
                />
            )}

            {selectedRow?.rawMaterialId && (
                <RawMaterialStockInDrawer
                    open={openStockInDrawer}
                    onOpen={() => setOpenStockInDrawer(true)}
                    onClose={handleStockInDrawerClose}
                    rawMaterialInventory={selectedRow}
                />
            )}

            <RawMaterialInventoryForm
                open={formModalOpen}
                onClose={handleCloseFormModal}
                rawMaterialInventory={selectedRow}
            />
        </Box>
    );
};

export default RawMaterialInventory;
