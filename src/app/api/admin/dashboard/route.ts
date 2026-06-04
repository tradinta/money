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
    // 1. Verify user is admin
    const userRes = await query('SELECT role FROM "user" WHERE id = $1', [session.user.id]);
    const user = userRes.rows[0];
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    // 2. Fetch System Supply Metrics
    // Total minted is the sum of all 'mint' transactions
    const mintedRes = await query(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'mint'`);
    const totalMinted = parseFloat(mintedRes.rows[0].total);

    // Vault reserve is the sum of active coins where ownerId IS NULL
    const vaultRes = await query(`SELECT COALESCE(SUM(amount), 0) as total FROM coin_blocks WHERE "ownerId" IS NULL AND status = 'active'`);
    const vaultReserve = parseFloat(vaultRes.rows[0].total);

    // Circulation is the sum of active coins owned by users (ownerId IS NOT NULL)
    const circRes = await query(`SELECT COALESCE(SUM(amount), 0) as total FROM coin_blocks WHERE "ownerId" IS NOT NULL AND status = 'active'`);
    const inCirculation = parseFloat(circRes.rows[0].total);

    // Accumulated fees is the sum of fee column in transfer transactions
    const feesRes = await query(`SELECT COALESCE(SUM(fee), 0) as total FROM transactions`);
    const accumulatedFees = parseFloat(feesRes.rows[0].total);

    // 3. Fetch Pending Overdraft Requests with user username
    const overdraftRes = await query(
      `SELECT r.*, u.username, u.balance
       FROM overdraft_requests r
       JOIN "user" u ON r."userId" = u.id
       WHERE r.status = 'pending'
       ORDER BY r."createdAt" ASC`
    );

    // 4. Fetch Audit Logs (last 100 entries, including suspicious ones)
    const logsRes = await query(
      `SELECT a.*, u.username
       FROM audit_logs a
       LEFT JOIN "user" u ON a."userId" = u.id
       ORDER BY a."createdAt" DESC
       LIMIT 100`
    );

    // 5. Fetch List of All Users
    const usersRes = await query(
      `SELECT id, name, email, role, username, balance, "overdraftLimit", "savingsBalance", "createdAt"
       FROM "user"
       ORDER BY "createdAt" DESC`
    );

    return NextResponse.json({
      metrics: {
        totalMinted,
        vaultReserve,
        inCirculation,
        accumulatedFees,
      },
      overdraftRequests: overdraftRes.rows,
      auditLogs: logsRes.rows,
      users: usersRes.rows,
    });
  } catch (error: any) {
    console.error('Error fetching admin dashboard:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
