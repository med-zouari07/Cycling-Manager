import type { Role } from './supabase';

export interface Club {
  id: string;
  name: string;
  logo_url: string | null;
  manager: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Rider {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  sex: 'M' | 'F' | null;
  birth_date: string | null;
  category_id: string | null;
  license_number: string | null;
  club_id: string | null;
  nationality: string | null;
  email: string | null;
  phone: string | null;
  bib_number: number | null;
  created_at: string;
}

export interface Championship {
  id: string;
  name: string;
  season: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'draft' | 'active' | 'completed';
  is_global: boolean;
  created_at: string;
}

export interface Cup {
  id: string;
  name: string;
  season: string | null;
  description: string | null;
  status: 'draft' | 'active' | 'completed';
  is_global: boolean;
  created_at: string;
}

export type StageType =
  | 'Route'
  | 'Contre-la-montre'
  | 'VTT'
  | 'Cyclo-cross'
  | 'Piste';

export interface Stage {
  id: string;
  name: string;
  stage_date: string;
  stage_time: string | null;
  city: string | null;
  venue: string | null;
  distance_km: number | null;
  stage_type: StageType;
  championship_id: string | null;
  cup_id: string | null;
  is_global: boolean;
  created_at: string;
}

export interface Race {
  id: string;
  stage_id: string;
  category_id: string;
  bib_start: number;
  is_global: boolean;
  created_at: string;
}

export interface Registration {
  id: string;
  race_id: string;
  rider_id: string;
  bib_number: number | null;
  status: 'pending' | 'validated' | 'refused';
  created_at: string;
}

export interface Result {
  id: string;
  race_id: string;
  rider_id: string;
  position: number | null;
  finish_time: string | null;
  gap: string | null;
  status: 'finished' | 'DNF' | 'DNS' | 'DSQ';
  points: number;
  created_at: string;
}

export interface PointsScale {
  id: string;
  name: string;
  scale: { position: number; points: number }[];
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: 'info' | 'competition' | 'registration' | 'results' | 'warning';
  is_read: boolean;
  is_global: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  role: Role;
  is_active: boolean;
  club_name: string | null;
  created_at: string;
}
