/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  SmartAlert, 
  SmartAlertCategory, 
  SmartAlertSeverity, 
  SmartAlertStatus, 
  NotificationPreference, 
  User, 
  Material,
  MaterialTransfer,
  ReceivingSession,
  ApprovalRequest,
  EnterpriseTask,
  SupplierEntity
} from '../types';
import { dbService } from './dbService';

const ALERT_STORAGE_KEY = 'emis_intelligence_alerts';
const NOTIF_PREF_KEY = 'emis_notification_preferences';

class SmartAlertEngine {
  private getStoredAlerts(): SmartAlert[] {
    try {
      const raw = localStorage.getItem(ALERT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveAlerts(alerts: SmartAlert[]): void {
    try {
      localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(alerts.slice(0, 500)));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emis:smart-alerts-updated'));
      }
    } catch (e) {
      console.warn('[SmartAlertEngine] Failed to persist alerts:', e);
    }
  }

  public getAlerts(siteFilter?: string, categoryFilter?: SmartAlertCategory, statusFilter?: SmartAlertStatus): SmartAlert[] {
    let alerts = this.getStoredAlerts();
    if (alerts.length === 0) {
      // Run initial rule evaluation to populate genuine alerts from system state
      this.evaluateAllRules();
      alerts = this.getStoredAlerts();
    }

    return alerts.filter(a => {
      if (siteFilter && siteFilter !== 'ALL' && a.site && a.site !== siteFilter) return false;
      if (categoryFilter && a.category !== categoryFilter) return false;
      if (statusFilter && a.status !== statusFilter) return false;
      return true;
    });
  }

  public getAlertSummary(siteFilter?: string) {
    const alerts = this.getAlerts(siteFilter);
    const active = alerts.filter(a => a.status === 'NEW' || a.status === 'IN_PROGRESS' || a.status === 'ACKNOWLEDGED');

    return {
      total: alerts.length,
      active: active.length,
      critical: active.filter(a => a.severity === 'CRITICAL').length,
      high: active.filter(a => a.severity === 'HIGH').length,
      medium: active.filter(a => a.severity === 'MEDIUM').length,
      low: active.filter(a => a.severity === 'LOW').length,
      byCategory: {
        STOCK: active.filter(a => a.category === 'STOCK').length,
        DOCUMENT: active.filter(a => a.category === 'DOCUMENT').length,
        INSPECTION: active.filter(a => a.category === 'INSPECTION').length,
        APPROVAL: active.filter(a => a.category === 'APPROVAL').length,
        MISMATCH: active.filter(a => a.category === 'MISMATCH').length,
        TRANSFER: active.filter(a => a.category === 'TRANSFER').length,
        SUPPLIER: active.filter(a => a.category === 'SUPPLIER').length,
        SYSTEM: active.filter(a => a.category === 'SYSTEM' || a.category === 'SYNC').length
      }
    };
  }

  public createAlert(alertData: Omit<SmartAlert, 'id' | 'createdAt' | 'status'>, user?: User): SmartAlert | null {
    const alerts = this.getStoredAlerts();
    const existing = alerts.find(a => 
      a.fingerprint === alertData.fingerprint && 
      (a.status === 'NEW' || a.status === 'ACKNOWLEDGED' || a.status === 'IN_PROGRESS')
    );

    if (existing) {
      return null; // Deduplicated
    }

    const newAlert: SmartAlert = {
      ...alertData,
      id: `ALT-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      status: 'NEW',
      createdAt: new Date().toISOString()
    };

    alerts.unshift(newAlert);
    this.saveAlerts(alerts);

    // Trigger Notification center
    dbService.addNotification({
      type: newAlert.severity === 'CRITICAL' ? 'CRITICAL' : newAlert.severity === 'HIGH' ? 'ERROR' : 'WARNING',
      title: `[Smart Alert] ${newAlert.title}`,
      message: `${newAlert.description} (${newAlert.site})`,
      linkType: 'material',
      linkId: newAlert.materialId || newAlert.partNumber,
      site: newAlert.site
    });

    if (user) {
      dbService.logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'create',
        details: `Smart Alert Created [${newAlert.severity}]: ${newAlert.title} (${newAlert.site})`
      });
    }

    // Process Email dispatch if rule applies
    this.processEmailDispatch(newAlert);

    return newAlert;
  }

  public acknowledgeAlert(alertId: string, user: User): boolean {
    const alerts = this.getStoredAlerts();
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedBy = user.name;
    alert.acknowledgedAt = new Date().toISOString();

    this.saveAlerts(alerts);
    dbService.logActivity({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'update',
      details: `Smart Alert Acknowledged: ${alert.title}`
    });

    return true;
  }

  public resolveAlert(alertId: string, resolutionNotes: string, user: User): boolean {
    const alerts = this.getStoredAlerts();
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.status = 'RESOLVED';
    alert.resolvedBy = user.name;
    alert.resolvedAt = new Date().toISOString();
    alert.resolutionNotes = resolutionNotes;

    this.saveAlerts(alerts);
    dbService.logActivity({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'update',
      details: `Smart Alert Resolved: ${alert.title} - Notes: ${resolutionNotes}`
    });

    return true;
  }

  public dismissAlert(alertId: string, reason: string, user: User): boolean {
    const alerts = this.getStoredAlerts();
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.status = 'DISMISSED';
    alert.resolvedBy = user.name;
    alert.resolvedAt = new Date().toISOString();
    alert.resolutionNotes = `Dismissed: ${reason}`;

    this.saveAlerts(alerts);
    return true;
  }

  // --- AUTOMATED AUDIT & RULE EVALUATION ENGINE ---
  public evaluateAllRules(user?: User): number {
    let generatedCount = 0;
    const materials = dbService.getMaterials();
    const transfers = dbService.getMaterialTransfers();
    const approvals = dbService.getApprovalRequests();
    const suppliers = dbService.getSuppliers();
    const tasks = dbService.getEnterpriseTasks();

    // 1. Stock Rules: Out of Stock & Low Stock
    materials.forEach(m => {
      const site = m.store || 'NDGS';
      const qty = m.quantity || 0;
      const minStock = m.minStockLevel || 1;

      if (qty === 0) {
        const created = this.createAlert({
          fingerprint: `${site}:${m.partNumber}:STOCK:OUT_OF_STOCK`,
          category: 'STOCK',
          severity: 'CRITICAL',
          title: `Stock Exhausted: ${m.partNumber}`,
          arabicTitle: `نفاد المخزون بالكامل: ${m.partNumber}`,
          description: `Part ${m.partNumber} (${m.description}) has reached 0 ${m.unit || 'EA'} at ${site}. Immediate replenishment required.`,
          site,
          materialId: m.partNumber,
          partNumber: m.partNumber,
          materialDescription: m.description,
          relatedEntity: 'Material',
          relatedEntityId: m.partNumber,
          relatedEntityNumber: m.partNumber,
          ruleCode: 'STK-001'
        }, user);
        if (created) generatedCount++;
      } else if (qty <= minStock) {
        const created = this.createAlert({
          fingerprint: `${site}:${m.partNumber}:STOCK:LOW_STOCK`,
          category: 'STOCK',
          severity: 'HIGH',
          title: `Low Stock Threshold: ${m.partNumber}`,
          arabicTitle: `تنبيه انخفاض مستوى المخزون: ${m.partNumber}`,
          description: `Current quantity (${qty} ${m.unit || 'EA'}) is at or below minimum threshold (${minStock} ${m.unit || 'EA'}) at ${site}.`,
          site,
          materialId: m.partNumber,
          partNumber: m.partNumber,
          materialDescription: m.description,
          relatedEntity: 'Material',
          relatedEntityId: m.partNumber,
          relatedEntityNumber: m.partNumber,
          ruleCode: 'STK-002'
        }, user);
        if (created) generatedCount++;
      }

      // 2. Document Rules: Missing Datasheet or CoC on active items
      if (m.inspectionStatus === 'UNDER_INSPECTION' || m.status === 'Under Inspection' || m.status === 'Pending Engineering Review') {
        const hasDoc = !!(m.datasheet || m.coc || (m.documents && Object.keys(m.documents).length > 0));
        if (!hasDoc) {
          const created = this.createAlert({
            fingerprint: `${site}:${m.partNumber}:DOC:MISSING_CERTIFICATES`,
            category: 'DOCUMENT',
            severity: 'MEDIUM',
            title: `Missing Compliance Documents: ${m.partNumber}`,
            arabicTitle: `مستندات المطابقة مفقودة: ${m.partNumber}`,
            description: `Material ${m.partNumber} is pending inspection at ${site} without Mill Test Certificate (MTR) or CoC attached.`,
            site,
            materialId: m.partNumber,
            partNumber: m.partNumber,
            materialDescription: m.description,
            relatedEntity: 'Document',
            relatedEntityId: m.partNumber,
            relatedEntityNumber: m.partNumber,
            ruleCode: 'DOC-001'
          }, user);
          if (created) generatedCount++;
        }
      }

      // 3. Mismatch Rules
      if (m.oemVerificationStatus === 'alternative' || m.inspectionStatus === 'REJECTED' || m.status === 'Blacklisted') {
        const created = this.createAlert({
          fingerprint: `${site}:${m.partNumber}:MISMATCH:REJECTED_DISCREPANCY`,
          category: 'MISMATCH',
          severity: 'CRITICAL',
          title: `Inspection Discrepancy / Rejection: ${m.partNumber}`,
          arabicTitle: `عدم مطابقة فنية / رفض مادة: ${m.partNumber}`,
          description: `Technical non-conformance recorded for ${m.partNumber}. Disposition / Quarantine required.`,
          site,
          materialId: m.partNumber,
          partNumber: m.partNumber,
          materialDescription: m.description,
          relatedEntity: 'Inspection',
          relatedEntityId: m.partNumber,
          relatedEntityNumber: m.partNumber,
          ruleCode: 'QC-001'
        }, user);
        if (created) generatedCount++;
      }
    });

    // 4. Approval Aging Rules: Pending approvals > 2 days
    const now = Date.now();
    approvals.forEach(app => {
      if (app.status === 'PENDING') {
        const ageHours = (now - new Date(app.requestedDate).getTime()) / (1000 * 3600);
        if (ageHours > 48) {
          const created = this.createAlert({
            fingerprint: `GLOBAL:${app.id}:APPROVAL:OVERDUE`,
            category: 'APPROVAL',
            severity: app.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
            title: `Approval SLA Overdue: ${app.approvalNumber}`,
            arabicTitle: `تجاوز مهلة الاعتماد الفني: ${app.approvalNumber}`,
            description: `${app.type} requested by ${app.requestedBy} has been pending decision for ${Math.round(ageHours / 24)} days.`,
            site: 'NDGS',
            relatedEntity: 'Approval',
            relatedEntityId: app.id,
            relatedEntityNumber: app.approvalNumber,
            ruleCode: 'APP-001'
          }, user);
          if (created) generatedCount++;
        }
      }
    });

    // 5. Transfer In-Transit Rules: Transfers in transit > 72 hours
    transfers.forEach(tr => {
      if (tr.status === 'IN_TRANSIT') {
        const ageHours = (now - new Date(tr.dispatchDate || tr.requestDate).getTime()) / (1000 * 3600);
        if (ageHours > 72) {
          const created = this.createAlert({
            fingerprint: `${tr.fromSite}:${tr.transferNumber}:TRANSFER:TRANSIT_DELAY`,
            category: 'TRANSFER',
            severity: 'HIGH',
            title: `Inter-Site Transfer Delayed: ${tr.transferNumber}`,
            arabicTitle: `تأخر شحنة النقل بين المواقع: ${tr.transferNumber}`,
            description: `Shipment from ${tr.fromSite} to ${tr.toSite} (${tr.partNumber}) has been in transit for ${Math.round(ageHours / 24)} days.`,
            site: tr.toSite,
            partNumber: tr.partNumber,
            materialDescription: tr.description,
            relatedEntity: 'Transfer',
            relatedEntityId: tr.id,
            relatedEntityNumber: tr.transferNumber,
            ruleCode: 'TRF-001'
          }, user);
          if (created) generatedCount++;
        }
      }
    });

    // 6. Supplier Performance Rules
    suppliers.forEach(sup => {
      if (sup.status === 'UNDER_REVIEW' || (sup.totalDeliveries > 0 && (sup.rejectedDeliveries / sup.totalDeliveries) > 0.2)) {
        const created = this.createAlert({
          fingerprint: `GLOBAL:${sup.id}:SUPPLIER:HIGH_REJECTION_RATE`,
          category: 'SUPPLIER',
          severity: 'HIGH',
          title: `Supplier Quality Risk: ${sup.name}`,
          arabicTitle: `مخاطر جودة المورد: ${sup.name}`,
          description: `Supplier ${sup.name} has a rejection rate of ${Math.round((sup.rejectedDeliveries / Math.max(1, sup.totalDeliveries)) * 100)}% with ${sup.rejectedDeliveries} rejected batches.`,
          site: 'NDGS',
          relatedEntity: 'Supplier',
          relatedEntityId: sup.id,
          relatedEntityNumber: sup.code,
          ruleCode: 'SUP-001'
        }, user);
        if (created) generatedCount++;
      }
    });

    return generatedCount;
  }

  // --- USER NOTIFICATION PREFERENCES ---
  public getNotificationPreferences(userId: string): NotificationPreference {
    try {
      const raw = localStorage.getItem(`${NOTIF_PREF_KEY}_${userId}`);
      if (raw) return JSON.parse(raw);
    } catch {}

    return {
      userId,
      emailEnabled: true,
      emailLevel: 'HIGH_CRITICAL',
      inAppEnabled: true,
      siteSubscriptions: [],
      categorySubscriptions: ['STOCK', 'DOCUMENT', 'INSPECTION', 'APPROVAL', 'MISMATCH', 'TRANSFER', 'SUPPLIER', 'SYSTEM'],
      dailySummary: true,
      recipientEmail: 'ahssan1991@gmail.com',
      updatedAt: new Date().toISOString()
    };
  }

  public saveNotificationPreferences(prefs: NotificationPreference, user: User): void {
    try {
      localStorage.setItem(`${NOTIF_PREF_KEY}_${prefs.userId}`, JSON.stringify(prefs));
      dbService.logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'update',
        details: `Updated Notification Preferences: Email ${prefs.emailEnabled ? 'Enabled' : 'Disabled'} (${prefs.emailLevel})`
      });
    } catch (e) {
      console.warn('Failed to save notification preferences:', e);
    }
  }

  private async processEmailDispatch(alert: SmartAlert): Promise<void> {
    // Only send email for critical or high severity alerts if preference allows
    if (alert.severity !== 'CRITICAL' && alert.severity !== 'HIGH') return;

    try {
      const emailSettings = dbService.getEmailSettings();
      const recipient = emailSettings.adminNotificationEmail || 'ahssan1991@gmail.com';
      alert.emailDeliveryStatus = 'SENDING';
      alert.emailRecipient = recipient;

      const dispatchResult = await dbService.sendEmailNotification({
        to: [recipient],
        subject: `[EMIS Smart Alert - ${alert.severity}] ${alert.title}`,
        body: `
EMIS ENGINEERING INTELLIGENCE NOTIFICATION
--------------------------------------------------
Alert ID: ${alert.id}
Category: ${alert.category}
Severity: ${alert.severity}
Site: ${alert.site}
Rule: ${alert.ruleCode}

Details:
${alert.description}

Action Recommended:
Please log in to the EMIS Portal to review and take corrective engineering action.
Timestamp: ${alert.createdAt}
--------------------------------------------------
Automated intelligence notification from EMIS v3.0.
        `,
        event: `SmartAlert_${alert.category}_${alert.severity}`
      });

      if (dispatchResult.success && dispatchResult.status === 'SENT') {
        alert.emailSent = true;
        alert.emailDeliveryStatus = 'SENT';
        alert.emailTimestamp = new Date().toISOString();
        alert.emailError = undefined;
      } else {
        alert.emailSent = false;
        alert.emailDeliveryStatus = (dispatchResult.status as any) || 'FAILED';
        alert.emailError = dispatchResult.error || 'Email could not be delivered';

        // Port 11 Item 18: Record EMAIL_FAILURE audit event while preserving alert
        dbService.logAudit({
          id: `aud-eml-fail-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'EMAIL_FAILURE',
          entity: 'SmartAlert',
          entityId: alert.id,
          user: 'SmartAlertEngine',
          site: alert.site,
          reason: dispatchResult.error || `Delivery status: ${dispatchResult.status}`,
          result: 'FAILED'
        });
      }

      // Update persisted alert in storage with actual status
      const alerts = this.getStoredAlerts();
      const idx = alerts.findIndex(a => a.id === alert.id);
      if (idx >= 0) {
        alerts[idx] = { ...alerts[idx], ...alert };
        this.saveAlerts(alerts);
      }
    } catch (e: any) {
      console.warn('[SmartAlertEngine] Email dispatch error:', e);
      alert.emailSent = false;
      alert.emailDeliveryStatus = 'FAILED';
      alert.emailError = e.message || 'Exception during email dispatch';

      dbService.logAudit({
        id: `aud-eml-fail-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'EMAIL_FAILURE',
        entity: 'SmartAlert',
        entityId: alert.id,
        user: 'SmartAlertEngine',
        site: alert.site,
        reason: e.message || 'Unhandled exception in dispatch',
        result: 'FAILED'
      });
    }
  }
}

export const smartAlertService = new SmartAlertEngine();
