import { PrismaClient } from '@prisma/client';
import INITIAL_DICTIONARY from '../../core/src/dictionary/initialDictionary.json';

const db = new PrismaClient();

/**
 * Mavjud kategoriyalarga faqat objectType/group/emoji maydonlarini
 * to'ldiradi — sinonimlarga tegmaydi (adminlar CategoryDetailScreen orqali
 * qo'lda tahrirlagan bo'lishi mumkin, ularni ustidan yozib yubormaslik uchun
 * alohida script). Lug'atda bor-u bazada hali yo'q yangi kategoriyalarni esa
 * (masalan Choyxona, Restoran) to'liq sinonimlari bilan yaratadi.
 */
async function main() {
  let updated = 0;
  let created = 0;
  for (const cat of INITIAL_DICTIONARY.categories as Array<{ name: string; synonyms: string[]; object_type?: string; group?: string; emoji?: string }>) {
    const existing = await db.category.findFirst({ where: { name: { equals: cat.name, mode: 'insensitive' } } });
    if (existing) {
      await db.category.update({
        where: { id: existing.id },
        data: {
          objectType: (cat.object_type as any) || null,
          group: cat.group || null,
          emoji: cat.emoji || null,
        },
      });
      updated++;
    } else {
      await db.category.create({
        data: {
          name: cat.name,
          synonyms: cat.synonyms,
          objectType: (cat.object_type as any) || null,
          group: cat.group || null,
          emoji: cat.emoji || null,
        },
      });
      created++;
    }
  }
  console.log(`✅ Backfilled objectType/group/emoji on ${updated} existing category rows (synonyms untouched), created ${created} new categories.`);
}

main()
  .catch((e) => {
    console.error('❌ Backfill error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
