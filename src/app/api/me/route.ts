import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { query, initializeDatabase } from "@/lib/db";

let dbInitialized = false;

export async function GET() {
  // Automatically initialize database if not done in this runtime instance
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  try {
    // Fetch complete user data including custom columns
    const userRes = await query('SELECT * FROM "user" WHERE id = $1', [session.user.id]);
    let userData = userRes.rows[0];

    if (!userData) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    // Auto-promote first user to Admin for easy testing
    const countRes = await query('SELECT COUNT(*) FROM "user"');
    const userCount = parseInt(countRes.rows[0].count);
    if (userCount === 1 && userData.role !== 'admin') {
      await query('UPDATE "user" SET role = \'admin\' WHERE id = $1', [userData.id]);
      userData.role = 'admin';
      console.log(`Auto-promoted first user (${userData.email}) to Admin.`);
    }

    // Auto-initialize username if null or empty
    if (!userData.username) {
      let baseUsername = userData.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (baseUsername.length < 3) baseUsername = 'user';
      
      let finalUsername = baseUsername;
      let suffix = 1;
      while (true) {
        const exist = await query('SELECT id FROM "user" WHERE username = $1', [finalUsername]);
        if (exist.rows.length === 0) break;
        finalUsername = `${baseUsername}${suffix}`;
        suffix++;
      }
      
      await query('UPDATE "user" SET username = $1 WHERE id = $2', [finalUsername, userData.id]);
      userData.username = finalUsername;
      console.log(`Auto-generated username ${finalUsername} for user ID ${userData.id}`);
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        image: userData.image,
        role: userData.role,
        username: userData.username || userData.name.toLowerCase().replace(/\s+/g, ''),
        balance: parseFloat(userData.balance || 0),
        overdraftLimit: parseFloat(userData.overdraftLimit || 0),
        savingsBalance: parseFloat(userData.savingsBalance || 0),
      },
      session: session.session,
    });
  } catch (error: any) {
    console.error('Error in /api/me:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST endpoint to update username
export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { username } = await req.json();
    const cleanUsername = username?.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (!cleanUsername || cleanUsername.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 alphanumeric characters.' }, { status: 400 });
    }

    // Check if username is taken
    const existing = await query('SELECT id FROM "user" WHERE username = $1 AND id != $2', [cleanUsername, session.user.id]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Username is already taken.' }, { status: 400 });
    }

    await query('UPDATE "user" SET username = $1 WHERE id = $2', [cleanUsername, session.user.id]);

    return NextResponse.json({ success: true, username: cleanUsername });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
