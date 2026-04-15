import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { auth } from '../services/firebase';
import { Machine, Client, PMOC as PMOCType } from '../types';
import { Logo } from '../components/Logo';
import { CheckCircle, FileText, X, Printer, Thermometer, Activity, Zap, MessageCircle, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const PROCEDURES = [
  'Limpeza de Filtros', 
  'Limpeza de Bandeja', 
  'Verificação Drenagem', 
  'Limpeza Serpentinas', 
  'Verificação Elétrica', 
  'Medição de Gás', 
  'Aplicação Bactericida', 
  'Aperto de Bornes', 
  'Teste Remoto'
];

export const PMOC: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  
  const [clientId, setClientId] = useState('');
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // State for the parameters modal
  const [showParamsModal, setShowParamsModal] = useState(false);
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [tempPhone, setTempPhone] = useState('');
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>(PROCEDURES);
  const [readings, setReadings] = useState({
    tempIn: '7.5',
    tempOut: '22.0',
    superheat: 'OK',
    current: '5.2'
  });

  useEffect(() => {
    const unsubClients = dbService.subscribeClients(setClients);
    const unsubMachines = dbService.subscribeMachines(setMachines);
    return () => {
      unsubClients();
      unsubMachines();
    };
  }, []);

  const client = clients.find(c => c.id === clientId);
  const clientMachines = machines.filter(m => m.clientId === clientId);

  const toggleMachine = (id: string) => {
    if (selectedMachines.includes(id)) {
      setSelectedMachines(selectedMachines.filter(m => m !== id));
    } else {
      setSelectedMachines([...selectedMachines, id]);
    }
  };

  const toggleProcedure = (proc: string) => {
    setSelectedProcedures(prev => 
      prev.includes(proc) ? prev.filter(p => p !== proc) : [...prev, proc]
    );
  };

  const handleStartGeneration = () => {
     setShowParamsModal(true);
  };

  const handleConfirmGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowParamsModal(false);
    
    // Save PMOC record to database
    try {
        const user = auth.currentUser;
        const newPMOC: Omit<PMOCType, 'id'> = {
            clientId,
            technicianId: user?.uid || '',
            date: new Date().toISOString(),
            machines: selectedMachines,
            readings: readings,
            procedures: selectedProcedures,
            status: 'Gerado'
        };

        await dbService.addPMOC(newPMOC as any);
    } catch (err) {
        console.error("Failed to save PMOC history", err);
    }

    setIsGenerating(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = async () => {
    if (!client) return;
    
    const phone = client.whatsapp || client.phone;
    if (!phone) {
      setShowPhonePrompt(true);
      return;
    }
    
    await generateAndSend(phone);
  };

  const generateAndSend = async (phone: string) => {
    const element = document.getElementById('pmoc-document');
    if (!element) return;

    setIsGeneratingPDF(true);

    try {
      // Use html2canvas to capture the element
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794, // A4 width in px at 96dpi (approx)
        windowWidth: 794
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      const fileName = `PMOC_${client?.name.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);
      
      // Prepare WhatsApp link
      const cleanPhone = phone.replace(/\D/g, '');
      const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
      
      const message = encodeURIComponent(`Olá ${client?.name}, segue o documento PMOC referente à vistoria realizada em ${new Date().toLocaleDateString('pt-BR')}. O arquivo PDF foi baixado em seu dispositivo.`);
      
      setTimeout(() => {
        window.open(`https://wa.me/${finalPhone}?text=${message}`, '_blank');
      }, 1000);
      
    } catch (err) {
      console.error('Error generating PDF', err);
      alert('Erro ao gerar PDF. Tente usar o botão de Imprimir e salvar como PDF manualmente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (isGenerating && client) {
     return (
        <div className="bg-gray-100 min-h-screen p-8 text-sm print:p-0 print:bg-white flex justify-center">
           {/* Page Container A4 */}
           <div 
              id="pmoc-document"
              className="bg-white shadow-2xl print:shadow-none relative overflow-hidden flex flex-col"
              style={{
                  width: '210mm',
                  minHeight: '296mm', // Slight adjustment to fit browsers better
                  padding: '15mm',
                  color: 'black'
              }}
           >
              {/* Watermark - Icon Only, very light */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none print:opacity-[0.03]">
                 <Logo size="lg" hideText={true} className="transform scale-[8]" />
              </div>

              {/* Header */}
              <div 
                  className="flex justify-between items-start border-b-2 pb-6 mb-6 relative z-10"
                  style={{ borderColor: '#FF7A00' }} // Force Orange Border
              >
                 <Logo size="lg" />
                 <div className="text-right">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>PMOC</h1>
                    <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mt-1">Plano de Manutenção, Operação e Controle</p>
                    <p className="font-mono text-xs mt-2 text-gray-600 bg-gray-100 inline-block px-2 py-1 rounded">LEI FEDERAL 13.589/2018</p>
                 </div>
              </div>

              {/* Client Info Box */}
              <div className="mb-6 relative z-10">
                 <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex items-center gap-2" style={{ backgroundColor: '#f3f4f6' }}>
                        <FileText size={16} className="text-gray-600" />
                        <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">Dados do Contrato</span>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-8">
                        <div>
                            <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Cliente</span>
                            <strong className="text-base text-gray-900 block leading-tight">{client.name}</strong>
                        </div>
                        <div>
                            <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">CNPJ / CPF</span>
                            <strong className="text-base text-gray-900 block leading-tight font-mono">{client.document}</strong>
                        </div>
                        <div className="col-span-2">
                            <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Endereço</span>
                            <span className="text-sm text-gray-800 block leading-tight">{client.address}</span>
                        </div>
                    </div>
                 </div>
              </div>

              {/* Machines Table */}
              <div className="mb-6 relative z-10">
                 <h3 className="font-bold text-brand-blue mb-3 uppercase text-xs tracking-wider flex items-center gap-2" style={{ color: '#007BFF' }}>
                    <CheckCircle size={14} /> Equipamentos Vistoriados
                 </h3>
                 <table className="w-full text-xs border-collapse">
                    <thead>
                       <tr className="text-white" style={{ backgroundColor: '#1F2937', color: 'white', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
                          <th className="p-2 text-left font-bold border-b border-gray-800 uppercase tracking-wide">Equipamento</th>
                          <th className="p-2 text-center font-bold border-b border-gray-800 uppercase tracking-wide">Capacidade</th>
                          <th className="p-2 text-center font-bold border-b border-gray-800 uppercase tracking-wide">Local</th>
                          <th className="p-2 text-center font-bold border-b border-gray-800 uppercase tracking-wide">Status</th>
                       </tr>
                    </thead>
                    <tbody>
                       {clientMachines.filter(m => selectedMachines.includes(m.id)).map((m, idx) => (
                          <tr key={m.id} className="border-b border-gray-200">
                             <td className="p-2 font-bold text-gray-800">{m.brand} {m.model}</td>
                             <td className="p-2 text-center">{m.capacityBTU} BTUs</td>
                             <td className="p-2 text-center text-gray-600">{m.location}</td>
                             <td className="p-2 text-center">
                                 <span 
                                    className="font-bold px-2 py-1 rounded-full text-[10px] border"
                                    style={{ backgroundColor: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0', printColorAdjust: 'exact' }}
                                 >
                                     ✓ Vistoriado
                                 </span>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>

              {/* Checklist Grid */}
              <div className="mb-6 relative z-10">
                 <h3 className="font-bold text-brand-blue mb-3 uppercase text-xs tracking-wider flex items-center gap-2" style={{ color: '#007BFF' }}>
                    <Activity size={14} /> Procedimentos Realizados
                 </h3>
                 <div className="grid grid-cols-3 gap-2 text-xs">
                    {['Limpeza de Filtros', 'Limpeza de Bandeja', 'Verificação Drenagem', 'Limpeza Serpentinas', 'Verificação Elétrica', 'Medição de Gás', 'Aplicação Bactericida', 'Aperto de Bornes', 'Teste Remoto'].map(item => (
                       <div key={item} className="flex items-center gap-2 border border-gray-200 p-2 rounded bg-white">
                          <div 
                            className="w-4 h-4 text-white flex items-center justify-center text-[10px] font-bold rounded shadow-sm" 
                            style={{ backgroundColor: '#FF7A00', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
                          >✓</div>
                          <span className="font-medium text-gray-700">{item}</span>
                       </div>
                    ))}
                 </div>
              </div>

              {/* Readings */}
              <div className="mb-8 relative z-10">
                 <h3 className="font-bold text-brand-blue mb-3 uppercase text-xs tracking-wider flex items-center gap-2" style={{ color: '#007BFF' }}>
                    <Thermometer size={14} /> Parâmetros Médios Coletados
                 </h3>
                 <div className="flex justify-between p-4 rounded-xl border border-gray-300" style={{ backgroundColor: '#f9fafb', printColorAdjust: 'exact' }}>
                    <div className="text-center w-1/4">
                       <span className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wide">Temp. Insuflamento</span>
                       <strong className="text-xl text-gray-900">{readings.tempIn} <span className="text-xs text-gray-400">°C</span></strong>
                    </div>
                    <div className="text-center w-1/4 border-l border-gray-300">
                       <span className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wide">Temp. Retorno</span>
                       <strong className="text-xl text-gray-900">{readings.tempOut} <span className="text-xs text-gray-400">°C</span></strong>
                    </div>
                    <div className="text-center w-1/4 border-l border-gray-300">
                       <span className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wide">Superaquecimento</span>
                       <strong className="text-xl text-gray-900">{readings.superheat}</strong>
                    </div>
                    <div className="text-center w-1/4 border-l border-gray-300">
                       <span className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wide">Corrente Média</span>
                       <strong className="text-xl text-gray-900">{readings.current} <span className="text-xs text-gray-400">A</span></strong>
                    </div>
                 </div>
              </div>

              {/* Footer (Pushes to bottom) */}
              <div className="mt-auto flex justify-between items-end relative z-10 w-full">
                 <div className="flex items-center gap-4">
                    <div className="bg-white p-1 border border-gray-200 rounded shrink-0">
                        {/* QR Code - Using simpler API or ensuring image loads */}
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=PMOC_${clientId}_${new Date().toISOString()}`} 
                            className="w-20 h-20" 
                            alt="QR Autenticação"
                            style={{ display: 'block' }}
                        />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-900 uppercase">Autenticação Digital</p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5 max-w-[150px] leading-tight break-all">
                            ID: {new Date().getTime().toString(16).toUpperCase()}
                        </p>
                    </div>
                 </div>
                 <div className="text-right">
                    {/* Explicit Signature Line using div background instead of border */}
                    <div style={{ height: '1px', backgroundColor: 'black', width: '240px', marginBottom: '8px', marginLeft: 'auto' }}></div>
                    <p className="font-bold text-gray-900 uppercase text-sm">SERVICE REFRIGERAÇÃO LTDA</p>
                    <p className="text-xs text-gray-600 font-medium">CNPJ 17.279.046/0001-94</p>
                    <p className="text-[10px] text-gray-400 mt-1">Gerado em {new Date().toLocaleDateString()} às {new Date().toLocaleTimeString()}</p>
                 </div>
              </div>
           </div>
           
           <div className="fixed top-4 right-4 no-print z-50 flex gap-2">
               <button 
                  disabled={isGeneratingPDF}
                  onClick={handleSendWhatsApp} 
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-full shadow-xl flex items-center gap-2 font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
               >
                  {isGeneratingPDF ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <MessageCircle size={18} />
                  )}
                  Enviar por Zap
               </button>
               <button 
                  onClick={handlePrint} 
                  className="bg-brand-blue hover:bg-blue-600 text-white px-6 py-2.5 rounded-full shadow-xl flex items-center gap-2 font-bold transition-transform hover:scale-105 active:scale-95"
               >
                  <Printer size={18} /> Imprimir Documento
               </button>
               <button 
                  onClick={() => setIsGenerating(false)} 
                  className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 font-medium transition-colors"
               >
                  <X size={18} />
               </button>
           </div>
        </div>
     )
  }

  return (
    <div className="space-y-6">
       <div>
         <h1 className="text-2xl font-bold text-gray-800">Emissão de PMOC</h1>
         <p className="text-gray-500 text-sm">Geração de laudos técnicos conforme Lei 13.589/2018.</p>
       </div>

       <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="mb-6">
             <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o Cliente</label>
             <select 
               className="w-full p-3 border rounded-xl"
               value={clientId}
               onChange={e => {
                  setClientId(e.target.value);
                  setSelectedMachines([]);
               }}
             >
                <option value="">Selecione...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
          </div>

          {clientMachines.length > 0 && (
             <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                   <h3 className="font-bold text-gray-700">Máquinas do Cliente</h3>
                   <button 
                     onClick={() => setSelectedMachines(clientMachines.map(m => m.id))}
                     className="text-sm text-brand-blue hover:underline"
                   >
                      Marcar Todas
                   </button>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                   {clientMachines.map(m => (
                      <div 
                        key={m.id} 
                        onClick={() => toggleMachine(m.id)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                           selectedMachines.includes(m.id) 
                              ? 'border-brand-blue bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                         <div>
                            <p className="font-bold text-gray-800">{m.brand} {m.model}</p>
                            <p className="text-xs text-gray-500">{m.location} • {m.capacityBTU} BTUs</p>
                         </div>
                         <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedMachines.includes(m.id) ? 'border-brand-blue bg-brand-blue text-white' : 'border-gray-300'
                         }`}>
                            {selectedMachines.includes(m.id) && <CheckCircle size={14} />}
                         </div>
                      </div>
                   ))}
                </div>

                <div className="pt-6 border-t mt-6">
                   <button 
                     disabled={selectedMachines.length === 0}
                     onClick={handleStartGeneration}
                     className="w-full py-4 bg-gradient-to-r from-brand-orange to-brand-blue text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                   >
                      <FileText size={20} />
                      Preencher Dados e Gerar PMOC
                   </button>
                </div>
             </div>
          )}
          
          {clientId && clientMachines.length === 0 && (
             <div className="text-center py-8 text-gray-400">
                Este cliente não possui máquinas cadastradas.
             </div>
          )}
       </div>

       {/* Parameters Modal */}
       {showParamsModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                   <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <Activity className="text-brand-blue"/> 
                      Parâmetros Médios
                   </h2>
                   <button onClick={() => setShowParamsModal(false)}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                
                <form onSubmit={handleConfirmGeneration} className="space-y-4">
                   <p className="text-sm text-gray-500 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                      Informe os dados médios coletados durante a vistoria para constar no documento oficial.
                   </p>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Temp. Insuflamento (°C)</label>
                         <div className="relative">
                            <Thermometer className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input 
                              type="text" 
                              className="w-full pl-7 p-2 border rounded-lg" 
                              value={readings.tempIn} 
                              onFocus={(e) => e.target.select()}
                              onChange={e => setReadings({...readings, tempIn: e.target.value})} 
                              required
                            />
                         </div>
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Temp. Retorno (°C)</label>
                         <div className="relative">
                            <Thermometer className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input 
                              type="text" 
                              className="w-full pl-7 p-2 border rounded-lg" 
                              value={readings.tempOut} 
                              onFocus={(e) => e.target.select()}
                              onChange={e => setReadings({...readings, tempOut: e.target.value})} 
                              required
                            />
                         </div>
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Superaquecimento</label>
                         <input 
                           type="text" 
                           placeholder="Ex: OK ou 5K"
                           className="w-full p-2 border rounded-lg" 
                           value={readings.superheat} 
                           onChange={e => setReadings({...readings, superheat: e.target.value})} 
                           required
                         />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Corrente Média (A)</label>
                         <div className="relative">
                            <Zap className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input 
                              type="text" 
                              className="w-full pl-7 p-2 border rounded-lg" 
                              value={readings.current} 
                              onFocus={(e) => e.target.select()}
                              onChange={e => setReadings({...readings, current: e.target.value})} 
                              required
                            />
                         </div>
                      </div>
                   </div>

                   <button type="submit" className="w-full mt-6 py-3 bg-brand-blue text-white font-bold rounded-lg hover:bg-blue-600 transition-colors shadow-lg">
                      Confirmar e Gerar Documento
                   </button>
                </form>
             </div>
          </div>
       )}

       {/* Phone Prompt Modal */}
       {showPhonePrompt && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                   <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <MessageCircle className="text-green-600" />
                      WhatsApp do Cliente
                   </h2>
                   <button onClick={() => setShowPhonePrompt(false)}><X size={20} className="text-gray-400" /></button>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                   O cliente <strong>{client?.name}</strong> não possui celular cadastrado. Informe o número para envio:
                </p>

                <div className="space-y-4">
                   <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Número com DDD</label>
                      <input 
                        type="text" 
                        placeholder="Ex: 41999999999"
                        className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                        value={tempPhone}
                        onChange={e => setTempPhone(e.target.value)}
                        autoFocus
                      />
                   </div>
                   
                   <button 
                     onClick={() => {
                       if (tempPhone.length >= 10) {
                         setShowPhonePrompt(false);
                         generateAndSend(tempPhone);
                       } else {
                         alert('Por favor, informe um número válido com DDD.');
                       }
                     }}
                     className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                   >
                      Gerar PDF e Enviar
                   </button>
                </div>
             </div>
          </div>
       )}
    </div>
  );
};