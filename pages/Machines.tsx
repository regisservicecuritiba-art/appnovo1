import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Machine, Client } from '../types';
import { QrCode, Plus, Fan, Tag, Printer, X, Trash2 } from 'lucide-react';

export const Machines: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMachine, setNewMachine] = useState<Partial<Machine>>({ type: 'Split', clientId: '' });

  useEffect(() => {
    const unsubMachines = dbService.subscribeMachines(setMachines);
    const unsubClients = dbService.subscribeClients(setClients);
    return () => {
      unsubMachines();
      unsubClients();
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachine.brand || !newMachine.model || !newMachine.clientId) return;

    const machine: Omit<Machine, 'id'> = {
      clientId: newMachine.clientId!,
      type: newMachine.type as any,
      brand: newMachine.brand!,
      model: newMachine.model!,
      capacityBTU: Number(newMachine.capacityBTU) || 9000,
      serialNumber: newMachine.serialNumber || 'N/A',
      location: newMachine.location || '',
      installDate: newMachine.installDate || new Date().toISOString().split('T')[0],
      warrantyEnd: newMachine.warrantyEnd || '',
      qrCodeData: '', 
      notes: newMachine.notes || '',
    };

    try {
      await dbService.addMachine(machine as any);
      setShowAddModal(false);
      // We don't have the ID here easily since addDoc returns a promise with the ref
      // But the subscription will update the list
    } catch (err) {
      console.error('Erro ao criar máquina:', err);
      alert('Erro ao criar máquina');
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">Máquinas & Equipamentos</h1>
           <p className="text-gray-500 text-sm">Inventário de ativos instalados.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-brand-orange text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/30"
        >
          <Plus size={18} /> Nova Máquina
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
        {machines.map(machine => {
           const clientName = clients.find(c => c.id === machine.clientId)?.name || 'Cliente Desconhecido';
           return (
            <div key={machine.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between group hover:border-brand-blue/30 transition-all">
              <div>
                <div className="flex justify-between items-start mb-2">
                   <div className="p-2 bg-blue-50 rounded-lg text-brand-blue">
                     <Fan size={24} />
                   </div>
                   <div className="flex gap-1">
                     <button 
                      onClick={() => setSelectedMachine(machine)}
                      className="text-gray-400 hover:text-gray-800 p-1"
                      title="Ver QR Code"
                     >
                       <QrCode size={20} />
                     </button>
                     <button 
                      onClick={async () => {
                        if (confirm('Deseja excluir esta máquina?')) {
                          await dbService.deleteMachine(machine.id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-500 p-1"
                      title="Excluir Máquina"
                     >
                       <Trash2 size={20} />
                     </button>
                   </div>
                </div>
                <h3 className="font-bold text-gray-800">{machine.brand} - {machine.model}</h3>
                <p className="text-xs text-gray-500 mb-2">{machine.type} • {machine.capacityBTU} BTUs</p>
                <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                   <Tag size={12} /> S/N: {machine.serialNumber}
                </div>
                <div className="text-xs bg-gray-50 p-2 rounded mt-2 border border-gray-100">
                  <strong>Local:</strong> {machine.location}<br/>
                  <strong>Cliente:</strong> {clientName}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                 <button onClick={() => setSelectedMachine(machine)} className="text-xs font-bold text-brand-blue uppercase tracking-wide hover:underline">
                    Gerar Etiqueta
                 </button>
              </div>
            </div>
           );
        })}
      </div>

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Cadastrar Equipamento</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>
            <form onSubmit={handleAddMachine} className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="md:col-span-2">
                 <label className="block text-sm font-medium text-gray-700">Cliente</label>
                 <select required className="w-full p-2 border rounded-lg" value={newMachine.clientId} onChange={e => setNewMachine({...newMachine, clientId: e.target.value})}>
                   <option value="">Selecione o cliente...</option>
                   {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700">Marca</label>
                  <input required className="w-full p-2 border rounded-lg" value={newMachine.brand || ''} onChange={e => setNewMachine({...newMachine, brand: e.target.value})} />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700">Modelo</label>
                  <input required className="w-full p-2 border rounded-lg" value={newMachine.model || ''} onChange={e => setNewMachine({...newMachine, model: e.target.value})} />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo</label>
                  <select className="w-full p-2 border rounded-lg" value={newMachine.type} onChange={e => setNewMachine({...newMachine, type: e.target.value as any})}>
                    <option>Split</option><option>Cassete</option><option>Piso Teto</option><option>VRF</option><option>Janela</option>
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700">BTUs</label>
                  <input type="number" className="w-full p-2 border rounded-lg" value={newMachine.capacityBTU || ''} onChange={e => setNewMachine({...newMachine, capacityBTU: Number(e.target.value)})} />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700">Nº Série</label>
                  <input className="w-full p-2 border rounded-lg" value={newMachine.serialNumber || ''} onChange={e => setNewMachine({...newMachine, serialNumber: e.target.value})} />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700">Local Instalação</label>
                  <input className="w-full p-2 border rounded-lg" value={newMachine.location || ''} onChange={e => setNewMachine({...newMachine, location: e.target.value})} />
               </div>
               <button type="submit" className="md:col-span-2 py-3 bg-brand-blue text-white font-bold rounded-lg mt-4">Salvar Equipamento</button>
            </form>
          </div>
        </div>
      )}

      {/* QR CODE MODAL / PRINT VIEW */}
      {selectedMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 print:bg-white print:static print:block">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative print:shadow-none print:w-full print:max-w-none">
              <button onClick={() => setSelectedMachine(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 print:hidden"><X size={24}/></button>
              
              <div className="p-8 flex flex-col items-center text-center border-4 border-brand-blue m-2 border-dashed rounded-xl">
                 <div className="flex items-center gap-2 mb-4">
                   <div className="w-4 h-4 rounded-full bg-brand-orange"></div>
                   <h2 className="text-2xl font-black text-gray-800 tracking-tighter">SERVICE <span className="text-gray-400 text-sm font-normal">REFRIGERAÇÃO</span></h2>
                 </div>
                 
                 <div className="w-48 h-48 bg-gray-900 mb-4 p-2 rounded-lg flex items-center justify-center">
                    {/* Simulated QR Code */}
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedMachine.id}`} 
                      alt="QR Code" 
                      className="w-full h-full object-contain bg-white rounded"
                    />
                 </div>

                 <h3 className="text-xl font-bold text-gray-800">{selectedMachine.brand} {selectedMachine.model}</h3>
                 <p className="text-sm text-gray-500 mb-2">{selectedMachine.capacityBTU} BTUs • {selectedMachine.type}</p>
                 <p className="text-xs text-gray-400 font-mono mb-6">ID: {selectedMachine.id.toUpperCase().substring(0,8)}...</p>

                 <div className="w-full bg-blue-50 p-3 rounded-lg text-left text-sm mb-6 print:hidden">
                    <p className="text-brand-blue font-bold mb-1">Dica:</p>
                    <p className="text-gray-600 leading-tight">Imprima esta etiqueta e cole na lateral da unidade condensadora ou evaporadora para acesso rápido ao histórico.</p>
                 </div>

                 <button onClick={handlePrint} className="w-full py-3 bg-brand-blue text-white font-bold rounded-lg flex items-center justify-center gap-2 print:hidden hover:bg-blue-600">
                    <Printer size={20} /> Imprimir Etiqueta
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};