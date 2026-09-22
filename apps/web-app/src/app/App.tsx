import { ThemeProvider } from "../../../../packages/ui/src/theme";
import { type JSX, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { BrowserRouter as Router, Outlet, Route, Routes } from "react-router-dom";
import { FullscreenProvider } from "../context/fullscreen-context.tsx";
import { appRoutes, GuardedRoute, type AppRouteType } from "@/app/router";
import { useAuth } from "@clerk/react";
import { AppLayout, AppSpinner } from "@/shared/components";
import { ScrollToTop } from "@/shared/utils";
import { ErrorFallbackPage } from "@/pages/feedbacks";

// Recursive function to render routes and their nested children
const renderRoutes = (routes: AppRouteType[], parentPath = ""): JSX.Element[] => {
    return routes.flatMap((route, index) => {
        // Combine the parent path and current route path, ensuring no double slashes
        const fullPath = (parentPath ? `${parentPath}/${route.to}` : route.to).replace(/\/+/g, "/");

        // Set defaults for layout and auth guard
        const useLayout = route.useLayout ?? true;
        const authGuard = route.authGuard ?? true;

        // If the route.element exists, render it. Otherwise, render an Outlet for children to pass through.
        let element: JSX.Element = route.element ? <route.element /> : <Outlet />;

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
        return <AppSpinner />;
    }

    return (
        <>
            <ScrollToTop />
            <ErrorBoundary FallbackComponent={ErrorFallbackPage}>
                <Suspense fallback={<AppSpinner />}>
                    <Routes>{renderRoutes(appRoutes)}</Routes>
                </Suspense>
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
