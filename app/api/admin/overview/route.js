import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getDb } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function publicAccount(doc) {
  return {
    id: doc.id,
    slot: doc.slot || doc.id,
    name: doc.name || 'V',
    provider: doc.provider || 'quick',
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  };
}

function cleanConfig(input) {
  const cfg = input && typeof input === 'object' ? input : {};
  return {
    maintenance: !!cfg.maintenance,
    maintenanceMessage: String(cfg.maintenanceMessage || '').slice(0, 160),
    realtimeEnabled: cfg.realtimeEnabled !== false,
    maxPlayersPerRoom: Math.max(2, Math.min(64, Math.round(Number(cfg.maxPlayersPerRoom) || 16))),
    motd: String(cfg.motd || '').slice(0, 160),
  };
}

function fallbackConfig() {
  return cleanConfig({ realtimeEnabled: true, maxPlayersPerRoom: 16, motd: 'WELCOME TO NIGHT CITY' });
}

export async function GET(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const db = await getDb();
    const [accounts, savesCount, configDoc] = await Promise.all([
      db.collection('accounts').find({}, { projection: { _id: 0, tokenHash: 0 } }).sort({ updatedAt: -1, createdAt: -1 }).limit(200).toArray(),
      db.collection('saves').countDocuments(),
      db.collection('app_config').findOne({ id: 'main' }, { projection: { _id: 0 } }),
    ]);
    return NextResponse.json({
      ok: true,
      dbConnected: true,
      users: accounts.map(publicAccount),
      stats: { users: accounts.length, saves: savesCount },
      config: cleanConfig(configDoc?.config || fallbackConfig()),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, dbConnected: false, error: error.message, users: [], stats: { users: 0, saves: 0 }, config: fallbackConfig() }, { status: 200 });
  }
}

export async function PUT(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({}));
    const config = cleanConfig(body.config);
    const db = await getDb();
    await db.collection('app_config').updateOne(
      { id: 'main' },
      { $set: { id: 'main', config, updatedAt: new Date().toISOString() } },
      { upsert: true },
    );
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }
}
