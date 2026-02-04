import {useCreateMenuItemMutation} from "@/store/slice";
import {useEffect} from "react";
import {localDb} from "@/db/local-db.ts";
import {localSyncStatusEnum} from "@/types";
import type {CreateMenuItemType} from "@/types/menu-item-type.ts";

export const SyncProvider = ({children}: { children: React.ReactNode }) => {
    const [createMenuItem] = useCreateMenuItemMutation();

    useEffect(() => {
        const handleSync = async () => {
            // Only proceed if online
            if (!navigator.onLine) return;

            const pendingItems = await localDb.menuItems
                .where('syncStatus')
                .equals(localSyncStatusEnum.PENDING)
                .toArray();

            for (const item of pendingItems) {
                try {
                    // Extract only the fields the API expects
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const {syncStatus, id, store, inventory, storeId, ...validApiData} = item;

                    // Attempt to create on server
                    await createMenuItem(validApiData as CreateMenuItemType).unwrap();

                    // Success: Clean up local DB
                    // Note: Since the backend might generate a new ID/SKU,
                    // your mutation's onQueryStarted handles the ID swap.
                    // Here we just mark the current record as synced if it wasn't swapped.
                    await localDb.menuItems.update(item.id, {
                        syncStatus: localSyncStatusEnum.SYNCED
                    });

                } catch (error) {
                    // Check if it's a permanent validation error (400-409)
                    // or a temporary network/server error (500 or 0)
                    const status = error?.status;

                    if (status >= 400 && status < 500) {
                        console.error(`Validation error for ${item.name}:`, error);
                        // Stop trying to sync this item until the user modifies it
                        await localDb.menuItems.update(item.id, {
                            syncStatus: localSyncStatusEnum.ERROR
                        });
                    } else {
                        // It's a network error or server 500.
                        // Do nothing. Leave as PENDING to retry next time.
                        console.warn(`Temporary sync failure for ${item.name}. Will retry later.`);
                        break; // Stop the loop to prevent spamming a down server
                    }
                }
            }
        };

        window.addEventListener('online', handleSync);
        handleSync();
        return () => window.removeEventListener('online', handleSync);
    }, [createMenuItem]);

    return <>{children}</>;
};