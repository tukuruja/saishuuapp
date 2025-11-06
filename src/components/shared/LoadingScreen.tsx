import { Loader2 } from 'lucide-react';

export const LoadingScreen = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center h-full p-8">
    <div className="text-center">
      <Loader2 className="h-16 w-16 text-action-blue mb-4 mx-auto animate-spin" />
      <p className="text-lg">{message}</p>
    </div>
  </div>
);
