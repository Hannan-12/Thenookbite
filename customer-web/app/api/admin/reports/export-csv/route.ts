import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const { searchParams, origin } = new URL(req.url);
  const from    = searchParams.get('from_date');
  const to      = searchParams.get('to_date');
  const type    = searchParams.get('type') ?? 'daily';
  const sort_by = searchParams.get('sort_by') ?? 'revenue';

  if (!from || !to) {
    return NextResponse.json({ detail: 'from_date and to_date are required' }, { status: 400 });
  }

  // Fetch data from the relevant report API
  let apiUrl: string;
  if (type === 'items') {
    apiUrl = `${origin}/api/admin/reports/top-items?from_date=${from}&to_date=${to}&sort_by=${sort_by}&limit=100`;
  } else if (type === 'categories') {
    apiUrl = `${origin}/api/admin/reports/top-categories?from_date=${from}&to_date=${to}&sort_by=${sort_by}`;
  } else {
    apiUrl = `${origin}/api/admin/reports/sales-over-time?from_date=${from}&to_date=${to}&group_by=day`;
  }

  // Forward the cookie so auth passes
  const cookie = req.headers.get('cookie') ?? '';
  const dataRes = await fetch(apiUrl, { headers: { cookie } });
  if (!dataRes.ok) return NextResponse.json({ detail: 'Failed to fetch report data' }, { status: 500 });
  const data = await dataRes.json();

  let csv = '';
  if (type === 'items') {
    csv = 'Item,Revenue (PKR),Qty Sold,Orders\n';
    for (const row of data) {
      csv += `"${row.item_name}",${row.revenue},${row.qty},${row.orders}\n`;
    }
  } else if (type === 'categories') {
    csv = 'Category,Revenue (PKR),Qty Sold,Orders\n';
    for (const row of data) {
      csv += `"${row.category}",${row.revenue},${row.qty},${row.orders}\n`;
    }
  } else {
    csv = 'Date,Revenue (PKR),Orders\n';
    for (const row of data) {
      csv += `"${row.label}",${row.revenue},${row.orders}\n`;
    }
  }

  const filename = `tnb-report-${type}-${from}-${to}.csv`;
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
