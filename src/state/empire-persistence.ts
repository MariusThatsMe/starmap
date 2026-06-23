import type { Empire } from '../types';
import { parseCampaignExport, type CampaignExport } from '../utils/empires';

const STORAGE_KEY = 'starmap-campaign';

export type PersistedCampaign = {
  empires: Empire[];
  starAssignments: Record<string, string | null>;
};

export function loadCampaignFromStorage(): PersistedCampaign | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = parseCampaignExport(JSON.parse(raw));
    if (!parsed) return null;
    return {
      empires: parsed.empires,
      starAssignments: parsed.starAssignments,
    };
  } catch {
    return null;
  }
}

export function saveCampaignToStorage(campaign: PersistedCampaign): void {
  const payload: CampaignExport = {
    version: 2,
    empires: campaign.empires,
    starAssignments: campaign.starAssignments,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearCampaignStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}
