import Receipt from "@/components/point-of-sale/receipt.tsx";
import ViewSalesHistoryLoading from "@/components/sales-history/spinners/view-sales-history-loading.tsx";
import {useGetAllStoresQuery, useGetOrderByIdQuery} from "@/store/slice";
import {selectActiveStore, setActiveStore} from "@/store/slice/store-slice.ts";
import {Box} from "@mui/material";
import {useEffect, useRef} from "react";
import {useDispatch, useSelector} from "react-redux";
import {useNavigate, useParams} from "react-router-dom";
import CustomButton from "@/components/ui/button.tsx";
import {getApiError} from "@/helpers/get-api-error.ts";
import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import useNotifier from "@/hooks/useNotifier.ts";
import {useTranslation} from "react-i18next";

import {ArrowBackIosNewOutlined, LocalPrintshopOutlined} from "@mui/icons-material";
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";

const ViewSalesHistory = () => {
    const {t} = useTranslation();
    const notify = useNotifier();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const {id} = useParams();
    const activeStore = useSelector(selectActiveStore);

    const printRef = useRef<HTMLDivElement>(null);

    const {
        data: order,
        isLoading: isOrdersLoading,
        isError,
        error,
    } = useGetOrderByIdQuery(id!, {
        skip: !id,
    });

    const {data: stores, isLoading: isLoadingStores} = useGetAllStoresQuery();
    const memoizedStores = useMemoizedArray(stores);


    const loading = isOrdersLoading || isLoadingStores;

    const handlePrint = () => {
        window.print();
    };

    useEffect(() => {
        if (!activeStore && memoizedStores && memoizedStores.length > 0) {
            dispatch(setActiveStore(memoizedStores[0]));
        }
    }, [activeStore, memoizedStores, dispatch]);

    if (loading) return <ViewSalesHistoryLoading/>;

    if (isError) {
        notify(`Failed to load ${t("history")}.`, "error");
        const apiError = getApiError(error, `Failed to load ${t("history")}.`);

        return <ApiErrorDisplay statusCode={apiError.type} message={apiError.message}/>;
    }

    return (
        <Box>
            {/* --- Action Buttons --- */}
            <Box className="no-print" sx={{mb: 3, display: "flex", gap: 1}}>
                <CustomButton
                    title={"Go Back"}
                    variant="outlined"
                    size="small"
                    onClick={() => navigate(-1)}
                    startIcon={<ArrowBackIosNewOutlined fontSize="small" sx={{height: 16, mr: 0.5}}/>}
                />
                <CustomButton
                    title={"Print Receipt"}
                    variant="contained"
                    size="small"
                    onClick={handlePrint}
                    startIcon={<LocalPrintshopOutlined fontSize="small" sx={{height: 16, mr: 0.5}}/>}/>
            </Box>

            {/* --- Printable Receipt Area --- */}
            <Receipt order={order} storeData={activeStore} ref={printRef}/>
        </Box>
    );
};

export default ViewSalesHistory;
