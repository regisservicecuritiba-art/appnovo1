import Dexie, { Table } from 'dexie';
import { Client, Machine, Part, ServiceCatalog, ServiceOrder, PMOC, MaintenanceSession, User } from '../types';

export interface PendingSync {
  id?: number;
  table: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

export class LocalDatabase extends Dexie {
  clients!: Table<Client>;
  machines!: Table<Machine>;
  parts!: Table<Part>;
  services!: Table<ServiceCatalog>;
  service_orders!: Table<ServiceOrder>;
  pmocs!: Table<PMOC>;
  maintenance_sessions!: Table<MaintenanceSession>;
  users!: Table<User>;
  pending_sync!: Table<PendingSync>;

  constructor() {
    super('RefriServiceDB');
    this.version(2).stores({
      clients: 'id, name, email',
      machines: 'id, clientId, serialNumber, location',
      parts: 'id, name, code',
      services: 'id, name',
      service_orders: 'id, clientId, status, date',
      pmocs: 'id, clientId, status, date, createdAt',
      maintenance_sessions: 'id, order_id, status, created_at',
      users: 'id, email, name',
      pending_sync: '++id, table, action, timestamp'
    });
  }
}

export const localDB = new LocalDatabase();
