import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useOfflineSync } from '../src/hooks/useOfflineSync';

export const OfflineStatus: React.FC = () => {
  const { isOnline, isSyncing } = useOfflineSync();

  if (isOnline && !isSyncing) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-white font-medium transition-all ${
      isOnline ? 'bg-blue-600' : 'bg-red-600'
    }`}>
      {isSyncing ? (
        <>
          <RefreshCw size={18} className="animate-spin" />
          <span>Sincronizando...</span>
        </>
      ) : !isOnline ? (
        <>
          <WifiOff size={18} />
          <span>Modo Offline</span>
        </>
      ) : (
        <>
          <Wifi size={18} />
          <span>Online</span>
        </>
      )}
    </div>
  );
};
