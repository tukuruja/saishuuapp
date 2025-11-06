'use client';
import { useDrawingStore, Tool } from '@/store/useDrawingStore';
import { Move, Ruler, Scaling, Trash2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface ToolbarProps {
    drawingName: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({ drawingName }) => {
  const { tool, setTool, clearMeasurements } = useDrawingStore();
  const router = useRouter();

  const handleClear = () => {
    if (window.confirm("全ての計測結果を削除しますか？")) {
        clearMeasurements();
    }
  };

  const handleExport = () => {
    alert("【実装予定】この画面をPDFとして出力します。");
  };

  const ToolButton = ({ icon: Icon, label, targetTool }: { icon: any, label: string, targetTool: Tool }) => {
    const isActive = tool === targetTool;
    return (
        <button
            onClick={() => setTool(targetTool)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition ${
                isActive ? 'text-action-blue bg-background-light' : 'text-text-secondary hover:text-text-primary'
            }`}
        >
            <Icon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{label}</span>
        </button>
    );
  };

  return (
    <div className="w-full bg-background-dark shadow-inner-lg border-t border-background-light p-4 space-y-4">
        <div className="flex justify-between items-center">
            <h1 className="text-sm truncate max-w-xs" title={drawingName}>{drawingName}</h1>
            <Button onClick={handleExport} variant="primary" className="min-h-0 h-10">
                PDF出力
            </Button>
        </div>
        
        <div className="flex justify-around items-center">
            <ToolButton icon={Move} label="移動" targetTool="move" />
            <ToolButton icon={Scaling} label="縮尺設定" targetTool="scale" />
            <ToolButton icon={Ruler} label="距離計測" targetTool="measure" />
            
            <button
                onClick={handleClear}
                className="flex flex-col items-center justify-center p-2 rounded-lg text-text-secondary hover:text-error-red transition"
            >
                <Trash2 className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">クリア</span>
            </button>

            <button
                onClick={() => router.back()}
                className="flex flex-col items-center justify-center p-2 rounded-lg text-text-secondary hover:text-text-primary transition"
            >
                <LogOut className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">戻る</span>
            </button>
        </div>
    </div>
  );
};
