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
  Timestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Client, Machine, Part, ServiceOrder, PMOC, OSStatus, MaintenanceSession } from '../types';

class FirestoreDatabase {
  // Clientes
  subscribeClients(callback: (clients: Client[]) => void) {
    const q = query(collection(db, 'clients'), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      const clients = snapshot.docs.map(doc => {
        const data = doc.data();
        return { ...data, id: doc.id } as Client;
      });
      callback(clients);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'clients'));
  }

  async addClient(client: Omit<Client, 'id'>) {
    try {
      await addDoc(collection(db, 'clients'), client);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'clients');
    }
  }

  async updateClient(id: string, client: Partial<Client>) {
    try {
      await updateDoc(doc(db, 'clients', id), client as any);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `clients/${id}`);
    }
  }

  async deleteClient(id: string) {
    try {
      await deleteDoc(doc(db, 'clients', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `clients/${id}`);
    }
  }

  // Equipamentos
  subscribeMachines(callback: (machines: Machine[]) => void) {
    const q = query(collection(db, 'machines'), orderBy('location'));
    return onSnapshot(q, (snapshot) => {
      const machines = snapshot.docs.map(doc => {
        const data = doc.data();
        return { ...data, id: doc.id } as Machine;
      });
      callback(machines);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'machines'));
  }

  async addMachine(machine: Omit<Machine, 'id'>) {
    try {
      await addDoc(collection(db, 'machines'), machine);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'machines');
    }
  }

  async updateMachine(id: string, machine: Partial<Machine>) {
    try {
      await updateDoc(doc(db, 'machines', id), machine as any);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `machines/${id}`);
    }
  }

  async deleteMachine(id: string) {
    try {
      await deleteDoc(doc(db, 'machines', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `machines/${id}`);
    }
  }

  // Peças
  subscribeParts(callback: (parts: Part[]) => void) {
    const q = query(collection(db, 'parts'), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      const parts = snapshot.docs.map(doc => {
        const data = doc.data();
        return { ...data, id: doc.id } as Part;
      });
      callback(parts);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'parts'));
  }

  async addPart(part: Omit<Part, 'id'>) {
    try {
      await addDoc(collection(db, 'parts'), part);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'parts');
    }
  }

  async updatePart(id: string, part: Partial<Part>) {
    try {
      await updateDoc(doc(db, 'parts', id), part as any);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `parts/${id}`);
    }
  }

  async deletePart(id: string) {
    try {
      await deleteDoc(doc(db, 'parts', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `parts/${id}`);
    }
  }

  // Ordens de Serviço
  subscribeOrders(callback: (orders: ServiceOrder[]) => void) {
    const q = query(collection(db, 'orders'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => {
        const data = doc.data();
        return { ...data, id: doc.id } as ServiceOrder;
      });
      callback(orders);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));
  }

  async addOrder(order: Omit<ServiceOrder, 'id'>) {
    try {
      await addDoc(collection(db, 'orders'), order);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'orders');
    }
  }

  async updateOrder(id: string, order: Partial<ServiceOrder>) {
    try {
      await updateDoc(doc(db, 'orders', id), order as any);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${id}`);
    }
  }

  async deleteOrder(id: string) {
    try {
      await deleteDoc(doc(db, 'orders', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `orders/${id}`);
    }
  }

  // Catálogo de Serviços
  subscribeServices(callback: (services: any[]) => void) {
    const q = query(collection(db, 'services'), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      const services = snapshot.docs.map(doc => {
        const data = doc.data();
        return { ...data, id: doc.id };
      });
      callback(services);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'services'));
  }

  async addService(service: any) {
    try {
      await addDoc(collection(db, 'services'), service);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'services');
    }
  }

  async updateService(id: string, service: any) {
    try {
      await updateDoc(doc(db, 'services', id), service);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `services/${id}`);
    }
  }

  async deleteService(id: string) {
    try {
      await deleteDoc(doc(db, 'services', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `services/${id}`);
    }
  }

  // PMOC
  subscribePMOCs(callback: (pmocs: PMOC[]) => void) {
    const q = query(collection(db, 'pmocs'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const pmocs = snapshot.docs.map(doc => {
        const data = doc.data();
        return { ...data, id: doc.id } as PMOC;
      });
      callback(pmocs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pmocs'));
  }

  async addPMOC(pmoc: Omit<PMOC, 'id'>) {
    try {
      await addDoc(collection(db, 'pmocs'), { ...pmoc, createdAt: new Date().toISOString() });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'pmocs');
    }
  }

  // Manutenções (Sessions)
  subscribeMaintenanceSessions(callback: (sessions: MaintenanceSession[]) => void, status?: 'Ativa' | 'Finalizada') {
    let q = query(collection(db, 'maintenance_sessions'), orderBy('created_at', 'desc'));
    if (status) {
      q = query(collection(db, 'maintenance_sessions'), where('status', '==', status), orderBy('created_at', 'desc'));
    }
    return onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => {
        const data = doc.data();
        return { ...data, id: doc.id } as MaintenanceSession;
      });
      callback(sessions);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'maintenance_sessions'));
  }

  async addMaintenanceSession(session: Omit<MaintenanceSession, 'id'>) {
    try {
      await addDoc(collection(db, 'maintenance_sessions'), { ...session, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'maintenance_sessions');
    }
  }

  async updateMaintenanceSession(id: string, data: Partial<MaintenanceSession>) {
    try {
      const docRef = doc(db, 'maintenance_sessions', id);
      await updateDoc(docRef, { ...data, updated_at: new Date().toISOString() });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'maintenance_sessions');
    }
  }

  // Usuários
  subscribeUsers(callback: (users: any[]) => void) {
    const q = query(collection(db, 'users'), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => {
        const data = doc.data();
        return { ...data, id: doc.id };
      });
      callback(users);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));
  }
}

export const dbService = new FirestoreDatabase();
