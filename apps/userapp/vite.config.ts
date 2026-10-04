import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

/**
 * Ikonka shrifti faqat ishlatilgan ikonkalar bilan (2026-10-03): to'liq
 * Material Symbols 4 MB edi — ikonkalar ilova ochilgandan bir necha soniya
 * keyin chiqardi. Build paytida koddagi barcha ikonka nomlari rasmiy ro'yxat
 * bilan solishtirilib, Google Fonts `icon_names` bilan ~20 KB subset olinadi.
 */
function iconSubset(): Plugin {
  return {
    name: 'kimbor-icon-subset',
    transformIndexHtml(html) {
      const valid = new Set(
        fs.readFileSync(path.resolve(__dirname, 'scripts/material-symbols.codepoints'), 'utf8').split('\n').map((l) => l.split(' ')[0]).filter(Boolean),
      );
      const used = new Set<string>();
      const walk = (d: string) => {
        for (const f of fs.readdirSync(d, { withFileTypes: true })) {
          const p = path.join(d, f.name);
          if (f.isDirectory()) walk(p);
          else if (/\.tsx?$/.test(f.name)) for (const m of fs.readFileSync(p, 'utf8').matchAll(/['"`>]([a-z][a-z0-9_]{2,40})['"`<]/g)) if (valid.has(m[1])) used.add(m[1]);
        }
      };
      walk(path.resolve(__dirname, 'src'));
      const names = [...used].sort().join(',');
      return html.replace('__ICON_NAMES__', names);
    },
  };
}

// Foydalanuvchi ilovasi https://olmaliq.online/app/ ostida ishlaydi.
export default defineConfig({
  base: '/app/',
  plugins: [react(), iconSubset()],
  server: { proxy: { '/api': 'https://olmaliq.online' } },
});
