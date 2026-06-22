import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('photo') as File | null;

  if (!file) {
    return NextResponse.json({ detail: 'No photo' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `checkin-${Date.now()}.jpg`;
  const path = `photos/${new Date().toISOString().slice(0, 10)}/${fileName}`;

  const db = createServiceClient();
  const { error } = await db.storage
    .from('attendance-photos')
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: false });

  if (error) {
    // Don't block check-in if upload fails
    return NextResponse.json({ url: null });
  }

  // Store the storage path, not a public URL — admin routes generate signed URLs on demand
  return NextResponse.json({ url: path });
}
