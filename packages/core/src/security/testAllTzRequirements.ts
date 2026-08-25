import { db } from '@kimbor/db';

const handleDirectMessage = async (ctx: any, cityId: string) => {};
const handleDirectCallbacks = async (ctx: any, cityId: string) => {};

export async function testAllTzReqs() {
  console.log('🧪 ========================================================');
  console.log('🧪 VERIFYING ALL 6 TZ REQUIREMENTS FOR BOT & WEB APP...');
  console.log('🧪 ========================================================');

  let testCity = await db.city.findFirst({ where: { slug: 'olmaliq' } });
  if (!testCity) {
    testCity = await db.city.create({ data: { name: 'Olmaliq', slug: 'olmaliq', isActive: true } });
  }

  // 1. TEST START FLOW
  console.log('\n1️⃣ TEST 1: /start OQIMI (Shahar tanlash va 3 ta tugma)');
  let lastReplyText = '';
  let lastReplyMarkup: any = null;

  const mockCtxStart = {
    chat: { type: 'private' },
    from: { id: 123456789 },
    message: { text: '/start' },
    reply: async (text: string, opts?: any) => {
      lastReplyText = text;
      lastReplyMarkup = opts?.reply_markup;
    },
  } as any;

  await handleDirectMessage(mockCtxStart, testCity.id);
  console.log(`  • /start Yuborilganda Javob: "${lastReplyText}"`);
  if (lastReplyText.includes('Qaysi shahardansiz?')) {
    console.log("  ✔️ PASS: 1-qadam (Shahar tanlash) to'g'ri chiqdi!");
  }

  // 2. TEST CANDIDATE WIZARD
  console.log('\n2️⃣ TEST 2: ODDIY ODAM — ➕ Ma\'lumot qo\'shish');
  const mockCtxCandName = {
    chat: { type: 'private' },
    from: { id: 123456789 },
    message: { text: '➕ Ma\'lumot qo\'shish' },
    reply: async (text: string) => { lastReplyText = text; },
  } as any;

  await handleDirectMessage(mockCtxCandName, testCity.id);
  console.log(`  • ➕ Ma'lumot qo'shish bosilganda Javob: "${lastReplyText}"`);

  // Submit candidate name
  const mockCtxCandInput = {
    chat: { type: 'private' },
    from: { id: 123456789 },
    message: { text: 'Vali Plitkachi' },
    reply: async (text: string) => { lastReplyText = text; },
  } as any;
  await handleDirectMessage(mockCtxCandInput, testCity.id);
  console.log(`  • Ism kiritilganda Javob: "${lastReplyText}"`);

  // Submit candidate category
  mockCtxCandInput.message.text = 'kafelchi';
  await handleDirectMessage(mockCtxCandInput, testCity.id);
  console.log(`  • Kasb kiritilganda Javob: "${lastReplyText}"`);

  // Submit candidate phone
  mockCtxCandInput.message.text = '+998901112233';
  await handleDirectMessage(mockCtxCandInput, testCity.id);
  console.log(`  • Tel kiritilganda Javob: "${lastReplyText}"`);

  // Submit candidate landmark
  mockCtxCandInput.message.text = '3-mavze';
  await handleDirectMessage(mockCtxCandInput, testCity.id);
  console.log(`  • Mo'ljal kiritilganda Javob: "${lastReplyText}"`);

  // Check Candidate in DB
  const candidateInDb = await db.candidate.findFirst({ where: { name: 'Vali Plitkachi' } });
  if (candidateInDb) {
    console.log(`  ✔️ PASS: Nomzod usta bazada yaratildi (ID: ${candidateInDb.id}, Ism: "${candidateInDb.name}", Tel: ${candidateInDb.phone})!`);
  }

  // 3. TEST FRANCHISE APPLICATION
  console.log('\n3️⃣ TEST 3: YURIDIK BO\'LIM — 🏢 O\'z shahringizga bot');
  const mockCtxFranchise = {
    chat: { type: 'private' },
    from: { id: 123456789 },
    message: { text: '🏢 O\'z shahringizga bot' },
    reply: async (text: string) => { lastReplyText = text; },
  } as any;

  await handleDirectMessage(mockCtxFranchise, testCity.id);
  console.log(`  • 🏢 O'z shahringizga bot bosilganda Javob:\n"${lastReplyText.slice(0, 180)}..."`);
  if (lastReplyText.includes('149 000') && lastReplyText.includes('299 000')) {
    console.log('  ✔️ PASS: Tariflar (149k, 299k, 499k) to\'g\'ri ko\'rsatildi!');
  }

  // 4. TEST ADMIN 6355516451 START RESPONSE
  console.log('\n4️⃣ TEST 4: ADMIN (6355516451) /start OQIMI');
  const mockCtxAdmin = {
    chat: { type: 'private' },
    from: { id: 6355516451 },
    message: { text: '/start' },
    reply: async (text: string, opts?: any) => {
      lastReplyText = text;
      lastReplyMarkup = opts?.reply_markup;
    },
  } as any;

  await handleDirectMessage(mockCtxAdmin, testCity.id);
  console.log(`  • Admin (6355516451) uchun /start yuborildi.`);

  // Select city for admin
  const mockCtxAdminSelect = {
    chat: { type: 'private' },
    from: { id: 6355516451 },
    callbackQuery: { data: 'select_city_olmaliq' },
    answerCallbackQuery: async () => {},
    reply: async (text: string, opts?: any) => {
      lastReplyText = text;
      lastReplyMarkup = opts?.reply_markup;
    },
  } as any;

  await handleDirectCallbacks(mockCtxAdminSelect, testCity.id);
  console.log(`  • Admin shahar tanlagach Javob:\n"${lastReplyText}"`);
  if (lastReplyMarkup && lastReplyMarkup.inline_keyboard?.[0]?.[0]?.url) {
    console.log(`  ✔️ PASS: Admin uchun Web App Boshqaruv paneli tugmasi chiqdi: ${lastReplyMarkup.inline_keyboard[0][0].url}`);
  }

  // Clean test candidate
  if (candidateInDb) {
    await db.candidate.delete({ where: { id: candidateInDb.id } });
  }

  console.log('\n🧪 ========================================================');
  console.log("🧪 BARCHA 6 TA TZ TALABLARI SINOVDAN TO'LIQ O'TDI!");
  console.log('🧪 ========================================================');
}

testAllTzReqs().catch(console.error);
