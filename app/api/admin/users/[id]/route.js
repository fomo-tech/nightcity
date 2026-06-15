import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getDb } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cleanId(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
}

function cleanName(value) {
  return String(value || 'V').replace(/[^\p{L}\p{N}_ -]/gu, '').trim().slice(0, 18).toUpperCase() || 'V';
}

function cleanProvider(value) {
  return String(value || 'quick').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'quick';
}

export async function PATCH(request, { params }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const { id } = await params;
    const accountId = cleanId(id);
    const body = await request.json().catch(() => ({}));
    const update = {
      name: cleanName(body.name),
      provider: cleanProvider(body.provider),
      updatedAt: new Date().toISOString(),
    };
    const db = await getDb();
    const result = await db.collection('accounts').updateOne({ id: accountId }, { $set: update });
    return NextResponse.json({ ok: result.matchedCount > 0, updated: update });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }
}

export async function DELETE(request, { params }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const { id } = await params;
    const accountId = cleanId(id);
    const db = await getDb();
    const [accountResult, saveResult] = await Promise.all([
      db.collection('accounts').deleteOne({ id: accountId }),
      db.collection('saves').deleteMany({ slot: accountId }),
    ]);
    return NextResponse.json({ ok: true, deletedAccounts: accountResult.deletedCount, deletedSaves: saveResult.deletedCount });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }
}
