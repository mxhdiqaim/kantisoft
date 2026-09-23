import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type UserType } from "@/modules/iam/types";

interface AuthState {
    user: UserType | null;
    isAuthenticated: boolean;

    setCredentials: (user: UserType) => void;
    logOut: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,

            setCredentials: (user) => {
                // Prevent empty objects {} from corrupting the store
                if (!user || Object.keys(user).length === 0) return;
                set({ user, isAuthenticated: true });
            },

            logOut: () => set({ user: null, isAuthenticated: false }),
        }),
        {
            name: "kantisoft-auth-storage",
            // Auto-heals corrupted storage on app load
            onRehydrateStorage: () => (state) => {
                if (state?.user && Object.keys(state.user).length === 0) {
                    console.warn("Corrupted empty user found in storage. Wiping state.");
                    state.logOut();
                }
            },
        },
    ),
);
