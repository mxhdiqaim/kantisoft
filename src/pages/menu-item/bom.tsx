import {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {
    Autocomplete,
    Box,
    Card,
    CircularProgress,
    Divider,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    useTheme
} from '@mui/material';
import {
    AddCircleOutline as AddIcon,
    ArrowBackIosNew as BackIcon,
    DeleteOutline as DeleteIcon,
    SaveOutlined as SaveIcon
} from '@mui/icons-material';
import {
    useDefineBOMMutation,
    useGetAllRawMaterialsQuery,
    useGetAllUnitOfMeasurementsQuery,
    useGetBOMQuery
} from '@/store/slice'; // Import from your new productionApi
import useNotifier from '@/hooks/useNotifier';
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";
import CustomButton from "@/components/ui/button.tsx";

interface BomRow {
    rawMaterialId: string;
    consumptionQuantityPresentation: number;
    unitOfMeasurementId: string;
}

const BillOfMaterialsScreen = () => {
    const {id: menuItemId} = useParams<{ id: string }>();
    const theme = useTheme();
    const navigate = useNavigate();
    const notify = useNotifier();

    // API Hooks
    const {data: bomData, isLoading: isLoadingBom} = useGetBOMQuery(menuItemId!);
    const memoizedBom = useMemoizedArray(bomData);

    const {data: rawMaterials} = useGetAllRawMaterialsQuery();
    const memoizedMaterial = useMemoizedArray(rawMaterials);

    const {data: unitData} = useGetAllUnitOfMeasurementsQuery();
    const memoizedMeasurements = useMemoizedArray(unitData);

    const [defineBom, {isLoading: isSaving}] = useDefineBOMMutation();

    // Local State for Form
    const [rows, setRows] = useState<BomRow[]>([]);

    // Initialize rows when existing BOM is loaded
    useEffect(() => {
        if (memoizedBom && Array.isArray(memoizedBom)) {
            const initialRows = memoizedBom.map(item => ({
                rawMaterialId: item.rawMaterialId,
                consumptionQuantityPresentation: item.consumptionQuantity,
                unitOfMeasurementId: item.unitOfMeasurement.id
            }));
            setRows(initialRows);
        } else if (!isLoadingBom && (!memoizedBom || memoizedBom.length === 0)) {
            // Add one empty row by default if no BOM exists
            handleAddRow();
        }
    }, [memoizedBom, isLoadingBom]);

    const handleAddRow = () => {
        setRows([...rows, {rawMaterialId: '', consumptionQuantityPresentation: 0, unitOfMeasurementId: ''}]);
    };

    const handleRemoveRow = (index: number) => {
        setRows(rows.filter((_, i) => i !== index));
    };

    const handleUpdateRow = (index: number, field: keyof BomRow, value: any) => {
        const newRows = [...rows];
        newRows[index] = {...newRows[index], [field]: value};
        setRows(newRows);
    };

    const handleSave = async () => {
        // Validation
        const isValid = rows.every(r => r.rawMaterialId && r.consumptionQuantityPresentation > 0 && r.unitOfMeasurementId);
        if (!isValid) {
            notify("Please ensure all rows have a material, quantity, and unit.", "warning");
            return;
        }

        try {
            await defineBom({menuItemId: menuItemId!, bomItems: rows}).unwrap();
            notify("Recipe updated successfully!", "success");
            navigate('/catalog/menu-items');
        } catch (error: any) {
            notify(error?.data?.message || "Failed to save recipe", "error");
        }
    };

    if (isLoadingBom) return <Box sx={{display: 'flex', justifyContent: 'center', p: 5}}><CircularProgress/></Box>;

    return (
        <Box>
            <CustomButton
                title={"Go Back"}
                startIcon={<BackIcon sx={{fontSize: 14}}/>}
                onClick={() => navigate(-1)}
                sx={{color: theme.palette.text.secondary, mb: 1}}
            />

            <Box sx={{my: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <Box>
                    <Typography variant="h4" color="primary">Manage Recipe</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Define the ingredients and quantities required for this item.
                    </Typography>
                </Box>
                <CustomButton
                    title={"Save Recipe"}
                    variant="contained"
                    startIcon={isSaving ? <CircularProgress size={20} color="inherit"/> : <SaveIcon/>}
                    onClick={handleSave}
                    disabled={isSaving}
                />
            </Box>

            <Card sx={{overflow: 'hidden', border: `1px solid ${theme.palette.customColors.border}`}}>
                <TableContainer>
                    <Table>
                        <TableHead sx={{backgroundColor: theme.palette.customColors.tableHeader}}>
                            <TableRow>
                                <TableCell sx={{width: '40%'}}>Raw Material</TableCell>
                                <TableCell sx={{width: '25%'}}>Quantity</TableCell>
                                <TableCell sx={{width: '25%'}}>Unit of Measure</TableCell>
                                <TableCell sx={{width: '10%', textAlign: 'center'}}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row, index) => (
                                <TableRow key={index} sx={{'&:hover': {backgroundColor: '#F9F9F9'}}}>
                                    {/* Material Selection */}
                                    <TableCell>
                                        <Autocomplete
                                            options={memoizedMaterial}
                                            getOptionLabel={(option) => option.name}
                                            value={memoizedMaterial.find(rm => rm.id === row.rawMaterialId) || null}
                                            onChange={(_, newValue) => handleUpdateRow(index, 'rawMaterialId', newValue?.id || '')}
                                            renderInput={(params) =>
                                                <TextField
                                                    {...params}
                                                    placeholder="Select Material"
                                                    size="small"
                                                />
                                            }
                                        />
                                    </TableCell>

                                    {/* Quantity Input */}
                                    <TableCell>
                                        <TextField
                                            type="number"
                                            fullWidth
                                            size="small"
                                            value={row.consumptionQuantityPresentation}
                                            onChange={(e) => handleUpdateRow(index, 'consumptionQuantityPresentation', parseFloat(e.target.value))}
                                            slotProps={{htmlInput: {min: 0, step: 0.1}}}
                                        />
                                    </TableCell>

                                    {/* Unit Selection */}
                                    <TableCell>
                                        <Autocomplete
                                            options={memoizedMeasurements}
                                            getOptionLabel={(option) => `${option.name} (${option.symbol})`}
                                            value={memoizedMeasurements.find(u => u.id === row.unitOfMeasurementId) || null}
                                            onChange={(_, newValue) => handleUpdateRow(index, 'unitOfMeasurementId', newValue?.id || '')}
                                            renderInput={(params) => <TextField {...params} placeholder="Select Unit"
                                                                                size="small"/>}
                                        />
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell sx={{textAlign: 'center'}}>
                                        <IconButton color="error" onClick={() => handleRemoveRow(index)}
                                                    disabled={rows.length === 1}>
                                            <DeleteIcon/>
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Divider/>

                <Box sx={{p: 2, display: 'flex', justifyContent: 'center'}}>
                    <CustomButton
                        title={"Add Ingredient"}
                        variant="outlined"
                        startIcon={<AddIcon/>}
                        onClick={handleAddRow}
                        sx={{borderRadius: 2}}
                    />
                </Box>
            </Card>
        </Box>
    );
};

export default BillOfMaterialsScreen;