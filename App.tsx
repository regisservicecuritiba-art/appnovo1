import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth, onAuthStateChanged, db, signOut } from './services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Layout } from './components/Layout';
import { OfflineStatus } from './components/OfflineStatus';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Clients } from './pages/Clients';
import { Machines } from './pages/Machines';
import { ServiceOrders } from './pages/ServiceOrders';
import { PMOC } from './pages/PMOC';
import { Maintenance } from './pages/Maintenance';
import { History } from './pages/History';
import { FinancialReports } from './pages/FinancialReports';
import { Parts } from './pages/PartsAndServices';
import { User } from './types';
import { Logo } from './components/Logo';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        fetchProfile(firebaseUser);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchProfile = async (firebaseUser: any) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        setUser(userDoc.data() as User);
      } else {
        console.warn('Profile not found in Firestore, attempting auto-creation...');
        await createMissingProfile(firebaseUser);
      }
    } catch (e) {
      console.error('Error loading profile from Firestore', e);
    } finally {
      setLoading(false);
    }
  };

  const createMissingProfile = async (firebaseUser: any) => {
     try {
       const name = firebaseUser.displayName || 'Usuário sem nome';
       const role = firebaseUser.email?.toLowerCase() === 'regisservicecuritiba@gmail.com' ? 'ADMIN' : 'TECNICO';
       
       const newProfile = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: name,
          role: role,
          avatar: `https://ui-avatars.com/api/?name=${name.replace(/\s/g, '+')}`
       };

       await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
       setUser(newProfile as User);
     } catch (err) {
        console.error('Critical error creating profile in Firestore', err);
     }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="relative mb-6">
          <div className="w-24 h-24 border-4 border-brand-blue/10 border-t-brand-blue rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Logo size="lg" hideText />
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">SERVICE <span className="text-brand-blue">APP</span></h2>
        <p className="mt-2 text-sm text-gray-400 font-medium animate-pulse">Iniciando sistema...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      {!user ? (
        <Login />
      ) : (
        <>
          <Layout user={user} onLogout={handleLogout}>
            <Routes>
              <Route path="/" element={<Dashboard user={user} />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/machines" element={<Machines />} />
              <Route path="/orders" element={<ServiceOrders />} />
              <Route path="/maintenance" element={<Maintenance user={user} />} />
              <Route path="/history" element={<History />} />
              <Route path="/pmoc" element={<PMOC />} />
              <Route path="/parts" element={<Parts />} />
              <Route path="/reports" element={<FinancialReports />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Layout>
          <OfflineStatus />
        </>
      )}
    </HashRouter>
  );
};

export default App;