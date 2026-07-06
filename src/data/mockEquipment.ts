/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Equipment } from '../types';

export const INITIAL_EQUIPMENT: Equipment[] = [
  {
    tagNumber: "EQ-PMP-101",
    name: "Centrifugal Water Pump 1A",
    manufacturer: "Karus Pumps Ltd.",
    model: "K-CENT-200-XP",
    plant: "Water Treatment Plant",
    area: "Pumping Station Alpha",
    unit: "Unit 3 / Filtration Loop",
    description: "Main high-capacity centrifugal pump utilized for continuous supply of circulating process water.",
    photoUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=300&q=80",
    installationDate: "2024-03-12",
    status: "operational",
    compatibleSpares: ["BRG-6204-2RSH", "LM2596S-5.0"]
  },
  {
    tagNumber: "EQ-VLV-502",
    name: "Rotary Valve Packager Controller",
    manufacturer: "Festo Automation",
    model: "VUVS-V20-M32",
    plant: "Packaging & Assembly",
    area: "Sorting bay B",
    unit: "Line 2 / Cartoning Division",
    description: "Multi-port high pressure pneumatic rotary distributor for automated parts handling operations.",
    photoUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=300&q=80",
    installationDate: "2025-01-05",
    status: "operational",
    compatibleSpares: ["VLV-SOL-3W2P-24V", "SEN-PROX-IND-M12"]
  },
  {
    tagNumber: "EQ-PLC-201",
    name: "Control Cabinet Logic PLC Panel",
    manufacturer: "Siemens AG",
    model: "S7-1200 / CPU 1214C",
    plant: "Power Distribution",
    area: "Substation 3 Control Room",
    unit: "Cabinet Row-D Panel 4",
    description: "Main logic automation controller node coordinating motor controls, emergency valves, and proximity arrays.",
    photoUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=80",
    installationDate: "2023-08-20",
    status: "operational",
    compatibleSpares: ["PLC-S71200-1214C", "STM32F407VGT6", "RES-10K-0603-1%", "CAP-CER-100NF-0603"]
  },
  {
    tagNumber: "EQ-CONV-305",
    name: "Raw Feed Assembly Belt Conveyor",
    manufacturer: "Dorner Conveyors",
    model: "D2200 Heavy Duty",
    plant: "Raw Materials Yard",
    area: "Bulk Intake Grates",
    unit: "Line 1 Receiving",
    description: "Industrial variable speed belt conveyor for continuous loading of structural profiles and metals.",
    photoUrl: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=300&q=80",
    installationDate: "2022-11-14",
    status: "maintenance",
    compatibleSpares: ["BRG-6204-2RSH", "ALU-FLAT-10x100-6061", "SCR-M4-16-HEX-8.8"]
  }
];
