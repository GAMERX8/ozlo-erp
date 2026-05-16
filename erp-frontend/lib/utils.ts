import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

export function generateRandomName(): string {
  const adjectives = [
    "moho", "shiny", "brave", "cool", "smart", "fast", "bright", "neon", "cosmic", "golden",
    "silver", "hyper", "super", "magic", "stealth", "alpha", "delta", "omega", "zen", "vivid",
    "alphabet", "quantum", "pixel", "solar", "orbital"
  ];
  const nouns = [
    "shine", "don", "bolt", "flow", "flux", "spark", "nova", "edge", "link", "star",
    "node", "hub", "sync", "grid", "pulse", "mesh", "core", "wave", "base", "zone",
    "claw", "path", "track", "vista", "point"
  ];

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  return `${adjective}-${noun}`;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(amount);
}

