// iOS Contacts/Reminders'dagi kabi — nomga qarab barqaror (har doim bir xil)
// rang tanlaydi, shuning uchun har bir manzil o'zining "shaxsiyati"ga ega
// bo'ladi va ro'yxat bir xil ko'k rang bilan monoton ko'rinmaydi.
const IOS_PALETTE = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE',
  '#30B0C7', '#32ADE6', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55',
];

export function avatarColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return IOS_PALETTE[hash % IOS_PALETTE.length];
}
