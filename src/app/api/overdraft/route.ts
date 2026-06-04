import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/banking";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const requests = await query(
      `SELECT * FROM overdraft_requests WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
      [session.user.id]
    );
    return NextResponse.json({ requests: requests.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { requestedAmount, reason } = await req.json();
    const amount = parseFloat(requestedAmount);

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive.' }, { status: 400 });
    }

    // Check if user already has a pending request
    const pendingRes = await query(
      `SELECT id FROM overdraft_requests WHERE "userId" = $1 AND status = 'pending'`,
      [session.user.id]
    );

    if (pendingRes.rows.length > 0) {
      return NextResponse.json({ error: 'You already have a pending overdraft request.' }, { status: 400 });
    }

    const id = 'od_' + Math.random().toString(36).substring(2, 15);
    await query(
      `INSERT INTO overdraft_requests (id, "userId", "requestedAmount", status, reason)
       VALUES ($1, $2, $3, 'pending', $4)`,
      [id, session.user.id, amount, reason || 'Emergency funds']
    );

    await logAudit(session.user.id, 'OVERDRAFT_REQUEST_CREATED', `Requested overdraft limit of ${amount.toFixed(2)}`);

    return NextResponse.json({ success: true, requestId: id });
  } catch (error: any) {
    console.error('Error requesting overdraft:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
