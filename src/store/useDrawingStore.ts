import { create } from 'zustand';

export type Tool = 'move' | 'scale' | 'measure';
export type Point = { x: number; y: number };

type ScaleInfo = {
  ratio: number; // mm per pixel
};

type Measurement = {
  id: string;
  points: [Point, Point];
  realLength: number;
};

interface DrawingState {
  tool: Tool;
  setTool: (tool: Tool) => void;
  scaleInfo: ScaleInfo | null;
  tempPoints: Point[];
  addTempPoint: (point: Point) => boolean;
  clearTempPoints: () => void;
  calculateAndSetScale: (distance: number) => void;
  measurements: Measurement[];
  addMeasurement: (p1: Point, p2: Point) => void;
  clearMeasurements: () => void;
  resetStore: () => void;
}

// V5 修正点: TypeScriptがtoolをstringと推論しないよう、as Toolで明示的にキャストする
const initialState = {
    tool: 'move' as Tool,
    scaleInfo: null,
    tempPoints: [] as Point[],
    measurements: [] as Measurement[],
};

export const useDrawingStore = create<DrawingState>((set, get) => ({
  ...initialState,
  
  setTool: (tool) => {
    set({ tool, tempPoints: [] });
  },

  addTempPoint: (point) => {
    const points = [...get().tempPoints, point];
    set({ tempPoints: points });
    return points.length === 2;
  },

  clearTempPoints: () => set({ tempPoints: [] }),

  calculateAndSetScale: (distance) => {
    const points = get().tempPoints;
    if (points.length !== 2) return;

    const [p1, p2] = points;
    const pixelLength = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    
    if (pixelLength < 1) {
        alert("距離が短すぎます。もう少し離れた2点を選択してください。");
        set({ tempPoints: [] });
        return;
    }

    const ratio = distance / pixelLength;
    const newScaleInfo: ScaleInfo = { ratio };
    
    set({ scaleInfo: newScaleInfo, tempPoints: [], tool: 'measure' });
    alert(`縮尺が設定されました。自動で計測モードに切り替わります。\n(${ratio.toFixed(4)} mm/pixel)`);
  },
  
  addMeasurement: (p1, p2) => {
    const { scaleInfo, measurements } = get();
    if (!scaleInfo) {
        alert("先に縮尺設定を行ってください。");
        set({ tempPoints: [], tool: 'scale' });
        return;
    }

    const pixelLength = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    const realLength = pixelLength * scaleInfo.ratio;
      
    const newMeasurement: Measurement = {
        id: new Date().toISOString(),
        points: [p1, p2],
        realLength,
    };
    set({
        measurements: [...measurements, newMeasurement],
        tempPoints: [],
    });
  },
  
  clearMeasurements: () => set({ measurements: [] }),
  
  resetStore: () => set(initialState),
}));
