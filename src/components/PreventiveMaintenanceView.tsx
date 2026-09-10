/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wrench, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  PlusCircle, 
  Printer, 
  Search, 
  ShoppingCart, 
  PackageCheck, 
  PackageX, 
  ShieldCheck, 
  Layers, 
  FileText, 
  X,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Material, PreventiveMaintenancePlan, PMKitItem, User as UserType } from '../types';
import { OfficialDocumentHeader, OfficialDocumentFooter } from './OfficialDocumentHeader';

interface PreventiveMaintenanceViewProps {
  materials: Material[];
  currentUser?: UserType;
  onInspectMaterial?: (material: Material) => void;
  onNavigateToTab?: (tab: string, query?: string) => void;
}

const INITIAL_PM_PLANS: PreventiveMaintenancePlan[] = [
  {
    id: 'pm-plan-001',
    planNumber: 'PM-2026-0104',
    equipmentTag: 'PT-101',
    equipmentName: 'High-Pressure Steam Transmitter',
    facility: 'Unit 14 - Hydrocracker Plant',
    frequency: 'SEMI_ANNUAL',
    intervalDays: 180,
    nextDueDate: '2026-09-28',
    lastPerformedDate: '2026-03-25',
    status: 'DUE_NOW',
    assignedTeam: 'Instrumentation & Calibration Crew A',
    estimatedHours: 4,
    kitItems: [
      {
        id: 'ki-1',
        partNumber: '3051S-SEAL-KIT',
        description: 'Rosemount 3051S Coplanar Flange Viton O-Ring Seal Kit',
        requiredQuantity: 2,
        unit: 'KIT',
        isCritical: true,
        notes: 'Replace on every sensor calibration'
      },
      {
        id: 'ki-2',
        partNumber: 'CAL-OIL-500ML',
        description: 'High-Temperature Silicone Transmitter Diaphragm Fill Fluid',
        requiredQuantity: 1,
        unit: 'BTL',
        isCritical: false
      }
    ],
    procedureNotes: 'Perform zero and span 5-point calibration at 0, 25, 50, 75, and 100% of range (0-160 barg). Replace flange gasket and leak-test with Snoop solution.',
    safetyChecklist: [
      'Lockout / Tagout (LOTO) valve isolation verified',
      'Steam line depressurized and cooled to < 50°C',
      'Permit to Work (PTW) Hot/Cold signed by area shift engineer'
    ],
    createdAt: '2026-01-10'
  },
  {
    id: 'pm-plan-002',
    planNumber: 'PM-2026-0105',
    equipmentTag: 'FCV-204',
    equipmentName: 'Pneumatic Feedwater Control Valve 4-inch',
    facility: 'Boiler Island 2',
    frequency: 'ANNUAL',
    intervalDays: 365,
    nextDueDate: '2026-10-15',
    lastPerformedDate: '2025-10-12',
    status: 'UPCOMING',
    assignedTeam: 'Valve & Actuator Specialist Team',
    estimatedHours: 8,
    kitItems: [
      {
        id: 'ki-3',
        partNumber: 'VALVE-PACKING-4IN',
        description: 'PTFE Chevron V-Ring Stem Packing Set 4-inch Class 600',
        requiredQuantity: 1,
        unit: 'SET',
        isCritical: true
      },
      {
        id: 'ki-4',
        partNumber: 'DIAPHRAGM-ACTUATOR-60',
        description: 'Molded Buna-N Actuator Diaphragm Size 60',
        requiredQuantity: 1,
        unit: 'EA',
        isCritical: true
      },
      {
        id: 'ki-5',
        partNumber: 'GREASE-MOLY-500G',
        description: 'Molykote High Pressure Valve Stem Lubricant',
        requiredQuantity: 1,
        unit: 'CAN',
        isCritical: false
      }
    ],
    procedureNotes: 'Disassemble actuator, inspect diaphragm for micro-cracks, repack gland with torque wrench according to OEM specs (45 Nm). Stroke valve 0-100% and test travel feedback.',
    safetyChecklist: [
      'Double Block and Bleed (DBB) line isolation confirmed',
      'Pneumatic instrument air supply decoupled and vented'
    ],
    createdAt: '2026-01-15'
  },
  {
    id: 'pm-plan-003',
    planNumber: 'PM-2026-0106',
    equipmentTag: 'P-301A',
    equipmentName: 'Boiler Feed Water Centrifugal Pump',
    facility: 'Utilities & Power Generation',
    frequency: 'QUARTERLY',
    intervalDays: 90,
    nextDueDate: '2026-09-18',
    lastPerformedDate: '2026-06-18',
    status: 'OVERDUE',
    assignedTeam: 'Rotating Equipment Mechanics',
    estimatedHours: 6,
    kitItems: [
      {
        id: 'ki-6',
        partNumber: 'BEARING-6312-C3',
        description: 'Deep Groove Ball Bearing 6312-C3 Premium Steel',
        requiredQuantity: 2,
        unit: 'EA',
        isCritical: true
      },
      {
        id: 'ki-7',
        partNumber: 'LUBE-SYN-VG46',
        description: 'Synthetic Industrial ISO VG 46 Turbine & Pump Oil',
        requiredQuantity: 10,
        unit: 'L',
        isCritical: true
      }
    ],
    procedureNotes: 'Check shaft alignment with laser dial indicator (tolerance < 0.05 mm). Flush bearing housing, inspect mechanical seal faces, replace lubricant and check vibration signature.',
    safetyChecklist: [
      'Motor 4160V breaker racked out and tagged (LOTO)',
      'Suction and discharge isolation valves chained and locked',
      'Pump casing drained and vented'
    ],
    createdAt: '2026-02-01'
  }
];

export const PreventiveMaintenanceView: React.FC<PreventiveMaintenanceViewProps> = ({
  materials,
  currentUser,
  onInspectMaterial,
  onNavigateToTab
}) => {
  const [plans, setPlans] = useState<PreventiveMaintenancePlan[]>(() => {
    try {
      const stored = localStorage.getItem('emis_pm_plans_v1');
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_PM_PLANS;
  });

  const [selectedPlan, setSelectedPlan] = useState<PreventiveMaintenancePlan | null>(plans[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DUE_NOW' | 'OVERDUE' | 'UPCOMING'>('ALL');
  const [isPrintJobPack, setIsPrintJobPack] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [reservationNotice, setReservationNotice] = useState<string | null>(null);

  // Cross-reference PM Kit items against live materials inventory
  const evaluatedPlanKits = useMemo(() => {
    return plans.map(plan => {
      let isFullyStocked = true;
      let shortageCount = 0;

      const itemsWithStock = plan.kitItems.map(item => {
        // Find matching material in registered ledger
        const found = materials.find(m => 
          m.partNumber.toLowerCase() === item.partNumber.toLowerCase() ||
          m.description.toLowerCase().includes(item.partNumber.toLowerCase())
        );

        const currentStock = found ? found.quantity : 0;
        const isSufficient = currentStock >= item.requiredQuantity;
        if (!isSufficient) {
          isFullyStocked = false;
          shortageCount++;
        }

        return {
          ...item,
          matchedMaterial: found,
          currentStock,
          isSufficient,
          shortageQty: Math.max(0, item.requiredQuantity - currentStock),
          location: found ? `${found.store} [R:${found.rack} S:${found.shelf}]` : 'Not in Warehouse'
        };
      });

      return {
        plan,
        itemsWithStock,
        isFullyStocked,
        shortageCount
      };
    });
  }, [plans, materials]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    let overdueCount = 0;
    let dueNowCount = 0;
    let upcomingCount = 0;
    let totalKitsWithShortage = 0;

    evaluatedPlanKits.forEach(ep => {
      if (ep.plan.status === 'OVERDUE') overdueCount++;
      else if (ep.plan.status === 'DUE_NOW') dueNowCount++;
      else upcomingCount++;

      if (!ep.isFullyStocked) totalKitsWithShortage++;
    });

    return { overdueCount, dueNowCount, upcomingCount, totalKitsWithShortage };
  }, [evaluatedPlanKits]);

  const activePlanEvaluation = useMemo(() => {
    if (!selectedPlan) return null;
    return evaluatedPlanKits.find(ep => ep.plan.id === selectedPlan.id) || null;
  }, [selectedPlan, evaluatedPlanKits]);

  const handleReserveKit = (plan: PreventiveMaintenancePlan) => {
    setReservationNotice(`Materials for ${plan.equipmentTag} (${plan.planNumber}) have been digitally earmarked and locked for Work Order dispatch.`);
    setTimeout(() => setReservationNotice(null), 4000);
  };

  const handleGenerateShortagePR = (evaluation: any) => {
    if (!evaluation) return;
    const shortages = evaluation.itemsWithStock.filter((i: any) => !i.isSufficient);
    if (shortages.length === 0) {
      alert('All kit items are currently 100% in stock. No requisition required.');
      return;
    }
    if (onNavigateToTab) {
      onNavigateToTab('reorder-hub');
    }
  };

  return (
    <div className="space-y-6">
      {/* Printable Job Pack Modal */}
      {isPrintJobPack && selectedPlan && activePlanEvaluation && (
        <div className="fixed inset-0 z-50 bg-white text-black p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between no-print border-b pb-3 mb-4">
              <span className="font-bold text-sm">Official Preventive Maintenance Work Pack Print</span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold"
                >
                  Print Job Pack
                </button>
                <button
                  onClick={() => setIsPrintJobPack(false)}
                  className="px-4 py-1.5 bg-gray-200 text-gray-800 rounded text-xs font-bold"
                >
                  Close Preview
                </button>
              </div>
            </div>

            <OfficialDocumentHeader
              titleEn="Preventive Maintenance Job Pack & Parts Picklist"
              titleAr="حزمة عمل الصيانة الوقائية وقائمة صرف قطع الغيار"
              documentNumber={selectedPlan.planNumber}
              statusBadge="AUTHORIZED WO / أمر معتمد"
            />

            {/* Equipment Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 border border-gray-300 rounded-lg text-xs">
              <div>
                <span className="text-gray-500 font-mono block">Equipment Tag</span>
                <strong className="text-sm font-mono">{selectedPlan.equipmentTag}</strong>
              </div>
              <div>
                <span className="text-gray-500 font-mono block">Machinery Name</span>
                <strong>{selectedPlan.equipmentName}</strong>
              </div>
              <div>
                <span className="text-gray-500 font-mono block">Scheduled Due Date</span>
                <strong>{selectedPlan.nextDueDate}</strong>
              </div>
              <div>
                <span className="text-gray-500 font-mono block">Assigned Crew</span>
                <strong>{selectedPlan.assignedTeam}</strong>
              </div>
            </div>

            {/* Bill of Materials / Picklist */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider border-b pb-1">
                Required PM Spare Parts & Consumables Picklist
              </h3>
              <table className="w-full text-xs border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left">Part Number</th>
                    <th className="border border-gray-300 p-2 text-left">Description</th>
                    <th className="border border-gray-300 p-2 text-center">Req Qty</th>
                    <th className="border border-gray-300 p-2 text-center">Warehouse Location</th>
                    <th className="border border-gray-300 p-2 text-center">Store Issue Sign</th>
                  </tr>
                </thead>
                <tbody>
                  {activePlanEvaluation.itemsWithStock.map((item: any, itemIdx: number) => (
                    <tr key={`pm-print-item-${item.id || item.partNumber || itemIdx}-${itemIdx}`} className="border-b border-gray-200">
                      <td className="border border-gray-200 p-2 font-mono font-bold">{item.partNumber}</td>
                      <td className="border border-gray-200 p-2">{item.description}</td>
                      <td className="border border-gray-200 p-2 text-center font-bold">{item.requiredQuantity} {item.unit}</td>
                      <td className="border border-gray-200 p-2 text-center font-mono">{item.location}</td>
                      <td className="border border-gray-200 p-2 text-center text-gray-400">[  ] Verified</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Procedure & Safety Checklist */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider border-b pb-1">
                Maintenance Engineering Procedure & Notes
              </h3>
              <p className="text-xs bg-gray-50 p-3 rounded border border-gray-200 leading-relaxed">
                {selectedPlan.procedureNotes}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider border-b pb-1">
                Field Safety & Isolation Verification
              </h3>
              <div className="space-y-1 text-xs">
                {selectedPlan.safetyChecklist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-4 h-4 border border-gray-400 rounded inline-block"></span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <OfficialDocumentFooter
              preparedBy={currentUser?.name || 'Maintenance Planner'}
              date={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-industrial-900 border border-industrial-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Preventive Maintenance & Spare Parts Forecasting</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                PM-KIT
              </span>
            </h1>
            <p className="text-xs text-industrial-400" dir="rtl">
              ربط جداول الصيانة الوقائية للمعدات بحزم قطع الغيار وكشف النواقص مسبقاً
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {selectedPlan && (
            <button
              onClick={() => setIsPrintJobPack(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-industrial-800 hover:bg-industrial-750 border border-industrial-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Print PM Job Pack</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      <AnimatePresence>
        {reservationNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{reservationNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-industrial-900 border border-industrial-800 space-y-1">
          <div className="flex items-center justify-between text-rose-400 text-xs font-mono uppercase font-bold">
            <span>Overdue Maintenance</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400">
            {metrics.overdueCount} <span className="text-xs font-normal text-industrial-400">Plans</span>
          </div>
          <div className="text-[11px] text-rose-300/80">Immediate attention required</div>
        </div>

        <div className="p-4 rounded-2xl bg-industrial-900 border border-industrial-800 space-y-1">
          <div className="flex items-center justify-between text-amber-400 text-xs font-mono uppercase font-bold">
            <span>Due Now (&lt; 14 Days)</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {metrics.dueNowCount} <span className="text-xs font-normal text-industrial-400">Plans</span>
          </div>
          <div className="text-[11px] text-industrial-400">Ready for job dispatch</div>
        </div>

        <div className="p-4 rounded-2xl bg-industrial-900 border border-industrial-800 space-y-1">
          <div className="flex items-center justify-between text-rose-400 text-xs font-mono uppercase font-bold">
            <span>Parts Shortage Alert</span>
            <PackageX className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400">
            {metrics.totalKitsWithShortage} <span className="text-xs font-normal text-industrial-400">Kits</span>
          </div>
          <div className="text-[11px] text-industrial-400">Need purchase requisition</div>
        </div>

        <div className="p-4 rounded-2xl bg-industrial-900 border border-industrial-800 space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-mono uppercase font-bold">
            <span>Parts 100% In-Stock</span>
            <PackageCheck className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {evaluatedPlanKits.length - metrics.totalKitsWithShortage} <span className="text-xs font-normal text-industrial-400">Kits</span>
          </div>
          <div className="text-[11px] text-industrial-400">Materials ready in warehouse</div>
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: List of PM Plans */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase text-industrial-400 font-bold tracking-wider">
              Equipment Maintenance Plans
            </h2>
            <div className="flex gap-1">
              {(['ALL', 'OVERDUE', 'DUE_NOW', 'UPCOMING'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    statusFilter === st ? 'bg-brand-600 text-white' : 'bg-industrial-850 text-industrial-400'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {evaluatedPlanKits
              .filter(ep => statusFilter === 'ALL' || ep.plan.status === statusFilter)
              .map(ep => {
                const isSelected = selectedPlan?.id === ep.plan.id;

                return (
                  <div
                    key={ep.plan.id}
                    onClick={() => setSelectedPlan(ep.plan)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-industrial-850 border-brand-500 shadow-md'
                        : 'bg-industrial-900 border-industrial-800 hover:border-industrial-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-sm text-white">
                            {ep.plan.equipmentTag}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                            ep.plan.status === 'OVERDUE' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            ep.plan.status === 'DUE_NOW' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {ep.plan.status.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="text-xs text-industrial-300 font-medium mt-0.5">
                          {ep.plan.equipmentName}
                        </h4>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] font-mono text-industrial-400 block">
                          Due: {ep.plan.nextDueDate}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold mt-1 ${
                          ep.isFullyStocked ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {ep.isFullyStocked ? (
                            <>
                              <PackageCheck className="w-3 h-3" />
                              <span>Parts 100% Ready</span>
                            </>
                          ) : (
                            <>
                              <PackageX className="w-3 h-3" />
                              <span>{ep.shortageCount} Shortages</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-industrial-800 text-[11px] text-industrial-400">
                      <span>{ep.plan.facility}</span>
                      <span className="font-mono">{ep.plan.frequency} ({ep.plan.intervalDays}d)</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Right Column: Selected PM Plan Details & Bill of Materials */}
        <div className="lg:col-span-7">
          {selectedPlan && activePlanEvaluation ? (
            <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-5 space-y-5 shadow-xl">
              {/* Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-industrial-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white font-mono">
                      {selectedPlan.equipmentTag} - {selectedPlan.planNumber}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      {selectedPlan.frequency}
                    </span>
                  </div>
                  <p className="text-xs text-industrial-300 mt-0.5">
                    {selectedPlan.equipmentName} • {selectedPlan.facility}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReserveKit(selectedPlan)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Reserve Kit Parts</span>
                  </button>

                  {!activePlanEvaluation.isFullyStocked && (
                    <button
                      onClick={() => handleGenerateShortagePR(activePlanEvaluation)}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Reorder Shortage (PR)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Maintenance Kit Bill of Materials */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono uppercase text-industrial-400 font-bold tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-brand-400" />
                    <span>Preventive Maintenance Kit (Spare Parts Bill of Materials)</span>
                  </h4>
                  <span className="text-[11px] font-mono text-industrial-400">
                    {activePlanEvaluation.itemsWithStock.length} Required Items
                  </span>
                </div>

                <div className="space-y-2">
                  {activePlanEvaluation.itemsWithStock.map((item: any, itemIdx: number) => (
                    <div 
                      key={`pm-card-item-${item.id || item.partNumber || itemIdx}-${itemIdx}`}
                      className="p-3 rounded-xl bg-industrial-850 border border-industrial-750 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-white">
                            {item.partNumber}
                          </span>
                          {item.isCritical && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              CRITICAL
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-industrial-300 mt-0.5 line-clamp-1">
                          {item.description}
                        </p>
                        <span className="text-[10px] font-mono text-industrial-400">
                          Location: {item.location}
                        </span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-mono">
                            <span className="text-industrial-400">Required: </span>
                            <strong className="text-white">{item.requiredQuantity} {item.unit}</strong>
                          </div>
                          <div className="text-[11px] font-mono">
                            <span className="text-industrial-400">In Stock: </span>
                            <strong className={item.isSufficient ? 'text-emerald-400' : 'text-rose-400'}>
                              {item.currentStock} {item.unit}
                            </strong>
                          </div>
                        </div>

                        {item.matchedMaterial && onInspectMaterial && (
                          <button
                            onClick={() => onInspectMaterial(item.matchedMaterial)}
                            className="p-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-industrial-300 hover:text-white transition-colors"
                            title="Inspect Material in Inventory"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Maintenance Procedure Notes */}
              <div className="p-3.5 rounded-xl bg-industrial-850 border border-industrial-800 space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-industrial-400 font-bold block">
                  Standard Operating Procedure & Engineering Guide
                </span>
                <p className="text-xs text-industrial-300 leading-relaxed">
                  {selectedPlan.procedureNotes}
                </p>
              </div>

              {/* Safety & Isolation Checklist */}
              <div className="p-3.5 rounded-xl bg-industrial-850 border border-industrial-800 space-y-2">
                <span className="text-[10px] font-mono uppercase text-industrial-400 font-bold block">
                  Safety Protocol & Permitting Checklist
                </span>
                <div className="space-y-1.5">
                  {selectedPlan.safetyChecklist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-industrial-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-industrial-500 bg-industrial-900 border border-industrial-800 rounded-2xl">
              Select an equipment maintenance plan from the left list to view PM kit readiness.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
