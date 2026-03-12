import { Client, Machine, Part, ServiceOrder, User, UserRole, OSStatus, PMOC } from '../types';

// Initial Mock Data
const MOCK_USERS: User[] = [
  { id: '1', name: 'Régis Oliveira', email: 'admin@service.com', role: UserRole.ADMIN, avatar: 'https://picsum.photos/100/100' },
  { id: '2', name: 'Carlos Técnico', email: 'tech@service.com', role: UserRole.TECNICO, avatar: 'https://picsum.photos/101/101' },
];

const MOCK_CLIENTS: Client[] = [
  { id: 'c1', name: 'Empresa Modelo S.A.', document: '12.345.678/0001-90', phone: '(11) 99999-9999', whatsapp: '(11) 99999-9999', email: 'contato@empresa.com', address: 'Av. Paulista, 1000, SP', type: 'Comercial' },
  { id: 'c2', name: 'João da Silva', document: '123.456.789-00', phone: '(11) 98888-8888', whatsapp: '(11) 98888-8888', email: 'joao@gmail.com', address: 'Rua das Flores, 123, SP', type: 'Residencial' },
  { id: 'c3', name: 'Restaurante Sabor', document: '98.765.432/0001-00', phone: '(41) 3333-3333', whatsapp: '(41) 99999-8888', email: 'chef@sabor.com', address: 'Rua XV, 500, Curitiba', type: 'Comercial' },
];

const MOCK_MACHINES: Machine[] = [
  { id: 'm1', clientId: 'c1', type: 'Split', brand: 'Daikin', model: 'FTX12', capacityBTU: 12000, serialNumber: 'SN123456', location: 'Sala de Reunião', installDate: '2023-01-15', warrantyEnd: '2025-01-15', technicianId: '2', qrCodeData: 'm1-SN123456' },
  { id: 'm2', clientId: 'c1', type: 'Cassete', brand: 'LG', model: 'CASS24', capacityBTU: 24000, serialNumber: 'SN987654', location: 'Recepção', installDate: '2023-02-20', warrantyEnd: '2024-02-20', technicianId: '2', qrCodeData: 'm2-SN987654' },
  { id: 'm3', clientId: 'c2', type: 'Split', brand: 'Samsung', model: 'WindFree', capacityBTU: 9000, serialNumber: 'WF9000', location: 'Quarto Casal', installDate: '2023-06-10', warrantyEnd: '2024-06-10', technicianId: '2', qrCodeData: 'm3-WF9000' },
];

const MOCK_PARTS: Part[] = [
  { id: 'p1', name: 'Capacitor 45uF', code: 'CAP45', category: 'Elétrica', unitValue: 45.00, costPrice: 15.00, unit: 'un', stock: 20, minStock: 5 },
  { id: 'p2', name: 'Gás R410A', code: 'GAS410', category: 'Gases', unitValue: 120.00, costPrice: 60.00, unit: 'kg', stock: 10, minStock: 2 },
  { id: 'p3', name: 'Tubo Cobre 1/4', code: 'TUB14', category: 'Tubulação', unitValue: 35.00, costPrice: 18.00, unit: 'm', stock: 50, minStock: 10 },
  { id: 'p4', name: 'Placa Universal', code: 'PLA01', category: 'Eletrônica', unitValue: 350.00, costPrice: 150.00, unit: 'un', stock: 5, minStock: 1 },
];

const MOCK_OS: ServiceOrder[] = [
  {
    id: 'os1',
    clientId: 'c1',
    machineId: 'm1',
    technicianId: '2',
    type: 'Manutenção Preventiva',
    date: '2023-08-10T10:00:00',
    status: OSStatus.FINALIZADA,
    checklist: [{ label: 'Limpeza', checked: true, notes: '' }],
    partsUsed: [],
    services: [{ id: 's1', description: 'Limpeza Geral', value: 250 }],
    discount: 0,
    total: 250,
    paymentMethod: 'Boleto'
  },
  {
    id: 'os2',
    clientId: 'c1',
    machineId: 'm2',
    technicianId: '2',
    type: 'Manutenção Corretiva',
    date: '2023-09-05T14:30:00',
    status: OSStatus.FINALIZADA,
    checklist: [{ label: 'Verificação', checked: true, notes: '' }],
    partsUsed: [
      { partId: 'p1', name: 'Capacitor 45uF', quantity: 1, unitValue: 45.00, costPrice: 15.00 },
      { partId: 'p2', name: 'Gás R410A', quantity: 1, unitValue: 120.00, costPrice: 60.00 }
    ],
    services: [{ id: 's2', description: 'Troca de Compressor', value: 450 }],
    discount: 0,
    total: 615,
    paymentMethod: 'Transferência'
  },
  {
    id: 'os3',
    clientId: 'c2',
    machineId: 'm3',
    technicianId: '2',
    type: 'Instalação',
    date: '2023-09-15T09:00:00',
    status: OSStatus.FINALIZADA,
    checklist: [{ label: 'Instalação', checked: true, notes: '' }],
    partsUsed: [
      { partId: 'p3', name: 'Tubo Cobre 1/4', quantity: 5, unitValue: 35.00, costPrice: 18.00 }
    ],
    services: [{ id: 's3', description: 'Instalação Padrão', value: 600 }],
    discount: 50,
    total: 725,
    paymentMethod: 'Pix'
  },
  {
    id: 'os4',
    clientId: 'c3',
    machineId: 'm1', // Reusing m1 logic for simplicity
    technicianId: '2',
    type: 'Higienização',
    date: '2023-10-02T11:00:00',
    status: OSStatus.FINALIZADA,
    checklist: [],
    partsUsed: [],
    services: [{ id: 's4', description: 'Higienização Completa', value: 300 }],
    discount: 0,
    total: 300,
    paymentMethod: 'Cartão'
  },
  {
    id: 'os5',
    clientId: 'c1',
    machineId: 'm2',
    technicianId: '2',
    type: 'Manutenção Corretiva',
    date: '2023-10-12T16:00:00',
    status: OSStatus.FINALIZADA,
    checklist: [],
    partsUsed: [{ partId: 'p4', name: 'Placa Universal', quantity: 1, unitValue: 350.00, costPrice: 150.00 }],
    services: [{ id: 's5', description: 'Troca de Placa', value: 200 }],
    discount: 0,
    total: 550,
    paymentMethod: 'Boleto'
  },
    {
    id: 'os6',
    clientId: 'c2',
    machineId: 'm3',
    technicianId: '2',
    type: 'Manutenção Preventiva',
    date: '2023-10-25T16:00:00',
    status: OSStatus.PENDENTE,
    checklist: [],
    partsUsed: [],
    services: [{ id: 's6', description: 'Limpeza', value: 200 }],
    discount: 0,
    total: 200,
    paymentMethod: 'Boleto'
  }
];

class MockDatabase {
  users = MOCK_USERS;
  clients = MOCK_CLIENTS;
  machines = MOCK_MACHINES;
  parts = MOCK_PARTS;
  orders = MOCK_OS;
  pmocs: PMOC[] = [];

  // Clients
  getClients() { return this.clients; }
  addClient(client: Client) { this.clients.push(client); }
  
  // Machines
  getMachines() { return this.machines; }
  getMachinesByClient(clientId: string) { return this.machines.filter(m => m.clientId === clientId); }
  addMachine(machine: Machine) { this.machines.push(machine); }
  getMachineById(id: string) { return this.machines.find(m => m.id === id); }

  // Parts
  getParts() { return this.parts; }
  addPart(part: Part) { this.parts.push(part); }
  deletePart(id: string) { this.parts = this.parts.filter(p => p.id !== id); }

  // Orders
  getOrders() { return this.orders; }
  addOrder(order: ServiceOrder) { this.orders.push(order); }
  updateOrder(order: ServiceOrder) {
    const idx = this.orders.findIndex(o => o.id === order.id);
    if (idx >= 0) this.orders[idx] = order;
  }

  // PMOC
  addPMOC(pmoc: PMOC) { this.pmocs.push(pmoc); }
  getPMOCs() { return this.pmocs; }
  
  // Stats
  getStats() {
    return {
      clients: this.clients.length,
      machines: this.machines.length,
      openOS: this.orders.filter(o => o.status !== OSStatus.FINALIZADA && o.status !== OSStatus.PAGO && o.status !== OSStatus.CANCELADA).length,
      revenue: this.orders.reduce((acc, o) => acc + ((o.status === OSStatus.FINALIZADA || o.status === OSStatus.PAGO) ? o.total : 0), 0)
    };
  }
}

export const db = new MockDatabase();