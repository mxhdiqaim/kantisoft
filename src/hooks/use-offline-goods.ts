import {useLiveQuery} from "dexie-react-hooks";
import {localDb} from "@/db/local-db";
import {useGetAllInventoryQuery} from "@/store/slice";
import {useAppSelector} from "@/store";
import {selectCurrentUser} from "@/store/slice/auth-slice.ts";

export const useOfflineGoods = () => {
    const currentUser = useAppSelector(selectCurrentUser);
    // Background sync: Trigger RTK Query
    const {isLoading, isError, error} = useGetAllInventoryQuery();

    // Local Source of Truth: Read from Dexie
    const items = useLiveQuery(() =>
            localDb.inventory
                // .where('storeId')
                // .equals(currentUser.storeId || "")
                .toArray()
        , [currentUser.storeId]);

    return {
        data: items,
        isLoading: isLoading && (!items || items.length === 0),
        isError,
        error
    };
};