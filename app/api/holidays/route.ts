import { NextResponse } from 'next/server';
import {
  getAllHolidays,
  addHoliday,
  deleteHoliday,
  deleteHolidayById,
  updateHoliday,
  getHolidaysByLabel,
} from '@/lib/db/services/holidays';
import { dbHolidaysToConfig } from '@/lib/config/holidays';
import { CACHE_TAGS, invalidate } from '@/lib/cache';

export async function GET() {
  try {
    const rows = await getAllHolidays();
    const holidaysData = dbHolidaysToConfig(rows);
    // `data` reste groupé par label (rétro-compat) ; `rows` expose les ids
    // pour permettre l'édition/suppression d'une période précise côté UI.
    return NextResponse.json({ success: true, data: holidaysData, rows });
  } catch (error) {
    console.error('Error reading holidays data:', error);
    return NextResponse.json({ success: false, message: 'Failed to load holidays' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, start, end }: { name: string; start: string; end: string } = await request.json();

    if (!name || !start || !end) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const existing = await getHolidaysByLabel(name);
    if (existing.length > 0) {
      return NextResponse.json({ success: false, message: 'Holiday with this name already exists' }, { status: 400 });
    }

    await addHoliday(name, start, end);
    invalidate(CACHE_TAGS.holidays);

    const rows = await getAllHolidays();
    const holidaysData = dbHolidaysToConfig(rows);
    return NextResponse.json({ success: true, message: 'Holiday added successfully', data: holidaysData });
  } catch (error) {
    console.error('Error adding holiday:', error);
    return NextResponse.json({ success: false, message: 'Error adding holiday' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, name, start, end }: { id?: number; name?: string; start?: string; end?: string } =
      await request.json();

    if (typeof id !== 'number') {
      return NextResponse.json({ success: false, message: 'Holiday id is required' }, { status: 400 });
    }

    if (name === undefined && start === undefined && end === undefined) {
      return NextResponse.json({ success: false, message: 'No fields to update' }, { status: 400 });
    }

    if (start !== undefined && end !== undefined && new Date(start) >= new Date(end)) {
      return NextResponse.json(
        { success: false, message: 'End date must be after start date' },
        { status: 400 },
      );
    }

    await updateHoliday(id, { label: name, start, end });
    invalidate(CACHE_TAGS.holidays);

    const rows = await getAllHolidays();
    const holidaysData = dbHolidaysToConfig(rows);
    return NextResponse.json({
      success: true,
      message: 'Holiday updated successfully',
      data: holidaysData,
      rows,
    });
  } catch (error) {
    console.error('Error updating holiday:', error);
    return NextResponse.json({ success: false, message: 'Error updating holiday' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, name }: { id?: number; name?: string } = await request.json();

    // Suppression d'une période précise par id
    if (typeof id === 'number') {
      await deleteHolidayById(id);
      invalidate(CACHE_TAGS.holidays);

      const rows = await getAllHolidays();
      const holidaysData = dbHolidaysToConfig(rows);
      return NextResponse.json({
        success: true,
        message: 'Holiday deleted successfully',
        data: holidaysData,
        rows,
      });
    }

    // Suppression de toutes les périodes d'un label
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Holiday id or name is required' },
        { status: 400 },
      );
    }

    const existing = await getHolidaysByLabel(name);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, message: 'Holiday not found' }, { status: 404 });
    }

    for (const holiday of existing) {
      await deleteHoliday(holiday.id);
    }
    invalidate(CACHE_TAGS.holidays);

    const rows = await getAllHolidays();
    const holidaysData = dbHolidaysToConfig(rows);
    return NextResponse.json({
      success: true,
      message: 'Holiday deleted successfully',
      data: holidaysData,
      rows,
    });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    return NextResponse.json({ success: false, message: 'Error deleting holiday' }, { status: 500 });
  }
}
