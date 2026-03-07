import {Grid, Typography, useTheme} from "@mui/material";
import CustomCard from "@/components/customs/custom-card.tsx";
import {formatCurrency} from "@/utils";
import {Cell, Pie, PieChart, ResponsiveContainer, Tooltip} from "recharts";
import DataGridTable from "@/components/ui/data-grid-table";
import {useMemo} from "react";
import type {GridColDef} from "@mui/x-data-grid";
import TableStyledBox from "@/components/ui/data-grid-table/table-styled-box.tsx";
import type {ProductionWastageSummaryType} from "@/types/production-types.ts";

interface Props {
    data: ProductionWastageSummaryType[];
    loading: boolean;
}

const WastageAnalysisTab = ({data, loading}: Props) => {
    const theme = useTheme();
    const COLORS = [theme.palette.error.main, theme.palette.warning.main, theme.palette.info.main, theme.palette.primary.main];

    const columns: GridColDef[] = useMemo(() => [
        {
            flex: 1,
            field: 'reason',
            headerName: 'Reason',
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
            field: 'totalLost',
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
            field: 'financialLoss',
            headerName: 'Value Lost',
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
        }
    ], []);

    return (
        <Grid container spacing={3}>
            {/* Financial Impact Card */}
            <Grid size={{xs: 12, md: 4}}>
                <CustomCard sx={{textAlign: 'center', height: '100%'}}>
                    <Typography variant="h6" color="text.secondary">Total Loss (Period)</Typography>
                    <Typography variant="h3" color="error" sx={{my: 2}}>
                        {formatCurrency(data?.reduce((acc, curr) => acc + curr.financialLoss, 0) || 0)}
                    </Typography>
                    <Typography variant="body2">
                        This is the direct cost of ingredients thrown away.
                    </Typography>
                </CustomCard>
            </Grid>

            {/* Pie Chart: Waste by Reason */}
            <Grid size={{xs: 12, md: 8}}>
                <CustomCard sx={{height: 400}}>
                    <Typography variant="h6" gutterBottom>Waste by Reason</Typography>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="financialLoss"
                                nameKey="reason"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label
                            >
                                {data?.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(Number(value))}/>
                        </PieChart>
                    </ResponsiveContainer>
                </CustomCard>
            </Grid>

            {/* Top Wasted Items Table */}
            <Grid size={12}>
                <DataGridTable
                    data={data}
                    columns={columns}
                    loading={loading}
                    getRowId={() => Math.random().toString(36).substr(2, 9)}
                />
            </Grid>
        </Grid>
    );
};

export default WastageAnalysisTab;
