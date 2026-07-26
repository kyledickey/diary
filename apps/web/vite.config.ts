import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

export default defineConfig({
    resolve: {
        tsconfigPaths: true
    },
    plugins: [tanstackStart(), svgr(), react()]
});
