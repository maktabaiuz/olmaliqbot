import { Language } from './types';
export interface LocalNumbers {
    mahalliy_gaz?: string;
    mahalliy_suv?: string;
    mahalliy_elektr?: string;
    mahalliy_issiqlik?: string;
    mahalliy_hokimiyat?: string;
}
export declare function renderEmergencyTemplate(category: string, lang?: Language, localNumbers?: LocalNumbers, serviceListingsFormatted?: string): string | null;
//# sourceMappingURL=render.d.ts.map