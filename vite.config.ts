import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
import {defineConfig, type Connect, type Plugin} from 'vite';

/** Serve the admin panel at /admin (as Vercel does) in `npm run dev` and `npm run preview`. */
function adminRoute(): Plugin {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    if (req.url && /^\/admin\/?(\?.*)?$/.test(req.url)) req.url = req.url.replace(/^\/admin\/?/, '/admin.html');
    next();
  };
  return {
    name: 'admin-route',
    configureServer: (server) => void server.middlewares.use(rewrite),
    configurePreviewServer: (server) => void server.middlewares.use(rewrite),
  };
}

export default defineConfig({
  plugins: [adminRoute(), react(), tailwindcss()],
  build: {
    target: 'es2020',
    rollupOptions: {
      // Two pages: the storefront and the owner's admin panel (/admin).
      input: {main: resolve(__dirname, 'index.html'), admin: resolve(__dirname, 'admin.html')},
    },
  },
});
