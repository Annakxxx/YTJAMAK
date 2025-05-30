import { NextResponse } from 'next/server';
import { makeYouTubeApiRequest } from '@/app/utils/youtube';

interface CaptionResponse {
  items: Array<{
    id: string;
    snippet: {
      language: string;
      name: string;
    };
  }>;
}

interface CaptionData {
  text: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json(
      { error: 'videoId is required' },
      { status: 400 }
    );
  }

  try {
    // 자막 목록 가져오기
    const captionListResponse = await makeYouTubeApiRequest<CaptionResponse>(
      'https://www.googleapis.com/youtube/v3/captions',
      {
        part: 'snippet',
        videoId: videoId
      }
    );

    // 한국어 자막 찾기
    const koreanCaption = captionListResponse.items.find(
      item => item.snippet.language === 'ko'
    );

    if (!koreanCaption) {
      return NextResponse.json(
        { error: 'Korean caption not found' },
        { status: 404 }
      );
    }

    // 자막 내용 가져오기
    const captionResponse = await makeYouTubeApiRequest<CaptionData>(
      'https://www.googleapis.com/youtube/v3/captions/' + koreanCaption.id,
      {
        part: 'snippet'
      }
    );

    return NextResponse.json({ caption: captionResponse.text });
  } catch (error) {
    console.error('Error fetching caption:', error);
    return NextResponse.json(
      { error: 'Failed to fetch caption' },
      { status: 500 }
    );
  }
}
