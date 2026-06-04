import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { query } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: txId } = await params;

  try {
    // 1. Fetch transaction details
    const txRes = await query(
      `SELECT t.*, 
              s.username as sender_username, 
              s.name as sender_name,
              r.username as receiver_username,
              r.name as receiver_name
       FROM transactions t
       LEFT JOIN "user" s ON t."senderId" = s.id
       LEFT JOIN "user" r ON t."receiverId" = r.id
       WHERE t.id = $1`,
      [txId]
    );

    const transaction = txRes.rows[0];
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // 2. Fetch coin blocks created by this transaction
    const createdBlocksRes = await query(
      `SELECT cb.id, cb."serialNumber", cb.amount, cb."ownerId", cb.status, u.username as owner_username
       FROM coin_blocks cb
       LEFT JOIN "user" u ON cb."ownerId" = u.id
       WHERE cb."createdByTransactionId" = $1`,
      [txId]
    );

    // 3. Fetch coin blocks spent by this transaction
    const spentBlocksRes = await query(
      `SELECT cb.id, cb."serialNumber", cb.amount, cb."ownerId", cb.status, u.username as owner_username
       FROM coin_blocks cb
       LEFT JOIN "user" u ON cb."ownerId" = u.id
       WHERE cb."spentByTransactionId" = $1`,
      [txId]
    );

    return NextResponse.json({
      transaction,
      createdBlocks: createdBlocksRes.rows,
      spentBlocks: spentBlocksRes.rows,
    });
  } catch (error: any) {
    console.error('Error in GET /api/transactions/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
