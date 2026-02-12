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
    const currentUser = useSelector(selectCurrentUser);
    const activeStore = useSelector(selectActiveStore);

    const total = cartItems.reduce((acc, item) => acc + Number(item.price) * item.quantity, 0);

    const {
        control,
        handleSubmit,
        reset,
        formState: {errors, isValid},
    } = useForm({
        mode: "onChange",
        defaultValues: {
            // sellerId: currentUser?.id || "",
            // storeId: activeStore?.id || "",
            // paymentMethod: OrderPaymentMethod.CASH,
            // orderStatus: OrderStatus.PENDING,
            // items: [],
            // amountReceived: 0,
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
                sellerId: currentUser?.id || "",
                storeId: activeStore?.id || "",
                paymentMethod: OrderPaymentMethod.CASH,
                orderStatus: OrderStatus.PENDING,
                items: items,
                amountReceived: 0,
            });
        }
    }, [open, cartItems, currentUser?.id, activeStore?.id, reset]);

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
                </FormControl>
                <DialogActions sx={{mt: 2, px: 0}}>
                    <CustomButton title={"Cancel"} onClick={onClose}/>
                    <CustomButton
                        title={isLoading ? "Processing..." : "Complete Order"}
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={!isValid || isLoading}
                    />
                </DialogActions>
            </form>
        </CustomModal>
    );
};

export default PaymentModal;
