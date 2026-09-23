// Xaritada belgilangan mahalla chegaralari (2026-09) — admin xaritadan
// nuqta bosganda, shu nuqta qaysi mahalla poligoni ICHIDA ekanini aniqlash
// uchun. Ray-casting algoritmi: kichik, mustaqil, tashqi kutubxona (turf
// va h.k.) talab qilmaydi — bu vazifa uchun ular ortiqcha og'irlik bo'lardi.

export type LatLng = [number, number];

/**
 * Klassik ray-casting: nuqtadan cheksizlikka chiziq tortilib, poligon
 * qirralarini necha marta kesib o'tishi hisoblanadi — toq son bo'lsa
 * nuqta ICHKARIDA.
 */
export function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  if (polygon.length < 3) return false;
  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];

    const intersects =
      latI > lat !== latJ > lat &&
      lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI;
    if (intersects) inside = !inside;
  }

  return inside;
}

/**
 * Berilgan nuqtani o'z ichiga olgan BIRINCHI mo'ljalni topadi. Bir nechta
 * poligon bir-biriga ustma-ust tushib qolsa (masalan chegaralar hali
 * aniqlanmagan/tahrirlanayotgan bo'lsa) — ro'yxatdagi birinchisi qaytadi;
 * bu chekka holat, odatiy ishlashda mahallalar bir-biriga tushmasligi kerak.
 */
export function findContainingLandmark<T extends { id: string; boundary: unknown }>(
  lat: number,
  lng: number,
  landmarks: T[]
): T | null {
  for (const landmark of landmarks) {
    const boundary = landmark.boundary;
    if (!Array.isArray(boundary) || boundary.length < 3) continue;
    const polygon = boundary as LatLng[];
    if (isPointInPolygon([lat, lng], polygon)) return landmark;
  }
  return null;
}
