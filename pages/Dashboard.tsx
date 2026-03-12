import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { dbService } from '../services/db';
import { Users, Fan, ClipboardList, TrendingUp, AlertTriangle } from 'lucide-react';
import { User, UserRole, OSStatus, Machine, Client, ServiceOrder } from '../types';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const isAdmin = user.role === UserRole.ADMIN;
  const [stats, setStats] = useState({ clients: 0, machines: 0, openOS: 0, revenue: 0 });
  const [machines, setMachines] = useState<Machine[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fake chart data for visual consistency until real data aggregates are built
  const data = [
    { name: 'Jan', servicos: 12 },
    { name: 'Fev', servicos: 19 },
    { name: 'Mar', servicos: 15 },
    { name: 'Abr', servicos: 22 },
    { name: 'Mai', servicos: 30 },
  ];
  
  const COLORS = ['#FFBB28', '#0088FE', '#00C49F'];

  useEffect(() => {
    let clients: Client[] = [];
    let machines: Machine[] = [];
    let orders: ServiceOrder[] = [];

    const updateStats = () => {
      const openOS = orders.filter(o => o.status !== OSStatus.FINALIZADA && o.status !== OSStatus.PAGO && o.status !== OSStatus.CANCELADA).length;
      const revenue = orders.reduce((acc, o) => acc + ((o.status === OSStatus.FINALIZADA || o.status === OSStatus.PAGO) ? Number(o.total) : 0), 0);

      const pendentes = orders.filter(o => o.status === OSStatus.PENDENTE).length;
      const andamento = orders.filter(o => o.status === OSStatus.EM_EXECUCAO).length;
      const concluidas = orders.filter(o => o.status === OSStatus.FINALIZADA || o.status === OSStatus.PAGO).length;

      setStats({
        clients: clients.length,
        machines: machines.length,
        openOS,
        revenue
      });

      setStatusData([
         { name: 'Pendentes', value: pendentes },
         { name: 'Em Andamento', value: andamento },
         { name: 'Concluídas', value: concluidas },
      ]);

      setMachines(machines);
      setLoading(false);
    };

    const unsubClients = dbService.subscribeClients((data) => {
      clients = data;
      updateStats();
    });

    const unsubMachines = dbService.subscribeMachines((data) => {
      machines = data;
      updateStats();
    });

    const unsubOrders = dbService.subscribeOrders((data) => {
      orders = data;
      updateStats();
    });

    return () => {
      unsubClients();
      unsubMachines();
      unsubOrders();
    };
  }, []);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    });

    return () => window.removeEventListener('beforeinstallprompt', () => {});
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const Card = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-800 mt-1">{loading ? '-' : value}</p>
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="text-white" size={24} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          Olá, {user.name.split(' ')[0]} 👋
        </h1>
        <div className="flex gap-2">
          {showInstallBanner && (
            <button 
              onClick={handleInstallClick}
              className="px-3 py-1 bg-brand-orange text-white text-sm font-bold rounded-full shadow-sm hover:bg-orange-600 transition-colors flex items-center gap-1"
            >
              <TrendingUp size={14} />
              Instalar App
            </button>
          )}
          <span className="px-3 py-1 bg-blue-50 text-brand-blue text-sm font-medium rounded-full border border-blue-100">
            {user.role}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          title="Total de Clientes" 
          value={stats.clients} 
          icon={Users} 
          color="bg-blue-500" 
        />
        <Card 
          title="Máquinas Ativas" 
          value={stats.machines} 
          icon={Fan} 
          color="bg-cyan-500" 
        />
        <Card 
          title="OS Abertas" 
          value={stats.openOS} 
          icon={ClipboardList} 
          color="bg-orange-500" 
        />
        {isAdmin && (
          <Card 
            title="Faturamento (Total)" 
            value={`R$ ${stats.revenue.toLocaleString('pt-BR')}`} 
            icon={TrendingUp} 
            color="bg-green-500" 
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Serviços Realizados (2023)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="servicos" fill="#007BFF" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Status de Ordens</h3>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#FFBB28]"></div> Pendente</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#0088FE]"></div> Andamento</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#00C49F]"></div> Concluída</div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
         <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-brand-orange" size={20}/>
            Equipamentos Recentes
         </h3>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
               <thead>
                 <tr className="border-b border-gray-100">
                   <th className="py-2">Máquina</th>
                   <th className="py-2">Local</th>
                   <th className="py-2">Vencimento Garantia</th>
                   <th className="py-2">Status</th>
                 </tr>
               </thead>
               <tbody>
                 {machines.slice(0, 5).map(m => (
                   <tr key={m.id} className="border-b border-gray-50">
                     <td className="py-3 font-medium text-gray-800">{m.brand} {m.model}</td>
                     <td className="py-3">{m.location}</td>
                     <td className="py-3">{m.warrantyEnd ? new Date(m.warrantyEnd).toLocaleDateString('pt-BR') : '-'}</td>
                     <td className="py-3"><span className="text-green-500 bg-green-50 px-2 py-1 rounded-full text-xs">Ativo</span></td>
                   </tr>
                 ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};