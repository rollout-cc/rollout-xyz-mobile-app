// Stripe product/price mappings and plan constants

export const PLAN_TIERS = {
  rising: {
    name: "Rising",
    price: 0,
    seats: 1,
    description: "For solo creators getting started",
  },
  icon_5: {
    name: "Icon",
    price: 45,
    seats: 5,
    priceId: "price_1T71uJQqzrroFM17NVp8fmBj",
    productId: "prod_U5CIvGZDhdaGnx",
    description: "Up to 5 team members",
  },
  icon_10: {
    name: "Icon",
    price: 70,
    seats: 10,
    priceId: "price_1T72AKQqzrroFM17maKFYrCj",
    productId: "prod_U5CZIYD0Nmn0ty",
    description: "Up to 10 team members",
  },
  icon_15: {
    name: "Icon",
    price: 120,
    seats: 15,
    priceId: "price_1T72GIQqzrroFM17uRdMfC30",
    productId: "prod_U5CfH5aXZPJHUm",
    description: "Up to 15 team members",
  },
  legend: {
    name: "Legend",
    price: null,
    seats: null,
    description: "15+ seats, dedicated support, custom APIs",
  },
} as const;

export type PlanKey = keyof typeof PLAN_TIERS;

export const FREE_LIMITS = {
  maxArtists: 3,
  maxProspects: 2,
  maxTasksPerMonth: 10,
} as const;

export const ICON_TIERS = ["icon_5", "icon_10", "icon_15"] as const;

export function getTierKeyFromSeats(seats: number): PlanKey {
  if (seats <= 1) return "rising";
  if (seats <= 5) return "icon_5";
  if (seats <= 10) return "icon_10";
  if (seats <= 15) return "icon_15";
  return "legend";
}
