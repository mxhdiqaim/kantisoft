import { Box, Grid, Typography } from "@mui/material";
import type { FinishedGoodsProfitMarginType } from "@/types/production-types.ts";
import DataGridTable from "@/shared/components/ui/table/data-grid.table.tsx";
import type { GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";
import StyledBoxTable from "@/shared/components/ui/table/styled-box.table.tsx";
import { formatCurrency, snakeCaseToTitleCase } from "@/shared/utils/custom.util.ts";
import { useSearch } from "@/use-search.ts";
import SearchActionTable from "@/shared/components/ui/table/search-action.table.tsx";
import { getTextColor } from "@/shared/components/ui";

interface Props {
    data: FinishedGoodsProfitMarginType[];
    loading: boolean;
}

const ProfitOverviewTab = ({ data, loading }: Props) => {
    const { searchControl, searchSubmit, handleSearch, filteredData } = useSearch({
        initialData: data,
        searchKeys: ["name", "sellingPrice", "totalCost", "status"],
    });

    const columns: GridColDef[] = useMemo(
        () => [
            {
                flex: 1,
                field: "name",
                headerName: "Good Name",
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
                field: "marginPercentage",
                headerName: "Margin %",
                type: "number",
                width: 150,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2" fontWeight="medium">
                            {params.value}%
                        </Typography>
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "totalCost",
                headerName: "Total Cost",
                type: "number",
                width: 150,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2" fontWeight="medium">
                            {formatCurrency(params.value)}
                        </Typography>
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "sellingPrice",
                headerName: "Selling Price",
                width: 200,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2" fontWeight="medium">
                            {formatCurrency(params.value)}
                        </Typography>
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "grossProfit",
                headerName: "Gross Profit",
                width: 200,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2" fontWeight="medium">
                            {formatCurrency(params.value)}
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
        ],
        [],
    );

    return (
        <Box>
            <SearchActionTable
                searchControl={searchControl}
                searchSubmit={searchSubmit}
                handleSearch={handleSearch}
                placeholder={"Search by menu item, selling price, total cost status..."}
            />
            <Grid size={12}>
                <DataGridTable
                    data={filteredData}
                    columns={columns}
                    loading={loading}
                    getRowId={() => Math.random().toString(36).substr(2, 9)}
                />
            </Grid>
        </Box>
    );
};

export default ProfitOverviewTab;
