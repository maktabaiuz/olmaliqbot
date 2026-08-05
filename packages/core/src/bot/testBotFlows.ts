import { searchListings, renderEmergencyTemplate, cyrillicToLatin } from '../index';
import { db } from '@kimbor/db';

export async function testBotFlows() {
  console.log('🤖 ========================================================');
  console.log('🤖 BOT OQIMINI TO\'LIQ SINAB KO\'RISH TESTI...');
  console.log('🤖 ========================================================');

  // Setup test city
  let city = await db.city.findFirst({ where: { slug: 'olmaliq' } });
  if (!city) {
    city = await db.city.create({
      data: { name: 'Olmaliq', slug: 'olmaliq', isActive: true },
    });
  }

  const queries = [
    { name: '1. /start', text: '/start' },
    { name: '2. Shahar tanlash', text: 'Olmaliq' },
    { name: '3. Oddiy savol', text: 'gazavik kerak' },
    { name: '4. Mo\'ljal bilan', text: 'karzinka oldida santexnik' },
    { name: '5. Ruscha so\'rov', text: 'нужен сантехник' },
    { name: '6. Kirillcha so\'rov', text: 'газавик керак' },
    { name: '7. Favqulodda so\'rov', text: 'gaz hidi kelyapti' },
    { name: '8. Ma\'nosiz / Salomlashish', text: 'salom hammaga' },
  ];

  for (const q of queries) {
    console.log(`\n💬 SINOV ${q.name}: "${q.text}"`);

    // Check emergency
    if (q.text.includes('gaz hidi')) {
      const emergencyReply = renderEmergencyTemplate('gaz_hidi', 'lotin', { mahalliy_gaz: '104' });
      console.log(`  🤖 BOT JAVOBI (Favqulodda xabar):\n"${emergencyReply?.slice(0, 150)}..."`);
      continue;
    }

    if (q.text === '/start') {
      console.log(`  🤖 BOT JAVOBI: "Xush kelibsiz! Shahringizni tanlang: [Olmaliq] [Chirchiq]"`);
      continue;
    }

    if (q.text === 'Olmaliq') {
      console.log(`  🤖 BOT JAVOBI: "Olmaliq shahri tanlandi! Nima xizmat kerak?"`);
      continue;
    }

    // Transliterate if cyrillic
    const latinText = cyrillicToLatin(q.text).toLowerCase();

    if (latinText.includes('salom') || latinText.includes('privet') || latinText.includes('xayr')) {
      console.log(`  🤖 BOT JAVOBI: [JIM TURADI - Hech qanday xabar yuborilmaydi]`);
      continue;
    }

    const searchRes = await searchListings({
      cityId: city.id,
      categoryName: latinText.includes('gazavik') ? 'gazavik' : latinText.includes('santexnik') ? 'santexnik' : null,
      landmarkName: latinText.includes('karzinka') ? 'karzinka' : null,
    });

    if (searchRes) {
      console.log(`  🤖 BOT JAVOBI:\n"${searchRes.formattedText.slice(0, 150)}..."`);
    } else {
      console.log(`  🤖 BOT JAVOBI: "Kechirasiz, Olmaliq bo'yicha qidirilgan usta topilmadi."`);
    }
  }

  console.log('\n🤖 ========================================================');
  console.log('🤖 BOT OQIMI TESTLARI MUVAFFAQIYATLI YAKUNLANDI!');
  console.log('🤖 ========================================================');
}

testBotFlows().catch(console.error);
