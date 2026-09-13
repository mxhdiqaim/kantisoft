import { useDeleteStoreMutation, useGetAllStoresQuery } from "@/store/slice";
import { Box, Chip, Grid, Tooltip, Typography, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import type { BusinessType } from "@/modules/iam/types/business.type.ts";
import { type MouseEvent, useCallback, useMemo, useState } from "react";
import StyledBoxTable from "@/shared/components/ui/table/styled-box.table.tsx";
import { useNotification } from "@/shared";
import { parseApiErrorUtil } from "@/shared/api/parse-api-error.util.ts";
import DataGridTable from "@/shared/components/ui/table/data-grid.table.tsx";
import SearchActionTable from "@/shared/components/ui/table/search-action.table.tsx";
import { useSearch } from "@/use-search.ts";
import CustomButton from "@/shared/components/ui/button.util.tsx";
import TableStyledMenuItem from "@/shared/components/ui/table/table-style-menuitem.tsx";
import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import DeleteConfirmationModal from "@/shared/components/ui/delete-confimation-modal.tsx";
import StoreForm from "@/components/administrator/store-form.tsx";
import { useMemoizedArray } from "@/hooks/use-memoized-array.ts";
import ViewStoreDrawer from "@/components/administrator/view-store-drawer.tsx";

import { AddOutlined, DeleteOutline, EditOutlined, MoreVert, VisibilityOutlined } from "@mui/icons-material";

const StoresScreen = () => {
    const theme = useTheme();
    const { t } = useTranslation();
    const { success: successMessage, error: errorMessage } = useNotification();

    const { data: storesData, isLoading, isFetching, isError, error } = useGetAllStoresQuery();
    const memoizedStores = useMemoizedArray(storesData);

    const [deleteStore, { isLoading: isDeleting }] = useDeleteStoreMutation();

    const { searchControl, searchSubmit, handleSearch, filteredData } = useSearch({
        initialData: memoizedStores,
        searchKeys: ["name", "storeType", "location"],
    });

    const [selectedRow, setSelectedRow] = useState<BusinessType | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [openStoreForm, setOpenStoreForm] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const handleMenuClick = (_event: MouseEvent<HTMLElement>, row: BusinessType) => {
        setSelectedRow(row);
    };

    const handleCloseDeleteModal = () => {
        setDeleteModalOpen(false);
        setSelectedRow(null);
    };

    const handleDrawerOpen = useCallback(() => {
        setDrawerOpen(true);
    }, []);

    const handleDrawerClose = useCallback(() => {
        setDrawerOpen(false);
        setSelectedRow(null);
    }, []);

    const handleConfirmDelete = async () => {
        if (!selectedRow) return;
        try {
            await deleteStore(selectedRow.id).unwrap();
            successMessage("Store deleted successfully");
        } catch (error) {
            const defaultMessage = "Failed to delete store";
            const apiError = parseApiErrorUtil(error, defaultMessage);
            errorMessage(apiError.message);
        } finally {
            handleCloseDeleteModal();
        }
    };

    const handleCloseStoreForm = () => {
        setOpenStoreForm(false);
        setSelectedRow(null);
    };

    const columns: GridColDef<BusinessType>[] = useMemo(
        () => [
            {
                flex: 1,
                field: "name",
                headerName: "Store Name",
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
                field: "branchType",
                headerName: "Branch Type",
                minWidth: 120,
                align: "left",
                headerAlign: "left",
                renderCell: (params: GridRenderCellParams<BusinessType>) => {
                    const isMain = params.row.branchType === "main";
                    const label = isMain ? `Main ${t("store")}` : `Branch ${t("store")}`;
                    const color = isMain ? "primary" : "secondary";
                    return (
                        <StyledBoxTable>
                            <Chip
                                label={label}
                                size="medium"
                                color={color}
                                sx={{ textTransform: "capitalize", borderRadius: theme.borderRadius.small }}
                            />
                        </StyledBoxTable>
                    );
                },
            },
            {
                flex: 1,
                field: "location",
                headerName: "Location",
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
                field: "storeType",
                headerName: "Type",
                minWidth: 150,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Chip
                            label={params.value}
                            size="medium"
                            sx={{ textTransform: "capitalize", borderRadius: theme.borderRadius.small }}
                        />
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "createdAt",
                headerName: "Date Created",
                width: 180,
                align: "left",
                headerAlign: "left",
                renderCell: (params: GridRenderCellParams<BusinessType, string>) => {
                    const date = new Date(params.value as string);
                    if (isNaN(date.getTime())) {
                        return "Invalid Date";
                    }
                    return (
                        <StyledBoxTable>
                            <Typography variant="body2" fontWeight="500">
                                {date.toLocaleDateString()}
                            </Typography>
                        </StyledBoxTable>
                    );
                },
            },
            {
                // flex: 1,
                field: "actions",
                headerName: "Actions",
                width: 120,
                sortable: false,
                align: "center",
                headerAlign: "center",
                renderCell: (params) => {
                    const isMainStore = params.row.branchType === "main";
                    const hasBranches = memoizedStores?.length > 1;
                    const isDeleteDisabled = isMainStore && hasBranches;

                    return (
                        <CustomButton
                            variant={"text"}
                            sx={{
                                borderRadius: "10px",
                                color: theme.palette.text.primary,
                            }}
                            onClick={(e) => handleMenuClick(e, params.row)}
                            startIcon={
                                <Tooltip title="More Actions" placement={"top"}>
                                    <MoreVert />
                                </Tooltip>
                            }
                        >
                            <TableStyledMenuItem onClick={handleDrawerOpen}>
                                <VisibilityOutlined sx={{ mr: 1 }} />
                                View
                            </TableStyledMenuItem>
                            <TableStyledMenuItem onClick={() => setOpenStoreForm(true)}>
                                <EditOutlined sx={{ mr: 1 }} />
                                Edit
                            </TableStyledMenuItem>
                            <TableStyledMenuItem
                                onClick={() => setDeleteModalOpen(true)}
                                disabled={isDeleteDisabled || params.row.branchType === "main"}
                            >
                                <DeleteOutline sx={{ mr: 1 }} />
                                Delete
                            </TableStyledMenuItem>
                        </CustomButton>
                    );
                },
            },
        ],
        [theme.borderRadius.small, memoizedStores, t],
    );

    if (isError) {
        errorMessage(`Failed to load ${t("store")}. Please try again later.`);
        const apiError = parseApiErrorUtil(error, `Failed to load ${t("store")}.`);
        return <ApiErrorDisplay statusCode={apiError.statusCode} message={apiError.message} />;
    }

    return (
        <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                <Typography variant="h4">{t("store")}</Typography>
                <CustomButton
                    title={`New Branch`}
                    variant="contained"
                    startIcon={<AddOutlined />}
                    onClick={() => setOpenStoreForm(true)}
                />
            </Box>
            <SearchActionTable
                searchControl={searchControl}
                searchSubmit={searchSubmit}
                handleSearch={handleSearch}
                placeholder={"Search by name, type or location"}
            />
            <Grid container spacing={2}>
                <Grid size={12}>
                    <DataGridTable data={filteredData} columns={columns} loading={isLoading || isFetching} />
                </Grid>
            </Grid>

            <DeleteConfirmationModal
                open={deleteModalOpen}
                onClose={handleCloseDeleteModal}
                onConfirm={handleConfirmDelete}
                isLoading={isDeleting}
                title="Delete Store?"
                message="You won't be able to revert this action."
            />
            <StoreForm open={openStoreForm} onClose={handleCloseStoreForm} currentData={selectedRow} />

            {selectedRow && (
                <ViewStoreDrawer
                    open={drawerOpen}
                    onOpen={() => setDrawerOpen(true)}
                    onClose={handleDrawerClose}
                    storeId={selectedRow.id}
                />
            )}
        </Box>
    );
};

export default StoresScreen;
