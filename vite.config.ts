import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  envDir: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // React et Radix restent groupés : ils sont partagés par presque toutes les pages,
        // et un morceau stable se garde en cache d'une visite à l'autre.
        //
        // recharts et react-markdown ont été RETIRÉS de cette liste. Les nommer ici en
        // faisait des morceaux de premier niveau, que Vite précharge depuis la page
        // d'entrée : recharts (420 Ko) partait ainsi sur la page d'accueil alors que seules
        // deux pages d'administration l'utilisent. Depuis que les routes sont découpées,
        // Rollup les place tout seul dans les morceaux qui en ont besoin, chargés à
        // l'ouverture de la page concernée.
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-tabs", "@radix-ui/react-select", "@radix-ui/react-toast"],
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
