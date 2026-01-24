import {Box, Grid, Typography, useTheme} from '@mui/material';
import {formatCurrency} from "@/utils";
import {useMemo} from "react";
import type {GridColDef} from "@mui/x-data-grid";
import {useGetProductionWastageSummaryQuery} from "@/store/slice";
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";
import CustomCard from "@/components/customs/custom-card.tsx";

const WastageAnalysisScreen = () => {
    const theme = useTheme();
    const {data, isLoading} = useGetProductionWastageSummaryQuery();

    console.log({data})

    const wasteData = useMemoizedArray(data);

    console.log({wasteData})

    // Prepare data for the Pie Chart (Reason Breakdown)
    const COLORS = [theme.palette.error.main, theme.palette.warning.main, theme.palette.info.main, theme.palette.primary.main];

    const columns: GridColDef[] = useMemo(() => [
        {field: 'reason', headerName: 'Reason', flex: 1},
        {field: 'totalLost', headerName: 'Qty Lost', width: 150},
        {
            field: 'financialLoss',
            headerName: 'Value Lost',
            width: 150,
            renderCell: (params) => formatCurrency(params.value)
        }
    ], [])

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Wastage Analysis</Typography>

            <Grid container spacing={3}>
                {/* Financial Impact Card */}
                <Grid size={{xs: 12, md: 4}}>
                    <CustomCard sx={{p: 3, textAlign: 'center', height: '100%'}}>
                        <Typography variant="h6" color="text.secondary">Total Loss (Period)</Typography>
                        <Typography variant="h3" color="error" sx={{my: 2}}>
                            {formatCurrency(wasteData?.reduce((acc, curr) => acc + curr.financialLoss, 0) || 0)}
                        </Typography>
                        <Typography variant="body2">
                            This is the direct cost of ingredients thrown away.
                        </Typography>
                    </CustomCard>
                </Grid>

                {/* 2. Pie Chart: Waste by Reason */}
                {/*<Grid size={{ xs: 12, md: 8}}>*/}
                {/*    <Card sx={{ p: 3, height: 400 }}>*/}
                {/*        <Typography variant="h6" gutterBottom>Waste by Reason</Typography>*/}
                {/*        <ResponsiveContainer width="100%" height="100%">*/}
                {/*            <PieChart>*/}
                {/*                <Pie*/}
                {/*                    data={wasteData}*/}
                {/*                    dataKey="financialLoss"*/}
                {/*                    nameKey="reason"*/}
                {/*                    cx="50%"*/}
                {/*                    cy="50%"*/}
                {/*                    outerRadius={100}*/}
                {/*                    label*/}
                {/*                >*/}
                {/*                    {wasteData?.map((entry, index) => (*/}
                {/*                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />*/}
                {/*                    ))}*/}
                {/*                </Pie>*/}
                {/*                <Tooltip formatter={(value) => formatCurrency(value)} />*/}
                {/*            </PieChart>*/}
                {/*        </ResponsiveContainer>*/}
                {/*    </Card>*/}
                {/*</Grid>*/}

                {/* 3. Top Wasted Items Table */}
                {/*<Grid size={12}>*/}
                {/*    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Highest Loss Ingredients</Typography>*/}
                {/*    <DataGridTable rows={wasteData} columns={columns} loading={isLoading} />*/}
                {/*</Grid>*/}
            </Grid>
        </Box>
    );
};

export default WastageAnalysisScreen;