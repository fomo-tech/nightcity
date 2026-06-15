import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

function secret() {
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || 'night-city-pixel-admin-dev';
}

function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function adminPasswordConfigured() {
  return !!process.env.ADMIN_PASSWORD;
}

export function verifyAdminPassword(password) {
  return safeEqual(password, process.env.ADMIN_PASSWORD || 'admin');
}

export function createAdminToken() {
  const payload = JSON.stringify({ role: 'admin', exp: Date.now() + TOKEN_TTL_MS });
  const encoded = Buffer.from(payload).toString('base64url');
  return encoded + '.' + sign(encoded);
}

export function readAdminToken(request) {
  const auth = request.headers.get('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return request.cookies.get('ncpx_admin')?.value || '';
}

export function verifyAdminToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2 || !safeEqual(parts[1], sign(parts[0]))) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    return payload.role === 'admin' && Number(payload.exp) > Date.now();
  } catch (error) {
    return false;
  }
}

export function requireAdmin(request) {
  if (verifyAdminToken(readAdminToken(request))) return null;
  return NextResponse.json({ ok: false, error: 'ADMIN_AUTH_REQUIRED' }, { status: 401 });
}
