// Léttar gerðir sem eru sendar í vafra (client components)
export type LiteProduct = {
  id: string;
  slug: string;
  name: string;
  type: string;
  tier: string | null;
  tagline: string;
  shortDescription: string;
  features: string[];
  image: string;
  price: number;
  compareAtPrice: number | null;
  subPrice: number;
  subDiscountPct: number;
  weightLabel: string;
  suitsFor: string;
};

export type LiteFruit = {
  id: string;
  slug: string;
  name: string;
  variety: string;
  illustration: string;
  color: string;
  imageUrl: string;
  origin: string;
  region: string;
  farmer: string;
  season: string;
  description: string;
  taste: string;
  storage: string;
  ripeness: string;
  goodToKnow: string;
  deluxeOnly: boolean;
};

export type Frequency = { every: number; label: string };
