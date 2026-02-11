import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from "path";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
            "@assets": path.resolve(__dirname, "src/assets"),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    if (id.includes('node_modules')) {
                        // Split heavy libraries into their own chunks
                        if (id.includes('xlsx')) {
                            return 'xlsx';
                        }
                        if (id.includes('@mui')) {
                            return 'mui';
                        }
                        if (id.includes('recharts')) {
                            return 'recharts';
                        }
                        if (id.includes('@sentry')) {
                            return 'sentry';
                        }

                        // Validated small packages can stay in a common vendor file
                        return 'vendor';
                    }
                }
            }
        },
        chunkSizeWarningLimit: 1000, // Optional: Increases warning limit to 1MB
    },
    server: {
        port: 3000,
        host: true,
        watch: {
            usePolling: true,
        },
    },
})