import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOfflineSync } from '../src/hooks/useOfflineSync';

export const OfflineStatus: React.FC = () => {
  const { isOnline } = useOfflineSync();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1 rounded-md shadow-sm bg-red-600 text-white text-xs font-bold uppercase tracking-wider">
      <WifiOff size={12} />
      <span>OFFLine</span>
    </div>
  );
};
