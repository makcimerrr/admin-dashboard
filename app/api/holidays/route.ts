import { NextResponse } from 'next/server';
import { getAllHolidays, addHoliday, deleteHoliday, getHolidaysByLabel } from '@/lib/db/services/holidays';
import { dbHolidaysToConfig } from '@/lib/config/holidays';

export async function GET() {
  try {
    const rows = await getAllHolidays();
    const holidaysData = dbHolidaysToConfig(rows);
    return NextResponse.json({ success: true, data: holidaysData });
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

    const rows = await getAllHolidays();
    const holidaysData = dbHolidaysToConfig(rows);
    return NextResponse.json({ success: true, message: 'Holiday added successfully', data: holidaysData });
  } catch (error) {
    console.error('Error adding holiday:', error);
    return NextResponse.json({ success: false, message: 'Error adding holiday' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { name }: { name: string } = await request.json();

    if (!name) {
      return NextResponse.json({ success: false, message: 'Holiday name is required' }, { status: 400 });
    }

    const existing = await getHolidaysByLabel(name);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, message: 'Holiday not found' }, { status: 404 });
    }

    for (const holiday of existing) {
      await deleteHoliday(holiday.id);
    }

    const rows = await getAllHolidays();
    const holidaysData = dbHolidaysToConfig(rows);
    return NextResponse.json({ success: true, message: 'Holiday deleted successfully', data: holidaysData });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    return NextResponse.json({ success: false, message: 'Error deleting holiday' }, { status: 500 });
  }
}
