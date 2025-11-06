'use client';
import { useAuth } from '@/context/AuthContext';
import { FloatingActionButton } from '@/components/shared/FloatingActionButton';
import { useRouter } from 'next/navigation';
import { Building } from 'lucide-react';
import { LoadingScreen } from '@/components/shared/LoadingScreen';

type Contractor = {
  id: string;
  name: string;
  ownerId: string;
};

const DUMMY_CONTRACTORS: Contractor[] = [
  { id: 'c1', name: '株式会社サンプル建設（ダミー）', ownerId: 'DUMMY_USER_ID' },
  { id: 'c2', name: 'テクノロジーパートナーズ（ダミー）', ownerId: 'DUMMY_USER_ID' },
];

const HomePage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return <div className="h-screen"><LoadingScreen message="認証確認中..." /></div>;
  }

  const contractors = user ? DUMMY_CONTRACTORS.filter(c => c.ownerId === user.uid) : [];

  const handleAddContractor = () => {
    const name = prompt("新しい元請業者の名前を入力してください:");
    if (name && user) {
      alert(`「${name}」を追加しました。（ダミー）`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">元請業者リスト</h1>
      </header>

      {contractors.length === 0 ? (
        <p className="text-center p-10 bg-background-light rounded-lg">
          データがありません。右下の「+」ボタンから追加してください。
        </p>
      ) : (
        <div className="space-y-4">
          {contractors.map(contractor => (
            <button
              key={contractor.id}
              onClick={() => router.push(`/contractors/${contractor.id}`)}
              className="w-full bg-background-light p-5 rounded-lg shadow text-left transition hover:bg-gray-700 flex items-center"
            >
              <Building className="w-6 h-6 mr-4 text-action-blue" />
              <span className="text-lg font-medium">{contractor.name}</span>
            </button>
          ))}
        </div>
      )}

      <FloatingActionButton onClick={handleAddContractor} label="元請業者を追加" />
    </div>
  );
};

export default HomePage;
