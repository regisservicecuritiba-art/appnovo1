import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  FileText, 
  LogOut, 
  Menu, 
  X,
  Fan,
  ClipboardCheck,
  Package,
  BarChart3,
  Wrench,
  History
} from 'lucide-react';
import { Logo } from './Logo';
import { User, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return <>{children}</>;

  const isAdmin = user.role === UserRole.ADMIN;
  const isTech = user.role === UserRole.TECNICO;

  const menuItems = [];

  // Dashboard only for Admin
  if (isAdmin) {
    menuItems.push({ label: 'Dashboard', icon: LayoutDashboard, path: '/' });
  }

  // Common items for both
  menuItems.push({ label: 'Clientes', icon: Users, path: '/clients' });
  menuItems.push({ label: 'Máquinas', icon: Fan, path: '/machines' });
  menuItems.push({ label: 'Ordens de Serviço', icon: ClipboardCheck, path: '/orders' });
  menuItems.push({ label: 'Manutenção', icon: Wrench, path: '/maintenance' });
  menuItems.push({ label: 'Histórico', icon: History, path: '/history' });
  menuItems.push({ label: 'PMOC', icon: FileText, path: '/pmoc' });
  menuItems.push({ label: 'Peças e Serviços', icon: Package, path: '/parts' });

  // Financial Reports only for Admin
  if (isAdmin) {
    menuItems.push({ label: 'Relatórios Financeiros', icon: BarChart3, path: '/reports' });
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed h-full z-20 print:hidden">
        <div className="p-6 border-b border-gray-100 flex justify-center">
          <Logo />
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? 'bg-blue-50 text-brand-blue border-l-4 border-brand-blue'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <img src={user.avatar} alt="User" className="w-8 h-8 rounded-full bg-gray-200" />
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white border-b border-gray-200 z-30 flex items-center justify-between px-4 py-3 print:hidden">
        <Logo size="sm" />
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-600 p-1">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-gray-900/50 z-40 print:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-64 bg-white p-4 shadow-xl" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6 border-b pb-4">
               <span className="font-bold text-gray-700">Menu</span>
               <button onClick={() => setIsMobileMenuOpen(false)}><X size={20} /></button>
             </div>
             <nav className="space-y-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                      isActive(item.path) ? 'bg-blue-50 text-brand-blue' : 'text-gray-600'
                    }`}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </Link>
                ))}
                 <button 
                  onClick={() => {
                    onLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 font-medium"
                >
                  <LogOut size={20} />
                  Sair
                </button>
             </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 mt-16 md:mt-0 pb-20 md:pb-8 print:m-0 print:p-0">
        {children}
      </main>
    </div>
  );
};