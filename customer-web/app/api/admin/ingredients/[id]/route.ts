import { NextRequest } from 'next/server';
import { adminPatch, adminDelete } from '@/lib/api-helpers';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return adminPatch('ingredients', params.id, await req.json(), 400);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return adminDelete('ingredients', params.id, 400);
}
