import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { query } from "@/lib/db";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch transactions where user is sender OR receiver
    // Include the usernames of other parties involved
    const txsRes = await query(
      `SELECT t.*, 
              s.username as sender_username, 
              r.username as receiver_username
       FROM transactions t
       LEFT JOIN "user" s ON t."senderId" = s.id
       LEFT JOIN "user" r ON t."receiverId" = r.id
       WHERE t."senderId" = $1 OR t."receiverId" = $1
       ORDER BY t."createdAt" DESC
       LIMIT 100`,
      [session.user.id]
    );

    return NextResponse.json({ transactions: txsRes.rows });
  } catch (error: any) {
    console.error('Error in /api/transactions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
