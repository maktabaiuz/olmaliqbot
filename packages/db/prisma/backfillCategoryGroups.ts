import { PrismaClient } from '@prisma/client';
import INITIAL_DICTIONARY from '../../core/src/dictionary/initialDictionary.json';

const db = new PrismaClient();

/**
 * Faqat objectType va group maydonlarini to'ldiradi — sinonimlarga
 * tegmaydi (adminlar CategoryDetailScreen orqali qo'lda tahrirlagan
 * bo'lishi mumkin, ularni ustidan yozib yubormaslik uchun alohida script).
 */
async function main() {
  let count = 0;
  for (const cat of INITIAL_DICTIONARY.categories as Array<{ name: string; object_type?: string; group?: string }>) {
    const result = await db.category.updateMany({
      where: { name: cat.name },
      data: {
        objectType: (cat.object_type as any) || null,
        group: cat.group || null,
      },
    });
    count += result.count;
  }
  console.log(`✅ Backfilled objectType/group on ${count} existing category rows (synonyms untouched).`);
}

main()
  .catch((e) => {
    console.error('❌ Backfill error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
