import {useLiveQuery} from "dexie-react-hooks";
import {localDb} from "@/db/local-db";
import {useGetAllCategoriesQuery} from "@/store/slice";
import {useAppSelector} from "@/store";
import {selectCurrentUser} from "@/store/slice/auth-slice.ts";

export const useOfflineCategories = () => {
    const currentUser = useAppSelector(selectCurrentUser);
    // Trigger the RTK query to fetch/update data in the background
    const {isLoading, isError, error, isFetching} = useGetAllCategoriesQuery();

    // Read from Dexie for the actual UI display
    // This will update instantly when Dexie changes (optimistic updates)
    const items = useLiveQuery(() =>
            localDb.categories
                .where('storeId')
                .equals(currentUser.storeId || "")
                .toArray()
        , [currentUser.storeId]);

    return {
        data: items,
        isLoading: isLoading && (!items || items.length === 0), // Only show loader if we have nothing locally
        isFetching,
        isError,
        error
    };
};