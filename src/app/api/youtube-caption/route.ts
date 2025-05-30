import axios from 'axios';
import { JSDOM } from 'jsdom';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface CaptionData {
  text: string;
}

interface CaptionTrack {
  languageCode: string;
  baseUrl: string;
}

function parseCaptions(xmlData: string) {
  const dom = new JSDOM(xmlData, { contentType: 'text/xml' });
  return Array.from(dom.window.document.getElementsByTagName('text')).map((el) => ({
    start: el.getAttribute('start'),
    dur: el.getAttribute('dur'),
    text: el.textContent || '',
  }));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
  }

  try {
    // 1. 유튜브 HTML 페이지 가져오기
    const pageRes = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      },
    });

    // 2. ytInitialPlayerResponse 파싱
    const match = pageRes.data.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
    if (!match) throw new Error('ytInitialPlayerResponse not found');

    const playerResponse = JSON.parse(match[1]);

    // 3. 자막 URL 추출
    const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks || tracks.length === 0) throw new Error('No captionTracks found');

    const koTrack = tracks.find((t: CaptionTrack) => t.languageCode === 'ko');
    const selectedTrack = koTrack || tracks[0];
    const captionRes = await axios.get(selectedTrack.baseUrl);

    // 4. XML 자막 파싱
    const captions = parseCaptions(captionRes.data);
    const raw = Array.isArray(captions)
      ? captions.map((c: CaptionData) => c.text).join('\n')
      : captions;
    return NextResponse.json({ captions: raw }, { status: 200 });
  } catch (error) {
    console.error('❌ 자막 추출 실패:', error);
    return NextResponse.json({ error: '자막을 불러오지 못했습니다.' }, { status: 500 });
  }
}
