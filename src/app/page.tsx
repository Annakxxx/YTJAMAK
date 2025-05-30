'use client';

import { useState } from 'react';

interface CaptionData {
  captions: string | Array<{ text: string }>;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractVideoId = (input: string): string => {
    try {
      const u = new URL(input);
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
      if (u.hostname.includes('youtube.com')) return u.searchParams.get('v') || '';
    } catch {
      return '';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const videoId = extractVideoId(url);
    if (!videoId) {
      setError('유효한 유튜브 링크를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setCaption('');

    try {
      const captionResponse = await fetch(`/api/youtube-caption?videoId=${videoId}`);
      const captionData = await captionResponse.json() as CaptionData;
      const raw = Array.isArray(captionData.captions)
        ? captionData.captions.map((c) => c.text).join('\n')
        : captionData.captions;

      const fixedResponse = await fetch('/api/fix-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: raw }),
      });
      const { result } = await fixedResponse.json();
      setCaption(result);
    } catch (error) {
      console.error('Error processing caption:', error);
      setError('자막 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">YTJAMAK - 유튜브 자막 추출기</h1>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="유튜브 링크를 입력하세요"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 border rounded px-4 py-2"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? '처리 중...' : '자막 추출'}
        </button>
      </form>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {caption && (
        <div className="bg-gray-100 rounded p-4 whitespace-pre-wrap">
          {caption}
        </div>
      )}
    </main>
  );
}
