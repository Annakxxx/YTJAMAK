import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { caption } = await req.json();

    if (!caption || typeof caption !== 'string') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // 1. 공백 정리
    const cleaned = caption
      .replace(/\s+/g, ' ') // 여러 공백 -> 한 칸
      .trim();

    // 2. 문장 단위로 분리 (마침표, 느낌표, 물음표 뒤 공백 기준)
    const sentences = cleaned.split(/(?<=[.?!])\s+/);

    // 3. 문장 끝에 마침표 없으면 붙이기
    const punctuated = sentences.map(s => {
      const line = s.trim();
      return /[.?!]$/.test(line) ? line : line + '.';
    });

    // 4. 문장 기준 줄바꿈 조합
    const result = punctuated.join('\n');

    return NextResponse.json({ result });
  } catch (error) {
    console.error('fix-captions 오류:', error);
    return NextResponse.json({ error: 'Failed to clean caption' }, { status: 500 });
  }
}
