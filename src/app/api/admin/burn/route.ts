import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { query } from "@/lib/db";
import { burnCoins } from "@/lib/banking";

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

    const { amount } = await req.json();
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount. Must be positive.' }, { status: 400 });
    }

    const result = await burnCoins(session.user.id, parsedAmount);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in /api/admin/burn:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
