import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import path from "path";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function getPromoStatus() {
  if (typeof window !== 'undefined') {
    throw new Error('getPromoStatus can only be used on the server side');
  }

  const fs = await import('fs').then(mod => mod.promises);
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const rootDir = path.join(__dirname, '../'); // En remontant jusqu'à la racine du projet
  const jsonFilePath = path.join(rootDir, 'config', 'promoStatus.json'); // Chemin vers config/promoStatus.json
  const fileContent = await fs.readFile(jsonFilePath, 'utf-8');
  return JSON.parse(fileContent);
}