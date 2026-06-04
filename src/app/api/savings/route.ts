import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { depositToSavings, withdrawFromSavings, simulateSavingsInterest } from "@/lib/banking";

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action, amount } = await req.json();

    if (action === 'deposit') {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ error: 'Invalid deposit amount.' }, { status: 400 });
      }
      const result = await depositToSavings(session.user.id, parsedAmount);
      return NextResponse.json(result);
    } 
    
    if (action === 'withdraw') {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ error: 'Invalid withdrawal amount.' }, { status: 400 });
      }
      const result = await withdrawFromSavings(session.user.id, parsedAmount);
      return NextResponse.json(result);
    } 
    
    if (action === 'simulate_interest') {
      const result = await simulateSavingsInterest(session.user.id);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in savings API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
