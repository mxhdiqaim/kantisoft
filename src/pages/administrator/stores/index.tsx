import {useDeleteStoreMutation, useGetAllStoresQuery} from "@/store/slice";
import {Box, Chip, Grid, Tooltip, Typography, useTheme} from "@mui/material";
import {useTranslation} from "react-i18next";
import type {GridColDef, GridRenderCellParams} from "@mui/x-data-grid";
import type {StoreType} from "@/types/store-types.ts";
import {type MouseEvent, useCallback, useMemo, useState} from "react";
import TableStyledBox from "@/components/ui/data-grid-table/table-styled-box.tsx";
import useNotifier from "@/hooks/useNotifier.ts";
import {getApiError} from "@/helpers/get-api-error.ts";
import DataGridTable from "@/components/ui/data-grid-table";
import TableSearchActions from "@/components/ui/data-grid-table/table-search-action.tsx";
import {useSearch} from "@/use-search.ts";
import CustomButton from "@/components/ui/button.tsx";
import TableStyledMenuItem from "@/components/ui/data-grid-table/table-style-menuitem.tsx";
import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import DeleteConfirmationModal from "@/components/ui/delete-confimation-modal.tsx";
import StoreForm from "@/components/administrator/store-form.tsx";
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";
import ViewStoreDrawer from "@/components/administrator/view-store-drawer.tsx";

import {AddOutlined, DeleteOutline, EditOutlined, MoreVert, VisibilityOutlined} from "@mui/icons-material";

const StoresScreen = () => {
    const theme = useTheme();
    const {t} = useTranslation();
    const notify = useNotifier();

    const {data: storesData, isLoading, isError, error} = useGetAllStoresQuery();
    const memoizedStores = useMemoizedArray(storesData);

    const [deleteStore, {isLoading: isDeleting}] = useDeleteStoreMutation();

    const {searchControl, searchSubmit, handleSearch, filteredData} = useSearch({
        initialData: memoizedStores,
        searchKeys: ["name", "storeType", "location"],
    });

    const [selectedRow, setSelectedRow] = useState<StoreType | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [openStoreForm, setOpenStoreForm] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    console.log({selectedRow});

    const handleMenuClick = (_event: MouseEvent<HTMLElement>, row: StoreType) => {
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

    // const handleMenuClose = () => {
    //     setAnchorEl(null);
    //     setSelectedRow(null);
    // };

    const handleConfirmDelete = async () => {
        if (!selectedRow) return;
        try {
            await deleteStore(selectedRow.id).unwrap();
            notify("Store deleted successfully", "success");
        } catch (error) {
            const defaultMessage = "Failed to delete store";
            const apiError = getApiError(error, defaultMessage);
            notify(apiError.message, "error");
        } finally {
            handleCloseDeleteModal();
        }
    };

    const handleCloseStoreForm = () => {
        setOpenStoreForm(false)
        setSelectedRow(null);
    }

    const columns: GridColDef<StoreType>[] = useMemo(
        () => [
            {
                flex: 1,
                field: "name",
                headerName: "Store Name",
                minWidth: 150,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2">{params.value}</Typography>
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "branchType",
                headerName: "Branch Type",
                minWidth: 120,
                align: "left",
                headerAlign: "left",
                renderCell: (params: GridRenderCellParams<StoreType>) => {
                    const isMain = params.row.branchType === "main";
                    const label = isMain ? `Main ${t("store")}` : `Branch ${t("store")}`;
                    const color = isMain ? "primary" : "secondary";
                    return (
                        <TableStyledBox>
                            <Chip
                                label={label}
                                size="medium"
                                color={color}
                                sx={{textTransform: "capitalize", borderRadius: theme.borderRadius.small}}
                            />
                        </TableStyledBox>
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
                    <TableStyledBox>
                        <Typography variant="body2">{params.value}</Typography>
                    </TableStyledBox>
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
                    <TableStyledBox>
                        <Chip
                            label={params.value}
                            size="medium"
                            sx={{textTransform: "capitalize", borderRadius: theme.borderRadius.small}}
                        />
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "createdAt",
                headerName: "Date Created",
                width: 180,
                align: "left",
                headerAlign: "left",
                renderCell: (params: GridRenderCellParams<StoreType, string>) => {
                    const date = new Date(params.value as string);
                    if (isNaN(date.getTime())) {
                        return "Invalid Date";
                    }
                    return (
                        <TableStyledBox>
                            <Typography variant="body2" fontWeight="500">
                                {date.toLocaleDateString()}
                            </Typography>
                        </TableStyledBox>
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
                                    <MoreVert/>
                                </Tooltip>
                            }
                        >
                            <TableStyledMenuItem onClick={handleDrawerOpen}>
                                <VisibilityOutlined sx={{mr: 1}}/>
                                View
                            </TableStyledMenuItem>
                            <TableStyledMenuItem onClick={() => setOpenStoreForm(true)}>
                                <EditOutlined sx={{mr: 1}}/>
                                Edit
                            </TableStyledMenuItem>
                            <TableStyledMenuItem
                                onClick={() => setDeleteModalOpen(true)}
                                disabled={isDeleteDisabled || params.row.branchType === "main"}
                            >
                                <DeleteOutline sx={{mr: 1}}/>
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
        notify(`Failed to load ${t("store")}. Please try again later.`, "error");
        const apiError = getApiError(error, `Failed to load ${t("store")}.`);
        return <ApiErrorDisplay statusCode={apiError.type} message={apiError.message}/>;
    }

    return (
        <Box>
            <Box sx={{display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3}}>
                <Typography variant="h4">{t("store")}</Typography>
                <CustomButton
                    title={`New Branch`}
                    variant="contained"
                    startIcon={<AddOutlined/>}
                    onClick={() => setOpenStoreForm(true)}
                />
            </Box>
            <TableSearchActions
                searchControl={searchControl}
                searchSubmit={searchSubmit}
                handleSearch={handleSearch}
                placeholder={"Search by name, type or location"}
            />
            <Grid container spacing={2}>
                <Grid size={12}>
                    <DataGridTable data={filteredData} columns={columns} loading={isLoading}/>
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
            <StoreForm
                open={openStoreForm}
                onClose={handleCloseStoreForm}
                currentData={selectedRow}
            />

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
