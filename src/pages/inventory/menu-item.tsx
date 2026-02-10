import {type MouseEvent, useCallback, useMemo, useState} from "react";
import {Box, Chip, Grid, Tooltip, Typography, useTheme} from "@mui/material";
import {useDeleteMenuItemMutation} from "@/store/slice";
import useNotifier from "@/hooks/useNotifier.ts";
import MenuItemFormModal from "@/components/menu-items/menu-item-form-modal.tsx";
import type {MenuItemType} from "@/types/menu-item-type.ts";
import {useTranslation} from "react-i18next";
import {getApiError} from "@/helpers/get-api-error.ts";
import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import {selectCurrentUser} from "@/store/slice/auth-slice.ts";
import {useAppSelector} from "@/store";
import DataGridTable from "@/components/ui/data-grid-table";
import type {GridColDef} from "@mui/x-data-grid";
import TableStyledBox from "@/components/ui/data-grid-table/table-styled-box.tsx";
import {camelCaseToTitleCase, formatCurrency} from "@/utils";
import TableSearchActions from "@/components/ui/data-grid-table/table-search-action.tsx";
import {useSearch} from "@/use-search.ts";
import CustomButton from "@/components/ui/button.tsx";
import {UserRoleEnum} from "@/types/user-types.ts";
import TableStyledMenuItem from "@/components/ui/data-grid-table/table-style-menuitem.tsx";
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";
import {getMenuItemsInventoryStatusChip} from "@/components/ui";
import BillOfMaterialsDrawer from "@/components/menu-items/bom-drawer.tsx";
import {useOfflineMenuItems} from "@/hooks/use-offline-menuitems.ts";

import {DeleteOutline, EditOutlined, MoreVert, RestaurantMenuOutlined} from "@mui/icons-material";
import {localSyncStatusEnum} from "@/types";

const MenuItems = () => {
    const theme = useTheme();
    const notify = useNotifier();
    const {t} = useTranslation();

    const currentUser = useAppSelector(selectCurrentUser);

    const {items: menuItems, isLoading, isError, error} = useOfflineMenuItems({});

    const [deleteMenuItem, {isLoading: isDeleting}] = useDeleteMenuItemMutation();

    const flattenedMenuItems = useMemo(() => {
        if (!menuItems) return [];
        return menuItems.map(item => ({
            ...item,
            inventoryQuantity: item.inventory?.quantity,
            inventoryStockStatus: item.inventory?.status,
            inventoryMinStockLevel: item.inventory?.minStockLevel,
            inventoryLastCountDate: item.inventory?.lastCountDate,
        }));
    }, [menuItems]);

    const memoizedMenuItems = useMemoizedArray(flattenedMenuItems);

    const {searchControl, searchSubmit, handleSearch, filteredData} = useSearch({
        initialData: memoizedMenuItems,
        searchKeys: ["name", "itemCode", "sku"],
    });

    const [formModalOpen, setFormModalOpen] = useState(false);
    const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItemType | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRow, setSelectedRow] = useState<MenuItemType | null>(null);
    const [openRecipeDrawer, setOpenRecipeDrawer] = useState(false);

    const totalMenuItems = useMemo(() => menuItems?.length || 0, [menuItems]);

    const handleOpenFormModal = (menuItem: MenuItemType | null = null) => {
        setSelectedMenuItem(menuItem);
        setFormModalOpen(true);
    };

    const handleCloseFormModal = () => {
        setSelectedMenuItem(null);
        setFormModalOpen(false);
    };

    const handleStockInDrawerClose = useCallback(() => {
        setOpenRecipeDrawer(false);
    }, []);

    // // Define custom formatters for MenuItemsTable
    // const menuItemsFieldFormatters = useMemo(
    //     () => ({
    //         itemCode: (row: MenuItemType) => row.itemCode,
    //         name: (row: MenuItemType) => row.name,
    //         price: (row: MenuItemType) => row.price,
    //         store: (row: MenuItemType) => row.store?.name,
    //         inventoryQuantity: (row: MenuItemType) => row.inventory?.quantity ?? "",
    //         inventoryStockStatus: (row: MenuItemType) => row.inventory?.status ?? "",
    //     }),
    //     [],
    // );

    // const prepareExportData = () => {
    //     return getExportFormattedData(
    //         filteredData, // Your data source
    //         columns, // Your column definitions
    //         menuItemsFieldFormatters // Your specific formatters
    //     );
    // };

    // const handleExportCsv = () => {
    //     const dataToExport = prepareExportData();
    //
    //     if (dataToExport.length === 0) {
    //         notify("No data to export.", "error");
    //         return;
    //     }
    //
    //     const filename = `menu_items_data.csv`;
    //     exportToCsv(dataToExport, filename); // Uses generic utility
    // };

    // // Export to XLSX function
    // const handleExportXlsx = () => {
    //     const dataToExport = prepareExportData();
    //
    //     if (dataToExport.length === 0) {
    //         notify("No data to export.", "error");
    //         return;
    //     }
    //
    //     const filename = `menu_items_data.xlsx`;
    //     exportToXlsx(dataToExport, filename, "Sales History", columns); // Uses generic utility
    // };

    const handleMenuClick = (event: MouseEvent<HTMLElement>, row: MenuItemType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRow(row);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedRow(null);
    };

    const handleDelete = async (rowId: string) => {
        try {
            await deleteMenuItem(rowId).unwrap();
            notify("Menu item deleted successfully", "success");
        } catch (error) {
            console.error("Failed to delete menu item:", error);
            notify("Failed to delete menu item", "error");
        }

        handleMenuClose();
    };

    const columns: GridColDef[] = useMemo(
        () => [
            {
                flex: 1,
                field: "name",
                headerName: "Name",
                minWidth: 220,
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2">
                            {params.value}

                            {/* Error Chip */}
                            {params.row.syncStatus === localSyncStatusEnum.ERROR && (
                                <Tooltip title="Failed to sync. Click Edit to fix issues (e.g. duplicate name).">
                                    <Chip
                                        label="Sync Error"
                                        color="error"
                                        size="small"
                                        variant="filled"
                                        sx={{height: 20, fontSize: '0.6rem'}}
                                    />
                                </Tooltip>
                            )}

                            {/* Pending Chip */}
                            {params.row.syncStatus === localSyncStatusEnum.PENDING && (
                                <Tooltip title="Waiting for internet...">
                                    <Chip label="Offline" size="small" variant="outlined"
                                          sx={{height: 20, fontSize: '0.65rem'}}/>
                                </Tooltip>
                            )}
                        </Typography>
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "price",
                headerName: "Price",
                type: "number",
                minWidth: 150,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox sx={{justifyContent: "left"}}>
                        <Typography variant="body2" fontWeight="medium">
                            {formatCurrency(params.value)}
                        </Typography>
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "inventoryStockStatus",
                headerName: "Stock Status",
                minWidth: 180,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        {params.value ? <Chip
                            label={camelCaseToTitleCase(params.value)}
                            color={getMenuItemsInventoryStatusChip(params.value)}
                            size="small"
                            sx={{textTransform: "capitalize"}}
                        /> : ""}
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "inventoryMinStockLevel",
                headerName: "Minimum Stock",
                minWidth: 150,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2">
                            {params.value ?? ""}
                        </Typography>
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "inventoryQuantity",
                headerName: "Quantity",
                minWidth: 120,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2">
                            {params.value ?? ""}
                        </Typography>
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "itemCode",
                headerName: "Item Code",
                minWidth: 150,
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2" className="capitalize">
                            {params?.value}
                        </Typography>
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "sku",
                headerName: "SKU",
                minWidth: 220,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2">
                            {params?.value}
                        </Typography>
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "store",
                headerName: `${t("store")}`,
                minWidth: 150,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography>
                            {params.value?.name}
                        </Typography>
                    </TableStyledBox>
                ),
            },
            {
                field: "actions",
                headerName: "Actions",
                type: "actions",
                width: 100,
                align: "center",
                headerAlign: "center",
                renderCell: (params) => {

                    const handleEdit = () => {
                        handleOpenFormModal(params.row);
                        handleMenuClose();
                    };

                    if (!currentUser || currentUser.role === UserRoleEnum.GUEST) {
                        return null; // No actions for guests or logged-out users
                    }

                    const canInteract = [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN].includes(currentUser.role);

                    return (
                        canInteract && (
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
                                <TableStyledMenuItem onClick={handleEdit}>
                                    <EditOutlined sx={{mr: 1}}/>
                                    Edit
                                </TableStyledMenuItem>
                                <TableStyledMenuItem
                                    onClick={() => setOpenRecipeDrawer(true)}>
                                    <RestaurantMenuOutlined sx={{mr: 1}}/>
                                    Recipe
                                </TableStyledMenuItem>
                                <TableStyledMenuItem
                                    onClick={() => handleDelete(params.row.id)}
                                    sx={{color: "error.main"}}
                                    disabled={isDeleting && selectedRow.id === params.row.id}
                                >
                                    <DeleteOutline sx={{mr: 1}}/>
                                    Delete
                                </TableStyledMenuItem>
                            </CustomButton>
                        )
                    );
                },
            },
        ],
        [theme, anchorEl, selectedRow, currentUser, handleOpenFormModal],
    );

    if (isError && (!menuItems || menuItems.length === 0)) {
        const apiError = getApiError(error, `Failed to load ${t("menuItem")}.`);
        return <ApiErrorDisplay statusCode={apiError.type} message={apiError.message}/>;
    }

    return (
        <Box>
            <Grid container spacing={2} mb={2}>
                <Grid size={{xs: 12, md: 6}}>
                    <Typography variant="h4">{t("menuItems")}</Typography>
                    <Typography variant="subtitle1">
                        Total {t("menuItem")}: {totalMenuItems}
                    </Typography>
                </Grid>
                {currentUser && (currentUser.role === "manager" || currentUser.role === "admin") && (
                    <Grid size={{xs: 12, md: 6}}>
                        <Box display="flex" justifyContent="flex-end">
                            <CustomButton
                                title={`Add ${t("item")}`}
                                variant="contained"
                                onClick={() => handleOpenFormModal()}
                            />
                        </Box>
                    </Grid>
                )}
            </Grid>

            <TableSearchActions
                searchControl={searchControl}
                searchSubmit={searchSubmit}
                handleSearch={handleSearch}
                // onExportCsv={handleExportCsv}
                // onExportXlsx={handleExportXlsx}
                placeholder={`Search ${t("menuItem")} by name, sku or item code`}
            />

            <Grid container spacing={2} sx={{mt: 2}}>
                <Grid size={12}>
                    <DataGridTable data={filteredData} columns={columns} loading={isLoading}/>
                </Grid>
            </Grid>

            <MenuItemFormModal open={formModalOpen} onClose={handleCloseFormModal} menuItemToEdit={selectedMenuItem}/>

            {selectedRow?.id && (
                <BillOfMaterialsDrawer
                    open={openRecipeDrawer}
                    onOpen={() => setOpenRecipeDrawer(true)}
                    onClose={handleStockInDrawerClose}
                    menuItemId={selectedRow.id}
                />
            )}
        </Box>
    );
};

export default MenuItems;
