import { useState, useEffect } from 'react';
import { localDB } from '../../services/localDB';
import { useLiveQuery } from 'dexie-react-hooks';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const pendingCount = useLiveQuery(
    () => localDB.pending_sync.count(),
    []
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { 
    isOnline, 
    isSyncing: (pendingCount || 0) > 0,
    pendingCount: pendingCount || 0
  };
}
