import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/banking";

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

    const { requestId, action } = await req.json(); // 'approve' or 'reject'

    if (!requestId || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json({ error: 'Invalid parameters.' }, { status: 400 });
    }

    // Fetch the request
    const reqRes = await query('SELECT * FROM overdraft_requests WHERE id = $1', [requestId]);
    const request = reqRes.rows[0];

    if (!request) {
      return NextResponse.json({ error: 'Overdraft request not found.' }, { status: 404 });
    }

    if (request.status !== 'pending') {
      return NextResponse.json({ error: 'Request already processed.' }, { status: 400 });
    }

    const requestedAmount = parseFloat(request.requested_amount || request.requestedAmount);

    if (action === 'approve') {
      // 1. Update user's overdraft limit
      await query(
        `UPDATE "user" SET "overdraftLimit" = $1 WHERE id = $2`,
        [requestedAmount, request.userId]
      );
      // 2. Set request status to approved
      await query(
        `UPDATE overdraft_requests SET status = 'approved', "updatedAt" = NOW() WHERE id = $1`,
        [requestId]
      );

      await logAudit(
        session.user.id,
        'OVERDRAFT_APPROVED',
        `Approved overdraft limit of ${requestedAmount.toFixed(2)} for user ID ${request.userId}`
      );
    } else {
      // Set request status to rejected
      await query(
        `UPDATE overdraft_requests SET status = 'rejected', "updatedAt" = NOW() WHERE id = $1`,
        [requestId]
      );

      await logAudit(
        session.user.id,
        'OVERDRAFT_REJECTED',
        `Rejected overdraft limit of ${requestedAmount.toFixed(2)} for user ID ${request.userId}`
      );
    }

    return NextResponse.json({ success: true, action });
  } catch (error: any) {
    console.error('Error processing overdraft request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
