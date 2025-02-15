import path from 'path';
import fs from 'fs';

export async function getPromoStatus() {
    // Check if you're in a local or Vercel environment
    const isVercel = process.env.VERCEL === '1';

    let jsonFilePath;

    if (isVercel) {
        // Use a relative path if on Vercel
        jsonFilePath = path.join('/vercel/path0/config', 'promoStatus.json');
    } else {
        // Local environment (adjust according to your local structure)
        const __dirname = path.dirname(new URL(import.meta.url).pathname);
        const rootDir = path.join(__dirname, '../');
        jsonFilePath = path.join(rootDir, 'config', 'promoStatus.json');
    }

    try {
        const fileContent = await fs.promises.readFile(jsonFilePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('Error reading promoStatus.json:', error);
        throw error; // Or handle error gracefully
    }
}