import type { Measurements, CardiovascularHistory } from '../clinical';

export type SyncState = 'pending' | 'synced' | 'failed';

export interface LocalPatient {
  id: string;
  identifier: string; // CPF (só dígitos)
  socialName: string;
  birthDate: string; // ISO
  biologicalSex: 'F' | 'M';
  smokingStatus: 'fumante' | 'ex_fumante' | 'nao_fumante';
  physicalActivity: 'nao_praticante' | 'raramente' | 'regularmente' | 'frequentemente';
  usesStatin: boolean;
  cardiovascularHistory: CardiovascularHistory;
  cardiovascularEventAt?: string | null;
  createdAt: string;
  updatedAt: string;
  syncState: SyncState;
}

export interface LocalVisit {
  id: string;
  patientId: string;
  collectedAt: string; // ISO
  authorId?: string | null;
  measurements: Measurements;
  createdAt: string;
  updatedAt: string;
  syncState: SyncState;
}

export interface OutboxItem {
  id: string; // = id da entidade (chave de idempotência no /sync)
  entity: 'patient' | 'visit';
  createdAt: string;
  attempts: number;
  lastError?: string | null;
}

export interface SyncMetaRow {
  key: string;
  value: string;
}
