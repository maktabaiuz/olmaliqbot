import { EmergencyTemplate } from '@kimbor/types';

export const LEVEL_1_SAFETY_TEMPLATE: EmergencyTemplate = {
  level: 1,
  title: '🚨 GAZ HIDI / FAVQULODDA VAZIYAT — DARHOL:',
  safetyInstructions: [
    '❌ Chiroq, gugurt, telefon — yoqmang',
    '❌ Vyklyuchatelga tegmang',
    '✅ Derazalarni oching',
    '✅ Gaz kranini yoping',
    '✅ Uydan chiqing',
  ],
  numbersToCall: [
    { label: 'Gaz avariya', key: 'gas_emergency' },
    { label: 'Yagona qutqaruv', key: 'rescue_112' },
  ],
  isPersistent: true, // Bu xabar o'chmaydi
};

export const DEFAULT_EMERGENCY_NUMBERS: Record<string, string> = {
  gas_emergency: '104',
  rescue_112: '112',
  fire_dept: '101',
  police: '102',
  ambulance: '103',
  water_dept: 'Suv idorasi raqami kiritilmagan',
  power_grid: 'Elektr tarmoqlari raqami kiritilmagan',
  heat_supply: 'Issiqlik ta\'minoti raqami kiritilmagan',
  city_hall: 'Shahar hokimiyati raqami kiritilmagan',
};

export function renderLevel1EmergencyMessage(cityEmergencyNumbers?: Record<string, string>): string {
  const numbers = { ...DEFAULT_EMERGENCY_NUMBERS, ...cityEmergencyNumbers };

  return `${LEVEL_1_SAFETY_TEMPLATE.title}

${LEVEL_1_SAFETY_TEMPLATE.safetyInstructions.join('\n')}

📞 ${numbers.gas_emergency} — Gaz avariya
📞 ${numbers.rescue_112} — Yagona qutqaruv

⚠️ Usta emas — avval avariya xizmatini chaqiring!`;
}
