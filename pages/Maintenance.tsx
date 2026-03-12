import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Plus, 
  X, 
  User as UserIcon, 
  Fan, 
  Save, 
  CheckCircle2,
  AlertCircle,
  Trash2,
  Package,
  ClipboardList
} from 'lucide-react';
import { dbService } from '../services/db';
import { Client, Machine, MaintenanceSession, Part, PartUsed, ServiceItem, User } from '../types';

interface MaintenanceProps {
  user?: User;
}

export const Maintenance: React.FC<MaintenanceProps> = ({ user }) => {
  const [sessions, setSessions] = useState<MaintenanceSession[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<MaintenanceSession | null>(null);
  
  // Add Modal State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [filteredMachines, setFilteredMachines] = useState<Machine[]>([]);

  // Detail Modal State
  const [activeParts, setActiveParts] = useState<PartUsed[]>([]);
  const [activeServices, setActiveServices] = useState<ServiceItem[]>([]);
  const [observations, setObservations] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // New Service Form State
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServiceValue, setNewServiceValue] = useState('');

  useEffect(() => {
    const unsubSessions = dbService.subscribeMaintenanceSessions(setSessions, 'Ativa');
    const unsubClients = dbService.subscribeClients(setClients);
    const unsubMachines = dbService.subscribeMachines(setMachines);
    const unsubParts = dbService.subscribeParts(setParts);

    setLoading(false);

    return () => {
      unsubSessions();
      unsubClients();
      unsubMachines();
      unsubParts();
    };
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      setFilteredMachines(machines.filter(m => m.clientId === selectedClientId));
    } else {
      setFilteredMachines([]);
    }
  }, [selectedClientId, machines]);

  const createSession = async (clientId: string, machineId: string) => {
    // Check if machine is already in maintenance
    if (sessions.some(s => s.machineId === machineId)) {
      alert('Esta máquina já está em manutenção.');
      return;
    }

    try {
      const newSession: Omit<MaintenanceSession, 'id'> = {
        machineId,
        clientId,
        technicianId: user?.id || '',
        status: 'Ativa',
        partsUsed: [],
        services: [],
        observations: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await dbService.addMaintenanceSession(newSession);
      
      setShowAddModal(false);
      setSelectedClientId('');
      setSelectedMachineId('');
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const openDetail = (session: MaintenanceSession) => {
    setShowDetailModal(session);
    setActiveParts(session.partsUsed || []);
    setActiveServices(session.services || []);
    setObservations(session.observations || '');
  };

  const saveSession = async () => {
    if (!showDetailModal) return;
    setIsSaving(true);
    try {
      await dbService.updateMaintenanceSession(showDetailModal.id, {
        partsUsed: activeParts,
        services: activeServices,
        observations: observations
      });

      setShowDetailModal(null);
    } catch (error) {
      console.error('Error saving session:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const finalizeSession = async () => {
    if (!showDetailModal) return;
    
    setIsSaving(true);
    try {
      // 1. Update session to Finalizada
      await dbService.updateMaintenanceSession(showDetailModal.id, {
        partsUsed: activeParts,
        services: activeServices,
        observations: observations,
        status: 'Finalizada'
      });

      // 2. If linked to an OS, update the OS
      if (showDetailModal.serviceOrderId) {
        // We'll need a way to get the OS from dbService
        // For now, we can just assume it's handled or implement a getOrder method
        // Actually, we can just update it if we have the ID
        const totalParts = activeParts.reduce((acc, p) => acc + (p.quantity * p.unitValue), 0);
        const totalServices = activeServices.reduce((acc, s) => acc + s.value, 0);
        
        // We don't have the full OS here to calculate total with discount easily without fetching it
        // But we can update the parts and services
        await dbService.updateOrder(showDetailModal.serviceOrderId, {
          partsUsed: activeParts,
          services: activeServices,
          status: 'Finalizada' as any
        });
      }

      setShowDetailModal(null);
      alert('Manutenção encerrada com sucesso!');
    } catch (error: any) {
      console.error('Error finalizing session:', error);
      alert(error.message || 'Erro ao encerrar manutenção.');
    } finally {
      setIsSaving(false);
    }
  };

  const addPart = (part: Part) => {
    const existing = activeParts.find(p => p.partId === part.id);
    if (existing) {
      setActiveParts(activeParts.map(p => p.partId === part.id ? { ...p, quantity: p.quantity + 1 } : p));
    } else {
      setActiveParts([...activeParts, {
        partId: part.id,
        name: part.name,
        quantity: 1,
        unitValue: part.unitValue,
        costPrice: part.costPrice
      }]);
    }
  };

  const removePart = (partId: string) => {
    setActiveParts(activeParts.filter(p => p.partId !== partId));
  };

  const addService = () => {
    console.log('addService called', { newServiceDesc, newServiceValue });
    const val = parseFloat(newServiceValue);
    if (newServiceDesc && !isNaN(val)) {
      setActiveServices([...activeServices, {
        id: Math.random().toString(36).substring(2, 9),
        description: newServiceDesc,
        value: val
      }]);
      setNewServiceDesc('');
      setNewServiceValue('');
      setShowServiceForm(false);
    } else {
      alert('Por favor, preencha a descrição e um valor válido.');
    }
  };

  const removeService = (id: string) => {
    setActiveServices(activeServices.filter(s => s.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Wrench className="text-brand-blue" /> MANUTENÇÃO
          </h1>
          <p className="text-gray-500 text-sm font-medium">Gerencie as máquinas em serviço ativo</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex-1 md:flex-none bg-brand-blue text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-600 transition-all active:scale-95"
          >
            <Plus size={20} /> Nova Manutenção
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wrench size={40} className="text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">
            Nenhuma máquina em manutenção
          </h3>
          <p className="text-gray-500 max-w-xs mx-auto mt-2">
            Adicione uma máquina manualmente para começar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions
            .map(session => {
            const machine = machines.find(m => m.id === session.machineId);
            const client = clients.find(c => c.id === session.clientId);
            return (
              <div 
                key={session.id}
                onClick={() => openDetail(session)}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 rounded-2xl transition-colors bg-blue-50 text-brand-blue group-hover:bg-brand-blue group-hover:text-white">
                      <Fan size={24} />
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700">
                      {session.status}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-black text-gray-900 uppercase truncate">
                    {machine?.brand} {machine?.model}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mb-4 flex items-center gap-1">
                    <UserIcon size={12} /> {client?.name}
                  </p>

                  <div className="space-y-2 pt-4 border-t border-gray-50">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 font-bold uppercase">Peças:</span>
                      <span className="text-gray-900 font-black">{(session.partsUsed || []).length}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 font-bold uppercase">Serviços:</span>
                      <span className="text-gray-900 font-black">{(session.services || []).length}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Iniciado em {new Date(session.created_at).toLocaleDateString()}</span>
                  <Wrench size={16} className="text-gray-300" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <Plus className="text-brand-blue" /> NOVA MANUTENÇÃO
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Selecione o Cliente</label>
                <select 
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none font-medium"
                >
                  <option value="">Escolha um cliente...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {selectedClientId && (
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2">Selecione a Máquina</label>
                  <select 
                    value={selectedMachineId}
                    onChange={(e) => setSelectedMachineId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none font-medium"
                  >
                    <option value="">Escolha a máquina...</option>
                    {filteredMachines.map(m => (
                      <option key={m.id} value={m.id}>{m.brand} {m.model} - {m.location}</option>
                    ))}
                  </select>
                </div>
              )}

              <button 
                disabled={!selectedMachineId}
                onClick={() => createSession(selectedClientId, selectedMachineId)}
                className="w-full py-4 bg-brand-blue text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-600 transition-all disabled:opacity-50 disabled:shadow-none mt-4"
              >
                COMEÇAR MANUTENÇÃO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-3xl">
              <div>
                <h2 className="text-xl font-black text-gray-800 uppercase">
                  MANUTENÇÃO: {machines.find(m => m.id === showDetailModal.machineId)?.brand}
                </h2>
                <p className="text-xs text-gray-500 font-medium">Cliente: {clients.find(c => c.id === showDetailModal.clientId)?.name}</p>
              </div>
              <button onClick={() => setShowDetailModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Parts Section */}
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black text-gray-400 uppercase flex items-center gap-2">
                    <Package size={16} className="text-brand-orange" /> Peças e Materiais
                  </h3>
                  {showDetailModal.status === 'Ativa' && (
                    <div className="relative">
                      <select 
                        onChange={(e) => {
                          const part = parts.find(p => p.id === e.target.value);
                          if (part) addPart(part);
                          e.target.value = '';
                        }}
                        className="text-xs font-bold bg-gray-100 px-4 py-2 rounded-lg outline-none border-none cursor-pointer hover:bg-gray-200 transition-colors"
                      >
                        <option value="">+ Adicionar Peça</option>
                        {parts.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Estoque: {p.stock})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                
                {activeParts.length === 0 ? (
                  <p className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded-xl text-center">Nenhuma peça registrada.</p>
                ) : (
                  <div className="space-y-2">
                    {activeParts.map(p => (
                      <div key={p.partId} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-50 text-brand-orange rounded-lg flex items-center justify-center font-bold text-xs">
                            {p.quantity}x
                          </div>
                          <span className="text-sm font-bold text-gray-800">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-black text-gray-900">R$ {(p.quantity * p.unitValue).toFixed(2)}</span>
                          {showDetailModal.status === 'Ativa' && (
                            <button onClick={() => removePart(p.partId)} className="text-red-400 hover:text-red-600">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Services Section */}
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black text-gray-400 uppercase flex items-center gap-2">
                    <ClipboardList size={16} className="text-brand-blue" /> Serviços Adicionais
                  </h3>
                  {showDetailModal.status === 'Ativa' && !showServiceForm && (
                    <button 
                      onClick={() => setShowServiceForm(true)}
                      className="text-xs font-bold bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      + Adicionar Serviço
                    </button>
                  )}
                </div>

                {showServiceForm && (
                  <div className="bg-gray-50 p-4 rounded-2xl mb-4 border border-gray-100 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input 
                        type="text" 
                        placeholder="Descrição do serviço"
                        value={newServiceDesc}
                        onChange={(e) => setNewServiceDesc(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-blue"
                      />
                      <input 
                        type="number" 
                        placeholder="Valor (R$)"
                        value={newServiceValue}
                        onChange={(e) => setNewServiceValue(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-blue"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={addService}
                        className="flex-1 bg-brand-blue text-white py-2 rounded-xl text-xs font-bold"
                      >
                        Confirmar
                      </button>
                      <button 
                        onClick={() => setShowServiceForm(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-600 rounded-xl text-xs font-bold"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {activeServices.length === 0 ? (
                  <p className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded-xl text-center">Nenhum serviço registrado.</p>
                ) : (
                  <div className="space-y-2">
                    {activeServices.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                        <span className="text-sm font-bold text-gray-800">{s.description}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-black text-gray-900">R$ {s.value.toFixed(2)}</span>
                          {showDetailModal.status === 'Ativa' && (
                            <button onClick={() => removeService(s.id)} className="text-red-400 hover:text-red-600">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Observations */}
              <section>
                <h3 className="text-sm font-black text-gray-400 uppercase mb-4 flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-500" /> Observações Técnicas
                </h3>
                <textarea 
                  value={observations}
                  readOnly={showDetailModal.status !== 'Ativa'}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Descreva o estado da máquina, problemas encontrados ou recomendações..."
                  className={`w-full h-32 p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm font-medium resize-none ${
                    showDetailModal.status !== 'Ativa' ? 'bg-gray-50' : ''
                  }`}
                />
              </section>
            </div>

            {showDetailModal.status === 'Ativa' && (
              <div className="p-6 bg-gray-50 border-t rounded-b-3xl flex gap-4">
                <button 
                  onClick={saveSession}
                  disabled={isSaving}
                  className="flex-1 py-4 bg-brand-blue text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={20} /> {isSaving ? 'Salvando...' : 'SALVAR ALTERAÇÕES'}
                </button>
                <button 
                  onClick={finalizeSession}
                  disabled={isSaving}
                  className="flex-1 py-4 bg-gray-900 text-white font-black rounded-2xl shadow-xl shadow-gray-200 hover:bg-black transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={20} /> {isSaving ? 'Encerrando...' : 'ENCERRAR SERVIÇO'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
