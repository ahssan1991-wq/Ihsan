/**
 * EMIS Material Inspection & Intelligence System
 * Firebase Cloud Function: onMaterialUpdate
 * 
 * Trigger: Firestore onDocumentUpdated('materials/{materialId}')
 * Purpose: Automatically monitors material record updates in Firestore and dispatches
 *          high-priority email alerts to the engineering team whenever a critical spare
 *          or instrumentation record is modified or inventory breaches safety thresholds.
 */

export interface MaterialRecord {
  partNumber: string;
  description: string;
  manufacturer: string;
  model?: string;
  criticality?: 'Critical' | 'Major' | 'Minor' | 'Non-Critical';
  isCritical?: boolean;
  quantity: number;
  minStockLevel?: number;
  unit: string;
  site?: string;
  store?: string;
  rack?: string;
  shelf?: string;
  tags?: string[];
  updatedAt?: string;
  lastModifiedBy?: string;
}

export interface CloudFunctionTriggerContext {
  params: {
    materialId: string;
  };
  eventId: string;
  timestamp: string;
}

/**
 * Core Evaluation Logic for Critical Material Records
 */
export function isCriticalMaterialUpdate(
  before: Partial<MaterialRecord> | undefined,
  after: Partial<MaterialRecord>
): boolean {
  if (!after) return false;

  const afterCrit = String(after.criticality || '').toLowerCase();
  const beforeCrit = String(before?.criticality || '').toLowerCase();

  // Condition 1: High process criticality rating
  const isCriticalTier = afterCrit === 'critical' || afterCrit === 'major' ||
                         beforeCrit === 'critical' || beforeCrit === 'major';

  // Condition 2: Explicit critical flag
  const isFlagged = Boolean(after.isCritical || before?.isCritical);

  // Condition 3: Stock deficit below engineering safety limit
  const isStockDeficit = typeof after.quantity === 'number' &&
                         typeof after.minStockLevel === 'number' &&
                         after.minStockLevel > 0 &&
                         after.quantity <= after.minStockLevel;

  // Condition 4: Critical tags attached
  const hasCriticalTag = Array.isArray(after.tags) &&
                         after.tags.some(t => String(t).toLowerCase().includes('critical'));

  return Boolean(isCriticalTier || isFlagged || isStockDeficit || hasCriticalTag);
}

/**
 * Standalone handler callable from Cloud Functions or Webhooks
 */
export async function handleMaterialUpdateEvent(
  before: Partial<MaterialRecord> | undefined,
  after: Partial<MaterialRecord>,
  serviceApiUrl: string = 'http://localhost:3000'
) {
  if (!isCriticalMaterialUpdate(before, after)) {
    return {
      triggered: false,
      reason: 'Material record does not meet critical thresholds; engineering notification bypassed.'
    };
  }

  const endpoint = `${serviceApiUrl.replace(/\/$/, '')}/api/cloud-functions/on-material-update`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Trigger-Source': 'Firebase-Cloud-Function-v2'
    },
    body: JSON.stringify({
      before,
      after,
      source: 'FIRESTORE_TRIGGER_CLOUD_FUNCTION',
      timestamp: new Date().toISOString()
    })
  });

  return await response.json();
}
