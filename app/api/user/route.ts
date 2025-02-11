import { NextResponse } from 'next/server';
import { getSettingsByName, updateSettings } from '@/lib/db';

// 🔹 Récupérer les paramètres utilisateur (GET)
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const username = searchParams.get('name');

        if (!username) {
            return NextResponse.json({ error: 'Missing username' }, { status: 400 });
        }

        const settings = await getSettingsByName(username);
        if (!settings) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(settings);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// 🔹 Mettre à jour les paramètres utilisateur (PUT)
export async function PUT(req: Request) {
    try {
        const { username, bio, urls, name, birthdate, language } = await req.json();

        if (!username) {
            return NextResponse.json({ error: 'Username is required' }, { status: 400 });
        }

        const updatedSettings = await updateSettings(username, { bio, urls, name, birthdate, language });

        return NextResponse.json(updatedSettings);
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}