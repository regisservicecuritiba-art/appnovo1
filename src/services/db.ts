import Dexie, { Table } from 'dexie';
import { Client, Machine, Part, ServiceCatalog, ServiceOrder, PMOC } from '../../types';

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
  pending_sync!: Table<PendingSync>;

  constructor() {
    super('RefriServiceDB');
    this.version(1).stores({
      clients: 'id, name, email',
      machines: 'id, clientId, serialNumber',
      parts: 'id, name, code',
      services: 'id, name',
      service_orders: 'id, clientId, status, date',
      pmocs: 'id, clientId, status, date',
      pending_sync: '++id, table, action, timestamp'
    });
  }
}

export const localDB = new LocalDatabase();
