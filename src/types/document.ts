export type OwnershipType = 'owned' | 'shared';

export type DashboardTab = 'all' | 'owned' | 'shared';

export type ViewMode = 'grid' | 'list';

export type SharePermission = 'viewer' | 'editor';

export interface DbDocument {
  id: string;
  title: string;
  content_json: Record<string, unknown> | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface DbDocumentShare {
  document_id: string;
  user_id: string;
  permission: string;
  created_at: string;
}

export interface DocumentShareItem {
  documentId: string;
  userId: string;
  email?: string;
  permission: SharePermission;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  contentJson?: Record<string, unknown> | null;
  content?: string; // fallback / preview representation
  updatedAt: string;
  createdAt: string;
  ownership: OwnershipType;
  ownerId?: string;
  authorName: string;
  authorEmail?: string;
  permission?: SharePermission | string;
  isStarred?: boolean;
  isTrash?: boolean;
}

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';
