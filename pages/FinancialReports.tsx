import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { dbService } from '../services/db';
import { OSStatus, UserRole, ServiceOrder, Client, User } from '../types';
import { Calendar, Printer, TrendingUp, DollarSign, Wallet, ArrowDownCircle, User as UserIcon, Activity, Wrench } from 'lucide-react';
import { Logo } from '../components/Logo';

export const FinancialReports: React.FC = () => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const COLORS = ['#FF7A00', '#007BFF', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  useEffect(() => {
    const unsubOrders = dbService.subscribeOrders(setOrders);
    const unsubClients = dbService.subscribeClients(setClients);
    const unsubUsers = dbService.subscribeUsers(setUsers);

    return () => {
      unsubOrders();
      unsubClients();
      unsubUsers();
    };
  }, []);

  // Filter Orders Base
  const filteredOrders = useMemo(() => {
    return orders.filter(os => {
      const osDate = os.date.split('T')[0];
      
      const dateMatch = osDate >= startDate && osDate <= endDate;
      const techMatch = selectedTechId ? os.technicianId === selectedTechId : true;
      const statusMatch = selectedStatus ? os.status === selectedStatus : true;

      return dateMatch && techMatch && statusMatch;
    });
  }, [orders, startDate, endDate, selectedTechId, selectedStatus]);

  // Calculations
  const metrics = useMemo(() => {
    // 1. Total Volume (OS Value): Includes 'Em Execução', 'Finalizada', 'Pago'
    const statusForTotalVolume = [OSStatus.EM_EXECUCAO, OSStatus.FINALIZADA, OSStatus.PAGO];
    
    // 2. Realized Profit (Cash Flow): Includes ONLY 'Pago'
    const statusForRealizedProfit = [OSStatus.PAGO];

    let totalRevenue = 0; // Booked Revenue (Volume)
    
    let realizedPartsCost = 0;
    let realizedPartsRevenue = 0;
    let realizedServicesRevenue = 0;
    
    // Stats specifically for charts that might want to show everything
    let allPartsRevenue = 0;
    let allServicesRevenue = 0;

    filteredOrders.forEach(os => {
      const isBooked = statusForTotalVolume.includes(os.status as OSStatus);
      const isPaid = statusForRealizedProfit.includes(os.status as OSStatus);

      if (isBooked) {
        totalRevenue += Number(os.total);
        os.partsUsed.forEach(part => allPartsRevenue += part.quantity * part.unitValue);
        os.services.forEach(svc => allServicesRevenue += svc.value);
      }

      if (isPaid) {
         os.partsUsed.forEach(part => {
           realizedPartsRevenue += part.quantity * part.unitValue;
           realizedPartsCost += part.quantity * (part.costPrice || 0);
         });
         os.services.forEach(svc => {
           realizedServicesRevenue += svc.value;
         });
      }
    });

    // For Gross Profit, we take the Total Paid OS Value minus Costs
    const totalPaidOSValue = filteredOrders
        .filter(os => statusForRealizedProfit.includes(os.status as OSStatus))
        .reduce((acc, os) => acc + Number(os.total), 0);

    const grossProfit = totalPaidOSValue - realizedPartsCost;

    return {
      totalRevenue, // Volume (Exec+)
      grossProfit, // Realized (Paid Only)
      laborProfit: realizedServicesRevenue, // Realized (Paid Only) - New Metric
      partsProfit: realizedPartsRevenue - realizedPartsCost, // Realized (Paid Only)
      
      // Breakdown for charts (Volume based)
      chartPartsRevenue: allPartsRevenue,
      chartServicesRevenue: allServicesRevenue
    };
  }, [filteredOrders]);

  // Chart Data: Monthly Revenue (Volume)
  const monthlyData = useMemo(() => {
    const data: Record<string, number> = {};
    const validStatuses = [OSStatus.EM_EXECUCAO, OSStatus.FINALIZADA, OSStatus.PAGO];

    filteredOrders.forEach(os => {
      if (validStatuses.includes(os.status as OSStatus)) {
        const date = new Date(os.date);
        const key = `${date.toLocaleString('pt-BR', { month: 'short' })}/${date.getFullYear().toString().substr(2)}`;
        data[key] = (data[key] || 0) + Number(os.total);
      }
    });
    return Object.keys(data).map(key => ({ name: key, revenue: data[key] }));
  }, [filteredOrders]);

  // Chart Data: Revenue by Type (Volume)
  const typeData = useMemo(() => {
    const data: Record<string, number> = {};
    const validStatuses = [OSStatus.EM_EXECUCAO, OSStatus.FINALIZADA, OSStatus.PAGO];

    filteredOrders.forEach(os => {
      if (validStatuses.includes(os.status as OSStatus)) {
         data[os.type] = (data[os.type] || 0) + Number(os.total);
      }
    });
    return Object.keys(data).map(key => ({ name: key, value: data[key] }));
  }, [filteredOrders]);

  // Chart Data: Revenue by Client (Volume)
  const clientData = useMemo(() => {
    const data: Record<string, number> = {};
    const validStatuses = [OSStatus.EM_EXECUCAO, OSStatus.FINALIZADA, OSStatus.PAGO];

    filteredOrders.forEach(os => {
      if (validStatuses.includes(os.status as OSStatus)) {
        const client = clients.find(c => c.id === os.clientId);
        const name = client ? client.name : 'Desconhecido';
        const displayName = name.length > 20 ? name.substring(0, 20) + '...' : name;
        data[displayName] = (data[displayName] || 0) + Number(os.total);
      }
    });
    
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredOrders, clients]);

  const sourceData = [
    { name: 'Serviços', value: metrics.chartServicesRevenue },
    { name: 'Venda de Peças', value: metrics.chartPartsRevenue },
  ];

  const handlePrint = () => {
    window.print();
  };

  const KPICard = ({ title, value, sub, icon: Icon, colorClass }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
          <Icon className={colorClass} size={24} />
        </div>
      </div>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );

  const selectedTechName = selectedTechId ? users.find(u => u.id === selectedTechId)?.name : 'Todos';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">Relatórios Financeiros</h1>
           <p className="text-gray-500 text-sm">Análise detalhada de faturamento e custos.</p>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Printer size={18} /> Exportar PDF
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end print:hidden">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data Inicial</label>
          <div className="relative">
             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="pl-10 p-2 border rounded-lg text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data Final</label>
          <div className="relative">
             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="pl-10 p-2 border rounded-lg text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Técnico Responsável</label>
          <div className="relative">
             <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <select 
              value={selectedTechId} 
              onChange={e => setSelectedTechId(e.target.value)}
              className="pl-10 pr-8 p-2 border rounded-lg text-sm w-48 appearance-none bg-white"
            >
              <option value="">Todos</option>
              {users.filter(u => u.role === UserRole.TECNICO).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status da OS</label>
          <div className="relative">
             <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <select 
              value={selectedStatus} 
              onChange={e => setSelectedStatus(e.target.value)}
              className="pl-10 pr-8 p-2 border rounded-lg text-sm w-40 appearance-none bg-white"
            >
              <option value="">Todos</option>
              {Object.values(OSStatus).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-8">
         <div className="flex justify-between items-center border-b pb-4">
            <Logo />
            <div className="text-right">
              <h1 className="text-2xl font-bold text-gray-800">Relatório Financeiro</h1>
              <p className="text-sm text-gray-500">Período: {new Date(startDate).toLocaleDateString()} até {new Date(endDate).toLocaleDateString()}</p>
              <div className="flex gap-4 justify-end mt-1 text-sm text-gray-600">
                 {selectedTechId && <p><strong>Técnico:</strong> {selectedTechName}</p>}
                 {selectedStatus && <p><strong>Status:</strong> {selectedStatus}</p>}
              </div>
            </div>
         </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Valor Total (Execução+)" 
          value={`R$ ${metrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          sub="Volume de vendas (OS em Execução ou mais)"
          icon={TrendingUp}
          colorClass="text-brand-blue"
        />
        <KPICard 
          title="Lucro Bruto (Pago)" 
          value={`R$ ${metrics.grossProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          sub="Receita Realizada - Custos (Apenas Pagos)"
          icon={DollarSign}
          colorClass="text-green-600"
        />
        {/* Changed from Parts Cost to Labor Profit */}
        <KPICard 
          title="Lucro Serviços (Pago)" 
          value={`R$ ${metrics.laborProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          sub="Serviços realizados (OS Pagas)"
          icon={Wrench}
          colorClass="text-blue-500"
        />
        <KPICard 
          title="Lucro em Peças (Pago)" 
          value={`R$ ${metrics.partsProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          sub="Margem de peças (OS Pagas)"
          icon={Wallet}
          colorClass="text-brand-orange"
        />
      </div>

      {/* Charts Row 1: Monthly & Type */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Bar Chart */}
         <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:break-inside-avoid">
            <h3 className="font-bold text-gray-800 mb-4">Evolução do Valor (Volume de Vendas)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={val => `R$${val/1000}k`} />
                  <Tooltip 
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Valor']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="revenue" fill="#007BFF" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
         </div>

         {/* Pie Chart: Type */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:break-inside-avoid">
            <h3 className="font-bold text-gray-800 mb-4">Volume por Tipo de Serviço</h3>
            <div className="h-72">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '10px'}} />
                  </PieChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* Charts Row 2: Client Revenue (NEW) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:break-inside-avoid">
         <h3 className="font-bold text-gray-800 mb-4">Top Clientes por Volume</h3>
         <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={clientData} 
                layout="vertical" 
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={val => `R$${val/1000}k`} />
                <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Valor']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={25}>
                   {clientData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* Breakdown Table & Source Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:break-before-page">
         {/* Source Pie */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">Composição do Valor (Geral)</h3>
            <div className="flex items-center">
              <div className="h-64 w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sourceData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                      >
                        <Cell fill="#00C49F" />
                        <Cell fill="#FF7A00" />
                      </Pie>
                      <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                    </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-4">
                 <div>
                    <p className="text-xs text-gray-500">Serviços</p>
                    <p className="text-xl font-bold text-green-600">R$ {metrics.chartServicesRevenue.toLocaleString('pt-BR')}</p>
                 </div>
                 <div>
                    <p className="text-xs text-gray-500">Venda de Peças</p>
                    <p className="text-xl font-bold text-brand-orange">R$ {metrics.chartPartsRevenue.toLocaleString('pt-BR')}</p>
                 </div>
              </div>
            </div>
         </div>

         {/* Parts Table */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">Detalhamento de Peças Utilizadas</h3>
            <div className="overflow-y-auto max-h-64">
               <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 sticky top-0">
                     <tr>
                        <th className="p-2">Item</th>
                        <th className="p-2 text-right">Qtd</th>
                        <th className="p-2 text-right">Venda</th>
                        <th className="p-2 text-right">Lucro Est.</th>
                     </tr>
                  </thead>
                  <tbody>
                     {filteredOrders.flatMap(os => os.partsUsed).map((part, idx) => (
                        <tr key={idx} className="border-b border-gray-50">
                           <td className="p-2 truncate max-w-[150px]">{part.name}</td>
                           <td className="p-2 text-right">{part.quantity}</td>
                           <td className="p-2 text-right">R$ {(part.quantity * part.unitValue).toFixed(2)}</td>
                           <td className="p-2 text-right text-green-600 font-medium">
                              R$ {(part.quantity * (part.unitValue - (part.costPrice || 0))).toFixed(2)}
                           </td>
                        </tr>
                     ))}
                     {filteredOrders.flatMap(os => os.partsUsed).length === 0 && (
                       <tr><td colSpan={4} className="p-4 text-center text-gray-400">Nenhuma peça no período/filtro.</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  );
};