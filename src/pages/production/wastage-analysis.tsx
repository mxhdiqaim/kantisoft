import {Box, Grid, Typography, useTheme} from '@mui/material';
import {formatCurrency} from "@/utils";
import {useMemo} from "react";
import type {GridColDef} from "@mui/x-data-grid";
import {useGetProductionWastageSummaryQuery} from "@/store/slice";
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";
import CustomCard from "@/components/customs/custom-card.tsx";
import DataGridTable from "@/components/ui/data-grid-table";
import TableStyledBox from "@/components/ui/data-grid-table/table-styled-box.tsx";
import {Cell, Pie, PieChart, ResponsiveContainer, Tooltip} from "recharts";

const ProfitabilityWastageScreen = () => {
    const theme = useTheme();
    const {data, isLoading} = useGetProductionWastageSummaryQuery();

    const wasteData = useMemoizedArray(data);

    console.log(wasteData)

    // Prepare data for the Pie Chart (Reason Breakdown)
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
            headerName: 'Qty Lost',
            type: "number",
            width: 150,
            align: "left",
            headerAlign: "left",
            renderCell: (params) => (
                <TableStyledBox>
                    <Typography variant="body2" fontWeight="medium">
                        {params.value}
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
    ], [])

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Wastage Analysis</Typography>

            <Grid container spacing={3}>
                {/* Financial Impact Card */}
                <Grid size={{xs: 12, md: 4}}>
                    <CustomCard sx={{textAlign: 'center', height: '100%'}}>
                        <Typography variant="h6" color="text.secondary">Total Loss (Period)</Typography>
                        <Typography variant="h3" color="error" sx={{my: 2}}>
                            {formatCurrency(wasteData?.reduce((acc, curr) => acc + curr.financialLoss, 0) || 0)}
                        </Typography>
                        <Typography variant="body2">
                            This is the direct cost of ingredients thrown away.
                        </Typography>
                    </CustomCard>
                </Grid>

                {/*2. Pie Chart: Waste by Reason */}
                <Grid size={{xs: 12, md: 8}}>
                    <CustomCard sx={{height: 400}}>
                        <Typography variant="h6" gutterBottom>Waste by Reason</Typography>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={wasteData}
                                    dataKey="financialLoss"
                                    nameKey="reason"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label
                                >
                                    {wasteData?.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(Number(value))}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </CustomCard>
                </Grid>

                {/*3. Top Wasted Items Table */}
                <Grid size={12}>
                    <Typography variant="h6" sx={{mt: 2, mb: 1}}>Highest Loss Ingredients</Typography>
                    <DataGridTable
                        data={wasteData}
                        columns={columns}
                        loading={isLoading}
                        getRowId={() => Math.random().toString(36).substr(2, 9)}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};

export default ProfitabilityWastageScreen;