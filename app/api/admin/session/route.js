import { NextResponse } from 'next/server';
import { adminPasswordConfigured, createAdminToken, verifyAdminPassword } from '@/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (!verifyAdminPassword(String(body.password || ''))) {
    return NextResponse.json({ ok: false, error: 'ADMIN_PASSWORD_INVALID' }, { status: 401 });
  }
  const token = createAdminToken();
  const res = NextResponse.json({ ok: true, token, passwordConfigured: adminPasswordConfigured() });
  res.cookies.set('ncpx_admin', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 8 * 60 * 60 });
  return res;
}
