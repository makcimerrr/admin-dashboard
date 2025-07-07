import path from 'path';
import fs from 'fs';

export async function getPromoStatus() {
  const isVercel = process.env.VERCEL === '1';

  let jsonFilePath;

  if (isVercel) {
    jsonFilePath = path.join('/vercel/path0/public', 'config', 'promoStatus.json');
  } else {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const rootDir = path.join(__dirname, '../');
    jsonFilePath = path.join(rootDir, 'config', 'promoStatus.json');
  }

  try {
    const fileContent = await fs.promises.readFile(jsonFilePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading promoStatus.json:', error);
    throw new Error(`File not found at ${jsonFilePath}`); // Renvoyer l'erreur avec plus d'infos
  }
}