import {Box, Grid, Tooltip, Typography, useTheme} from "@mui/material";
import {useDeleteCategoryMutation} from "@/store/slice";
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";
import DataGridTable from "@/components/ui/data-grid-table";
import type {GridColDef} from "@mui/x-data-grid";
import {type MouseEvent, useMemo, useState} from "react";
import TableStyledBox from "@/components/ui/data-grid-table/table-styled-box.tsx";
import {useSearch} from "@/use-search.ts";
import TableSearchActions from "@/components/ui/data-grid-table/table-search-action.tsx";
import {getApiError} from "@/helpers/get-api-error.ts";
import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import useNotifier from "@/hooks/useNotifier.ts";
import CustomButton from "@/components/ui/button.tsx";
import CategoryFormModal from "@/components/menu-items/category-form-modal.tsx";
import type {CategoryType} from "@/types/categories-types.ts";
import TableStyledMenuItem from "@/components/ui/data-grid-table/table-style-menuitem.tsx";
import {useOfflineCategories} from "@/hooks/use-offline-categories.ts";
import DeleteConfirmationModal from "@/components/ui/delete-confimation-modal.tsx";

import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";

const CategoriesScreen = () => {
    const theme = useTheme();
    const notify = useNotifier();

    const [formModalOpen, setFormModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState<CategoryType | null>(null);

    const [deleteCategory, {isLoading: isDeleting}] = useDeleteCategoryMutation();

    const {data, isLoading, isFetching, isError, error} = useOfflineCategories();
    const memoizedData = useMemoizedArray(data);

    const {searchControl, searchSubmit, handleSearch, filteredData} = useSearch({
        initialData: memoizedData,
        searchKeys: ["name", "description"],
    });

    const handleMenuClick = (_event: MouseEvent<HTMLElement>, row: CategoryType) => {
        setSelectedRow(row);
    };

    const handleOpenCreateModal = () => {
        // Ensure the selectedRow is null for creation
        setSelectedRow(null);
        setFormModalOpen(true);
    }

    const handleCloseFormModal = () => {
        setFormModalOpen(false);
        setSelectedRow(null);
    };

    const handleCloseDeleteModal = () => {
        setDeleteModalOpen(false);
        setSelectedRow(null);
    };

    const handleDeleteCategory = async () => {
        if (selectedRow) {
            try {
                await deleteCategory(selectedRow.id).unwrap();
                notify("Factory deleted successfully", "success");
                handleCloseDeleteModal();
            } catch (error) {
                console.error("Failed to delete factory:", error);
                notify("Failed to delete factory", "error");
            }
        }
    };

    const columns: GridColDef[] = useMemo(
        () => [
            {
                flex: 1,
                field: "name",
                headerName: "Name",
                minWidth: 220,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2" fontWeight="500" textTransform={"capitalize"}>
                            {params.value}
                        </Typography>
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "description",
                headerName: "description",
                minWidth: 300,
                cellClassName: "capitalize-cell",
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2" textTransform={"capitalize"}>{params.value}</Typography>
                    </TableStyledBox>
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
                                <MoreVertIcon/>
                            </Tooltip>
                        }
                    >
                        <TableStyledMenuItem
                            onClick={() => setFormModalOpen(true)}
                            sx={{borderRadius: theme.borderRadius.small, mx: 1}}
                        >
                            Edit
                        </TableStyledMenuItem>

                        <TableStyledMenuItem
                            onClick={() => setDeleteModalOpen(true)}
                            disabled={isDeleting}
                            sx={{
                                mt: 1,
                                mx: 1,
                                border: `1px solid ${theme.palette.error.main}`,
                                borderRadius: theme.borderRadius.small,
                                color: theme.palette.error.main,
                            }}
                        >
                            Delete
                        </TableStyledMenuItem>
                    </CustomButton>
                ),
            }
        ],
        [],
    );

    if (isError) {
        notify(`Failed to load Categories.`, "error");
        const apiError = getApiError(error, `Failed to load categories.`);
        return <ApiErrorDisplay statusCode={apiError.type} message={apiError.message}/>;
    }


    return (
        <Box>
            <Box sx={{display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3}}>
                <Typography variant="h4" component="h1">
                    Categories
                </Typography>
                <CustomButton
                    title={"Category"}
                    variant="contained"
                    startIcon={<AddIcon/>}
                    onClick={handleOpenCreateModal}
                />
            </Box>

            <TableSearchActions
                searchControl={searchControl}
                searchSubmit={searchSubmit}
                handleSearch={handleSearch}
                placeholder="Search Categories..."
            />

            <Grid container spacing={2}>
                <Grid size={12}>
                    <DataGridTable data={filteredData} columns={columns} loading={isLoading || isFetching}/>
                </Grid>
            </Grid>

            <CategoryFormModal open={formModalOpen} onClose={handleCloseFormModal} categoryData={selectedRow}/>

            <DeleteConfirmationModal
                open={deleteModalOpen}
                onClose={handleCloseDeleteModal}
                onConfirm={handleDeleteCategory}
                isLoading={isDeleting}
                title="Delete Category?"
                message="You won't be able to revert this action."
            />
        </Box>
    );
};

export default CategoriesScreen;