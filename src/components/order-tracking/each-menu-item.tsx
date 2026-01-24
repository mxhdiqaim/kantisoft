import CustomCard from "@/components/customs/custom-card";
import type {MenuItemType} from "@/types/menu-item-type.ts";
import {formatCurrency} from "@/utils";
import {Box, Divider, Typography, useTheme} from "@mui/material";
import CustomButton from "@/components/ui/button.tsx";

interface Props {
    item: MenuItemType;
    onAddToCart: (item: MenuItemType) => void;
}

const EachMenuItem = ({item, onAddToCart}: Props) => {
    const theme = useTheme();
    const inventory = item.inventory;

    // Determine Colour based on status
    const getStockColor = () => {
        if (!inventory || inventory.status === "outOfStock") return theme.palette.error.main;
        if (inventory.status === "lowStock") return theme.palette.warning.main;

        return theme.palette.success.main;
    };

    const getStockText = () => {
        if (!inventory || inventory.quantity <= 0) return "Sold Out";
        if (inventory.status === "lowStock") return `Low Stock: ${inventory.quantity}`;

        return `In Stock: ${inventory.quantity}`;
    };

    return (
        <CustomCard sx={{
            borderTop: `4px solid ${getStockColor()}`, // Visual indicator bar
            opacity: (!inventory || inventory.status === "outOfStock") ? 0.7 : 1
        }}>
            <Box>
                <Typography variant="h6" noWrap>{item.name}</Typography>
                <Typography variant="body2" color="primary" fontWeight="bold">
                    {formatCurrency(item.price)}
                </Typography>

                <Typography variant="caption" sx={{color: getStockColor(), display: 'block', mb: 1}}>
                    {getStockText()}
                </Typography>

                <Divider sx={{mb: 1}}/>

                <CustomButton
                    fullWidth
                    title={(!inventory || inventory.status === "outOfStock") ? "Unavailable" : "Add to Cart"}
                    variant="contained"
                    size="small"
                    onClick={() => onAddToCart(item)}
                    disabled={!inventory || inventory.status === "outOfStock"}
                    color={inventory?.status === "lowStock" ? "warning" : "primary"}
                />
            </Box>
        </CustomCard>
    );
};

export default EachMenuItem;