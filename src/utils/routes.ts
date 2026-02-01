// This function finds the highest-level parent route for a given pathname.
import type {AppRouteType} from "@/routes";

export const findRouteByPath = (routes: AppRouteType[], pathname: string): AppRouteType | undefined => {
    // Iterate through the main routes
    for (const route of routes) {
        // Skip routes that are hidden or not meant for the main layout
        if (route.hidden || !(route.useLayout ?? true)) {
            continue;
        }

        // Construct the full path, ensuring it's not a trailing slash
        const fullPath = route.to.startsWith("/") ? route.to : `/${route.to}`;

        // Ensure paths like "/dashboard" match "/dashboard" and not "/dashboard/subpage" unless a child exists
        if (route.children) {
            // Check if the current pathname starts with this parent's path
            // This will match /inventory with /inventory/items, /inventory/raw-materials, etc.
            if (pathname.startsWith(fullPath)) {
                return route;
            }
        }

        // This is the fallback check for exact, non-nested routes
        if (pathname === fullPath) {
            return route;
        }
    }
    return undefined; // No matching route found
};
