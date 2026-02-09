import { NextResponse } from 'next/server';
import { loadAwardBookData } from '@/lib/data-loader';
import { loadAwardBookDataFromSharePoint } from '@/lib/sharepoint-loader';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Use SharePoint if Azure credentials are configured, otherwise fall back to local file
    const useSharePoint = !!(
      process.env.AZURE_TENANT_ID &&
      process.env.AZURE_CLIENT_ID &&
      process.env.AZURE_CLIENT_SECRET &&
      process.env.SHAREPOINT_FILE_URL
    );

    const data = useSharePoint
      ? await loadAwardBookDataFromSharePoint()
      : loadAwardBookData();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to load AwardBook data:', error);
    return NextResponse.json(
      { error: 'Failed to load data from Excel file' },
      { status: 500 }
    );
  }
}
