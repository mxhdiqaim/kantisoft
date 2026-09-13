import { type MouseEvent, useMemo, useState } from "react";
import { useSearch } from "@/use-search.ts";
import type { GridColDef } from "@mui/x-data-grid";
import { Box, Grid, Tooltip, Typography, useTheme } from "@mui/material";
import {
    formatDateCustom,
    StyledBoxTable,
    snakeCaseToTitleCase,
    useNotification,
    CustomButton,
    DataGridTable,
    SearchActionTable,
    getTextColor,
} from "@/shared";
import type { DeletedRawMaterialType } from "@/types/raw-material-types.ts";
import TableStyledMenuItem from "@/shared/components/ui/table/table-style-menuitem.tsx";
import DeleteConfirmationModal from "@/shared/components/ui/delete-confimation-modal.tsx";

import { MoreVert, Undo as UndoIcon } from "@mui/icons-material";
import { useRecoverRawMaterialMutation } from "@/store/slice";

interface Props {
    data: DeletedRawMaterialType[];
    loading: boolean;
}

const RawMaterialTrashBinTab = ({ data, loading }: Props) => {
    const { success: successMessage, error: errorMessage } = useNotification();
    const theme = useTheme();

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState<DeletedRawMaterialType | null>(null);

    const [recoverRawMaterial, { isLoading: isRecovering }] = useRecoverRawMaterialMutation();

    const handleMenuClick = (_event: MouseEvent<HTMLElement>, row: DeletedRawMaterialType) => {
        setSelectedRow(row);
    };

    const handleCloseDeleteModal = () => {
        setDeleteModalOpen(false);
        setSelectedRow(null);
    };

    const { searchControl, searchSubmit, handleSearch, filteredData } = useSearch({
        initialData: data,
        searchKeys: ["name", "deletedAt"],
    });

    const handleRecover = async () => {
        if (!selectedRow) return;

        try {
            await recoverRawMaterial(selectedRow.id).unwrap();
            successMessage("Raw material recovered successfully");
            handleCloseDeleteModal();
        } catch (error) {
            console.error("Failed to recover raw material:", error);
            errorMessage("Failed to recover raw material");
        }
    };

    const columns: GridColDef[] = useMemo(
        () => [
            {
                flex: 1,
                field: "name",
                headerName: "Name",
                width: 200,
                align: "left",
                headerAlign: "left",
                cellClassName: "capitalize-cell",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2">{params.value}</Typography>
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "deletedAt",
                headerName: "Deleted On",
                width: 150,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2" fontWeight="medium">
                            {formatDateCustom(params.value)}
                        </Typography>
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "unitOfMeasurement",
                headerName: "Unit of Measurement",
                width: 200,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2" fontWeight="medium">
                            {params.value.name} ({params.value.symbol})
                        </Typography>
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "status",
                headerName: "Status",
                width: 200,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2" fontWeight="medium" color={getTextColor(params.value)}>
                            {snakeCaseToTitleCase(params.value)}
                        </Typography>
                    </StyledBoxTable>
                ),
            },
            {
                field: "actions",
                headerName: "",
                width: 120,
                sortable: false,
                align: "center",
                headerAlign: "center",
                renderCell: (params) => {
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
                            <TableStyledMenuItem onClick={() => setDeleteModalOpen(true)} disabled={isRecovering}>
                                <UndoIcon sx={{ mr: 1 }} />
                                Recover
                            </TableStyledMenuItem>
                        </CustomButton>
                    );
                },
            },
        ],
        [],
    );

    return (
        <Box>
            <SearchActionTable
                searchControl={searchControl}
                searchSubmit={searchSubmit}
                handleSearch={handleSearch}
                placeholder={"Search by name or deletion date"}
            />
            <Grid size={12}>
                <DataGridTable data={filteredData} columns={columns} loading={loading} />
            </Grid>

            <DeleteConfirmationModal
                open={deleteModalOpen}
                onClose={handleCloseDeleteModal}
                onConfirm={handleRecover}
                isLoading={isRecovering}
                title="Recover Raw Material?"
                // message="You won't be able to revert this action."
            />
        </Box>
    );
};

export default RawMaterialTrashBinTab;
