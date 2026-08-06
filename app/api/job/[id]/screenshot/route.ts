import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'desktop';

  const screenshotPath = path.resolve(
    process.cwd(),
    'exports',
    id,
    'raw',
    'screenshots',
    `${type}.png`
  );

  if (!fs.existsSync(screenshotPath)) {
    return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 });
  }

  const imageBuffer = fs.readFileSync(screenshotPath);
  return new NextResponse(imageBuffer, {
    headers: {
      'Content-Type': 'image/png',
    },
  });
}
