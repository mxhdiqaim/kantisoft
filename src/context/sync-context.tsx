import {useEffect} from 'react';
import {localDb} from "@/db/local-db.ts";
import {useCreateMenuItemMutation} from "@/store/slice";
import {localSyncStatusEnum} from "@/types";

export const SyncProvider = ({children}: { children: React.ReactNode }) => {
    const [createMenuItem] = useCreateMenuItemMutation();

    useEffect(() => {
        const handleSync = async () => {
            if (!navigator.onLine) return;

            // Find all pending menu items in Dexie
            const pendingItems = await localDb.menuItems
                .where('syncStatus')
                .equals(localSyncStatusEnum.PENDING)
                .toArray();

            // Push them to the backend using the RTK Mutation
            for (const item of pendingItems) {
                try {
                    // We strip the local 'syncStatus' before sending to backend
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const {syncStatus, ...backendData} = item;
                    await createMenuItem(backendData).unwrap();

                    // If successful, update local status to 'synced'
                    await localDb.menuItems.update(item.id, {syncStatus: localSyncStatusEnum.SYNCED});
                } catch (error) {
                    console.error("Sync failed for item:", item.name, error);
                }
            }
        };

        // Trigger sync when coming back online
        window.addEventListener('online', handleSync);

        // Also trigger on mount in case we started online
        handleSync();

        return () => window.removeEventListener('online', handleSync);
    }, [createMenuItem]);

    return <>{children}</>;
};