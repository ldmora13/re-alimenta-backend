/**
 * Tipos de las filas del esquema `public`.
 *
 * `auth_users` no se replica: Supabase Auth administra `auth.users` y las
 * tablas de negocio referencian `auth.users(id)` directamente.
 */

export interface Organization {
  id: string;
  legal_name: string;
  type: string;
  tax_id: string;
  verification_status: string;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  organization_id: string;
  label: string;
  address_line: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Donation {
  id: string;
  donor_organization_id: string;
  recipient_organization_id: string | null;
  pickup_address_id: string;
  delivery_address_id: string | null;
  status: string;
  description: string | null;
  available_from: string | null;
  available_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface DonationItem {
  id: string;
  donation_id: string;
  name: string;
  quantity: number;
  category: string;
  condition: string | null;
  created_at: string;
  updated_at: string;
}

export interface Delivery {
  id: string;
  donation_id: string;
  courier_id: string | null;
  origin_address_id: string;
  destination_address_id: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryEvent {
  id: string;
  delivery_id: string;
  actor_id: string | null;
  event_type: string;
  status: string | null;
  latitude: number | null;
  longitude: number | null;
  occurred_at: string;
}

export interface Attachment {
  id: string;
  uploaded_by: string | null;
  organization_id: string;
  resource_type: string;
  resource_id: string;
  storage_path: string;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}
