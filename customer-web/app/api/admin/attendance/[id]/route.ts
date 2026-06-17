import { NextRequest } from 'next/server';
import { adminPatch } from '@/lib/api-helpers';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return adminPatch('attendance', params.id, await req.json());
}
