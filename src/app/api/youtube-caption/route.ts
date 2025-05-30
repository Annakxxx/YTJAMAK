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

// 자막 XML 파싱
function parseCaptions(xmlData: string) {
  try {
    const dom = new JSDOM(xmlData, { contentType: 'text/xml' });
    const texts = dom.window.document.getElementsByTagName('text');
    if (texts.length === 0) throw new Error('자막 항목 없음');
    return Array.from(texts).map((el) => ({
      start: el.getAttribute('start'),
      dur: el.getAttribute('dur'),
      text: el.textContent || '',
    }));
  } catch (e) {
    console.error('XML 파싱 실패:', e);
    throw e;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
  }

  try {
    // 1. HTML 파싱 방식
    const pageRes = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      },
    });

    const match = pageRes.data.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
    if (!match) throw new Error('ytInitialPlayerResponse not found');

    const playerResponse = JSON.parse(match[1]);

    const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks || tracks.length === 0) throw new Error('No captionTracks found');

    const koTrack = tracks.find((t: CaptionTrack) => t.languageCode === 'ko');
    const selectedTrack = koTrack || tracks[0];
    const captionRes = await axios.get(selectedTrack.baseUrl);

    if (!captionRes.data || captionRes.data.trim() === '') {
      throw new Error('자막 XML이 비어 있음');
    }

    const captions = parseCaptions(captionRes.data);
    const raw = captions.map((c: CaptionData) => c.text).join('\n');

    return NextResponse.json({ captions: raw }, { status: 200 });

  } catch (error) {
    console.warn('⚠️ 기본 방식 실패, fallback 시도 중:', error);

    // 2. fallback: 비공식 YouTube 자막 API
    try {
      const fallbackUrl = `https://www.youtube.com/api/timedtext?lang=ko&v=${videoId}`;
      const fallbackRes = await axios.get(fallbackUrl);
      if (!fallbackRes.data || !fallbackRes.data.includes('<text')) {
        throw new Error('Fallback 자막 없음');
      }

      const fallbackCaptions = parseCaptions(fallbackRes.data);
      const fallbackRaw = fallbackCaptions.map((c: CaptionData) => c.text).join('\n');

      return NextResponse.json({ captions: fallbackRaw }, { status: 200 });

    } catch (fallbackError) {
      console.error('❌ 자막 추출 완전 실패:', fallbackError);
      return NextResponse.json({ error: '자막을 불러오지 못했습니다.' }, { status: 500 });
    }
  }
}
