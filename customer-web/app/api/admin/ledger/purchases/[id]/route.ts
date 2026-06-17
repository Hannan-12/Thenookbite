import { NextRequest } from 'next/server';
import { adminPatch, adminDelete } from '@/lib/api-helpers';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return adminPatch('purchases', params.id, await req.json());
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return adminDelete('purchases', params.id);
}
