import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where,
  setDoc,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Client, Machine, Part, ServiceOrder, PMOC, OSStatus, MaintenanceSession, User } from '../types';
import { localDB } from './localDB';
import { liveQuery } from 'dexie';

class FirestoreDatabase {
  constructor() {
    this.initSync();
  }

  private initSync() {
    // Listen for online status to trigger sync
    window.addEventListener('online', () => this.processPendingSync());
    if (navigator.onLine) {
      this.processPendingSync();
    }

    // Setup Firestore listeners to update LocalDB
    this.setupFirestoreListeners();
  }

  private setupFirestoreListeners() {
    const collections = ['clients', 'machines', 'parts', 'services', 'orders', 'pmocs', 'maintenance_sessions', 'users'];
    
    collections.forEach(colName => {
      const localTable = colName === 'orders' ? 'service_orders' : colName as any;
      onSnapshot(collection(db, colName), (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          const data = change.doc.data();
          const id = change.doc.id;
          
          if (change.type === 'removed') {
            await localDB.table(localTable).delete(id);
          } else {
            await localDB.table(localTable).put({ ...data, id } as any);
          }
        });
      });
    });
  }

  private async processPendingSync() {
    const pending = await localDB.pending_sync.toArray();
    for (const item of pending) {
      try {
        const colName = item.table === 'service_orders' ? 'orders' : item.table;
        if (item.action === 'create' || item.action === 'update') {
          const { id, ...data } = item.data;
          if (id) {
             await setDoc(doc(db, colName, id), data);
          }
        } else if (item.action === 'delete') {
          await deleteDoc(doc(db, colName, item.data.id));
        }
        await localDB.pending_sync.delete(item.id!);
      } catch (err) {
        console.error(`Failed to sync ${item.table}:`, err);
      }
    }
  }

  private async queueSync(table: string, action: 'create' | 'update' | 'delete', data: any) {
    await localDB.pending_sync.add({
      table,
      action,
      data,
      timestamp: Date.now()
    });
    if (navigator.onLine) {
      this.processPendingSync();
    }
  }

  // Clientes
  subscribeClients(callback: (clients: Client[]) => void) {
    const observable = liveQuery(() => localDB.clients.orderBy('name').toArray());
    const subscription = observable.subscribe({
      next: callback,
      error: (err) => console.error('Dexie subscribeClients error:', err)
    });
    return () => subscription.unsubscribe();
  }

  async addClient(client: Omit<Client, 'id'>) {
    const id = crypto.randomUUID();
    const newClient = { ...client, id } as Client;
    await localDB.clients.add(newClient);
    await this.queueSync('clients', 'create', newClient);
  }

  async updateClient(id: string, client: Partial<Client>) {
    await localDB.clients.update(id, client);
    const fullClient = await localDB.clients.get(id);
    if (fullClient) {
      await this.queueSync('clients', 'update', fullClient);
    }
  }

  async deleteClient(id: string) {
    await localDB.clients.delete(id);
    await this.queueSync('clients', 'delete', { id });
  }

  // Equipamentos
  subscribeMachines(callback: (machines: Machine[]) => void) {
    const observable = liveQuery(() => localDB.machines.orderBy('location').toArray());
    const subscription = observable.subscribe({
      next: callback,
      error: (err) => console.error('Dexie subscribeMachines error:', err)
    });
    return () => subscription.unsubscribe();
  }

  async addMachine(machine: Omit<Machine, 'id'>) {
    const id = crypto.randomUUID();
    const newMachine = { ...machine, id } as Machine;
    await localDB.machines.add(newMachine);
    await this.queueSync('machines', 'create', newMachine);
  }

  async updateMachine(id: string, machine: Partial<Machine>) {
    await localDB.machines.update(id, machine);
    const fullMachine = await localDB.machines.get(id);
    if (fullMachine) {
      await this.queueSync('machines', 'update', fullMachine);
    }
  }

  async deleteMachine(id: string) {
    await localDB.machines.delete(id);
    await this.queueSync('machines', 'delete', { id });
  }

  // Peças
  subscribeParts(callback: (parts: Part[]) => void) {
    const observable = liveQuery(() => localDB.parts.orderBy('name').toArray());
    const subscription = observable.subscribe({
      next: callback,
      error: (err) => console.error('Dexie subscribeParts error:', err)
    });
    return () => subscription.unsubscribe();
  }

  async addPart(part: Omit<Part, 'id'>) {
    const id = crypto.randomUUID();
    const newPart = { ...part, id } as Part;
    await localDB.parts.add(newPart);
    await this.queueSync('parts', 'create', newPart);
  }

  async updatePart(id: string, part: Partial<Part>) {
    await localDB.parts.update(id, part);
    const fullPart = await localDB.parts.get(id);
    if (fullPart) {
      await this.queueSync('parts', 'update', fullPart);
    }
  }

  async deletePart(id: string) {
    await localDB.parts.delete(id);
    await this.queueSync('parts', 'delete', { id });
  }

  // Ordens de Serviço
  subscribeOrders(callback: (orders: ServiceOrder[]) => void) {
    const observable = liveQuery(() => localDB.service_orders.reverse().sortBy('date'));
    const subscription = observable.subscribe({
      next: callback,
      error: (err) => console.error('Dexie subscribeOrders error:', err)
    });
    return () => subscription.unsubscribe();
  }

  async addOrder(order: Omit<ServiceOrder, 'id'>) {
    const id = crypto.randomUUID();
    const newOrder = { ...order, id } as ServiceOrder;
    await localDB.service_orders.add(newOrder);
    await this.queueSync('service_orders', 'create', newOrder);
  }

  async updateOrder(id: string, order: Partial<ServiceOrder>) {
    await localDB.service_orders.update(id, order);
    const fullOrder = await localDB.service_orders.get(id);
    if (fullOrder) {
      await this.queueSync('service_orders', 'update', fullOrder);
    }
  }

  async deleteOrder(id: string) {
    await localDB.service_orders.delete(id);
    await this.queueSync('service_orders', 'delete', { id });
  }

  // Catálogo de Serviços
  subscribeServices(callback: (services: any[]) => void) {
    const observable = liveQuery(() => localDB.services.orderBy('name').toArray());
    const subscription = observable.subscribe({
      next: callback,
      error: (err) => console.error('Dexie subscribeServices error:', err)
    });
    return () => subscription.unsubscribe();
  }

  async addService(service: any) {
    const id = crypto.randomUUID();
    const newService = { ...service, id };
    await localDB.services.add(newService);
    await this.queueSync('services', 'create', newService);
  }

  async updateService(id: string, service: any) {
    await localDB.services.update(id, service);
    const fullService = await localDB.services.get(id);
    if (fullService) {
      await this.queueSync('services', 'update', fullService);
    }
  }

  async deleteService(id: string) {
    await localDB.services.delete(id);
    await this.queueSync('services', 'delete', { id });
  }

  // PMOC
  subscribePMOCs(callback: (pmocs: PMOC[]) => void) {
    const observable = liveQuery(() => localDB.pmocs.reverse().sortBy('createdAt'));
    const subscription = observable.subscribe({
      next: callback,
      error: (err) => console.error('Dexie subscribePMOCs error:', err)
    });
    return () => subscription.unsubscribe();
  }

  async addPMOC(pmoc: Omit<PMOC, 'id'>) {
    const id = crypto.randomUUID();
    const newPMOC = { ...pmoc, id, createdAt: new Date().toISOString() } as PMOC;
    await localDB.pmocs.add(newPMOC);
    await this.queueSync('pmocs', 'create', newPMOC);
  }

  // Manutenções (Sessions)
  subscribeMaintenanceSessions(callback: (sessions: MaintenanceSession[]) => void, status?: 'Ativa' | 'Finalizada') {
    const observable = liveQuery(() => {
      if (status) {
        return localDB.maintenance_sessions.where('status').equals(status).reverse().sortBy('created_at');
      }
      return localDB.maintenance_sessions.reverse().sortBy('created_at');
    });
    const subscription = observable.subscribe({
      next: callback,
      error: (err) => console.error('Dexie subscribeMaintenanceSessions error:', err)
    });
    return () => subscription.unsubscribe();
  }

  async addMaintenanceSession(session: Omit<MaintenanceSession, 'id'>) {
    const id = crypto.randomUUID();
    const newSession = { ...session, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as MaintenanceSession;
    await localDB.maintenance_sessions.add(newSession);
    await this.queueSync('maintenance_sessions', 'create', newSession);
  }

  async updateMaintenanceSession(id: string, data: Partial<MaintenanceSession>) {
    await localDB.maintenance_sessions.update(id, { ...data, updated_at: new Date().toISOString() });
    const fullSession = await localDB.maintenance_sessions.get(id);
    if (fullSession) {
      await this.queueSync('maintenance_sessions', 'update', fullSession);
    }
  }

  // Usuários
  subscribeUsers(callback: (users: any[]) => void) {
    const observable = liveQuery(() => localDB.users.orderBy('name').toArray());
    const subscription = observable.subscribe({
      next: callback,
      error: (err) => console.error('Dexie subscribeUsers error:', err)
    });
    return () => subscription.unsubscribe();
  }
}

export const dbService = new FirestoreDatabase();

