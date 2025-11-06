'use client';
import { FloatingActionButton } from '@/components/shared/FloatingActionButton';
import { useRouter, useParams } from 'next/navigation';
import { HardHat, ArrowLeft } from 'lucide-react';

type Site = {
  id: string;
  name: string;
  contractorId: string;
};

const DUMMY_SITES: Site[] = [
    { id: 's1', name: '中央区Aビル新築工事（ダミー）', contractorId: 'c1' },
    { id: 's2', name: '港区マンション改修工事（ダミー）', contractorId: 'c1' },
    { id: 's3', name: '本社ビル移転プロジェクト（ダミー）', contractorId: 'c2' },
];

const ContractorPage = () => {
  const router = useRouter();
  const params = useParams();
  const contractorId = typeof params.contractorId === 'string' ? params.contractorId : '';

  const contractorName = `元請業者ID: ${contractorId}（仮）`;
  const sites = DUMMY_SITES.filter(s => s.contractorId === contractorId);

  const handleAddSite = () => {
    const name = prompt("新しい現場名を入力してください:");
    if (name) {
      alert(`「${name}」を追加しました。（ダミー）`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center mb-8">
        <button onClick={() => router.back()} className="mr-4 p-2 rounded-full hover:bg-background-light">
            <ArrowLeft className="w-6 h-6"/>
        </button>
        <h1 className="text-2xl font-bold">{contractorName} - 現場リスト</h1>
      </header>

      {sites.length === 0 ? (
        <p className="text-center p-10 bg-background-light rounded-lg">
          現場がありません。右下の「+」ボタンから追加してください。
        </p>
      ) : (
        <div className="space-y-4">
          {sites.map(site => (
            <button
              key={site.id}
              onClick={() => router.push(`/sites/${site.id}`)}
              className="w-full bg-background-light p-5 rounded-lg shadow text-left transition hover:bg-gray-700 flex items-center"
            >
              <HardHat className="w-6 h-6 mr-4 text-accent-yellow" />
              <span className="text-lg font-medium">{site.name}</span>
            </button>
          ))}
        </div>
      )}

      <FloatingActionButton onClick={handleAddSite} label="現場を追加" />
    </div>
  );
};

export default ContractorPage;
