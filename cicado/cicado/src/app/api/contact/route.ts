import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    const client = await clientPromise();
    const db = client.db();
    await db.collection('contacts').insertOne({
      name,
      email,
      message,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[contact] Failed to save message:', err);
    return NextResponse.json({ error: 'Failed to save message.' }, { status: 500 });
  }
}
