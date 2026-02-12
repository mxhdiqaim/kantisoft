import EachMenuItem from "@/components/point-of-sale/each-menu-item.tsx";
import MenuIteFormModal from "@/components/menu-items/menu-item-form-modal.tsx";
import OrderCart from "@/components/point-of-sale/order-cart";
import PaymentModal from "@/components/point-of-sale/payment-modal";
import MenuItemSkeleton from "@/components/spinners/manu-item-skeleton";
import {getApiError} from "@/helpers/get-api-error";
import useNotifier from "@/hooks/useNotifier";
import {useCreateOrderMutation, useGetMenuItemsQuery} from "@/store/slice";
import type {CartItem} from "@/types/cart-item-type";
import type {MenuItemType} from "@/types/menu-item-type";
import type {CreateOrderType} from "@/types/order-types";
import {Box, Grid, Typography} from "@mui/material";
import {useState} from "react";
import {useTranslation} from "react-i18next";
import TableSearchActions from "@/components/ui/data-grid-table/table-search-action.tsx";
import {useSearch} from "@/use-search.ts";
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";

const PointOfSale = () => {
    const notify = useNotifier();
    const {t} = useTranslation();

    const {data: menuItems, isLoading: isLoadingMenuItems, isError} = useGetMenuItemsQuery({});
    const memoizedMenuItems = useMemoizedArray(menuItems);

    const {searchControl, searchSubmit, handleSearch, filteredData} = useSearch({
        initialData: memoizedMenuItems,
        searchKeys: ["name", "itemCode", "price"],
    });

    const [createOrder, {isLoading: isCreatingOrder}] = useCreateOrderMutation();

    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [addMenuItemOpen, setAddMenuItemOpen] = useState(false);

    const handleAddToCart = (item: MenuItemType) => {
        setCartItems((prev) => {
            const existingItem = prev.find((cartItem) => cartItem.id === item.id);
            if (existingItem) {
                return prev.map((cartItem) =>
                    cartItem.id === item.id ? {...cartItem, quantity: cartItem.quantity + 1} : cartItem,
                );
            }
            return [...prev, {...item, quantity: 1}];
        });
    };

    const handleUpdateQuantity = (itemId: string, quantity: number) => {
        if (quantity === 0) {
            handleRemoveItem(itemId);
        } else {
            setCartItems((prev) => prev.map((item) => (item.id === itemId ? {...item, quantity} : item)));
        }
    };

    const handleRemoveItem = (itemId: string) => {
        setCartItems((prev) => prev.filter((item) => item.id !== itemId));
    };

    const handleOpenPaymentDialog = () => {
        if (cartItems.length === 0) {
            notify("Please add items to the cart first.", "warning");
            return;
        }
        setPaymentDialogOpen(true);
    };

    const handleClosePaymentDialog = () => {
        setPaymentDialogOpen(false);
    };

    const handleCompleteSale = async (orderData: Omit<CreateOrderType, "amountReceived">) => {
        try {
            await createOrder(orderData).unwrap();
            notify("Order completed successfully!", "success");
            setCartItems([]);
            setPaymentDialogOpen(false);
        } catch (error) {
            console.log(error);
            const defaultMessage = "Failed to complete order.";
            const apiError = getApiError(error, defaultMessage);
            notify(apiError.message, "error");
        }
    };

    if (isError) {
        return <Typography color="error">Failed to load menu items. Please try again later.</Typography>;
    }

    return (
        <Box>
            <Grid container spacing={3} mb={2}>
                <Grid size={{xs: 12, md: 8}}>
                    <Grid size={{xs: 12}}>
                        <TableSearchActions
                            searchControl={searchControl}
                            searchSubmit={searchSubmit}
                            handleSearch={handleSearch}
                            placeholder={`Search ${t("menuItem")} by name, price or item code`}
                            loading={isLoadingMenuItems}
                        />
                    </Grid>
                    {isLoadingMenuItems ? (
                        <Grid container spacing={2}>
                            {Array.from(new Array(9)).map((_, index) => (
                                <Grid size={{xs: 12, sm: 6, md: 4}} key={index}>
                                    <MenuItemSkeleton/>
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Grid container spacing={2} mt={2}>
                            {filteredData.length > 0 ? (
                                filteredData.map((item) => (
                                    <Grid size={{xs: 12, sm: 6, md: 4}} key={item.id}>
                                        <EachMenuItem item={item} cartItems={cartItems} onAddToCart={handleAddToCart}/>
                                    </Grid>
                                ))
                            ) : (
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        height: "60vh",
                                        width: "100%",
                                    }}
                                >
                                    <Typography variant={"h4"}>
                                        No {t("item")} found, Please add {t("item")}
                                    </Typography>
                                </Box>
                            )}
                        </Grid>
                    )}
                </Grid>
                <Grid size={{xs: 12, md: 4}}>
                    <OrderCart
                        cartItems={cartItems}
                        onRemoveItem={handleRemoveItem}
                        onUpdateQuantity={handleUpdateQuantity}
                        onOpenPaymentDialog={handleOpenPaymentDialog}
                    />
                </Grid>
            </Grid>
            <PaymentModal
                open={paymentDialogOpen}
                onClose={handleClosePaymentDialog}
                onCompleteSale={handleCompleteSale}
                cartItems={cartItems}
                isLoading={isCreatingOrder}
            />
            <MenuIteFormModal open={addMenuItemOpen} onClose={() => setAddMenuItemOpen(false)}/>
        </Box>
    );
};

export default PointOfSale;
