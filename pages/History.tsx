import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  History as HistoryIcon, 
  QrCode, 
  Search, 
  User as UserIcon, 
  Fan, 
  Calendar,
  ChevronRight,
  X,
  Package,
  ClipboardList,
  AlertCircle
} from 'lucide-react';
import { dbService } from '../services/db';
import { Client, Machine, MaintenanceSession, User } from '../types';
import { Html5QrcodeScanner } from 'html5-qrcode';

export const History: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [filteredMachines, setFilteredMachines] = useState<Machine[]>([]);
  const [machineHistory, setMachineHistory] = useState<MaintenanceSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedSession, setSelectedSession] = useState<MaintenanceSession | null>(null);

  useEffect(() => {
    const unsubClients = dbService.subscribeClients(setClients);
    const unsubMachines = dbService.subscribeMachines(setMachines);

    return () => {
      unsubClients();
      unsubMachines();
    };
  }, []);

  useEffect(() => {
    const machineId = searchParams.get('machineId');
    if (machineId && machines.length > 0) {
      const machine = machines.find(m => m.id === machineId);
      if (machine) {
        setSelectedClientId(machine.clientId);
        setSelectedMachineId(machine.id);
      }
    }
  }, [searchParams, machines]);

  useEffect(() => {
    if (selectedClientId) {
      setFilteredMachines(machines.filter(m => m.clientId === selectedClientId));
    } else {
      setFilteredMachines([]);
      setSelectedMachineId('');
    }
  }, [selectedClientId, machines]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    if (selectedMachineId) {
      setLoading(true);
      unsub = dbService.subscribeMaintenanceSessions((data) => {
        setMachineHistory(data.filter(s => s.machineId === selectedMachineId && s.status === 'Finalizada'));
        setLoading(false);
      }, 'Finalizada');
    } else {
      setMachineHistory([]);
    }
    return () => {
      if (unsub) unsub();
    };
  }, [selectedMachineId]);

  const startScanner = () => {
    setShowScanner(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("history-reader", { fps: 10, qrbox: 250 }, false);
      scanner.render(onScanSuccess, onScanError);
      
      function onScanSuccess(decodedText: string) {
        scanner.clear();
        setShowScanner(false);
        handleQrCode(decodedText);
      }

      function onScanError(err: any) {}
    }, 100);
  };

  const handleQrCode = (qrData: string) => {
    console.log('QR Data scanned:', qrData);
    
    let machineId = qrData.trim();

    // 1. Check if it's a URL (new format)
    try {
      if (qrData.includes('machineId=')) {
        const url = new URL(qrData);
        const id = url.searchParams.get('machineId');
        if (id) machineId = id;
      }
    } catch (e) {
      console.log('Not a valid URL, treating as ID');
    }
    
    // 2. Try to extract ID if it has the old prefix
    if (qrData.startsWith('SERVICE_MACHINE_')) {
      machineId = qrData.replace('SERVICE_MACHINE_', '');
    }

    // 3. Find the machine
    console.log('Searching for machine with ID or QR Data:', machineId);
    const machine = machines.find(m => 
      m.id === machineId || 
      m.qrCodeData === qrData || 
      m.id === qrData ||
      m.serialNumber === qrData
    );
    
    if (machine) {
      console.log('Machine found:', machine);
      setSelectedClientId(machine.clientId);
      setSelectedMachineId(machine.id);
    } else {
      console.error('Machine not found in list:', machines);
      alert(`Máquina não encontrada para este QR Code: ${qrData}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <HistoryIcon className="text-brand-blue" /> HISTÓRICO TÉCNICO
          </h1>
          <p className="text-gray-500 text-sm font-medium">Consulte o histórico completo de manutenções por máquina</p>
        </div>
        <button 
          onClick={startScanner}
          className="w-full md:w-auto bg-gray-900 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-black transition-all active:scale-95"
        >
          <QrCode size={20} /> Escanear Máquina
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase mb-2">Cliente</label>
            <select 
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-blue outline-none font-medium"
            >
              <option value="">Selecione o cliente...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase mb-2">Máquina</label>
            <select 
              value={selectedMachineId}
              disabled={!selectedClientId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-blue outline-none font-medium disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">Selecione a máquina...</option>
              {filteredMachines.map(m => (
                <option key={m.id} value={m.id}>{m.brand} {m.model} - {m.location}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
        </div>
      ) : selectedMachineId ? (
        machineHistory.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Nenhum histórico encontrado</h3>
            <p className="text-gray-500 mt-2">Esta máquina ainda não possui manutenções finalizadas registradas.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase px-2">Linha do Tempo de Manutenções</h3>
            {machineHistory.map((session) => (
              <div 
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-brand-blue rounded-xl flex items-center justify-center font-bold">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="font-black text-gray-900">{new Date(session.created_at).toLocaleDateString('pt-BR')}</p>
                    <p className="text-xs text-gray-500 font-medium">
                      {session.partsUsed.length} peças • {session.services.length} serviços
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-brand-blue transition-colors" />
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="bg-gray-50 rounded-3xl p-12 text-center border border-dashed border-gray-200">
          <Search size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Selecione uma máquina ou escaneie o QR Code para ver o histórico.</p>
        </div>
      )}

      {/* SESSION DETAIL MODAL */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-3xl">
              <div>
                <h2 className="text-xl font-black text-gray-800 uppercase">DETALHES DA MANUTENÇÃO</h2>
                <p className="text-xs text-gray-500 font-medium">Realizada em {new Date(selectedSession.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <button onClick={() => setSelectedSession(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <section>
                <h4 className="text-xs font-black text-gray-400 uppercase mb-3 flex items-center gap-2">
                  <Package size={14} className="text-brand-orange" /> Peças Utilizadas
                </h4>
                {selectedSession.partsUsed.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Nenhuma peça registrada.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedSession.partsUsed.map((p, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl text-sm">
                        <span className="font-bold text-gray-700">{p.quantity}x {p.name}</span>
                        <span className="font-black text-gray-900">R$ {(p.quantity * p.unitValue).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h4 className="text-xs font-black text-gray-400 uppercase mb-3 flex items-center gap-2">
                  <ClipboardList size={14} className="text-brand-blue" /> Serviços Realizados
                </h4>
                {selectedSession.services.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Nenhum serviço registrado.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedSession.services.map((s, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl text-sm">
                        <span className="font-bold text-gray-700">{s.description}</span>
                        <span className="font-black text-gray-900">R$ {s.value.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h4 className="text-xs font-black text-gray-400 uppercase mb-3 flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-500" /> Observações Técnicas
                </h4>
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-sm text-amber-900 font-medium whitespace-pre-wrap">
                  {selectedSession.observations || 'Nenhuma observação registrada.'}
                </div>
              </section>
            </div>
            
            <div className="p-6 border-t bg-gray-50 rounded-b-3xl">
              <button 
                onClick={() => setSelectedSession(null)}
                className="w-full py-3 bg-gray-900 text-white font-black rounded-xl"
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCANNER MODAL */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold">Escanear QR Code</h3>
              <button onClick={() => setShowScanner(false)}><X size={24} /></button>
            </div>
            <div id="history-reader" className="w-full"></div>
            <div className="p-4 text-center text-sm text-gray-500">
              Aponte a câmera para o QR Code da máquina
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
