import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { handleRequestAction } from "@/lib/banking";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { action } = await req.json(); // 'approve' or 'decline'

    if (action !== 'approve' && action !== 'decline') {
      return NextResponse.json({ error: 'Action must be approve or decline.' }, { status: 400 });
    }

    const result = await handleRequestAction(id, session.user.id, action);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in money request action:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
