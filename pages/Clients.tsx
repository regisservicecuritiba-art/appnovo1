import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dbService } from '../services/db';
import { Client, Machine, PMOC as PMOCType } from '../types';
import { Search, Plus, Phone, MapPin, Building, X, Fan, Wrench, Edit2, Trash2, LocateFixed, Loader2, History as HistoryIcon, ExternalLink } from 'lucide-react';

export const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [pmocs, setPmocs] = useState<PMOCType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals State
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPMOCHistoryModal, setShowPMOCHistoryModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAddingMachine, setIsAddingMachine] = useState(false);

  // Forms Data
  const [newClient, setNewClient] = useState<Partial<Client>>({ type: 'Residencial' });
  const [newMachine, setNewMachine] = useState<Partial<Machine>>({ type: 'Split' });

  const navigate = useNavigate();

  useEffect(() => {
    const unsub = dbService.subscribeClients(setClients);
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = dbService.subscribeMachines(setMachines);
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = dbService.subscribePMOCs(setPmocs);
    return () => unsub();
  }, []);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.document && c.document.includes(searchTerm))
  );

  const clientMachines = selectedClient 
    ? machines.filter(m => m.clientId === selectedClient.id)
    : [];

  const clientPMOCs = selectedClient
    ? pmocs.filter(p => p.clientId === selectedClient.id)
    : [];

  const handleOpenPublicPMOC = (pmocId: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}#/pmoc-public/${pmocId}`;
    window.open(shareUrl, '_blank');
  };

  const handleDeletePmoc = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este documento PMOC permanentemente?')) {
      try {
        await dbService.deletePMOC(id);
      } catch (err) {
        console.error("Failed to delete PMOC", err);
        alert("Erro ao excluir o documento.");
      }
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          if (data && data.display_name) {
            setNewClient(prev => ({ ...prev, address: data.display_name }));
          } else {
            alert('Não foi possível encontrar o endereço para esta localização.');
          }
        } catch (error) {
          console.error('Erro ao buscar endereço:', error);
          alert('Erro ao obter endereço da localização.');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error('Erro de geolocalização:', error);
        let msg = 'Erro ao obter sua localização.';
        if (error.code === 1) msg = 'Permissão de localização negada.';
        else if (error.code === 2) msg = 'Localização indisponível.';
        else if (error.code === 3) msg = 'Tempo esgotado ao obter localização.';
        alert(msg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name) return;

    try {
      if (isEditing && newClient.id) {
        const { id, ...data } = newClient;
        await dbService.updateClient(id, data);
      } else {
        await dbService.addClient(newClient as any);
      }
      
      setShowAddClientModal(false);
      setIsEditing(false);
      setNewClient({ type: 'Residencial' });
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      alert('Erro ao salvar cliente');
    }
  };

  const handleEditClient = (client: Client) => {
    setNewClient(client);
    setIsEditing(true);
    setShowAddClientModal(true);
  };

  const handleDeleteClient = async (id: string) => {
    setClientToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      await dbService.deleteClient(clientToDelete);
      if (selectedClient?.id === clientToDelete) {
        setSelectedClient(null);
      }
      setShowDeleteModal(false);
      setClientToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      // Fallback to console instead of alert
    }
  };

  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !newMachine.brand || !newMachine.model) return;

    const machineData = {
      ...newMachine,
      clientId: selectedClient.id,
      capacityBTU: Number(newMachine.capacityBTU) || 9000,
      installDate: new Date().toISOString().split('T')[0],
      serialNumber: newMachine.serialNumber || 'N/A',
      qrCodeData: `M-${Date.now()}`,
    } as Machine;

    try {
      await dbService.addMachine(machineData);
      setIsAddingMachine(false);
      setNewMachine({ type: 'Split' });
    } catch (err) {
      console.error('Erro ao salvar máquina:', err);
      alert('Erro ao salvar máquina');
    }
  };

  const handleStartMaintenance = (machineId: string) => {
    if (selectedClient) {
      navigate('/orders', { 
        state: { 
          clientId: selectedClient.id, 
          machineId: machineId,
          type: 'Manutenção Corretiva'
        } 
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
           <p className="text-gray-500 text-sm">Gerencie sua base de clientes residenciais e comerciais.</p>
        </div>
        <button 
          onClick={() => {
            setIsEditing(false);
            setNewClient({ type: 'Residencial' });
            setShowAddClientModal(true);
          }}
          className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30"
        >
          <Plus size={18} /> Novo Cliente
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nome, CPF ou CNPJ..." 
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map(client => (
          <div key={client.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{client.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${client.type === 'Comercial' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                  {client.type}
                </span>
              </div>
              <Building className="text-gray-300" size={24} />
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-gray-50 px-1 rounded">{client.document}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-brand-orange" />
                {client.phone}
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-brand-blue" />
                <span className="truncate">{client.address}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
              <div className="flex gap-1">
                <button 
                  onClick={() => handleEditClient(client)}
                  className="p-2 text-gray-400 hover:text-brand-blue hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar Cliente"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => {
                    setSelectedClient(client);
                    setShowPMOCHistoryModal(true);
                  }}
                  className="p-2 text-gray-400 hover:text-brand-orange hover:bg-orange-50 rounded-lg transition-colors"
                  title="Histórico PMOC"
                >
                  <HistoryIcon size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteClient(client.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Excluir Cliente"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <button 
                onClick={() => setSelectedClient(client)}
                className="text-sm font-medium text-brand-blue hover:underline"
              >
                Ver Detalhes
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* PMOC HISTORY MODAL */}
      {showPMOCHistoryModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Histórico PMOC</h2>
              <button onClick={() => setShowPMOCHistoryModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              <p className="text-sm text-gray-500 mb-4">Documentos emitidos para <strong>{selectedClient.name}</strong></p>
              
              {clientPMOCs.length > 0 ? (
                clientPMOCs.map(pmoc => (
                  <div key={pmoc.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50 flex justify-between items-center hover:border-brand-blue transition-colors">
                    <div>
                      <p className="font-bold text-gray-800">{new Date(pmoc.createdAt || pmoc.date).toLocaleDateString('pt-BR')}</p>
                      <p className="text-xs text-gray-500 uppercase tracking-widest">{pmoc.machines.length} Equipamento(s)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDeletePmoc(pmoc.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Excluir PMOC"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleOpenPublicPMOC(pmoc.id)}
                        className="p-2 bg-white text-brand-blue border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 text-xs font-bold"
                      >
                        <ExternalLink size={14} /> Visualizar
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  Nenhum PMOC emitido para este cliente.
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setShowPMOCHistoryModal(false)}
              className="w-full mt-6 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Confirmar Exclusão</h2>
            <p className="text-gray-600 mb-6">Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita localmente.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteClient}
                className="flex-1 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CLIENT MODAL */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'Editar Cliente' : 'Cadastrar Cliente'}</h2>
              <button onClick={() => setShowAddClientModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>
            <form onSubmit={handleSaveClient} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome / Razão Social</label>
                  <input required type="text" className="w-full p-2 border rounded-lg" value={newClient.name || ''} onChange={e => setNewClient({...newClient, name: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                   <select className="w-full p-2 border rounded-lg" value={newClient.type} onChange={e => setNewClient({...newClient, type: e.target.value as any})}>
                     <option value="Residencial">Residencial</option>
                     <option value="Comercial">Comercial</option>
                     <option value="Industrial">Industrial</option>
                   </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
                  <input required type="text" className="w-full p-2 border rounded-lg" value={newClient.document || ''} onChange={e => setNewClient({...newClient, document: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input type="text" className="w-full p-2 border rounded-lg" value={newClient.phone || ''} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                  <input type="text" className="w-full p-2 border rounded-lg" value={newClient.whatsapp || ''} onChange={e => setNewClient({...newClient, whatsapp: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Endereço Completo</label>
                    <button 
                      type="button"
                      onClick={handleGetCurrentLocation}
                      disabled={isLocating}
                      className="flex items-center gap-1 text-xs font-bold text-brand-blue hover:text-blue-700 disabled:opacity-50"
                    >
                      {isLocating ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Buscando...
                        </>
                      ) : (
                        <>
                          <LocateFixed size={12} />
                          Usar Localização Atual
                        </>
                      )}
                    </button>
                  </div>
                  <input required type="text" className="w-full p-2 border rounded-lg" value={newClient.address || ''} onChange={e => setNewClient({...newClient, address: e.target.value})} />
                </div>
                 <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" className="w-full p-2 border rounded-lg" value={newClient.email || ''} onChange={e => setNewClient({...newClient, email: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-brand-blue text-white font-bold rounded-lg hover:bg-blue-600 mt-4">Salvar Cliente</button>
            </form>
          </div>
        </div>
      )}

      {/* CLIENT DETAILS MODAL */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                 <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedClient.name}</h2>
                    <p className="text-gray-500 text-sm flex items-center gap-2 mt-1">
                      <span className="bg-white border px-2 py-0.5 rounded text-xs uppercase tracking-wide">{selectedClient.type}</span>
                      {selectedClient.document}
                    </p>
                 </div>
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowPMOCHistoryModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-brand-orange text-xs font-bold rounded hover:bg-orange-100 transition-colors"
                    >
                      <HistoryIcon size={14} /> Histórico PMOC
                    </button>
                    <button 
                      onClick={() => {
                        handleEditClient(selectedClient);
                        setSelectedClient(null);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-brand-blue text-xs font-bold rounded hover:bg-blue-100 transition-colors"
                    >
                      <Edit2 size={14} /> Editar
                    </button>
                    <button 
                      onClick={() => handleDeleteClient(selectedClient.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={14} /> Excluir
                    </button>
                    <button onClick={() => setSelectedClient(null)} className="ml-2 text-gray-400 hover:text-gray-600">
                       <X size={24} />
                    </button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                 {/* Contact Info */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                       <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Contato</h3>
                       <div className="space-y-2 text-sm">
                          <p className="flex items-center gap-2"><Phone size={14} className="text-brand-orange"/> {selectedClient.phone}</p>
                          <p className="flex items-center gap-2 text-green-600"><span className="font-bold">WA:</span> {selectedClient.whatsapp}</p>
                          <p className="truncate">{selectedClient.email}</p>
                       </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 md:col-span-2">
                       <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Localização</h3>
                       <p className="text-sm flex items-start gap-2">
                          <MapPin size={16} className="text-brand-blue shrink-0 mt-0.5"/> 
                          {selectedClient.address}
                       </p>
                       {selectedClient.notes && (
                         <div className="mt-4 pt-4 border-t border-gray-200">
                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-1">Observações</h3>
                            <p className="text-sm text-gray-600 italic">{selectedClient.notes}</p>
                         </div>
                       )}
                    </div>
                 </div>

                 {/* Machines Section */}
                 <div className="mb-4 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                       <Fan className="text-brand-blue" /> Máquinas Instaladas
                    </h3>
                    <button 
                      onClick={() => setIsAddingMachine(!isAddingMachine)}
                      className="text-sm bg-brand-orange/10 text-brand-orange px-3 py-1.5 rounded-lg font-medium hover:bg-brand-orange/20 transition-colors"
                    >
                       {isAddingMachine ? 'Cancelar Adição' : '+ Adicionar Máquina'}
                    </button>
                 </div>

                 {/* Add Machine Form (Inline) */}
                 {isAddingMachine && (
                    <div className="mb-8 p-4 bg-orange-50 rounded-xl border border-orange-100">
                       <h4 className="text-sm font-bold text-brand-orange mb-3">Nova Máquina</h4>
                       <form onSubmit={handleAddMachine} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input required placeholder="Marca (ex: LG)" className="p-2 border rounded text-sm" value={newMachine.brand || ''} onChange={e => setNewMachine({...newMachine, brand: e.target.value})} />
                          <input required placeholder="Modelo" className="p-2 border rounded text-sm" value={newMachine.model || ''} onChange={e => setNewMachine({...newMachine, model: e.target.value})} />
                          <input type="number" placeholder="BTUs" className="p-2 border rounded text-sm" value={newMachine.capacityBTU || ''} onFocus={(e) => e.target.select()} onChange={e => setNewMachine({...newMachine, capacityBTU: Number(e.target.value)})} />
                          <select className="p-2 border rounded text-sm" value={newMachine.type} onChange={e => setNewMachine({...newMachine, type: e.target.value as any})}>
                             <option>Split</option><option>Cassete</option><option>Piso Teto</option><option>VRF</option><option>Janela</option>
                          </select>
                          <input placeholder="Local (ex: Sala)" className="p-2 border rounded text-sm" value={newMachine.location || ''} onChange={e => setNewMachine({...newMachine, location: e.target.value})} />
                          <button type="submit" className="bg-brand-orange text-white rounded font-bold text-sm shadow hover:bg-orange-600">Salvar Máquina</button>
                       </form>
                    </div>
                 )}

                 {/* Machines List */}
                 <div className="space-y-3">
                    {clientMachines.map(machine => (
                       <div key={machine.id} className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center hover:border-brand-blue/50 transition-colors bg-white">
                          <div className="flex items-center gap-4 mb-3 md:mb-0">
                             <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                <Fan size={20} />
                             </div>
                             <div>
                                <h4 className="font-bold text-gray-800">{machine.brand} {machine.model}</h4>
                                <p className="text-xs text-gray-500">{machine.type} • {machine.capacityBTU} BTUs • {machine.location}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <button 
                                onClick={() => handleStartMaintenance(machine.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-brand-blue text-xs font-bold rounded hover:bg-blue-100"
                             >
                                <Wrench size={14} /> Iniciar Manutenção
                             </button>
                          </div>
                       </div>
                    ))}
                    {machines.length === 0 && (
                       <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          Nenhuma máquina cadastrada para este cliente.
                       </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};