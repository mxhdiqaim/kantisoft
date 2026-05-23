import AuthGuard from "@/components/auth/auth-guard.tsx";
import Layout from "@/components/layout";
import ErrorFallback from "@/pages/feedbacks/fallback";
import {appRoutes, type AppRouteType} from "@/routes";
import GuardedRoute from "@/routes/guarded-route";
import { useAppDispatch, useAppSelector } from "@/store";
import { logOut, selectCurrentUser } from "@/store/slice/auth-slice";
import {ThemeProvider} from "../../../packages/ui/src/theme";
import {ScrollToTop} from "@/utils";
import { type JSX, useEffect, useState } from "react";
import {ErrorBoundary} from "react-error-boundary";
import {useTranslation} from "react-i18next";
import {useSelector} from "react-redux";
import {BrowserRouter as Router, Route, Routes} from "react-router-dom";
import {FullscreenProvider} from "./context/fullscreen-context";
import {selectActiveStore} from "./store/slice/store-slice";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/config/firebase";
import "@/config/i18next-config";
import Spinner from "@/components/feedback/spinner.tsx";

// Recursive function to render routes and their nested children
const renderRoutes = (routes: AppRouteType[], parentPath = ""): JSX.Element[] => {
    return routes.flatMap((route, index) => {
        // Combine the parent path and current route path, ensuring no double slashes
        const fullPath = (parentPath ? `${parentPath}/${route.to}` : route.to).replace(/\/+/g, "/");

        // Set defaults for layout and auth guard
        const useLayout = route.useLayout ?? true;
        const authGuard = route.authGuard ?? true;

        // Prepare the element with layout and guards if needed
        let element: JSX.Element = <route.element/>;

        // Wrap with Layout if useLayout is true
        if (useLayout) {
            element = <Layout>{element}</Layout>;
        }

        // Wrap with GuardedRoute if authGuard is true
        if (authGuard) {
            element = <GuardedRoute authGuard={authGuard}>{element}</GuardedRoute>;
        }

        const currentRoute = <Route key={`${fullPath}-${index}`} path={fullPath} element={element}/>;

        // If the route has children, recursively render them
        if (route.children && route.children.length > 0) {
            return [currentRoute, ...renderRoutes(route.children, fullPath)];
        }

        return [currentRoute];
    });
};

// Component with router-dependent logic
const AppContent = () => {
    const { i18n } = useTranslation();
    const dispatch = useAppDispatch();
    const activeStore = useSelector(selectActiveStore);
    const currentUser = useAppSelector(selectCurrentUser);

    const [isFirebaseReady, setIsFirebaseReady] = useState(false);

    useEffect(() => {
        // Listen for Firebase to read IndexedDB and determine session status
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (!firebaseUser) {
                // If Firebase says no session exists, force clear Redux state
                dispatch(logOut());
            }
            // Firebase has completed its boot cycle!
            setIsFirebaseReady(true);
        });

        // Cleanup listener on unmounting
        return () => unsubscribe();
    }, [dispatch]);

    // Effect of language change
    useEffect(() => {
        if (activeStore?.storeType) {
            const currentLanguage = i18n.language;
            const targetLanguage = activeStore.storeType;

            if (currentLanguage !== targetLanguage) {
                i18n.changeLanguage(targetLanguage);
            }
        }
    }, [activeStore, i18n]);

    // Block the rest of the app from rendering or making queries until Firebase is ready
    if (!isFirebaseReady) {
        return <Spinner />;
    }

    return (
        <>
            <ScrollToTop />
            <ErrorBoundary FallbackComponent={ErrorFallback}>
                <AuthGuard currentUser={currentUser} />
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
                    <AppContent/>
                </Router>
            </FullscreenProvider>
        </ThemeProvider>
    );
}

export default App;
