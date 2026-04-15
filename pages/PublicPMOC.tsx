import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Client, Machine, PMOC as PMOCType } from '../types';
import { Logo } from '../components/Logo';
import { CheckCircle, FileText, Thermometer, Activity, Printer, Download, Loader2 } from 'lucide-react';

export const PublicPMOC: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [pmoc, setPmoc] = useState<PMOCType | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const pmocDoc = await getDoc(doc(db, 'pmocs', id));
        if (!pmocDoc.exists()) {
          setError('Documento não encontrado.');
          setLoading(false);
          return;
        }

        const pmocData = { id: pmocDoc.id, ...pmocDoc.data() } as PMOCType;
        setPmoc(pmocData);

        // Fetch Client
        const clientDoc = await getDoc(doc(db, 'clients', pmocData.clientId));
        if (clientDoc.exists()) {
          setClient({ id: clientDoc.id, ...clientDoc.data() } as Client);
        }

        // Fetch Machines
        const machinesData: Machine[] = [];
        for (const machineId of pmocData.machines) {
          const machineDoc = await getDoc(doc(db, 'machines', machineId));
          if (machineDoc.exists()) {
            machinesData.push({ id: machineDoc.id, ...machineDoc.data() } as Machine);
          }
        }
        setMachines(machinesData);
      } catch (err) {
        console.error('Error fetching PMOC data:', err);
        setError('Erro ao carnergar o documento. Por favor, tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 size={48} className="text-brand-blue animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Carregando PMOC...</p>
      </div>
    );
  }

  if (error || !pmoc || !client) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Ops!</h2>
          <p className="text-gray-500 mb-6">{error || 'Não foi possível carregar este documento.'}</p>
          <Logo size="md" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen p-4 md:p-8 text-sm print:p-0 print:bg-white flex flex-col items-center">
      {/* Action Bar */}
      <div className="w-full max-w-[210mm] mb-6 flex justify-between items-center no-print">
         <Logo size="md" />
         <div className="flex gap-2">
            <button 
               onClick={handlePrint} 
               className="bg-brand-blue hover:bg-blue-600 text-white px-6 py-2.5 rounded-full shadow-xl flex items-center gap-2 font-bold transition-transform hover:scale-105 active:scale-95"
            >
               <Printer size={18} /> Imprimir / Salvar PDF
            </button>
         </div>
      </div>

      {/* Page Container A4 */}
      <div 
         id="pmoc-document"
         className="bg-white shadow-2xl print:shadow-none relative overflow-hidden flex flex-col"
         style={{
             width: '210mm',
             minHeight: '296mm',
             padding: '15mm',
             color: 'black'
         }}
      >
         {/* Watermark */}
         <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none print:opacity-[0.03]">
            <Logo size="lg" hideText={true} className="transform scale-[8]" />
         </div>

         {/* Header */}
         <div className="flex justify-between items-start border-b-2 pb-6 mb-6 relative z-10" style={{ borderColor: '#FF7A00' }}>
            <Logo size="lg" />
            <div className="text-right">
               <h1 className="text-4xl font-black text-gray-900 tracking-tight">PMOC</h1>
               <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mt-1">Plano de Manutenção, Operação e Controle</p>
               <p className="font-mono text-xs mt-2 text-gray-600 bg-gray-100 inline-block px-2 py-1 rounded">LEI FEDERAL 13.589/2018</p>
            </div>
         </div>

         {/* Client Info Box */}
         <div className="mb-6 relative z-10">
            <div className="border border-gray-300 rounded-lg overflow-hidden">
               <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex items-center gap-2">
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
                  <tr className="text-white" style={{ backgroundColor: '#1F2937', color: 'white' }}>
                     <th className="p-2 text-left font-bold border-b border-gray-800 uppercase tracking-wide">Equipamento</th>
                     <th className="p-2 text-center font-bold border-b border-gray-800 uppercase tracking-wide">Capacidade</th>
                     <th className="p-2 text-center font-bold border-b border-gray-800 uppercase tracking-wide">Local</th>
                     <th className="p-2 text-center font-bold border-b border-gray-800 uppercase tracking-wide">Status</th>
                  </tr>
               </thead>
               <tbody>
                  {machines.map((m) => (
                     <tr key={m.id} className="border-b border-gray-200">
                        <td className="p-2 font-bold text-gray-800">{m.brand} {m.model}</td>
                        <td className="p-2 text-center">{m.capacityBTU} BTUs</td>
                        <td className="p-2 text-center text-gray-600">{m.location}</td>
                        <td className="p-2 text-center">
                            <span className="font-bold px-2 py-1 rounded-full text-[10px] border bg-green-50 text-green-700 border-green-200">
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
               {pmoc.procedures?.map(item => (
                  <div key={item} className="flex items-center gap-2 border border-gray-200 p-2 rounded bg-white">
                     <div className="w-4 h-4 text-white flex items-center justify-center text-[10px] font-bold rounded shadow-sm bg-brand-orange">✓</div>
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
            <div className="flex justify-between p-4 rounded-xl border border-gray-300 bg-gray-50">
               <div className="text-center w-1/4">
                  <span className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wide">Temp. Insuflamento</span>
                  <strong className="text-xl text-gray-900">{pmoc.readings?.tempIn} <span className="text-xs text-gray-400">°C</span></strong>
               </div>
               <div className="text-center w-1/4 border-l border-gray-300">
                  <span className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wide">Temp. Retorno</span>
                  <strong className="text-xl text-gray-900">{pmoc.readings?.tempOut} <span className="text-xs text-gray-400">°C</span></strong>
               </div>
               <div className="text-center w-1/4 border-l border-gray-300">
                  <span className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wide">Superaquecimento</span>
                  <strong className="text-xl text-gray-900">{pmoc.readings?.superheat}</strong>
               </div>
               <div className="text-center w-1/4 border-l border-gray-300">
                  <span className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wide">Corrente Média</span>
                  <strong className="text-xl text-gray-900">{pmoc.readings?.current} <span className="text-xs text-gray-400">A</span></strong>
               </div>
            </div>
         </div>

         {/* Footer */}
         <div className="mt-auto flex justify-between items-end relative z-10 w-full">
            <div className="flex items-center gap-4">
               <div className="bg-white p-1 border border-gray-200 rounded shrink-0">
                   <img 
                       src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=PMOC_${id}_${pmoc.createdAt}`} 
                       className="w-20 h-20" 
                       alt="QR Autenticação"
                   />
               </div>
               <div>
                   <p className="text-xs font-bold text-gray-900 uppercase">Autenticação Digital</p>
                   <p className="text-[10px] text-gray-500 font-mono mt-0.5 max-w-[150px] leading-tight break-all">
                       ID: {id?.substring(0, 8).toUpperCase()}
                   </p>
               </div>
            </div>
            <div className="text-right">
               <div style={{ height: '1px', backgroundColor: 'black', width: '240px', marginBottom: '8px', marginLeft: 'auto' }}></div>
               <p className="font-bold text-gray-900 uppercase text-sm">SERVICE REFRIGERAÇÃO LTDA</p>
               <p className="text-xs text-gray-600 font-medium">CNPJ 17.279.046/0001-94</p>
               <p className="text-[10px] text-gray-400 mt-1">Gerado em {new Date(pmoc.createdAt || '').toLocaleDateString()}</p>
            </div>
         </div>
      </div>
      
      <div className="mt-8 text-gray-400 text-[10px] uppercase tracking-widest font-bold no-print">
         Service App • Documento Gerado via Sistema
      </div>
    </div>
  );
};
