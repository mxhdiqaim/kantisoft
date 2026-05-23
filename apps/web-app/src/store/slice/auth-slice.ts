import type { RootState } from "@/store";
import type { UserType } from "@/types/user-types";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getUserDataFromStorage } from "@/utils";

type AuthState = {
    user: UserType | null;
};

const initialState: AuthState = {
    user: getUserDataFromStorage(),
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setCredentials: (state, action: PayloadAction<{ user: UserType }>) => {
            const { user } = action.payload;
            state.user = user;
            // We keep the profile data for fast UI rendering on refresh
            localStorage.setItem("userData", JSON.stringify(user));
        },
        logOut: (state) => {
            state.user = null;
            // Clean up the local profile data on logout
            localStorage.removeItem("userData");
            localStorage.removeItem("activeStoreState");
        },
    },
});

export const { setCredentials, logOut } = authSlice.actions;

export default authSlice.reducer;

export const selectCurrentUser = (state: RootState) => state.auth.user;