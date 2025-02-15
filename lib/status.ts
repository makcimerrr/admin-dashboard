import path from 'path';
import fs from 'fs';

export async function getPromoStatus() {
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const rootDir = path.join(__dirname, '../'); // En remontant jusqu'à la racine du projet
  const jsonFilePath = path.join(rootDir, 'config', 'promoStatus.json'); // Chemin vers config/promoStatus.json
  const fileContent = await fs.promises.readFile(jsonFilePath, 'utf-8');
  return JSON.parse(fileContent);
}
