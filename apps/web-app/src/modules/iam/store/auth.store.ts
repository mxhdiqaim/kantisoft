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

            // Actions
            setCredentials: (user) =>
                set({
                    user,
                    isAuthenticated: true,
                }),

            logOut: () =>
                set({
                    user: null,
                    isAuthenticated: false,
                }),
        }),
        {
            name: "kantisoft-auth-storage",
        },
    ),
);
