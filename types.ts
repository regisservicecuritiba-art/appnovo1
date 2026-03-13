export enum UserRole {
  ADMIN = 'ADMIN',
  TECNICO = 'TECNICO'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Client {
  id: string;
  name: string; // Razão Social or Name
  document: string; // CPF or CNPJ
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  type: 'Residencial' | 'Comercial' | 'Industrial';
  notes?: string;
  created_at?: string;
}

export interface Machine {
  id: string;
  clientId: string;
  type: 'Split' | 'Cassete' | 'Piso Teto' | 'VRF' | 'Janela' | 'Outro';
  brand: string;
  model: string;
  capacityBTU: number;
  serialNumber: string;
  location: string;
  installDate: string;
  warrantyEnd: string;
  technicianId?: string;
  notes?: string;
  qrCodeData: string;
  created_at?: string;
}

export interface Part {
  id: string;
  name: string;
  code: string;
  category: string;
  unitValue: number; // Selling price
  costPrice: number; // Cost price for margin calc
  unit: 'un' | 'm' | 'kg' | 'l';
  stock: number;
  minStock: number;
}

export interface ServiceCatalog {
  id: string;
  name: string;
  category: string;
  value: number;
}

export interface ServiceItem {
  id: string;
  description: string;
  value: number;
  timeSpent?: string;
}

export interface PartUsed {
  partId: string;
  name: string;
  quantity: number;
  unitValue: number;
  costPrice: number; // Snapshot of cost at time of use
}

export enum OSStatus {
  PENDENTE = 'Pendente',
  EM_EXECUCAO = 'Em Execução',
  FINALIZADA = 'Finalizada',
  PAGO = 'Pago',
  CANCELADA = 'Cancelada'
}

export interface ChecklistItem {
  label: string;
  checked: boolean;
  notes: string;
}

export interface ServiceOrder {
  id: string;
  clientId: string;
  machineId: string;
  machineIds?: string[]; // Support for multiple machines (e.g. Installation)
  technicianId: string;
  type: 'Instalação' | 'Manutenção Preventiva' | 'Manutenção Corretiva' | 'Higienização' | 'Diagnóstico';
  date: string;
  status: OSStatus;
  
  // Checklist
  checklist: ChecklistItem[];

  // Financials
  partsUsed: PartUsed[];
  services: ServiceItem[];
  discount: number; // Value in R$
  total: number;
  paymentMethod: string;
  
  technicianSignature?: string; // base64 or url
  created_at?: string;
}

export interface MaintenanceSession {
  id: string;
  machineId: string;
  clientId: string;
  serviceOrderId?: string;
  technicianId: string;
  status: 'Ativa' | 'Finalizada';
  partsUsed: PartUsed[];
  services: ServiceItem[];
  observations: string;
  created_at: string;
  updated_at: string;
}

export interface PMOC {
  id: string;
  clientId: string;
  date: string;
  technicianId: string;
  machines: any[];
  readings?: any;
  status?: string;
  notes?: string;
  createdAt?: string;
}