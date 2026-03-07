import {useLiveQuery} from "dexie-react-hooks";
import {localDb} from "@/db/local-db";
import {useGetMenuItemsQuery} from "@/store/slice";
import {useAppSelector} from "@/store";
import {selectCurrentUser} from "@/store/slice/auth-slice.ts";
import type {QueryParamType} from "@/types";

export const useOfflineMenuItems = (params: QueryParamType) => {
    const currentUser = useAppSelector(selectCurrentUser);
    // Trigger the RTK query to fetch/update data in the background
    const {isLoading, isError, error} = useGetMenuItemsQuery(params);

    // Read from Dexie for the actual UI display
    // This will update instantly when Dexie changes (optimistic updates)
    const items = useLiveQuery(() =>
            localDb.menuItems
                .where('storeId')
                .equals(currentUser.storeId || "")
                .toArray()
        , [currentUser.storeId]);

    return {
        items,
        isLoading: isLoading && (!items || items.length === 0), // Only show loader if we have nothing locally
        isError,
        error
    };
};