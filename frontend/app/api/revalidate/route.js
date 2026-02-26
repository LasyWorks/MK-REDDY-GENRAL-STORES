import { revalidateTag, revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { verifySignature } from '@/lib/requestSigning';

export async function POST(req) {
  try {
    const body = await req.json();
    const { tags = [], paths = [] } = body;
    
    // Extract signature and timestamp from headers
    const signature = req.headers.get('x-signature');
    const timestamp = parseInt(req.headers.get('x-timestamp'), 10);
    
    if (!signature || !timestamp) {
      return NextResponse.json(
        { error: 'Missing request signature or timestamp' }, 
        { status: 401 }
      );
    }
    
    // Verify signature with 5-minute time window
    const isValid = verifySignature(
      body,
      signature,
      process.env.REVALIDATION_SECRET,
      timestamp,
      300 // 5 minutes
    );
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired request signature' }, 
        { status: 403 }
      );
    }
    
    // Revalidate tags and paths
    for (const tag of tags) {
      revalidateTag(tag, "max");
    }
    for (const path of paths) {
      revalidatePath(path);
    }
    
    return NextResponse.json({
      revalidated: true,
      tags,
      paths,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
