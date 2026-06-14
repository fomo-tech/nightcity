import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { getDb } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cleanName(value) {
  return String(value || 'V').replace(/[^\p{L}\p{N}_ -]/gu, '').trim().slice(0, 18).toUpperCase() || 'V';
}

function cleanId(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
}

function hashToken(token) {
  return createHash('sha256').update(String(token || '')).digest('hex');
}

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

function errorResponse(error, status = 200) {
  console.warn('Quick account warning:', error.message);
  return NextResponse.json({ ok: false, dbConnected: false, error: error.message || 'Account request failed' }, { status });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const db = await getDb();
    const accounts = db.collection('accounts');
    const accountId = cleanId(body.accountId);
    const token = String(body.token || '');

    if (accountId && token) {
      const doc = await accounts.findOne({ id: accountId, tokenHash: hashToken(token) }, { projection: { _id: 0, tokenHash: 0 } });
      if (!doc) {
        return NextResponse.json({ ok: false, error: 'ACCOUNT_TOKEN_INVALID' }, { status: 401 });
      }
      return NextResponse.json({ ok: true, account: publicAccount(doc), token });
    }

    const now = new Date();
    const id = 'acct_' + randomBytes(8).toString('hex');
    const nextToken = 'ncp_' + randomBytes(24).toString('base64url');
    const account = {
      id,
      slot: id,
      provider: 'quick',
      name: cleanName(body.name),
      tokenHash: hashToken(nextToken),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await accounts.insertOne(account);
    const { tokenHash, ...safeAccount } = account;
    return NextResponse.json({ ok: true, account: publicAccount(safeAccount), token: nextToken });
  } catch (error) {
    return errorResponse(error);
  }
}
