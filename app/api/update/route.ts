import { NextRequest, NextResponse } from 'next/server';
import path from "path";
import fs from "fs";

export async function getPromoStatus() {
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const rootDir = path.join(__dirname, '../'); // En remontant jusqu'à la racine du projet
  const jsonFilePath = path.join(rootDir, 'config', 'promoStatus.json'); // Chemin vers config/promoStatus.json
  const fileContent = await fs.promises.readFile(jsonFilePath, 'utf-8');
  return JSON.parse(fileContent);
}

export async function POST(req: NextRequest) {
  try {
    const response = await fetch('https://admin-dashboard-blue-one.vercel.app/api/timeline_project', {
      method: 'GET'
    });

    if (response.ok) {
      return NextResponse.json(
        { success: true, message: 'Data updated successfully', response: response },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { success: false, message: 'Error updating data' },
        { status: 500 }
      );
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error }), {
      status: 500
    });
  }
}
