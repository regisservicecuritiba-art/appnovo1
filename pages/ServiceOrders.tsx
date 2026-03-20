import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { dbService } from '../services/db';
import { auth } from '../services/firebase';
import { ServiceOrder, Machine, ChecklistItem, PartUsed, ServiceItem, OSStatus, Part, Client, User, ServiceCatalog } from '../types';
import { Logo } from '../components/Logo';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { Plus, CheckSquare, Wrench, DollarSign, Calendar, Save, Trash2, Printer, Search, X, Package, Play, CheckCircle, Banknote, Ban, Eye, Filter, User as UserIcon, MapPin, FileText, Loader2 } from 'lucide-react';
import { Modal } from '../components/Modal';

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { label: 'Limpeza de filtros', checked: false, notes: '' },
  { label: 'Limpeza do gabinete', checked: false, notes: '' },
  { label: 'Limpeza do evaporador', checked: false, notes: '' },
  { label: 'Limpeza do condensador', checked: false, notes: '' },
  { label: 'Limpeza bandeja', checked: false, notes: '' },
  { label: 'Aplicação bactericida', checked: false, notes: '' },
  { label: 'Verificação elétrica', checked: false, notes: '' },
  { label: 'Medição de pressão', checked: false, notes: '' },
  { label: 'Medição de corrente', checked: false, notes: '' },
  { label: 'Adaptação e Limpeza da Tubulação', checked: false, notes: '' },
];

export const ServiceOrders: React.FC = () => {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New States for Filter and Modal
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [clientSearch, setClientSearch] = useState<string>('');
  const [viewOrder, setViewOrder] = useState<ServiceOrder | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<ServiceOrder | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const [printingOrder, setPrintingOrder] = useState<ServiceOrder | null>(null);
  const location = useLocation();

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'confirm';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: undefined
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm
    });
  };

  // Form State
  const [clientId, setClientId] = useState('');
  const [machineId, setMachineId] = useState('');
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
  const [osType, setOsType] = useState<any>('Manutenção Preventiva');
  const [technicianId, setTechnicianId] = useState('');
  
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);

  const [partsUsed, setPartsUsed] = useState<PartUsed[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [discount, setDiscount] = useState(0);

  // Part Selection State
  const [showPartSelector, setShowPartSelector] = useState(false);
  const [partSearchTerm, setPartSearchTerm] = useState('');
  const [allParts, setAllParts] = useState<Part[]>([]);

  // Service Selection State
  const [showServiceSelector, setShowServiceSelector] = useState(false);
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [allServices, setAllServices] = useState<ServiceCatalog[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubOrders = dbService.subscribeOrders(setOrders);
    const unsubClients = dbService.subscribeClients(setClients);
    const unsubMachines = dbService.subscribeMachines(setMachines);
    const unsubParts = dbService.subscribeParts(setAllParts);
    const unsubServices = dbService.subscribeServices(setAllServices);
    const unsubUsers = dbService.subscribeUsers(setUsers);
    const unsubPMOCs = dbService.subscribePMOCs(() => {}); // Just to keep it consistent if needed

    setLoading(false);

    return () => {
      unsubOrders();
      unsubClients();
      unsubMachines();
      unsubParts();
      unsubServices();
      unsubUsers();
      unsubPMOCs();
    };
  }, []);

  useEffect(() => {
    if (auth.currentUser && users.length > 0) {
      const user = users.find(u => u.id === auth.currentUser?.uid);
      if (user) setCurrentUser(user);
    }
  }, [users]);

  // Handle Navigation State (Pre-fill form)
  useEffect(() => {
    if (location.state && users.length > 0) {
      const { clientId: preClientId, machineId: preMachineId, type } = location.state as any;
      if (preClientId) {
        setClientId(preClientId);
        setView('create');
      }
      if (preMachineId) setMachineId(preMachineId);
      if (type) setOsType(type);
      
      // Auto-select current user as technician if logged in (simplified)
      if (auth.currentUser) {
        setTechnicianId(auth.currentUser.uid);
      }

      window.history.replaceState({}, document.title);
    }
  }, [location, users]);

  // Derived
  const clientMachines = machines.filter(m => m.clientId === clientId);
  const totalParts = partsUsed.reduce((acc, p) => acc + (p.quantity * p.unitValue), 0);
  const totalServices = services.reduce((acc, s) => acc + s.value, 0);
  const totalGeneral = totalParts + totalServices - discount;

  // Filtered Orders
  const filteredOrders = orders.filter(os => {
      if (statusFilter && os.status !== statusFilter) return false;
      if (clientSearch) {
          const client = clients.find(c => c.id === os.clientId);
          if (!client?.name.toLowerCase().includes(clientSearch.toLowerCase())) return false;
      }
      return true;
  });

  const handleSelectPart = (part: Part) => {
      setPartsUsed([
          ...partsUsed, 
          { 
              partId: part.id, 
              name: part.name, 
              quantity: 1, 
              unitValue: part.unitValue,
              costPrice: part.costPrice 
          }
      ]);
      setShowPartSelector(false);
      setPartSearchTerm('');
  };

  const handleRemovePart = (index: number) => {
      const newParts = [...partsUsed];
      newParts.splice(index, 1);
      setPartsUsed(newParts);
  };

  const handleSelectService = (service: ServiceCatalog) => {
      setServices([
          ...services,
          {
              id: Math.random().toString(36).substring(2, 9),
              description: service.name,
              value: service.value
          }
      ]);
      setShowServiceSelector(false);
      setServiceSearchTerm('');
  };

  const handleAddService = () => {
    setShowServiceSelector(true);
  };

  const handleRemoveService = (index: number) => {
    const newServices = [...services];
    newServices.splice(index, 1);
    setServices(newServices);
  };

  const handleSaveOS = async () => {
    const isInstallation = osType === 'Instalação';
    const finalMachineId = isInstallation ? selectedMachineIds[0] : machineId;
    
    if (!clientId || (!finalMachineId && !isInstallation) || (isInstallation && selectedMachineIds.length === 0) || !technicianId) {
        showAlert('Campos Obrigatórios', 'Por favor, preencha o cliente, a(s) máquina(s) e o técnico responsável.', 'warning');
        return;
    }

    try {
        const newOS: Omit<ServiceOrder, 'id'> = {
          clientId,
          machineId: finalMachineId || '',
          technicianId,
          type: osType,
          date: new Date().toISOString(),
          status: OSStatus.PENDENTE,
          checklist,
          partsUsed,
          services,
          discount: Number(discount) || 0,
          total: Number(totalGeneral) || 0,
          paymentMethod: 'A Definir',
          machineIds: isInstallation ? selectedMachineIds : [machineId],
          created_at: new Date().toISOString()
        };

        await dbService.addOrder(newOS);

        // Update parts stock (Optimistic / Simple Loop)
        for (const used of partsUsed) {
            const part = allParts.find(p => p.id === used.partId);
            if (part) {
                await dbService.updatePart(part.id, { stock: part.stock - used.quantity });
            }
        }
        
        setView('list');
        
        // Reset form
        setClientId('');
        setMachineId('');
        setSelectedMachineIds([]);
        setPartsUsed([]);
        setServices([]);
        setDiscount(0);
        setChecklist(DEFAULT_CHECKLIST);
        
        showAlert('Sucesso', 'Ordem de Serviço gerada com sucesso!', 'success');
    } catch (err: any) {
        console.error('Exception saving OS:', err);
        showAlert('Erro', 'Erro ao salvar OS: ' + err.message, 'error');
    }
  };

  const handleDeleteOS = async (id: string) => {
    try {
      await dbService.deleteOrder(id);
      if (viewOrder && viewOrder.id === id) setViewOrder(null);
      showAlert('Sucesso', 'Ordem de serviço excluída com sucesso.', 'success');
    } catch (err: any) {
      showAlert('Erro', 'Erro ao excluir OS: ' + err.message, 'error');
    }
  };

  const updateOSStatus = async (id: string, newStatus: OSStatus) => {
    const os = orders.find(o => o.id === id);
    if (!os) return;

    try {
        const updatedOS = { ...os, status: newStatus };
        await dbService.updateOrder(id, updatedOS);

        // Se entrar em execução, cria sessão de manutenção automaticamente
        if (newStatus === OSStatus.EM_EXECUCAO) {
            // No Firestore, as sessões de manutenção também devem ser migradas se existirem
            // Por enquanto, vamos apenas atualizar a OS.
            // Se houver uma coleção 'maintenance_sessions' no dbService, usaríamos ela.
        }

        // Update local modal state if open
        if (viewOrder && viewOrder.id === id) {
            setViewOrder(updatedOS);
        }
    } catch (err: any) {
        showAlert('Erro', 'Erro ao atualizar status: ' + err.message, 'error');
    }
  };

  const handlePrint = (os: ServiceOrder) => {
    setPrintingOrder(os);
    setTimeout(() => window.print(), 500);
  };

  const StatusBadge = ({ status }: { status: string }) => {
     const colors: any = {
         [OSStatus.PENDENTE]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
         [OSStatus.EM_EXECUCAO]: 'bg-blue-100 text-blue-700 border-blue-200',
         [OSStatus.FINALIZADA]: 'bg-green-100 text-green-700 border-green-200',
         [OSStatus.PAGO]: 'bg-purple-100 text-purple-700 border-purple-200',
         [OSStatus.CANCELADA]: 'bg-red-100 text-red-700 border-red-200',
     };
     return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${colors[status] || 'bg-gray-100'}`}>
            {status}
        </span>
     );
  };

  const ActionButtons = ({ os, isModal = false }: { os: ServiceOrder, isModal?: boolean }) => {
     const btnClass = isModal 
        ? "w-full py-3 flex justify-center text-sm font-bold rounded-lg shadow-sm" 
        : "flex items-center gap-1 text-xs px-2 py-1.5 rounded transition";
     
     if (os.status === OSStatus.PENDENTE) {
        return (
             <button 
                onClick={() => updateOSStatus(os.id, OSStatus.EM_EXECUCAO)}
                className={`${btnClass} bg-blue-600 text-white hover:bg-blue-700`}
             >
                <Play size={isModal ? 18 : 12} className={isModal ? "mr-2" : ""} /> Iniciar Execução
             </button>
        );
     }
     if (os.status === OSStatus.EM_EXECUCAO) {
        return (
             <button 
                onClick={() => updateOSStatus(os.id, OSStatus.FINALIZADA)}
                className={`${btnClass} bg-green-600 text-white hover:bg-green-700`}
             >
                <CheckCircle size={isModal ? 18 : 12} className={isModal ? "mr-2" : ""} /> Finalizar Serviço
             </button>
        );
     }
     if (os.status === OSStatus.FINALIZADA) {
        return (
             <div className="flex flex-col gap-2">
                <button 
                    onClick={() => updateOSStatus(os.id, OSStatus.PAGO)}
                    className={`${btnClass} bg-purple-600 text-white hover:bg-purple-700`}
                >
                    <Banknote size={isModal ? 18 : 12} className={isModal ? "mr-2" : ""} /> Receber Valor
                </button>
                <button 
                    onClick={() => setReceiptOrder(os)}
                    className={`${btnClass} bg-emerald-600 text-white hover:bg-emerald-700`}
                >
                    <FileText size={isModal ? 18 : 12} className={isModal ? "mr-2" : ""} /> Emitir Recibo
                </button>
             </div>
        );
     }
     if (os.status === OSStatus.PAGO) {
         return (
             <div className="flex flex-col gap-2 items-center">
                 <div className="flex items-center text-green-600 font-bold gap-2 text-sm justify-center">
                     <CheckCircle size={18} /> OS Concluída e Paga
                 </div>
                 <button 
                    onClick={() => setReceiptOrder(os)}
                    className={`${btnClass} bg-emerald-600 text-white hover:bg-emerald-700`}
                >
                    <FileText size={isModal ? 18 : 12} className={isModal ? "mr-2" : ""} /> Emitir Recibo
                </button>
             </div>
         );
     }
     if (os.status === OSStatus.CANCELADA) {
         return <div className="text-red-400 text-sm text-center">OS Cancelada</div>;
     }
     return null;
  };

  if (printingOrder) {
     const client = clients.find(c => c.id === printingOrder.clientId);
     const machineIds = printingOrder.machineIds || (printingOrder.machineId ? [printingOrder.machineId] : []);
     const tech = users.find(u => u.id === printingOrder.technicianId);

     return (
       <div className="bg-white p-8 min-h-screen">
          <div className="fixed top-4 right-4 no-print">
            <button onClick={() => setPrintingOrder(null)} className="px-4 py-2 bg-gray-200 rounded">Voltar</button>
          </div>
          
          <div className="flex justify-between items-center border-b pb-4 mb-6">
             <Logo />
             <div className="text-right">
                <h1 className="text-2xl font-bold text-gray-800">ORDEM DE SERVIÇO</h1>
                <p className="text-gray-500">#{printingOrder.id.toUpperCase().substring(0, 8)}</p>
                <p className="text-sm">{new Date(printingOrder.date).toLocaleString('pt-BR')}</p>
                <div className="mt-2">
                   <span className="text-xs uppercase font-bold text-gray-500">Status Atual:</span>
                   <p className="font-bold">{printingOrder.status}</p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
             <div>
                <h3 className="font-bold text-brand-blue mb-2">CLIENTE</h3>
                <p className="font-bold">{client?.name}</p>
                <p className="text-sm">{client?.address}</p>
                <p className="text-sm">{client?.document}</p>
                <p className="text-sm">{client?.phone}</p>
             </div>
             <div>
                <h3 className="font-bold text-brand-blue mb-2">EQUIPAMENTO(S)</h3>
                {machineIds.map(id => {
                   const m = machines.find(ma => ma.id === id);
                   return m ? (
                     <div key={id} className="mb-2 border-b border-gray-100 pb-2 last:border-0 last:mb-0">
                       <p className="font-bold">{m.brand} {m.model}</p>
                       <p className="text-sm">{m.type} - {m.capacityBTU} BTUs</p>
                       <p className="text-sm">Local: {m.location} • S/N: {m.serialNumber}</p>
                     </div>
                   ) : null;
                })}
             </div>
          </div>

          <div className="mb-6">
             <h3 className="font-bold bg-gray-100 p-2 mb-2">CHECKLIST TÉCNICO</h3>
             <div className="grid grid-cols-2 gap-2 text-sm">
                {printingOrder.checklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                     <div className={`w-4 h-4 border flex items-center justify-center ${item.checked ? 'bg-black text-white' : ''}`}>
                       {item.checked && '✓'}
                     </div>
                     <span>{item.label}</span>
                     {item.notes && <span className="text-xs text-gray-500 italic">({item.notes})</span>}
                  </div>
                ))}
             </div>
          </div>

          <div className="mb-6">
             <h3 className="font-bold bg-gray-100 p-2 mb-2">DESCRIÇÃO FINANCEIRA</h3>
             <table className="w-full text-sm">
                <thead>
                   <tr className="border-b">
                      <th className="text-left py-1">Descrição</th>
                      <th className="text-right py-1">Qtd</th>
                      <th className="text-right py-1">Total</th>
                   </tr>
                </thead>
                <tbody>
                   {printingOrder.partsUsed.map((p, i) => (
                      <tr key={`p-${i}`} className="border-b border-gray-50">
                         <td className="py-1">{p.name} (Peça)</td>
                         <td className="text-right">{p.quantity}</td>
                         <td className="text-right">R$ {(p.quantity * p.unitValue).toFixed(2)}</td>
                      </tr>
                   ))}
                    {printingOrder.services.map((s, i) => (
                      <tr key={`s-${i}`} className="border-b border-gray-50">
                         <td className="py-1">{s.description} (Serviço)</td>
                         <td className="text-right">1</td>
                         <td className="text-right">R$ {s.value.toFixed(2)}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
             <div className="flex justify-end mt-4">
                <div className="w-1/2">
                   <div className="flex justify-between py-1"><span>Subtotal:</span> <span>R$ {(printingOrder.total + printingOrder.discount).toFixed(2)}</span></div>
                   <div className="flex justify-between py-1 text-red-500"><span>Desconto:</span> <span>- R$ {printingOrder.discount.toFixed(2)}</span></div>
                   <div className="flex justify-between py-2 border-t font-bold text-lg"><span>Total:</span> <span>R$ {printingOrder.total.toFixed(2)}</span></div>
                </div>
             </div>
          </div>

          <div className="mt-12 pt-8 border-t flex justify-between">
             <div className="text-center">
                <div className="border-b border-black w-48 mb-2"></div>
                <p className="text-xs">Assinatura Cliente</p>
             </div>
             <div className="text-center">
                <div className="border-b border-black w-48 mb-2"></div>
                <p className="text-xs">Assinatura Técnico: {tech?.name}</p>
             </div>
          </div>
       </div>
     );
  }

  return (
    <div className="space-y-6">
      {view === 'list' && (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Ordens de Serviço</h1>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text"
                        placeholder="Pesquisar cliente..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border rounded-lg bg-white text-sm focus:ring-2 focus:ring-brand-blue/20 outline-none w-full sm:w-64"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="pl-10 pr-4 py-2 border rounded-lg bg-white text-sm focus:ring-2 focus:ring-brand-blue/20 outline-none w-full sm:w-48 appearance-none"
                    >
                        <option value="">Todos os Status</option>
                        {Object.values(OSStatus).map(st => (
                            <option key={st} value={st}>{st}</option>
                        ))}
                    </select>
                </div>
                <button onClick={() => setView('create')} className="bg-brand-blue text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-600 transition">
                  <Plus size={18} /> Nova OS
                </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 text-sm">
                    <tr>
                        <th className="p-4">OS / Cliente</th>
                        <th className="p-4 hidden md:table-cell">Tipo</th>
                        <th className="p-4 hidden sm:table-cell">Data</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 hidden lg:table-cell">Ação Rápida</th>
                        <th className="p-4 text-center">Opções</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredOrders.map(os => {
                        const client = clients.find(c => c.id === os.clientId);
                        return (
                        <tr key={os.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="p-4">
                                <span className="font-mono text-[10px] text-gray-400 block">#{os.id.substring(0,8)}</span>
                                <span className="font-bold text-gray-800 text-sm md:text-base">{client?.name || 'Cliente Removido'}</span>
                                <div className="md:hidden text-[10px] text-gray-500 mt-0.5">
                                    {os.type} • {new Date(os.date).toLocaleDateString()}
                                </div>
                            </td>
                            <td className="p-4 text-sm hidden md:table-cell">{os.type}</td>
                            <td className="p-4 text-gray-500 text-sm hidden sm:table-cell">{new Date(os.date).toLocaleDateString()}</td>
                            <td className="p-4">
                                <StatusBadge status={os.status} />
                            </td>
                            <td className="p-4 hidden lg:table-cell">
                                <ActionButtons os={os} />
                            </td>
                            <td className="p-4 text-center">
                                <div className="flex justify-center gap-2">
                                    <button 
                                        onClick={() => setViewOrder(os)}
                                        className="text-gray-400 hover:text-brand-blue p-1" 
                                        title="Visualizar Detalhes"
                                    >
                                        <Eye size={18}/>
                                    </button>
                                    <button onClick={() => handlePrint(os)} className="text-gray-400 hover:text-brand-blue p-1" title="Imprimir"><Printer size={18}/></button>
                                    {os.status !== OSStatus.PAGO && os.status !== OSStatus.CANCELADA && (
                                        <button 
                                            onClick={() => showConfirm(
                                                'Cancelar OS', 
                                                'Tem certeza que deseja cancelar esta OS?', 
                                                () => updateOSStatus(os.id, OSStatus.CANCELADA)
                                            )} 
                                            className="text-gray-400 hover:text-red-500 p-1" 
                                            title="Cancelar OS"
                                        >
                                            <Ban size={18}/>
                                        </button>
                                    )}
                                    {currentUser?.role === 'ADMIN' && (
                                        <button 
                                            onClick={() => showConfirm(
                                                'Excluir OS', 
                                                'Tem certeza que deseja EXCLUIR permanentemente esta OS? Esta ação não pode ser desfeita.', 
                                                () => handleDeleteOS(os.id)
                                            )} 
                                            className="text-gray-400 hover:text-red-700 p-1" 
                                            title="Excluir OS"
                                        >
                                            <Trash2 size={18}/>
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                        );
                    })}
                    {filteredOrders.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-400">
                            {loading ? 'Carregando...' : 'Nenhuma Ordem de Serviço encontrada.'}
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
             </div>
          </div>
        </>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewOrder && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                  {/* Header */}
                  <div className="p-6 border-b flex justify-between items-start bg-gray-50">
                      <div>
                          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                              OS #{viewOrder.id.substring(0,8).toUpperCase()}
                          </h2>
                          <p className="text-sm text-gray-500 mt-1">{new Date(viewOrder.date).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                           <StatusBadge status={viewOrder.status} />
                           <button onClick={() => setViewOrder(null)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                      </div>
                  </div>

                  <div className="p-6 space-y-6">
                      {/* Info Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                              <h3 className="text-xs font-bold text-brand-blue uppercase mb-2 flex items-center gap-1"><UserIcon size={12}/> Cliente</h3>
                              {(() => {
                                  const c = clients.find(cl => cl.id === viewOrder.clientId);
                                  return (
                                      <div>
                                          <p className="font-bold text-gray-800">{c?.name}</p>
                                          <p className="text-xs text-gray-500">{c?.phone} • {c?.document}</p>
                                          <p className="text-xs text-gray-500 mt-1 flex items-start gap-1"><MapPin size={10} className="mt-0.5"/> {c?.address}</p>
                                      </div>
                                  )
                              })()}
                          </div>
                          <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                              <h3 className="text-xs font-bold text-brand-orange uppercase mb-2 flex items-center gap-1"><Wrench size={12}/> Equipamento(s)</h3>
                              <div className="space-y-3">
                                  {(viewOrder.machineIds || (viewOrder.machineId ? [viewOrder.machineId] : [])).map(id => {
                                      const m = machines.find(ma => ma.id === id);
                                      return m ? (
                                          <div key={id} className="border-b border-orange-100 last:border-0 pb-2 last:pb-0">
                                              <p className="font-bold text-gray-800">{m.brand} {m.model}</p>
                                              <p className="text-xs text-gray-500">{m.type} • {m.capacityBTU} BTUs</p>
                                              <p className="text-xs text-gray-500 mt-1">Local: {m.location}</p>
                                          </div>
                                      ) : null;
                                  })}
                              </div>
                          </div>
                      </div>

                      {/* Checklist */}
                      <div className="border rounded-xl p-4">
                          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><CheckSquare size={16}/> Checklist Realizado</h3>
                          <div className="grid grid-cols-2 gap-2">
                              {viewOrder.checklist.map((item, i) => (
                                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                      <div className={`w-3 h-3 rounded-sm border ${item.checked ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}></div>
                                      <span className={item.checked ? 'text-gray-800 font-medium' : 'text-gray-400'}>{item.label}</span>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Financials */}
                      <div className="border rounded-xl p-4">
                          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><DollarSign size={16}/> Resumo Financeiro</h3>
                          <div className="space-y-2 text-sm">
                              {viewOrder.partsUsed.map((p, i) => (
                                  <div key={i} className="flex justify-between border-b border-dashed pb-1">
                                      <span>{p.quantity}x {p.name}</span>
                                      <span className="font-medium">R$ {(p.quantity * p.unitValue).toFixed(2)}</span>
                                  </div>
                              ))}
                              {viewOrder.services.map((s, i) => (
                                  <div key={i} className="flex justify-between border-b border-dashed pb-1">
                                      <span>{s.description}</span>
                                      <span className="font-medium">R$ {s.value.toFixed(2)}</span>
                                  </div>
                              ))}
                          </div>
                          <div className="flex justify-end mt-3 pt-3 border-t">
                              <div className="text-right">
                                  {viewOrder.discount > 0 && <p className="text-xs text-red-500">Desconto: - R$ {viewOrder.discount.toFixed(2)}</p>}
                                  <p className="text-xl font-bold text-brand-blue">Total: R$ {viewOrder.total.toFixed(2)}</p>
                              </div>
                          </div>
                      </div>

                      {/* Actions */}
                      <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                           <h3 className="text-xs font-bold text-gray-500 uppercase">Ações da Ordem</h3>
                           <ActionButtons os={viewOrder} isModal={true} />
                           
                           <div className="flex gap-2 pt-2">
                                <button 
                                    onClick={() => handlePrint(viewOrder)}
                                    className="flex-1 py-2.5 border border-gray-300 bg-white rounded-lg text-gray-700 font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                                >
                                    <Printer size={18} /> Imprimir OS
                                </button>
                                {viewOrder.status !== OSStatus.CANCELADA && viewOrder.status !== OSStatus.PAGO && (
                                    <button 
                                        onClick={() => showConfirm(
                                            'Cancelar OS', 
                                            'Tem certeza que deseja cancelar esta OS?', 
                                            () => updateOSStatus(viewOrder.id, OSStatus.CANCELADA)
                                        )}
                                        className="py-2.5 px-4 border border-red-200 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100"
                                        title="Cancelar"
                                    >
                                        <Ban size={18} />
                                    </button>
                                )}
                                {currentUser?.role === 'ADMIN' && (
                                    <button 
                                        onClick={() => showConfirm(
                                            'Excluir OS', 
                                            'Tem certeza que deseja EXCLUIR permanentemente esta OS? Esta ação não pode ser desfeita.', 
                                            () => handleDeleteOS(viewOrder.id)
                                        )}
                                        className="py-2.5 px-4 border border-red-200 bg-red-700 text-white rounded-lg font-medium hover:bg-red-800"
                                        title="Excluir"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                           <button 
                                onClick={() => setViewOrder(null)}
                                className="w-full py-2 text-gray-400 text-xs font-medium hover:text-gray-600 transition-colors"
                           >
                                Fechar
                           </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* RECEIPT MODAL */}
      {receiptOrder && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
              <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[95vh] transform transition-all">
                  {/* Header */}
                  <div className="p-6 border-b flex flex-col md:flex-row justify-between items-center bg-gray-50 rounded-t-3xl no-print gap-4">
                      <div className="text-center md:text-left">
                          <h2 className="text-xl font-bold text-gray-800">
                              RECIBO #{receiptOrder.id.substring(0,8).toUpperCase()}
                          </h2>
                          <p className="text-xs text-gray-500 mt-1">{new Date(receiptOrder.date).toLocaleString()}</p>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center">
                          <Logo size="sm" />
                          <h1 className="text-sm font-black text-gray-900 mt-1">Service Refrigeração</h1>
                          <p className="text-[10px] text-gray-500 font-bold">CNPJ 17.279.046/0001-94</p>
                      </div>

                      <div className="flex items-center gap-3">
                           <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 uppercase tracking-wider">Pago</div>
                           <button onClick={() => setReceiptOrder(null)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                      </div>
                  </div>

                  <div className="p-6 space-y-6 overflow-y-auto" id="receipt-content" style={{ backgroundColor: '#ffffff' }}>
                      {/* Header for Print */}
                      <div id="receipt-print-header" className="hidden print:flex flex-col items-center mb-8 border-b pb-6" style={{ borderBottomColor: '#f3f4f6' }}>
                          <Logo size="sm" />
                          <h1 className="font-black mt-2" style={{ color: '#111827', fontSize: '1.125rem' }}>Service Refrigeração</h1>
                          <p className="font-bold" style={{ color: '#6b7280', fontSize: '0.75rem' }}>CNPJ 17.279.046/0001-94</p>
                          <div className="mt-4 flex justify-between w-full items-end">
                              <div>
                                  <h2 className="font-black" style={{ color: '#111827', fontSize: '1.5rem' }}>RECIBO</h2>
                                  <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>#{receiptOrder.id.substring(0,8).toUpperCase()}</p>
                              </div>
                              <div className="text-right">
                                  <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>{new Date(receiptOrder.date).toLocaleString()}</p>
                                  <div className="font-bold uppercase" style={{ color: '#15803d', fontSize: '0.875rem' }}>Pagamento Confirmado</div>
                              </div>
                          </div>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border" style={{ backgroundColor: '#f0f7ff', borderColor: '#dbeafe' }}>
                              <h3 className="font-bold uppercase mb-2 flex items-center gap-1" style={{ color: '#007BFF', fontSize: '0.75rem' }}><UserIcon size={12}/> Cliente</h3>
                              {(() => {
                                  const c = clients.find(cl => cl.id === receiptOrder.clientId);
                                  return (
                                      <div>
                                          <p className="font-bold" style={{ color: '#1f2937' }}>{c?.name}</p>
                                          <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>{c?.phone} • {c?.document}</p>
                                          <p className="mt-1 flex items-start gap-1" style={{ color: '#6b7280', fontSize: '0.75rem' }}><MapPin size={10} className="mt-0.5"/> {c?.address}</p>
                                      </div>
                                  )
                              })()}
                          </div>
                          <div className="p-4 rounded-xl border" style={{ backgroundColor: '#fff7ed', borderColor: '#ffedd5' }}>
                              <h3 className="font-bold uppercase mb-2 flex items-center gap-1" style={{ color: '#FF7A00', fontSize: '0.75rem' }}><Wrench size={12}/> Equipamento(s)</h3>
                              <div className="space-y-3">
                                  {(receiptOrder.machineIds || (receiptOrder.machineId ? [receiptOrder.machineId] : [])).map(id => {
                                      const m = machines.find(ma => ma.id === id);
                                      return m ? (
                                          <div key={id} className="border-b border-orange-100 last:border-0 pb-2 last:pb-0">
                                              <p className="font-bold" style={{ color: '#1f2937' }}>{m.brand} {m.model}</p>
                                              <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>{m.type} • {m.capacityBTU} BTUs</p>
                                              <p className="mt-1" style={{ color: '#6b7280', fontSize: '0.75rem' }}>Local: {m.location}</p>
                                          </div>
                                      ) : null;
                                  })}
                              </div>
                          </div>
                      </div>

                      {/* Checklist */}
                      <div className="border rounded-xl p-4" style={{ borderColor: '#e5e7eb' }}>
                          <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#374151', fontSize: '0.875rem' }}><CheckSquare size={16}/> Checklist Realizado</h3>
                          <div className="grid grid-cols-2 gap-2">
                              {receiptOrder.checklist.map((item, i) => (
                                  <div key={i} className="flex items-center gap-2" style={{ fontSize: '0.875rem' }}>
                                      <div className="w-3 h-3 rounded-sm border" style={{ 
                                          backgroundColor: item.checked ? '#22c55e' : 'transparent',
                                          borderColor: item.checked ? '#22c55e' : '#d1d5db'
                                      }}></div>
                                      <span style={{ 
                                          color: item.checked ? '#1f2937' : '#9ca3af',
                                          fontWeight: item.checked ? 500 : 400
                                      }}>{item.label}</span>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Financials */}
                      <div className="border rounded-xl p-4" style={{ borderColor: '#e5e7eb' }}>
                          <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#374151', fontSize: '0.875rem' }}><DollarSign size={16}/> Resumo Financeiro</h3>
                          <div className="space-y-2" style={{ fontSize: '0.875rem' }}>
                              {receiptOrder.partsUsed.map((p, i) => (
                                  <div key={i} className="flex justify-between border-b border-dashed pb-1" style={{ borderBottomColor: '#e5e7eb' }}>
                                      <span style={{ color: '#4b5563' }}>{p.quantity}x {p.name}</span>
                                      <span className="font-medium" style={{ color: '#111827' }}>R$ {(p.quantity * p.unitValue).toFixed(2)}</span>
                                  </div>
                              ))}
                              {receiptOrder.services.map((s, i) => (
                                  <div key={i} className="flex justify-between border-b border-dashed pb-1" style={{ borderBottomColor: '#e5e7eb' }}>
                                      <span style={{ color: '#4b5563' }}>{s.description}</span>
                                      <span className="font-medium" style={{ color: '#111827' }}>R$ {s.value.toFixed(2)}</span>
                                  </div>
                              ))}
                          </div>
                          <div className="flex justify-end mt-3 pt-3 border-t" style={{ borderTopColor: '#e5e7eb' }}>
                              <div className="text-right">
                                  {receiptOrder.discount > 0 && <p style={{ color: '#ef4444', fontSize: '0.75rem' }}>Desconto: - R$ {receiptOrder.discount.toFixed(2)}</p>}
                                  <p className="font-bold" style={{ color: '#007BFF', fontSize: '1.25rem' }}>Total Pago: R$ {receiptOrder.total.toFixed(2)}</p>
                              </div>
                          </div>
                      </div>

                      {/* Legal Note */}
                      <div className="p-4 rounded-xl border" style={{ backgroundColor: '#f9fafb', borderColor: '#f3f4f6' }}>
                          <p className="leading-relaxed italic" style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                              Este documento confirma o recebimento do valor e a conclusão dos serviços descritos. 
                              O envio deste recibo caracteriza a confirmação de recebimento e quitação, sem a necessidade de assinatura física.
                          </p>
                      </div>

                      {/* Footer for Print */}
                      <div className="hidden print:block pt-8 border-t text-center" style={{ borderTopColor: '#f3f4f6' }}>
                          <p className="font-bold" style={{ color: '#1f2937', fontSize: '0.875rem' }}>Curitiba, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                          <p className="font-black uppercase tracking-widest mt-2" style={{ color: '#111827', fontSize: '0.75rem' }}>Service Refrigeração Ltda</p>
                          <p className="font-medium" style={{ color: '#9ca3af', fontSize: '10px' }}>CNPJ 17.279.046/0001-94 • (41) 99999-9999</p>
                      </div>
                  </div>

                  <div className="p-8 bg-gray-50 rounded-b-3xl border-t flex flex-col gap-4 no-print">
                      <div className="flex flex-col sm:flex-row gap-4">
                          <button 
                            onClick={() => window.print()}
                            className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-2xl shadow-xl hover:bg-black flex items-center justify-center gap-2 transition-all transform active:scale-95"
                          >
                            <Printer size={20} /> Imprimir Recibo
                          </button>
                          <button 
                            disabled={isGeneratingPDF}
                            onClick={async () => {
                                const element = document.getElementById('receipt-content');
                                if (element && receiptOrder) {
                                    setIsGeneratingPDF(true);
                                    
                                    // Temporarily remove overflow and fixed height to capture full content
                                    const originalStyle = element.style.cssText;
                                    element.style.overflow = 'visible';
                                    element.style.height = 'auto';
                                    element.style.maxHeight = 'none';

                                    // Temporarily show print header for PDF capture
                                    const printHeader = document.getElementById('receipt-print-header');
                                    if (printHeader) {
                                        printHeader.classList.remove('hidden');
                                        printHeader.classList.add('flex');
                                    }

                                    const opt = {
                                        margin: 10,
                                        filename: `Recibo_${receiptOrder.id.substring(0,8).toUpperCase()}.pdf`,
                                        image: { type: 'jpeg', quality: 0.98 },
                                        html2canvas: { 
                                            scale: 2, 
                                            useCORS: true, 
                                            allowTaint: true,
                                            scrollX: 0,
                                            scrollY: 0,
                                            logging: false,
                                            letterRendering: true,
                                            onclone: (clonedDoc: Document) => {
                                                // Inject a style that overrides common colors and fixes layout for PDF
                                                const style = clonedDoc.createElement('style');
                                                style.innerHTML = `
                                                    * { 
                                                        -webkit-print-color-adjust: exact !important;
                                                        color-adjust: exact !important;
                                                        font-family: Arial, sans-serif !important;
                                                    }
                                                    /* Fallback for common oklch colors used by Tailwind */
                                                    .text-brand-blue { color: #007BFF !important; }
                                                    .text-brand-orange { color: #FF7A00 !important; }
                                                    .bg-brand-blue { background-color: #007BFF !important; }
                                                    .bg-brand-orange { background-color: #FF7A00 !important; }
                                                    
                                                    /* Ensure background colors are captured */
                                                    [style*="oklch"] {
                                                        background-color: #ffffff !important;
                                                        color: #333333 !important;
                                                        border-color: #cccccc !important;
                                                    }
                                                `;
                                                clonedDoc.head.appendChild(style);

                                                // Remove problematic elements if any
                                                const svgs = clonedDoc.querySelectorAll('svg');
                                                svgs.forEach(svg => {
                                                    svg.setAttribute('width', svg.getBoundingClientRect().width.toString());
                                                    svg.setAttribute('height', svg.getBoundingClientRect().height.toString());
                                                });
                                            }
                                        },
                                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                                    };
                                    
                                    try {
                                        console.log('Iniciando geração de PDF...');
                                        // Use a promise with timeout to prevent infinite hang
                                        const pdfPromise = html2pdf().set(opt).from(element).save();
                                        const timeoutPromise = new Promise((_, reject) => 
                                            setTimeout(() => reject(new Error('O processo demorou muito (Timeout)')), 45000)
                                        );
                                        
                                        await Promise.race([pdfPromise, timeoutPromise]);
                                        console.log('PDF gerado com sucesso!');
                                    } catch (err: any) {
                                        console.error('Erro detalhado ao gerar PDF:', err);
                                        // Mensagem bem distinta para confirmar que o código novo está rodando
                                        alert('Falha na geração do PDF: ' + (err.message || 'Erro interno no gerador'));
                                    } finally {
                                        // Restore original styles
                                        element.style.cssText = originalStyle;
                                        if (printHeader) {
                                            printHeader.classList.add('hidden');
                                            printHeader.classList.remove('flex');
                                        }
                                        setIsGeneratingPDF(false);
                                    }
                                }
                            }}
                            className={`flex-1 py-4 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all transform active:scale-95 ${isGeneratingPDF ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                          >
                            {isGeneratingPDF ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" /> Gerando...
                                </>
                            ) : (
                                <>
                                    <FileText size={20} /> Gerar PDF
                                </>
                            )}
                          </button>
                      </div>
                      <button 
                        onClick={() => setReceiptOrder(null)}
                        className="w-full py-3 text-gray-500 font-bold hover:text-gray-700 transition-colors no-print"
                      >
                        Fechar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {view === 'create' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-4xl mx-auto">
           <div className="flex justify-between mb-6">
             <h2 className="text-xl font-bold text-gray-800">Nova Ordem de Serviço</h2>
             <button onClick={() => setView('list')} className="text-gray-500">Cancelar</button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                 <label className="block text-sm font-medium mb-1">Cliente</label>
                 <select className="w-full p-2 border rounded" value={clientId} onChange={e => setClientId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
              </div>
              <div>
                 <label className="block text-sm font-medium mb-1">Máquina(s)</label>
                 {osType === 'Instalação' ? (
                   <div className="border rounded p-2 max-h-40 overflow-y-auto bg-gray-50">
                     {clientMachines.length > 0 ? (
                       clientMachines.map(m => (
                         <label key={m.id} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer">
                           <input 
                             type="checkbox" 
                             checked={selectedMachineIds.includes(m.id)}
                             onChange={(e) => {
                               if (e.target.checked) {
                                 setSelectedMachineIds([...selectedMachineIds, m.id]);
                               } else {
                                 setSelectedMachineIds(selectedMachineIds.filter(id => id !== m.id));
                               }
                             }}
                             className="rounded text-brand-blue"
                           />
                           <span className="text-sm">{m.brand} {m.model} - {m.location}</span>
                         </label>
                       ))
                     ) : (
                       <p className="text-xs text-gray-500 p-2">Nenhuma máquina cadastrada para este cliente.</p>
                     )}
                   </div>
                 ) : (
                   <select className="w-full p-2 border rounded" value={machineId} onChange={e => setMachineId(e.target.value)} disabled={!clientId}>
                      <option value="">Selecione...</option>
                      {clientMachines.map(m => <option key={m.id} value={m.id}>{m.brand} {m.model} - {m.location}</option>)}
                   </select>
                 )}
              </div>
              <div>
                 <label className="block text-sm font-medium mb-1">Tipo de Serviço</label>
                 <select className="w-full p-2 border rounded" value={osType} onChange={e => setOsType(e.target.value)}>
                    <option>Manutenção Preventiva</option>
                    <option>Manutenção Corretiva</option>
                    <option>Instalação</option>
                    <option>Higienização</option>
                 </select>
              </div>
              <div>
                 <label className="block text-sm font-medium mb-1">Técnico Responsável</label>
                 <select className="w-full p-2 border rounded" value={technicianId} onChange={e => setTechnicianId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                 </select>
              </div>
           </div>

           <div className="space-y-6">
              {/* Checklist */}
              <div className="border rounded-lg p-4">
                 <h3 className="font-bold flex items-center gap-2 mb-3 text-brand-blue"><CheckSquare size={18} /> Checklist Técnico</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {checklist.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                         <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={item.checked} 
                              onChange={e => {
                                const newChecklist = [...checklist];
                                newChecklist[idx].checked = e.target.checked;
                                setChecklist(newChecklist);
                              }}
                              className="rounded text-brand-blue focus:ring-brand-blue"
                            />
                            <span className="text-sm">{item.label}</span>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>

              {/* Parts & Services */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Parts Section */}
                 <div className="border rounded-lg p-4 bg-orange-50/30 border-orange-100">
                    <div className="flex justify-between items-center mb-3">
                       <h3 className="font-bold flex items-center gap-2 text-brand-orange"><Wrench size={18} /> Peças e Materiais</h3>
                       <button onClick={() => setShowPartSelector(true)} className="text-xs bg-brand-orange text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 transition shadow-sm font-bold flex items-center gap-1">
                          <Plus size={12}/> Adicionar
                       </button>
                    </div>
                    <div className="space-y-2">
                       {partsUsed.map((p, i) => (
                          <div key={i} className="flex justify-between text-sm bg-white p-2 rounded shadow-sm border border-gray-100 items-center">
                             <div className="flex-1">
                                <div className="font-bold text-gray-800">{p.name}</div>
                                <div className="text-xs text-gray-500">Valor Unit: R$ {p.unitValue.toFixed(2)}</div>
                             </div>
                             <div className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  min="1"
                                  value={p.quantity} 
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => {
                                    const newParts = [...partsUsed];
                                    newParts[i].quantity = Number(e.target.value);
                                    setPartsUsed(newParts);
                                  }}
                                  className="w-12 text-center border rounded p-1"
                                />
                                <span className="font-bold text-gray-800 w-20 text-right">
                                    R$ {(p.quantity * p.unitValue).toFixed(2)}
                                </span>
                                <button onClick={() => handleRemovePart(i)} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                             </div>
                          </div>
                       ))}
                       {partsUsed.length === 0 && <p className="text-xs text-gray-400 text-center py-4 bg-white rounded border border-dashed">Nenhuma peça adicionada.</p>}
                    </div>
                 </div>

                 {/* Services Section */}
                 <div className="border rounded-lg p-4 bg-green-50/30 border-green-100">
                    <div className="flex justify-between items-center mb-3">
                       <h3 className="font-bold flex items-center gap-2 text-green-600"><Wrench size={18} /> Serviços</h3>
                       <button onClick={handleAddService} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition shadow-sm font-bold flex items-center gap-1">
                           <Plus size={12}/> Adicionar
                       </button>
                    </div>
                    <div className="space-y-2">
                       {services.map((s, i) => (
                          <div key={i} className="flex justify-between text-sm bg-white p-2 rounded shadow-sm border border-gray-100 items-center">
                             <div className="flex-1">
                                <div className="font-bold text-gray-800">{s.description}</div>
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-800 w-24 text-right">
                                    R$ {s.value.toFixed(2)}
                                </span>
                                <button onClick={() => handleRemoveService(i)} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                             </div>
                          </div>
                       ))}
                       {services.length === 0 && <p className="text-xs text-gray-400 text-center py-4 bg-white rounded border border-dashed">Nenhum serviço adicionado.</p>}
                    </div>
                 </div>
              </div>

              {/* Total */}
              <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-center">
                 <div className="flex items-center gap-6">
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Subtotal Peças</p>
                        <p className="font-bold">R$ {totalParts.toFixed(2)}</p>
                    </div>
                    <div className="w-px h-8 bg-gray-700"></div>
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Subtotal Serviços</p>
                        <p className="font-bold">R$ {totalServices.toFixed(2)}</p>
                    </div>
                    <div className="w-px h-8 bg-gray-700"></div>
                    <div>
                       <span className="text-gray-400 text-xs uppercase block mb-1">Desconto</span>
                       <div className="flex items-center gap-1">
                           <span className="text-gray-500 text-xs">R$</span>
                           <input 
                             type="number" 
                             value={discount} 
                             onFocus={(e) => e.target.select()}
                             onChange={e => setDiscount(Number(e.target.value))}
                             className="block w-20 bg-gray-800 border-none rounded text-white text-sm p-1" 
                           />
                       </div>
                    </div>
                 </div>
                 <div className="text-right mt-4 md:mt-0">
                    <p className="text-gray-400 text-sm">Total Final</p>
                    <p className="text-4xl font-bold text-brand-blue">R$ {totalGeneral.toFixed(2)}</p>
                 </div>
              </div>
           </div>

           <div className="mt-8 flex justify-end">
              <button 
                onClick={handleSaveOS}
                className="bg-brand-blue text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-blue-600 flex items-center gap-2 transform active:scale-95 transition-all"
              >
                <Save size={20} /> Finalizar e Gerar OS
              </button>
           </div>
        </div>
      )}

      {/* PART SELECTOR MODAL */}
      {showPartSelector && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <Package className="text-brand-orange" /> Selecionar Peça / Material
                      </h3>
                      <button onClick={() => setShowPartSelector(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  </div>
                  
                  <div className="p-4 border-b">
                      <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input 
                            autoFocus
                            placeholder="Buscar peça..." 
                            className="w-full pl-10 p-3 rounded-lg border bg-gray-50 focus:bg-white transition-colors"
                            value={partSearchTerm}
                            onChange={e => setPartSearchTerm(e.target.value)}
                          />
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2">
                      {allParts
                        .filter(p => p.name.toLowerCase().includes(partSearchTerm.toLowerCase()) || p.code.toLowerCase().includes(partSearchTerm.toLowerCase()))
                        .map(part => (
                          <div 
                            key={part.id} 
                            onClick={() => handleSelectPart(part)}
                            className="p-3 hover:bg-blue-50 cursor-pointer rounded-lg border border-transparent hover:border-blue-100 transition-all mb-1 group"
                          >
                              <div className="flex justify-between items-center">
                                  <div>
                                      <p className="font-bold text-gray-800">{part.name}</p>
                                      <p className="text-xs text-gray-500">{part.code} • Estoque: {part.stock} {part.unit}</p>
                                  </div>
                                  <div className="text-right">
                                      <p className="font-bold text-brand-blue">R$ {part.unitValue.toFixed(2)}</p>
                                      <span className="text-[10px] text-gray-400 group-hover:text-blue-400">Clique para adicionar</span>
                                  </div>
                              </div>
                          </div>
                        ))
                      }
                      {allParts.length === 0 && <p className="text-center p-4 text-gray-400">Nenhuma peça cadastrada.</p>}
                  </div>
              </div>
          </div>
      )}

      {/* SERVICE SELECTOR MODAL */}
      {showServiceSelector && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <Wrench className="text-brand-blue" /> Selecionar Serviço
                      </h3>
                      <button onClick={() => setShowServiceSelector(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  </div>
                  
                  <div className="p-4 border-b">
                      <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input 
                            autoFocus
                            placeholder="Buscar serviço..." 
                            className="w-full pl-10 p-3 rounded-lg border bg-gray-50 focus:bg-white transition-colors"
                            value={serviceSearchTerm}
                            onChange={e => setServiceSearchTerm(e.target.value)}
                          />
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2">
                      {allServices
                        .filter(s => s.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) || s.category.toLowerCase().includes(serviceSearchTerm.toLowerCase()))
                        .map(service => (
                          <div 
                            key={service.id} 
                            onClick={() => handleSelectService(service)}
                            className="p-3 hover:bg-blue-50 cursor-pointer rounded-lg border border-transparent hover:border-blue-100 transition-all mb-1 group"
                          >
                              <div className="flex justify-between items-center">
                                  <div>
                                      <p className="font-bold text-gray-800">{service.name}</p>
                                      <p className="text-xs text-gray-500">{service.category}</p>
                                  </div>
                                  <div className="text-right">
                                      <p className="font-bold text-brand-blue">R$ {service.value.toFixed(2)}</p>
                                      <span className="text-[10px] text-gray-400 group-hover:text-blue-400">Clique para adicionar</span>
                                  </div>
                              </div>
                          </div>
                        ))
                      }
                      {allServices.length === 0 && <p className="text-center p-4 text-gray-400">Nenhum serviço cadastrado.</p>}
                  </div>
              </div>
          </div>
      )}

      <Modal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
      />
    </div>
  );
};