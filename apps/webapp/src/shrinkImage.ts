/**
 * Rasmni yuklashdan oldin brauzerda kichraytiradi: uzun tomoni 2048px dan,
 * hajmi 4.5MB dan oshmasin. Server 5MB chegarasida faylni kesib, buzuq rasm
 * saqlanib qolgan edi (2026-10-08, xabar yuborish Telegram'da rad etilgan).
 * Kichik rasmlar o'zgarishsiz qaytariladi.
 */
const MAX_SIDE = 2048;
const MAX_BYTES = 4.5 * 1024 * 1024;

export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= MAX_BYTES) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.9, 0.8, 0.7, 0.6]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
    if (blob && (blob.size <= MAX_BYTES || quality === 0.6)) {
      return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
    }
  }
  return file;
}
