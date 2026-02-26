import { revalidateTag, revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
export async function POST(req) {
  try {
    const body = await req.json();
    const { secret, tags = [], paths = [] } = body;
    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }
    for (const tag of tags) {
      revalidateTag(tag);
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