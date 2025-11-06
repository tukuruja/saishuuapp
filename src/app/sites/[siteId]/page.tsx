'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { FileText, ArrowLeft, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { uploadFileAndProcess, db, collection, addDoc, serverTimestamp } from '@/lib/firebase/config';

type Drawing = {
  id: string;
  name: string;
  siteId: string;
};

const DUMMY_DRAWINGS: Drawing[] = [
    { id: 'd1', name: '1F 平面詳細図（ダミー）', siteId: 's1' },
    { id: 'd2', name: '構造図 S-001（ダミー）', siteId: 's1' },
];

const SitePage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const siteId = typeof params.siteId === 'string' ? params.siteId : '';

  const [isUploading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("アップロード待機中");

  const siteName = `現場ID: ${siteId}（仮）`;
  const drawings = DUMMY_DRAWINGS.filter(d => d.siteId === siteId);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;

    const file = e.target.files[0];
    const drawingName = file.name.replace(/\.[^/.]+$/, "");

    if (file.size > 40 * 1024 * 1024) {
        alert("ファイルサイズが40MBを超えています。");
        return;
    }

    setIsLoading(true);
    setProgress(0);
    setUploadStatus("開始中...");

    try {
        const { processedImageUrl } = await uploadFileAndProcess(file, user.uid, (prog, status) => {
            setProgress(prog);
            setUploadStatus(status);
        }) as { processedImageUrl: string };

        const docRef = await addDoc(collection(db, 'drawings'), {
            name: drawingName,
            imageUrl: processedImageUrl,
            siteId: siteId,
            ownerId: user.uid,
            createdAt: serverTimestamp(),
        });

        alert("図面のアップロードと解析が完了しました。（シミュレーション動作）");
        setIsLoading(false);
        
        router.push(`/viewer/${docRef.id}`);

    } catch (error) {
        console.error("Upload error:", error);
        alert("処理中にエラーが発生しました。");
        setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center mb-8">
        <button onClick={() => router.back()} className="mr-4 p-2 rounded-full hover:bg-background-light">
            <ArrowLeft className="w-6 h-6"/>
        </button>
        <h1 className="text-2xl font-bold">{siteName} - 図面管理</h1>
      </header>

      <section className="bg-background-light p-6 rounded-lg shadow space-y-4">
        <h2 className="text-lg font-semibold">新しい図面をアップロード</h2>
        {isUploading ? (
            <div className="space-y-3">
                <p className="text-center font-bold text-action-blue">{uploadStatus} ({Math.round(progress)}%)</p>
                <div className="w-full bg-gray-700 rounded-full h-4">
                    <div
                        className="bg-action-blue h-4 rounded-full transition-all duration-150"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>
        ) : (
            <>
                <input
                    id="fileUpload"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    onChange={handleUpload}
                    className="hidden"
                />
                <label htmlFor="fileUpload" className="cursor-pointer block">
                    {/* Buttonコンポーネントをspanとして使用 */}
                    <Button variant="primary" fullWidth as="span">
                        <UploadCloud className="mr-3 w-5 h-5" />
                        ファイルを選択 (PDF/画像, 最大40MB)
                    </Button>
                </label>
            </>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">保存済みの図面</h2>
        {drawings.length === 0 ? (
            <p className="text-center p-10 bg-background-light rounded-lg">
            図面がありません。上記からアップロードしてください。
            </p>
        ) : (
            <div className="space-y-4">
            {drawings.map(drawing => (
                <button
                key={drawing.id}
                onClick={() => router.push(`/viewer/${drawing.id}`)}
                className="w-full bg-background-light p-5 rounded-lg shadow text-left transition hover:bg-gray-700 flex items-center"
                >
                <FileText className="w-6 h-6 mr-4 text-action-blue" />
                <span className="text-lg font-medium">{drawing.name}</span>
                </button>
            ))}
            </div>
        )}
      </section>
    </div>
  );
};

export default SitePage;
