import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define the path to the holidays data file
const holidaysFilePath = path.join(process.cwd(), 'config/holidays.json');

// Read and parse the holidays data from the file
function readHolidaysData() {
  const holidaysRawData = fs.readFileSync(holidaysFilePath, 'utf-8');
  return JSON.parse(holidaysRawData);
}

// Save the holidays data back to the file
function saveHolidaysData(holidaysData: any) {
  fs.writeFileSync(holidaysFilePath, JSON.stringify(holidaysData, null, 2), 'utf-8');
}

// Handle GET request - Fetch all holidays
export async function GET() {
  try {
    const holidaysData = readHolidaysData();
    return NextResponse.json({ success: true, data: holidaysData });
  } catch (error) {
    console.error('Error reading holidays data:', error);
    return NextResponse.json({ success: false, message: 'Failed to load holidays' }, { status: 500 });
  }
}

// Handle POST request - Add a new holiday
export async function POST(request: Request) {
  try {
    const { name, start, end }: { name: string, start: string, end: string } = await request.json();

    if (!name || !start || !end) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const holidaysData = readHolidaysData();

    // Check if the holiday already exists
    if (holidaysData[name]) {
      return NextResponse.json({ success: false, message: 'Holiday with this name already exists' }, { status: 400 });
    }

    // Add new holiday
    holidaysData[name] = [{ start, end }];

    // Save the updated holidays data to the file
    saveHolidaysData(holidaysData);

    return NextResponse.json({ success: true, message: 'Holiday added successfully', data: holidaysData });
  } catch (error) {
    console.error('Error adding holiday:', error);
    return NextResponse.json({ success: false, message: 'Error adding holiday' }, { status: 500 });
  }
}

// Handle DELETE request - Delete a holiday by name
export async function DELETE(request: Request) {
  try {
    const { name }: { name: string } = await request.json();

    if (!name) {
      return NextResponse.json({ success: false, message: 'Holiday name is required' }, { status: 400 });
    }

    const holidaysData = readHolidaysData();

    // Check if the holiday exists
    if (!holidaysData[name]) {
      return NextResponse.json({ success: false, message: 'Holiday not found' }, { status: 404 });
    }

    // Delete the holiday
    delete holidaysData[name];

    // Save the updated holidays data to the file
    saveHolidaysData(holidaysData);

    return NextResponse.json({ success: true, message: 'Holiday deleted successfully', data: holidaysData });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    return NextResponse.json({ success: false, message: 'Error deleting holiday' }, { status: 500 });
  }
}