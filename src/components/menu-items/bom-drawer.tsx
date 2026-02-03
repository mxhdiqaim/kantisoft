import {type FC, useEffect} from 'react';
import {
    Box,
    Card,
    CircularProgress,
    Divider,
    FormControl,
    IconButton,
    InputAdornment,
    MenuItem,
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
import useNotifier from '@/hooks/useNotifier.ts';
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";
import CustomButton from "@/components/ui/button.tsx";
import {defineBomSchema, type DefineBomSchemaType} from "@/types/bom-types.ts";
import {Controller, useFieldArray, useForm, useWatch} from "react-hook-form";
import {yupResolver} from "@hookform/resolvers/yup";
import {getApiError} from "@/helpers/get-api-error.ts";
import {StyledTextField} from "@/components/ui";
import {bigDrawerPaperProps} from "@/components/styles";
import DataDrawer from "@/components/ui/data-drawer.tsx";

import {AddCircleOutline as AddIcon, DeleteOutline as DeleteIcon, SaveOutlined as SaveIcon} from '@mui/icons-material';
import Icon from "@/components/ui/icon.tsx";
import ArrowDownIconSvg from "@/assets/icons/arrow-down.svg";

interface Props {
    open: boolean;
    onOpen: () => void;
    onClose: () => void;
    menuItemId: string;
}

const BillOfMaterialsDrawer: FC<Props> = ({open, onOpen, onClose, menuItemId}) => {
    const theme = useTheme();
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

    const watchedBomItems = useWatch({
        control,
        name: 'bomItems',
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
            onClose();
        } catch (error) {
            const defaultMessage = `Failed to save recipe. Please try again.`;
            const apiError = getApiError(error, defaultMessage);
            notify(apiError.message, "error");
        }
    };

    return (
        <DataDrawer
            title={"Recipe"}
            anchor={"right"}
            open={open}
            onOpen={onOpen}
            onClose={onClose}
            PaperProps={bigDrawerPaperProps}
        >
            {isLoadingBom ? (
                <Box sx={{display: 'flex', justifyContent: 'center', p: 5}}>
                    <CircularProgress/>
                </Box>
            ) : (
                <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                    <Box sx={{display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3}}>
                        <Typography variant="h4" component="h1">
                            Recipe
                        </Typography>
                        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1}}>
                            <CustomButton
                                title={"Cancel"}
                                onClick={onClose}
                                sx={{color: theme.palette.text.secondary, mr: 1}}
                            />

                            <CustomButton
                                type="submit"
                                title={"Save Recipe"}
                                variant="contained"
                                startIcon={isSaving ? <CircularProgress size={20} color="inherit"/> : <SaveIcon/>}
                                disabled={isSaving}
                            />
                        </Box>
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
                                    {fields.map((field, index) => {
                                        const selectedRawMaterialId = watchedBomItems?.[index]?.rawMaterialId;
                                        const selectedRawMaterial = memoizedMaterial.find(material => material.id === selectedRawMaterialId);
                                        const materialFamily = selectedRawMaterial?.unitOfMeasurement?.unitOfMeasurementFamily?.toLowerCase();

                                        const filteredUnits = materialFamily
                                            ? memoizedMeasurements.filter(unit => unit.unitOfMeasurementFamily?.toLowerCase() === materialFamily)
                                            : [];

                                        const selectedUnitId = watchedBomItems?.[index]?.unitOfMeasurementId;
                                        const selectedUnitSymbol = memoizedMeasurements.find(u => u.id === selectedUnitId)?.symbol || '';

                                        // const {filteredUnits, selectedUnitSymbol} = useUnitFilter({
                                        //     control,
                                        //     allUnits: memoizedMeasurements,
                                        //     selectedMaterialFamily: selectedRawMaterial?.unitOfMeasurement?.unitOfMeasurementFamily,
                                        // });

                                        return (
                                            <TableRow key={field.id} sx={{'&:hover': {backgroundColor: '#F9F9F9'}}}>
                                                <TableCell>
                                                    <Controller
                                                        name={`bomItems.${index}.rawMaterialId`}
                                                        control={control}
                                                        render={({field, fieldState}) => (
                                                            <FormControl fullWidth>
                                                                <StyledTextField
                                                                    {...field}
                                                                    select
                                                                    placeholder="Select Material"
                                                                    size="small"
                                                                    disabled={isLoadingRawMaterial}
                                                                    error={!!fieldState.error}
                                                                    helperText={fieldState.error?.message}
                                                                    SelectProps={{
                                                                        IconComponent: () => null,
                                                                        endAdornment: (
                                                                            <InputAdornment position="end">
                                                                                <Icon
                                                                                    src={ArrowDownIconSvg}
                                                                                    alt={"Dropdown Arrow"}
                                                                                    sx={{width: 15, height: 15}}
                                                                                />
                                                                            </InputAdornment>
                                                                        ),
                                                                    }}
                                                                >
                                                                    <MenuItem value={""} disabled>
                                                                        Select Material
                                                                    </MenuItem>
                                                                    {memoizedMaterial.map((material) => (
                                                                        <MenuItem key={material.id} value={material.id}
                                                                                  sx={{textTransform: "capitalize"}}>
                                                                            {material.name}
                                                                        </MenuItem>
                                                                    ))}
                                                                </StyledTextField>
                                                            </FormControl>
                                                        )}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Controller
                                                        name={`bomItems.${index}.consumptionQuantityPresentation`}
                                                        control={control}
                                                        render={({field, fieldState}) => (
                                                            <FormControl fullWidth>
                                                                <StyledTextField
                                                                    {...field}
                                                                    label={`Quantity`}
                                                                    type="number"
                                                                    size="small"
                                                                    disabled={isSaving}
                                                                    error={!!fieldState.error}
                                                                    helperText={fieldState.error?.message}
                                                                    InputProps={{
                                                                        endAdornment: selectedUnitSymbol && (
                                                                            <InputAdornment
                                                                                position="end">{selectedUnitSymbol}</InputAdornment>
                                                                        ),
                                                                    }}
                                                                />
                                                            </FormControl>
                                                        )}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Controller
                                                        name={`bomItems.${index}.unitOfMeasurementId`}
                                                        control={control}
                                                        render={({field, fieldState}) => (
                                                            <FormControl fullWidth>
                                                                <StyledTextField
                                                                    {...field}
                                                                    select
                                                                    placeholder="Select Unit"
                                                                    size="small"
                                                                    disabled={isSaving || isUnitLoading || !selectedRawMaterialId}
                                                                    error={!!fieldState.error}
                                                                    helperText={fieldState.error?.message}
                                                                >
                                                                    {filteredUnits.map((unit) => (
                                                                        <MenuItem key={unit.id} value={unit.id}>
                                                                            {unit.name} ({unit.symbol})
                                                                        </MenuItem>
                                                                    ))}
                                                                </StyledTextField>
                                                            </FormControl>
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
                                        )
                                    })}
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
            )}
        </DataDrawer>
    );
};

export default BillOfMaterialsDrawer;
