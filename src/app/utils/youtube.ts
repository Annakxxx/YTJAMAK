import axios from 'axios';

const API_KEY = process.env.YOUTUBE_API_KEY;

export async function makeYouTubeApiRequest<T>(
  url: string,
  params: Record<string, string | number | boolean>
): Promise<T> {
  try {
    const response = await axios.get(url, {
      params: {
        ...params,
        key: API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    console.error('YouTube API 요청 실패:', error);
    throw error;
  }
} 