'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { Toolbar } from '@/components/viewer/Toolbar';
import { useDrawingStore } from '@/store/useDrawingStore';

const DrawingCanvas = dynamic(() => import('@/components/viewer/DrawingCanvas').then(mod => mod.DrawingCanvas), {
    ssr: false,
    loading: () => <LoadingScreen message="キャンバスを準備中..." />,
});

type DrawingDoc = {
  name: string;
  imageUrl: string;
};

const ViewerPage = () => {
  const params = useParams();
  const drawingId = typeof params.drawingId === 'string' ? params.drawingId : '';
  
  const resetStore = useDrawingStore(state => state.resetStore);

  const [data, setData] = useState<DrawingDoc | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!drawingId) return;
    
    resetStore();

    const fetchData = async () => {
        setLoading(true);
        const dummyData: DrawingDoc = {
            name: `図面ID: ${drawingId} (ダミー)`,
            imageUrl: 'https://placehold.jp/1600x1200.png?text=Dummy+Drawing+Image',
        };
        setData(dummyData);

        const img = new Image();
        img.onload = () => {
            setImageSize({ width: img.width, height: img.height });
            setLoading(false);
        };
        img.onerror = () => {
            alert("画像の読み込みに失敗しました。");
            setLoading(false);
        }
        img.src = dummyData.imageUrl;
    };
    
    fetchData();

  }, [drawingId, resetStore]);

  if (loading || !data) {
    return <div className="h-screen"><LoadingScreen message="図面を読み込んでいます..." /></div>;
  }

  return (
    <div className="w-full h-screen flex flex-col bg-background-dark">
      <div className="flex-grow w-full h-full relative overflow-hidden">
          <DrawingCanvas imageUrl={data.imageUrl} imageSize={imageSize} />
      </div>
      <Toolbar drawingName={data.name} />
    </div>
  );
};

export default ViewerPage;
