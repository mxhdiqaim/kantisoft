import {Box, Grid, Typography} from "@mui/material";
import type {FinishedGoodsProfitMarginType} from "@/types/production-types.ts";
import DataGridTable from "@/components/ui/data-grid-table";
import type {GridColDef} from "@mui/x-data-grid";
import {useMemo} from "react";
import TableStyledBox from "@/components/ui/data-grid-table/table-styled-box.tsx";
import {formatCurrency, snakeCaseToTitleCase} from "@/utils";
import {useSearch} from "@/use-search.ts";
import TableSearchActions from "@/components/ui/data-grid-table/table-search-action.tsx";
import {getTextColor} from "@/components/ui";

interface Props {
    data: FinishedGoodsProfitMarginType[];
    loading: boolean;
}

const ProfitOverviewTab = ({data, loading}: Props) => {
    const {searchControl, searchSubmit, handleSearch, filteredData} = useSearch({
        initialData: data,
        searchKeys: ["name", "sellingPrice", "totalCost", "status"],
    });

    const columns: GridColDef[] = useMemo(() => [
        {
            flex: 1,
            field: 'name',
            headerName: 'Good Name',
            width: 200,
            align: "left",
            headerAlign: "left",
            cellClassName: "capitalize-cell",
            renderCell: (params) => (
                <TableStyledBox>
                    <Typography variant="body2">{params.value}</Typography>
                </TableStyledBox>
            ),
        },
        {
            flex: 1,
            field: 'marginPercentage',
            headerName: 'Margin %',
            type: "number",
            width: 150,
            align: "left",
            headerAlign: "left",
            renderCell: (params) => (
                <TableStyledBox>
                    <Typography variant="body2" fontWeight="medium">
                        {params.value}%
                    </Typography>
                </TableStyledBox>
            ),
        },
        {
            flex: 1,
            field: 'totalCost',
            headerName: 'Total Cost',
            type: "number",
            width: 150,
            align: "left",
            headerAlign: "left",
            renderCell: (params) => (
                <TableStyledBox>
                    <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(params.value)}
                    </Typography>
                </TableStyledBox>
            ),
        },
        {
            flex: 1,
            field: 'sellingPrice',
            headerName: 'Selling Price',
            width: 200,
            align: "left",
            headerAlign: "left",
            renderCell: (params) => (
                <TableStyledBox>
                    <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(params.value)}
                    </Typography>
                </TableStyledBox>
            ),
        },
        {
            flex: 1,
            field: 'grossProfit',
            headerName: 'Gross Profit',
            width: 200,
            align: "left",
            headerAlign: "left",
            renderCell: (params) => (
                <TableStyledBox>
                    <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(params.value)}
                    </Typography>
                </TableStyledBox>
            ),
        },
        {
            flex: 1,
            field: 'status',
            headerName: 'Status',
            width: 200,
            align: "left",
            headerAlign: "left",
            renderCell: (params) => (
                <TableStyledBox>
                    <Typography variant="body2" fontWeight="medium" color={getTextColor(params.value)}>
                        {snakeCaseToTitleCase(params.value)}
                    </Typography>
                </TableStyledBox>
            ),
        }
    ], []);

    return (
        <Box>
            <TableSearchActions
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