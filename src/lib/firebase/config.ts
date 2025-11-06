// Firebase設定のスタブ（ダミー）

console.warn("Firebase configはダミーデータを使用しています。");

export const db = {};
export const storage = {};

export const collection = (db: any, path: string) => ({});
export const serverTimestamp = () => new Date();
export const addDoc = async (col: any, data: any) => ({ id: `DUMMY_DOC_${Date.now()}` });

export const ref = (storage: any, path: string) => ({});

// 40MBファイルアップロードとサーバー処理のシミュレーション
export const uploadFileAndProcess = (file: File, userUid: string, onProgress: (progress: number, status: string) => void) => {
  console.log(`ダミーアップロード開始: ${file.name} (${file.size} bytes)`);
  
  return new Promise((resolve, reject) => {
    let prog = 0;
    const interval = setInterval(() => {
        prog += 5;
        let status = "1. アップロード中...";

        if (prog >= 50) status = "2. 図面を解析中... (サーバー処理)";
        if (prog >= 90) status = "3. 表示準備中...";

        onProgress(prog, status);

        if (prog >= 100) {
            clearInterval(interval);
            const processedImageUrl = 'https://placehold.jp/1600x1200.png?text=Dummy+Drawing+Image';
            resolve({ processedImageUrl });
        }
    }, 200);
  });
};
