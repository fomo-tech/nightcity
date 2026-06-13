import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cleanSlot(slot) {
  return String(slot || 'default').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'default';
}

function errorResponse(error, status = 500) {
  return NextResponse.json({ ok: false, error: error.message || 'Save request failed' }, { status });
}

export async function GET(_request, { params }) {
  try {
    const { slot } = await params;
    const db = await getDb();
    const doc = await db.collection('saves').findOne({ slot: cleanSlot(slot) }, { projection: { _id: 0 } });
    return NextResponse.json({ ok: true, save: doc ? doc.save : null, updatedAt: doc ? doc.updatedAt : null });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const { slot } = await params;
    const body = await request.json();
    if (!body || typeof body !== 'object' || !body.save || typeof body.save !== 'object') {
      return errorResponse(new Error('Expected JSON body: { "save": { ... } }'), 400);
    }

    const now = new Date();
    const db = await getDb();
    await db.collection('saves').updateOne(
      { slot: cleanSlot(slot) },
      { $set: { slot: cleanSlot(slot), save: body.save, updatedAt: now } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, updatedAt: now.toISOString() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { slot } = await params;
    const db = await getDb();
    await db.collection('saves').deleteOne({ slot: cleanSlot(slot) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
