import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { query } from "@/lib/db";
import { createMoneyRequest } from "@/lib/banking";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get requests sent by the user
    const sentRes = await query(
      `SELECT r.*, u.username as payer_username
       FROM money_requests r
       JOIN "user" u ON r."payerId" = u.id
       WHERE r."requesterId" = $1
       ORDER BY r."createdAt" DESC`,
      [session.user.id]
    );

    // Get requests received by the user
    const receivedRes = await query(
      `SELECT r.*, u.username as requester_username
       FROM money_requests r
       JOIN "user" u ON r."requesterId" = u.id
       WHERE r."payerId" = $1
       ORDER BY r."createdAt" DESC`,
      [session.user.id]
    );

    return NextResponse.json({
      sent: sentRes.rows,
      received: receivedRes.rows,
    });
  } catch (error: any) {
    console.error('Error in /api/requests:', error);
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
    const { username, amount, description } = await req.json();
    const parsedAmount = parseFloat(amount);

    if (!username) {
      return NextResponse.json({ error: 'Username is required.' }, { status: 400 });
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount. Must be positive.' }, { status: 400 });
    }

    const result = await createMoneyRequest(
      session.user.id,
      username.trim().toLowerCase(),
      parsedAmount,
      description
    );
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in POST /api/requests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
