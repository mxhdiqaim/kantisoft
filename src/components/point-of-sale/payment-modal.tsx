import CustomModal from "@/components/customs/custom-modal";
import {selectCurrentUser} from "@/store/slice/auth-slice";
import {selectActiveStore} from "@/store/slice/store-slice";
import type {CartItem} from "@/types/cart-item-type";
import {createOrderSchema, type CreateOrderType, OrderPaymentMethod, OrderStatus} from "@/types/order-types.ts";
import {formatCurrency} from "@/utils";
import {yupResolver} from "@hookform/resolvers/yup";
import {DialogActions, FormControl, FormControlLabel, FormHelperText, Radio, RadioGroup,} from "@mui/material";
import {useEffect} from "react";
import {Controller, useForm} from "react-hook-form";
import {useSelector} from "react-redux";
import CustomButton from "@/components/ui/button.tsx";

interface Props {
    open: boolean;
    onClose: () => void;
    onCompleteSale: (data: Omit<CreateOrderType, "amountReceived">) => void;
    cartItems: CartItem[];
    isLoading?: boolean;
}

const PaymentModal = ({open, onClose, onCompleteSale, cartItems, isLoading}: Props) => {
    const seller = useSelector(selectCurrentUser);
    const activeStore = useSelector(selectActiveStore);

    const total = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

    const {
        control,
        handleSubmit,
        reset,
        formState: {errors, isValid},
    } = useForm<CreateOrderType>({
        mode: "onChange",
        defaultValues: {
            sellerId: seller?.id || "",
            storeId: activeStore?.id || "",
            paymentMethod: OrderPaymentMethod.CASH,
            orderStatus: OrderStatus.PENDING,
            items: [],
            amountReceived: 0,
        },

        resolver: yupResolver(createOrderSchema),
    });

    const onSubmit = (data: CreateOrderType) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {amountReceived, ...orderData} = data;
        onCompleteSale(orderData);
    };

    useEffect(() => {
        if (open) {
            const items = cartItems.map((item) => ({
                menuItemId: item.id,
                quantity: item.quantity,
            }));

            reset({
                sellerId: seller?.id || "",
                storeId: activeStore?.id || "",
                paymentMethod: "cash",
                orderStatus: "completed",
                items: items,
                amountReceived: 0,
            });
        }
    }, [open, cartItems, seller?.id, activeStore?.id, reset]);

    // useEffect(() => {
    //     if (paymentMethod === "cash") {
    //         if (amountReceived < total) {
    //             // If cash is not enough, manually set an error
    //             setError("amountReceived", {
    //                 type: "manual",
    //                 message: "Amount received must be at least the total.",
    //             });
    //         } else {
    //             // If cash is enough, clear the error
    //             clearErrors("amountReceived");
    //         }
    //     } else {
    //         // For other payment methods, ensure the error is cleared
    //         clearErrors("amountReceived");
    //     }
    // }, [amountReceived, paymentMethod, total, setError, clearErrors]);
    //
    // useEffect(() => {
    //     if (paymentMethod !== "cash") {
    //         // If payment is not cash, set the amountReceived to the total
    //         setValue("amountReceived", total, {shouldValidate: true});
    //     } else {
    //         // If switching back to cash, reset the amountReceived
    //         setValue("amountReceived", 0, {shouldValidate: true});
    //     }
    // }, [paymentMethod, total, setValue]);

    return (
        <CustomModal
            open={open}
            onClose={onClose}
            title={"Payment"}
            description={`Total Amount: ${formatCurrency(total)}`}
        >
            <form onSubmit={handleSubmit(onSubmit)}>
                <FormControl component="fieldset" error={!!errors.paymentMethod}>
                    <Controller
                        name="paymentMethod"
                        control={control}
                        render={({field}) => (
                            <RadioGroup {...field} row>
                                <FormControlLabel value="cash" control={<Radio/>} label="Cash"/>
                                <FormControlLabel value="card" control={<Radio/>} label="Card"/>
                                <FormControlLabel value="transfer" control={<Radio/>} label="Transfer"/>
                            </RadioGroup>
                        )}
                    />
                    {errors.paymentMethod && <FormHelperText>{errors.paymentMethod.message}</FormHelperText>}
                    {/*{paymentMethod === "cash" && (*/}
                    {/*    <>*/}
                    {/*        <Controller*/}
                    {/*            name="amountReceived"*/}
                    {/*            control={control}*/}
                    {/*            render={({ field }) => (*/}
                    {/*                <TextField*/}
                    {/*                    {...field}*/}
                    {/*                    label="Amount Received"*/}
                    {/*                    type="number"*/}
                    {/*                    fullWidth*/}
                    {/*                    margin="normal"*/}
                    {/*                    error={!!errors.amountReceived}*/}
                    {/*                    helperText={errors.amountReceived?.message}*/}
                    {/*                />*/}
                    {/*            )}*/}
                    {/*        />*/}
                    {/*        <Typography sx={{ mt: 1 }}>*/}
                    {/*            Change: {formatCurrency(change)}*/}
                    {/*        </Typography>*/}
                    {/*    </>*/}
                    {/*)}*/}
                </FormControl>
                <DialogActions sx={{mt: 2, px: 0}}>
                    <CustomButton title={"Cancel"} onClick={onClose}/>
                    <CustomButton
                        title={isLoading ? "Processing..." : "Complete Order"}
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={!isValid || /* isCashPaymentInsufficient || */ isLoading}
                    />
                </DialogActions>
            </form>
        </CustomModal>
    );
};

export default PaymentModal;
