export type AuraNavigationSystem =
  | 'aura_hcm'
  | 'aura_maintenance'
  | 'aura_signature'
  | 'aura_control_center'
  | 'aura_intelligence';

export interface AuraNavigationAction {
  id: string;
  label: string;
  description: string;
  type: string;
  system: AuraNavigationSystem;
  moduleId: string;
  route?: string;
  confidence: number;
  requiresConfirmation: boolean;
}

export interface AuraNavigationTarget {
  system: AuraNavigationSystem;
  route: string;
  label: string;
  externalUrl?: string;
  openMode: 'internal' | 'external' | 'new_tab';
}

export interface AuraNavigationResult {
  canNavigate: boolean;
  target?: AuraNavigationTarget;
  reason?: string;
  action: AuraNavigationAction;
}