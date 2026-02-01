import {useEffect} from 'react';
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
    Typography,
    useTheme
} from '@mui/material';
import {
    useDefineBOMMutation,
    useGetAllRawMaterialsQuery,
    useGetAllUnitOfMeasurementsQuery,
    useGetBOMQuery
} from '@/store/slice';
import useNotifier from '@/hooks/useNotifier';
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";
import CustomButton from "@/components/ui/button.tsx";
import {defineBomSchema, type DefineBomSchemaType} from "@/types/bom-types.ts";
import {Controller, useFieldArray, useForm} from "react-hook-form";
import {yupResolver} from "@hookform/resolvers/yup";
import {getApiError} from "@/helpers/get-api-error.ts";
import {StyledTextField} from "@/components/ui";

import {
    AddCircleOutline as AddIcon,
    ArrowBackIosNew as BackIcon,
    DeleteOutline as DeleteIcon,
    SaveOutlined as SaveIcon
} from '@mui/icons-material';

const BillOfMaterialsScreen = () => {
    const {id: menuItemId} = useParams<{ id: string }>();
    const theme = useTheme();
    const navigate = useNavigate();
    const notify = useNotifier();

    const {data: bomData, isLoading: isLoadingBom} = useGetBOMQuery(menuItemId!, {skip: !menuItemId});
    const memoizedBom = useMemoizedArray(bomData);

    const {data: rawMaterials, isLoading: isLoadingRawMaterial} = useGetAllRawMaterialsQuery();
    const memoizedMaterial = useMemoizedArray(rawMaterials);

    const {data: unitData, isLoading: isUnitLoading} = useGetAllUnitOfMeasurementsQuery();
    const memoizedMeasurements = useMemoizedArray(unitData);

    const [defineBom, {isLoading: isSaving}] = useDefineBOMMutation();

    const {
        control,
        handleSubmit,
        reset,
        formState: {errors},
    } = useForm({
        defaultValues: {
            bomItems: [{rawMaterialId: '', consumptionQuantityPresentation: 0, unitOfMeasurementId: ''}]
        },

        resolver: yupResolver(defineBomSchema),
    });

    const {fields, append, remove} = useFieldArray({
        control,
        name: "bomItems",
    });

    useEffect(() => {
        if (memoizedBom && memoizedBom.length > 0) {
            reset({
                bomItems: memoizedBom.map(item => ({
                    rawMaterialId: item.rawMaterialId,
                    consumptionQuantityPresentation: item.consumptionQuantity,
                    unitOfMeasurementId: item.unitOfMeasurement.id
                }))
            });
        }
    }, [memoizedBom, reset]);


    const onSubmit = async (data: DefineBomSchemaType) => {
        if (!menuItemId) return;

        try {
            await defineBom({menuItemId: menuItemId!, bomItems: data.bomItems}).unwrap();
            notify("Recipe updated successfully!", "success");
            navigate('/products/menu-items');
        } catch (error) {
            const defaultMessage = `Failed to save recipe. Please try again.`;
            const apiError = getApiError(error, defaultMessage);
            notify(apiError.message, "error");
        }
    };

    if (isLoadingBom) {
        return <Box sx={{display: 'flex', justifyContent: 'center', p: 5}}><CircularProgress/></Box>;
    }

    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1}}>
                <CustomButton
                    title={"Go Back"}
                    startIcon={<BackIcon sx={{fontSize: 14}}/>}
                    onClick={() => navigate(-1)}
                    sx={{color: theme.palette.text.secondary, mb: 1}}
                />

                <CustomButton
                    type="submit"
                    title={"Save Recipe"}
                    variant="contained"
                    startIcon={isSaving ? <CircularProgress size={20} color="inherit"/> : <SaveIcon/>}
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
                            {fields.map((field, index) => (
                                <TableRow key={field.id} sx={{'&:hover': {backgroundColor: '#F9F9F9'}}}>
                                    <TableCell>
                                        <Controller
                                            name={`bomItems.${index}.rawMaterialId`}
                                            control={control}
                                            render={({field: controllerField, fieldState}) => (
                                                <Autocomplete
                                                    {...controllerField}
                                                    options={memoizedMaterial}
                                                    loading={isLoadingRawMaterial}
                                                    getOptionLabel={(option) => option.name}
                                                    value={memoizedMaterial.find(rm => rm.id === controllerField.value) || null}
                                                    onChange={(_, newValue) => controllerField.onChange(newValue?.id || '')}
                                                    renderInput={(params) =>
                                                        <StyledTextField
                                                            {...params}
                                                            placeholder="Select Material"
                                                            size="small"
                                                            disabled={isSaving}
                                                            error={!!fieldState.error}
                                                            helperText={fieldState.error?.message}
                                                        />
                                                    }
                                                />
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Controller
                                            name={`bomItems.${index}.consumptionQuantityPresentation`}
                                            control={control}
                                            render={({field: controllerField, fieldState}) => (
                                                <StyledTextField
                                                    {...controllerField}
                                                    type="number"
                                                    fullWidth
                                                    size="small"
                                                    disabled={isSaving}
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message}
                                                    onChange={(e) => controllerField.onChange(parseFloat(e.target.value))}
                                                    slotProps={{htmlInput: {min: 0, step: 0.1}}}
                                                />
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Controller
                                            name={`bomItems.${index}.unitOfMeasurementId`}
                                            control={control}
                                            render={({field: controllerField, fieldState}) => (
                                                <Autocomplete
                                                    {...controllerField}
                                                    options={memoizedMeasurements}
                                                    loading={isUnitLoading}
                                                    getOptionLabel={(option) => `${option.name} (${option.symbol})`}
                                                    value={memoizedMeasurements.find(u => u.id === controllerField.value) || null}
                                                    onChange={(_, newValue) => controllerField.onChange(newValue?.id || '')}
                                                    renderInput={(params) =>
                                                        <StyledTextField
                                                            {...params}
                                                            placeholder="Select Unit"
                                                            size="small"
                                                            disabled={isSaving}
                                                            error={!!fieldState.error}
                                                            helperText={fieldState.error?.message}
                                                        />
                                                    }
                                                />
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell sx={{textAlign: 'center'}}>
                                        <IconButton
                                            color="error"
                                            onClick={() => remove(index)}
                                            disabled={fields.length === 1 || isSaving}
                                        >
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
                        onClick={() => append({
                            rawMaterialId: '',
                            consumptionQuantityPresentation: 0,
                            unitOfMeasurementId: ''
                        })}
                        sx={{borderRadius: 2}}
                        disabled={isSaving}
                    />
                </Box>
            </Card>
            {errors.bomItems?.message && (
                <Typography color="error" sx={{mt: 2, textAlign: 'center'}}>
                    {errors.bomItems.message}
                </Typography>
            )}
        </Box>
    );
};

export default BillOfMaterialsScreen;
