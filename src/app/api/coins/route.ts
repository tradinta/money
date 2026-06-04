import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const coinId = searchParams.get('coinId');

  try {
    // If a specific coin ID is requested, fetch its complete lineage tree!
    if (coinId) {
      const lineageRes = await query(
        `WITH RECURSIVE lineage AS (
          SELECT 
            id, "serialNumber", amount, "ownerId", "mintedAt", "parentBlockId", "createdByTransactionId", status, 0 as level
          FROM coin_blocks
          WHERE id = $1
          
          UNION ALL
          
          SELECT 
            c.id, c."serialNumber", c.amount, c."ownerId", c."mintedAt", c."parentBlockId", c."createdByTransactionId", c.status, l.level + 1
          FROM coin_blocks c
          INNER JOIN lineage l ON c.id = l."parentBlockId"
        )
        SELECT l.*, 
               u.username as owner_username,
               t.type as tx_type,
               t.description as tx_description
        FROM lineage l
        LEFT JOIN "user" u ON l."ownerId" = u.id
        LEFT JOIN transactions t ON l."createdByTransactionId" = t.id
        ORDER BY level DESC`, // DESC so the oldest (mint) is first in the list
        [coinId]
      );
      
      return NextResponse.json({ lineage: lineageRes.rows });
    }

    // Otherwise, return summary list of user's active and spent coins
    const activeCoinsRes = await query(
      `SELECT c.*, t.description as origin_description 
       FROM coin_blocks c
       LEFT JOIN transactions t ON c."createdByTransactionId" = t.id
       WHERE c."ownerId" = $1 AND c.status = 'active'
       ORDER BY c."mintedAt" DESC`,
      [session.user.id]
    );

    const spentCoinsRes = await query(
      `SELECT c.*, t.description as origin_description, st.description as spent_description 
       FROM coin_blocks c
       LEFT JOIN transactions t ON c."createdByTransactionId" = t.id
       LEFT JOIN transactions st ON c."spentByTransactionId" = st.id
       WHERE c."ownerId" = $1 AND c.status = 'spent'
       ORDER BY c."spentAt" DESC
       LIMIT 50`,
      [session.user.id]
    );

    return NextResponse.json({
      active: activeCoinsRes.rows,
      spent: spentCoinsRes.rows,
    });
  } catch (error: any) {
    console.error('Error in /api/coins:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
