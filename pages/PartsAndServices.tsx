import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Part, ServiceCatalog } from '../types';
import { Plus, Search, Package, Edit, Trash2, DollarSign, X, AlertTriangle, Wrench, Loader2 } from 'lucide-react';

export const Parts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'parts' | 'services'>('parts');
  const [parts, setParts] = useState<Part[]>([]);
  const [services, setServices] = useState<ServiceCatalog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPartModal, setShowPartModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'part' | 'service' } | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Form State - Parts
  const [currentPart, setCurrentPart] = useState<Partial<Part>>({
    unit: 'un',
    stock: 0,
    minStock: 5,
    unitValue: 0,
    costPrice: 0
  });

  // Form State - Services
  const [currentService, setCurrentService] = useState<Partial<ServiceCatalog>>({
    value: 0
  });

  useEffect(() => {
    let unsub: () => void;
    setLoading(true);
    if (activeTab === 'parts') {
      unsub = dbService.subscribeParts((data) => {
        setParts(data);
        setLoading(false);
      });
    } else {
      unsub = dbService.subscribeServices((data) => {
        setServices(data);
        setLoading(false);
      });
    }
    return () => unsub && unsub();
  }, [activeTab]);

  const filteredParts = parts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.category && s.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSavePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPart.name) return;

    try {
      if (currentPart.id) {
         await dbService.updatePart(currentPart.id, currentPart);
      } else {
          const newPart = {
              ...currentPart,
              unitValue: Number(currentPart.unitValue) || 0,
              costPrice: Number(currentPart.costPrice) || 0,
              stock: Number(currentPart.stock) || 0,
              minStock: Number(currentPart.minStock) || 0
          };
          await dbService.addPart(newPart as any);
      }
      
      setShowPartModal(false);
      setCurrentPart({ unit: 'un', stock: 0, minStock: 5, unitValue: 0, costPrice: 0 });
    } catch (err) {
      console.error("Error saving part:", err);
      alert("Erro ao salvar peça. Verifique sua conexão e permissões.");
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentService.name) return;

    try {
      if (currentService.id) {
         await dbService.updateService(currentService.id, currentService);
      } else {
          const newService = {
              ...currentService,
              value: Number(currentService.value) || 0
          };
          await dbService.addService(newService as any);
      }
      
      setShowServiceModal(false);
      setCurrentService({ value: 0 });
    } catch (err) {
      console.error("Error saving service:", err);
      alert("Erro ao salvar serviço. Verifique sua conexão e permissões.");
    }
  };

  const openEditPart = (part: Part) => {
      setCurrentPart({ ...part });
      setShowPartModal(true);
  };

  const openEditService = (service: ServiceCatalog) => {
      setCurrentService({ ...service });
      setShowServiceModal(true);
  };

  const handleDeletePart = async (id: string) => {
      setItemToDelete({ id, type: 'part' });
      setShowDeleteModal(true);
  };

  const handleDeleteService = async (id: string) => {
      setItemToDelete({ id, type: 'service' });
      setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
      if (!itemToDelete) return;
      try {
          if (itemToDelete.type === 'part') {
              await dbService.deletePart(itemToDelete.id);
          } else {
              await dbService.deleteService(itemToDelete.id);
          }
          setShowDeleteModal(false);
          setItemToDelete(null);
      } catch (err) {
          console.error("Error deleting item:", err);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">Peças e Serviços</h1>
           <p className="text-gray-500 text-sm">Catálogo de itens e serviços para orçamentos e ordens de serviço.</p>
        </div>
        <button 
          onClick={() => {
              if (activeTab === 'parts') {
                setCurrentPart({ unit: 'un', stock: 0, minStock: 5, unitValue: 0, costPrice: 0 });
                setShowPartModal(true);
              } else {
                setCurrentService({ value: 0 });
                setShowServiceModal(true);
              }
          }}
          className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30"
        >
          <Plus size={18} /> {activeTab === 'parts' ? 'Cadastrar Peça' : 'Cadastrar Serviço'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('parts')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
            activeTab === 'parts' 
              ? 'border-brand-blue text-brand-blue' 
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <Package size={18} />
            Peças e Materiais
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('services')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
            activeTab === 'services' 
              ? 'border-brand-blue text-brand-blue' 
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <Wrench size={18} />
            Serviços
          </div>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder={activeTab === 'parts' ? "Buscar por nome ou código..." : "Buscar por nome ou categoria..."}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
         <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                   {activeTab === 'parts' ? (
                     <tr>
                        <th className="p-4">Item / Código</th>
                        <th className="p-4">Categoria</th>
                        <th className="p-4 text-right">Preço Custo</th>
                        <th className="p-4 text-right">Preço Venda</th>
                        <th className="p-4 text-center">Estoque</th>
                        <th className="p-4 text-center">Ações</th>
                     </tr>
                   ) : (
                     <tr>
                        <th className="p-4">Serviço</th>
                        <th className="p-4">Categoria</th>
                        <th className="p-4 text-right">Valor</th>
                        <th className="p-4 text-center">Ações</th>
                     </tr>
                   )}
                </thead>
                <tbody>
                   {loading ? (
                     <tr>
                       <td colSpan={activeTab === 'parts' ? 6 : 4} className="p-8 text-center">
                         <div className="flex justify-center items-center gap-2 text-gray-400">
                           <Loader2 size={20} className="animate-spin" />
                           Carregando...
                         </div>
                       </td>
                     </tr>
                   ) : activeTab === 'parts' ? (
                     filteredParts.map(part => (
                        <tr key={part.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                           <td className="p-4">
                              <div className="font-bold text-gray-800">{part.name}</div>
                              <div className="text-xs text-gray-400 font-mono">{part.code}</div>
                           </td>
                           <td className="p-4">
                               <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{part.category}</span>
                           </td>
                           <td className="p-4 text-right text-gray-500">R$ {part.costPrice.toFixed(2)}</td>
                           <td className="p-4 text-right font-bold text-brand-blue">R$ {part.unitValue.toFixed(2)}</td>
                           <td className="p-4 text-center">
                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                                  part.stock <= part.minStock ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                              }`}>
                                  {part.stock <= part.minStock && <AlertTriangle size={10} />}
                                  {part.stock} {part.unit}
                              </div>
                           </td>
                           <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => openEditPart(part)} className="text-gray-400 hover:text-brand-blue p-2 bg-gray-50 rounded hover:bg-blue-50 transition-colors" title="Editar">
                                      <Edit size={16} />
                                  </button>
                                  <button onClick={() => handleDeletePart(part.id)} className="text-gray-400 hover:text-red-500 p-2 bg-gray-50 rounded hover:bg-red-50 transition-colors" title="Excluir">
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                           </td>
                        </tr>
                     ))
                   ) : (
                     filteredServices.map(service => (
                        <tr key={service.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                           <td className="p-4">
                              <div className="font-bold text-gray-800">{service.name}</div>
                           </td>
                           <td className="p-4">
                               <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{service.category}</span>
                           </td>
                           <td className="p-4 text-right font-bold text-brand-blue">R$ {service.value.toFixed(2)}</td>
                           <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => openEditService(service)} className="text-gray-400 hover:text-brand-blue p-2 bg-gray-50 rounded hover:bg-blue-50 transition-colors" title="Editar">
                                      <Edit size={16} />
                                  </button>
                                  <button onClick={() => handleDeleteService(service.id)} className="text-gray-400 hover:text-red-500 p-2 bg-gray-50 rounded hover:bg-red-50 transition-colors" title="Excluir">
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                           </td>
                        </tr>
                     ))
                   )}
                   {!loading && (activeTab === 'parts' ? filteredParts : filteredServices).length === 0 && (
                       <tr>
                           <td colSpan={activeTab === 'parts' ? 6 : 4} className="p-8 text-center text-gray-400">
                               Nenhum item encontrado.
                           </td>
                       </tr>
                   )}
                </tbody>
             </table>
         </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Confirmar Exclusão</h2>
            <p className="text-gray-600 mb-6">Tem certeza que deseja excluir este {itemToDelete?.type === 'part' ? 'item' : 'serviço'} permanentemente? Esta ação não pode ser desfeita localmente.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Part Modal */}
      {showPartModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6 border-b pb-4">
                      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                          <Package className="text-brand-blue"/> 
                          {currentPart.id ? 'Editar Peça' : 'Nova Peça'}
                      </h2>
                      <button onClick={() => setShowPartModal(false)}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
                  </div>
                  
                  <form onSubmit={handleSavePart} className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nome do Item</label>
                          <input required type="text" className="w-full p-2 border rounded-lg" value={currentPart.name || ''} onChange={e => setCurrentPart({...currentPart, name: e.target.value})} />
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Código (SKU)</label>
                          <input type="text" className="w-full p-2 border rounded-lg" value={currentPart.code || ''} onChange={e => setCurrentPart({...currentPart, code: e.target.value})} />
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Categoria</label>
                          <input type="text" list="part-categories" className="w-full p-2 border rounded-lg" value={currentPart.category || ''} onChange={e => setCurrentPart({...currentPart, category: e.target.value})} />
                          <datalist id="part-categories">
                              <option value="Elétrica" />
                              <option value="Gases" />
                              <option value="Tubulação" />
                              <option value="Eletrônica" />
                              <option value="Ferramentas" />
                              <option value="Acessórios" />
                          </datalist>
                      </div>

                      <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                          <label className="block text-xs font-bold text-red-500 mb-1 uppercase">Preço de Custo</label>
                          <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-red-400 text-xs">R$</span>
                              <input 
                                type="number" 
                                step="0.01" 
                                className="w-full pl-6 p-1 border rounded bg-white text-sm" 
                                value={currentPart.costPrice} 
                                onFocus={(e) => e.target.select()}
                                onChange={e => setCurrentPart({...currentPart, costPrice: Number(e.target.value)})} 
                              />
                          </div>
                      </div>

                      <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                          <label className="block text-xs font-bold text-brand-blue mb-1 uppercase">Preço de Venda</label>
                          <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-brand-blue text-xs">R$</span>
                              <input 
                                type="number" 
                                step="0.01" 
                                required
                                className="w-full pl-6 p-1 border rounded bg-white text-sm font-bold" 
                                value={currentPart.unitValue} 
                                onFocus={(e) => e.target.select()}
                                onChange={e => setCurrentPart({...currentPart, unitValue: Number(e.target.value)})} 
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Estoque Atual</label>
                          <input type="number" className="w-full p-2 border rounded-lg" value={currentPart.stock} onFocus={(e) => e.target.select()} onChange={e => setCurrentPart({...currentPart, stock: Number(e.target.value)})} />
                      </div>

                      <div className="flex gap-2">
                          <div className="w-2/3">
                              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Estoque Mín.</label>
                              <input type="number" className="w-full p-2 border rounded-lg" value={currentPart.minStock} onFocus={(e) => e.target.select()} onChange={e => setCurrentPart({...currentPart, minStock: Number(e.target.value)})} />
                          </div>
                          <div className="w-1/3">
                               <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Unid.</label>
                               <select className="w-full p-2 border rounded-lg" value={currentPart.unit} onChange={e => setCurrentPart({...currentPart, unit: e.target.value as any})}>
                                   <option value="un">un</option>
                                   <option value="m">m</option>
                                   <option value="kg">kg</option>
                                   <option value="l">L</option>
                                   <option value="kit">kit</option>
                               </select>
                          </div>
                      </div>

                      <button type="submit" className="col-span-2 mt-4 py-3 bg-brand-blue text-white font-bold rounded-lg hover:bg-blue-600 transition-colors">
                          Salvar Peça
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* Service Modal */}
      {showServiceModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6 border-b pb-4">
                      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                          <Wrench className="text-brand-blue"/> 
                          {currentService.id ? 'Editar Serviço' : 'Novo Serviço'}
                      </h2>
                      <button onClick={() => setShowServiceModal(false)}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
                  </div>
                  
                  <form onSubmit={handleSaveService} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nome do Serviço</label>
                          <input required type="text" className="w-full p-2 border rounded-lg" value={currentService.name || ''} onChange={e => setCurrentService({...currentService, name: e.target.value})} />
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Categoria</label>
                          <select required className="w-full p-2 border rounded-lg" value={currentService.category || ''} onChange={e => setCurrentService({...currentService, category: e.target.value})}>
                              <option value="">Selecione uma categoria</option>
                              <option value="Instalação">Instalação</option>
                              <option value="Manutenção Preventiva">Manutenção Preventiva</option>
                              <option value="Manutenção Corretiva">Manutenção Corretiva</option>
                              <option value="Higienização">Higienização</option>
                              <option value="Diagnóstico">Diagnóstico</option>
                              <option value="Outros">Outros</option>
                          </select>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                          <label className="block text-xs font-bold text-brand-blue mb-1 uppercase">Valor do Serviço</label>
                          <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-blue font-bold">R$</span>
                              <input 
                                type="number" 
                                step="0.01" 
                                required
                                className="w-full pl-10 p-2 border rounded-lg bg-white font-bold text-lg" 
                                value={currentService.value} 
                                onFocus={(e) => e.target.select()}
                                onChange={e => setCurrentService({...currentService, value: Number(e.target.value)})} 
                              />
                          </div>
                      </div>

                      <button type="submit" className="w-full mt-4 py-3 bg-brand-blue text-white font-bold rounded-lg hover:bg-blue-600 transition-colors">
                          Salvar Serviço
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
