import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { query } from "@/lib/db";
import { deductCoins } from "@/lib/banking";

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Verify user is admin
    const userRes = await query('SELECT role FROM "user" WHERE id = $1', [session.user.id]);
    const user = userRes.rows[0];
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const { username, amount } = await req.json();
    const parsedAmount = parseFloat(amount);

    if (!username) {
      return NextResponse.json({ error: 'Username is required.' }, { status: 400 });
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount. Must be positive.' }, { status: 400 });
    }

    const result = await deductCoins(session.user.id, username.trim().toLowerCase(), parsedAmount);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in /api/admin/deduct:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
