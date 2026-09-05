import path from 'path';

// Admin panelidan yuklangan yozuv rasmlari (masalan "uy arendaga" e'lonlari)
// shu papkaga saqlanadi — docker-compose'da named volume orqali qayta
// build/restart'lardan omon qoladi. index.ts va adminRoutes.ts ikkalasi ham
// shu yerdan olishadi (index.ts <-> adminRoutes.ts aylanma import'ining
// oldini olish uchun alohida faylga chiqarilgan).
export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
