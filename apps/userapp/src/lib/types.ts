// /api/public javoblari (apps/api/src/routes/publicSupport.ts toPublicCard bilan bir xil).

export interface OpenState {
  status: 'open' | 'closed' | 'unknown';
  label: string;
}

export interface Listing {
  id: string;
  name: string;
  type: 'USTA' | 'DOKON_OBYEKT' | 'MUASSASA' | 'TRANSPORT' | 'ARENDA' | 'ZAPRAVKA';
  category: { id: string; name: string; emoji: string | null; objectType: string | null } | null;
  landmark: { id: string; name: string } | null;
  serviceAreas: { id: string; name: string }[];
  verified: boolean;
  rating: { score: number; up: number; down: number };
  open: OpenState;
  workFrom: string | null;
  workTo: string | null;
  badges: string[];
  services: string | null;
  price: string | null;
  rent: { price: number; currency: 'UZS' | 'USD' | null; term: 'KUNLIK' | 'OYLIK' | 'YILLIK' | null; rooms: number | null } | null;
  photoUrls: string[];
  description: string | null;
  location: { lat: number; lng: number } | null;
  mapUrl: string | null;
}

export interface Category {
  id: string;
  name: string;
  emoji: string | null;
  objectType: string | null;
  group: string | null;
  count: number;
}

export interface Landmark {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  boundary: [number, number][] | null;
}

export interface Review {
  isPositive: boolean;
  comment: string | null;
  createdAt: string;
}

export interface SearchResponse {
  items: Listing[];
  primaryCount?: number;
  understood: { category: string | null; landmark: string | null; intent: string } | null;
  service?: { label: string; phone: string };
  emergency?: boolean;
}

export interface Channel {
  id: string;
  title: string;
  url: string;
}
