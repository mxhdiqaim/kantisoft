import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "../index.css";
import { SnackbarProvider } from "notistack";
import * as Sentry from "@sentry/react";
import { getEnvVariable } from "@/shared/utils";
import { SyncProvider } from "@/context/sync-context.tsx";
import { ClerkProvider } from "@clerk/react";
import { QueryClientProvider as TanstackQueryClientProvider } from "@tanstack/react-query";
import { tanstackQueryClient } from "@/config";

const VITE_APP_SENTRY_DSN = getEnvVariable("VITE_APP_SENTRY_DSN");
const VITE_CLERK_PUBLISHABLE_KEY = getEnvVariable("VITE_CLERK_PUBLISHABLE_KEY");

// Only initialise Sentry if we are in production and have a DSN
if (import.meta.env.PROD && VITE_APP_SENTRY_DSN) {
    Sentry.init({
        dsn: VITE_APP_SENTRY_DSN,
        enabled: import.meta.env.PROD,
        sendDefaultPii: true,
        integrations: [Sentry.replayIntegration()],
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
    });
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <TanstackQueryClientProvider client={tanstackQueryClient}>
            <SyncProvider>
                <SnackbarProvider
                    maxSnack={3}
                    autoHideDuration={3000}
                    variant="default"
                    anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "center",
                    }}
                >
                    <ClerkProvider publishableKey={VITE_CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
                        <App />
                    </ClerkProvider>
                </SnackbarProvider>
            </SyncProvider>
        </TanstackQueryClientProvider>
    </StrictMode>,
);
