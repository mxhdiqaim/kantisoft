import { AppLayout, ScrollToTop } from "@/shared";
import ErrorFallback from "@/pages/feedbacks/fallback.tsx";
import { ThemeProvider } from "../../../../packages/ui/src/theme";
import { type JSX } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { FullscreenProvider } from "../context/fullscreen-context.tsx";
import Spinner from "@/components/feedback/spinner.tsx";
import { appRoutes, GuardedRoute, type AppRouteType } from "@/app/router";
import { useAuth } from "@clerk/react";

// Recursive function to render routes and their nested children
const renderRoutes = (routes: AppRouteType[], parentPath = ""): JSX.Element[] => {
    return routes.flatMap((route, index) => {
        // Combine the parent path and current route path, ensuring no double slashes
        const fullPath = (parentPath ? `${parentPath}/${route.to}` : route.to).replace(/\/+/g, "/");

        // Set defaults for layout and auth guard
        const useLayout = route.useLayout ?? true;
        const authGuard = route.authGuard ?? true;

        // Prepare the element with layout and guards if needed
        let element: JSX.Element = <route.element />;

        // Wrap with Layout if useLayout is true
        if (useLayout) {
            element = <AppLayout>{element}</AppLayout>;
        }

        // Wrap with GuardedRoute if authGuard is true
        if (authGuard) {
            element = <GuardedRoute authGuard={authGuard}>{element}</GuardedRoute>;
        }

        const currentRoute = <Route key={`${fullPath}-${index}`} path={fullPath} element={element} />;

        // If the route has children, recursively render them
        if (route.children && route.children.length > 0) {
            return [currentRoute, ...renderRoutes(route.children, fullPath)];
        }

        return [currentRoute];
    });
};

const AppContent = () => {
    const { isLoaded } = useAuth();

    // Block rendering until Clerk is fully initialised
    if (!isLoaded) {
        return <Spinner />;
    }

    return (
        <>
            <ScrollToTop />
            <ErrorBoundary FallbackComponent={ErrorFallback}>
                <Routes>{renderRoutes(appRoutes)}</Routes>
            </ErrorBoundary>
        </>
    );
};

function App() {
    return (
        <ThemeProvider>
            <FullscreenProvider>
                <Router>
                    <AppContent />
                </Router>
            </FullscreenProvider>
        </ThemeProvider>
    );
}

export default App;
