import { NextResponse } from 'next/server';
import { getAllHolidays, addHoliday, deleteHoliday } from '@/lib/db/services/holidays';

// GET - Fetch all holidays
export async function GET() {
  try {
    const holidaysRows = await getAllHolidays();
    // Regrouper par label comme dans l'ancien JSON
    const holidaysData: Record<string, { start: string; end: string }[]> = {};
    for (const row of holidaysRows) {
      if (!holidaysData[row.label]) holidaysData[row.label] = [];
      holidaysData[row.label].push({ start: row.start, end: row.end });
    }
    return NextResponse.json({ success: true, data: holidaysData });
  } catch (error) {
    console.error('Error reading holidays data:', error);
    return NextResponse.json({ success: false, message: 'Failed to load holidays' }, { status: 500 });
  }
}

// POST - Add a new holiday
export async function POST(request: Request) {
  try {
    const { name, start, end }: { name: string, start: string, end: string } = await request.json();
    if (!name || !start || !end) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }
    // Vérifier si la holiday existe déjà
    const holidaysRows = await getAllHolidays();
    if (holidaysRows.some(h => h.label === name && h.start === start && h.end === end)) {
      return NextResponse.json({ success: false, message: 'Holiday with this name already exists' }, { status: 400 });
    }
    await addHoliday(name, start, end);
    // Retourner la liste à jour
    const updatedRows = await getAllHolidays();
    const holidaysData: Record<string, { start: string; end: string }[]> = {};
    for (const row of updatedRows) {
      if (!holidaysData[row.label]) holidaysData[row.label] = [];
      holidaysData[row.label].push({ start: row.start, end: row.end });
    }
    return NextResponse.json({ success: true, message: 'Holiday added successfully', data: holidaysData });
  } catch (error) {
    console.error('Error adding holiday:', error);
    return NextResponse.json({ success: false, message: 'Error adding holiday' }, { status: 500 });
  }
}

// DELETE - Delete a holiday by name
export async function DELETE(request: Request) {
  try {
    const { name }: { name: string } = await request.json();
    if (!name) {
      return NextResponse.json({ success: false, message: 'Holiday name is required' }, { status: 400 });
    }
    // Trouver tous les holidays avec ce label et les supprimer
    const holidaysRows = await getAllHolidays();
    const toDelete = holidaysRows.filter(h => h.label === name);
    for (const h of toDelete) {
      await deleteHoliday(h.id);
    }
    // Retourner la liste à jour
    const updatedRows = await getAllHolidays();
    const holidaysData: Record<string, { start: string; end: string }[]> = {};
    for (const row of updatedRows) {
      if (!holidaysData[row.label]) holidaysData[row.label] = [];
      holidaysData[row.label].push({ start: row.start, end: row.end });
    }
    return NextResponse.json({ success: true, message: 'Holiday deleted successfully', data: holidaysData });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    return NextResponse.json({ success: false, message: 'Error deleting holiday' }, { status: 500 });
  }
}