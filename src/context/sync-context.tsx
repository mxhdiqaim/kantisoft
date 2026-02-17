import {useCreateMenuItemMutation, useUpdateMenuItemMutation} from "@/store/slice";
import {useEffect} from "react";
import {localDb} from "@/db/local-db.ts";
import {localSyncStatusEnum} from "@/types";
import type {CreateMenuItemType} from "@/types/menu-item-type.ts";

export const SyncProvider = ({children}: { children: React.ReactNode }) => {
    const [createMenuItem] = useCreateMenuItemMutation();
    const [updateMenuItem] = useUpdateMenuItemMutation();

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
                    // Mark as SYNCING locally first
                    // This stops the next loop iteration from picking it up
                    await localDb.menuItems.update(item.id, {syncStatus: localSyncStatusEnum.SYNCING});

                    const isUpdate = !item.id.startsWith('temp-');
                    // Extract only the fields the API expects
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const {syncStatus, store, inventory, storeId, ...validApiData} = item;

                    if (isUpdate) {
                        await updateMenuItem({id: item.id, ...validApiData}).unwrap();
                        // For updates, we just mark as synced because the ID didn't change
                        await localDb.menuItems.update(item.id, {syncStatus: localSyncStatusEnum.SYNCED});
                    } else {
                        // For creations, we get a NEW ID from the server
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const {id: tempIdForCleaning, ...createData} = validApiData;
                        const serverResult = await createMenuItem(createData as CreateMenuItemType).unwrap();

                        // Remove the temp record entirely
                        await localDb.menuItems.delete(item.id);

                        // Add the official server record
                        await localDb.menuItems.add({
                            ...serverResult,
                            syncStatus: localSyncStatusEnum.SYNCED
                        });
                    }

                    // Success: Clean up local DB
                    await localDb.menuItems.update(item.id, {syncStatus: localSyncStatusEnum.SYNCED});
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
    }, [createMenuItem, updateMenuItem]);

    return <>{children}</>;
};