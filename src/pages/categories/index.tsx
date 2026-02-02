import {Box, Grid, Typography} from "@mui/material";
import {useGetAllCategoriesQuery} from "@/store/slice";
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";
import DataGridTable from "@/components/ui/data-grid-table";
import type {GridColDef} from "@mui/x-data-grid";
import {useMemo, useState} from "react";
import TableStyledBox from "@/components/ui/data-grid-table/table-styled-box.tsx";
import {useSearch} from "@/use-search.ts";
import TableSearchActions from "@/components/ui/data-grid-table/table-search-action.tsx";
import {getApiError} from "@/helpers/get-api-error.ts";
import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import useNotifier from "@/hooks/useNotifier.ts";
import CustomButton from "@/components/ui/button.tsx";
import CategoryFormModal from "@/components/menu-items/category-form-modal.tsx";

import AddIcon from "@mui/icons-material/Add";
// import MoreVertIcon from "@mui/icons-material/MoreVert";

const CategoriesScreen = () => {
    const notify = useNotifier();
    const [formModalOpen, setFormModalOpen] = useState(false);

    const {data, isLoading, isFetching, isError, error} = useGetAllCategoriesQuery({});
    const memoizedData = useMemoizedArray(data);

    console.log(memoizedData);

    const {searchControl, searchSubmit, handleSearch, filteredData} = useSearch({
        initialData: memoizedData,
        searchKeys: ["name", "description"],
    });

    const handleOpenCreateModal = () => {
        // Ensure the selectedRow is null for creation
        // setSelectedRow(null);
        setFormModalOpen(true);
    }

    const handleCloseFormModal = () => {
        setFormModalOpen(false);
        // Always reset selectedRow when modal closes to ensure clean state for next action
        // setSelectedRow(null);
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

            <CategoryFormModal open={formModalOpen} onClose={handleCloseFormModal} data={null}/>
        </Box>
    );
};

export default CategoriesScreen;