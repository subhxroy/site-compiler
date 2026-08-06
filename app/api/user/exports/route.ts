import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'UID parameter is required' }, { status: 400 });
    }

    const snapshot = await adminDb
      .collection('users')
      .doc(uid)
      .collection('exports')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const exports: any[] = [];
    snapshot.forEach((doc) => {
      exports.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({ exports });
  } catch (error: any) {
    console.error('[Admin DB] Fetch exports error:', error);
    return NextResponse.json({ exports: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { uid, jobId, url, format, title, zipSizeKb, downloadUrl } = body || {};

    if (!uid || !jobId) {
      return NextResponse.json({ error: 'UID and jobId are required' }, { status: 400 });
    }

    const docRef = await adminDb
      .collection('users')
      .doc(uid)
      .collection('exports')
      .add({
        jobId,
        url,
        format,
        title: title || url,
        zipSizeKb: zipSizeKb || 0,
        downloadUrl,
        createdAt: Date.now(),
        savedAt: new Date().toISOString(),
      });

    return NextResponse.json({ status: 'ok', id: docRef.id });
  } catch (error: any) {
    console.error('[Admin DB] Save export error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save export' }, { status: 500 });
  }
}
