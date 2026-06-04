import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { depositCoins } from "@/lib/banking";

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { username, amount } = await req.json();
    const parsedAmount = parseFloat(amount);

    if (!username) {
      return NextResponse.json({ error: 'Username is required.' }, { status: 400 });
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount. Must be positive.' }, { status: 400 });
    }

    const result = await depositCoins(session.user.id, username.trim().toLowerCase(), parsedAmount);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in /api/deposit:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
