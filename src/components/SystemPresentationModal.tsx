/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  LayoutDashboard, 
  Layers, 
  Camera, 
  GitBranch, 
  Zap, 
  Building2, 
  ClipboardCheck, 
  FileCheck2, 
  Cloud, 
  ShieldCheck, 
  Shield, 
  Printer, 
  Download, 
  Maximize2, 
  CheckCircle2,
  Cpu,
  Barcode,
  Search,
  Bot,
  Warehouse,
  Wrench,
  FileText
} from 'lucide-react';

interface SystemPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SlideItem {
  number: number;
  category: string;
  titleAr: string;
  titleEn: string;
  subtitle: string;
  icon: any;
  accentColor: string;
  pillars: {
    title: string;
    description: string;
    points: string[];
    tag: string;
  }[];
  systemImpact: string;
}

const PRESENTATION_SLIDES: SlideItem[] = [
  {
    number: 1,
    category: "نظرة عامة ورؤية المنظومة",
    titleAr: "منظومة EMIS v3.1 لإدارة وهندسة وفحص المخزون",
    titleEn: "Enterprise Material Inspection & Inventory System",
    subtitle: "منظومة هندسية صناعية متكاملة لإدارة المواد، التدقيق الفني، والمطابقة الرقمية بالذكاء الاصطناعي",
    icon: Cpu,
    accentColor: "from-blue-600 to-indigo-700",
    pillars: [
      {
        title: "التحول الرقمي الشامل للمخازن",
        description: "إلغاء الاعتماد على السجلات الورقية والملفات المنفصلة وتوحيد كافة العمليات في قاعدة بيانات موحدة.",
        points: ["سجل مركزي موحد لكافة الأصناف", "ربط هندسي بين المواد والمعدات التابعة لها", "إدارة دقيقة لمستويات الأمان وإعادة الطلب"],
        tag: "الرقمنة الكاملة"
      },
      {
        title: "المطابقة الفنية وفحص الجودة",
        description: "التحقق من مطابقة المواد للمواصفات القياسية والمخططات الهندسية قبل الاعتماد أو الصرف الميداني.",
        points: ["مطابقة شهادات الفحص (MTC/CoC)", "كشف المواد غير المطابقة ومحاصرتها", "توثيق هوية المصنعين الأصليين (OEM)"],
        tag: "الجودة والامتثال"
      },
      {
        title: "الذكاء الاصطناعي الميداني",
        description: "توظيف نماذج Gemini المتقدمة في فحص اللوحات المعدنية والترجمة الهندسية والتحليل التنبؤي.",
        points: ["استخراج المواصفات من الصور (OCR)", "ترجمة المواصفات المتخصصة فورياً", "مساعد هندسي ذكي للاستفسارات الفنية"],
        tag: "AI Powered"
      }
    ],
    systemImpact: "تقليل زمن استلام وتدقيق المواد بنسبة 70% ومنع تسرب القطع غير المطابقة إلى المنشآت الحيوية."
  },
  {
    number: 2,
    category: "مركز القيادة والتحكم",
    titleAr: "لوحة التحكم ومركز الإجراءات الميدانية",
    titleEn: "Command Center & Operational Action Hub",
    subtitle: "رؤية تشغيلية لحظية للمخزون مع توجيه الإشعارات والموافقات الحرجة فور حدوثها",
    icon: LayoutDashboard,
    accentColor: "from-sky-600 to-blue-700",
    pillars: [
      {
        title: "مؤشرات الأداء اللحظية (KPIs)",
        description: "شاشات بيانية حية تعرض إجمالي الأصناف، القيمة التقديرية، ومعدلات استهلاك المخزون.",
        points: ["مراقبة رصيد كل مستودع على حدة", "رصد مباشر لنسبة دقة الجرد الفعلي", "تنبيهات فورية للمواد التي وصلت حد الطلب"],
        tag: "Live Analytics"
      },
      {
        title: "مركز الإجراءات والتنبيهات العاجلة",
        description: "محطة عمل موحدة تجمع كل المهام المعلقة التي تتطلب قراراً أو تدخلاً من المهندسين أو المشرفين.",
        points: ["تنبيهات انخفاض الرصيد الحرج (Stock-Out)", "إشعارات قرب انتهاء الصلاحية للمواد الحساسة", "أوامر الشراء والاستلام في انتظار الفحص"],
        tag: "Action Hub"
      },
      {
        title: "التنقل التفاعلي السريع (Navigation Hub)",
        description: "قائمة أدوات حديثة بتصميم زجاجي انسيابي ومصنفة لونياً للوصول لأي وظيفة خلال ثانية واحدة.",
        points: ["تصنيف حسب القطاعات (المواد، العمليات، الجودة)", "بحث فوري في كافة أقسام التطبيق", "تخصيص العرض حسب دور وصلاحية المستخدم"],
        tag: "Quick Access"
      }
    ],
    systemImpact: "القضاء على مفاجآت نقص المخزون وضمان عدم تراكم المهام المعلقة بين الفرق الهندسية والمستودعية."
  },
  {
    number: 3,
    category: "إدارة المخزون والمواد",
    titleAr: "السجل الهندسي الشامل للمواد والمخزون",
    titleEn: "Master Materials Ledger & Catalog",
    subtitle: "قاعدة بيانات هندسية دقيقة تضم كافة الخصائص الفنية، المواقع التخزينية، وحالة التوثيق لكل قطعة",
    icon: Layers,
    accentColor: "from-emerald-600 to-teal-700",
    pillars: [
      {
        title: "بطاقة المادة الذكية (360° Profile)",
        description: "ملف تقني شامل لكل صنف يشمل رقم القطعة، الصانع، الموديل، القياس، والضغط والمواصفات.",
        points: ["تخزين الأرقام التسلسلية المتعددة لكل دفعة", "الموقع التخزيني الدقيق (المستودع، الرف، الخانة)", "تحديد نوع المعدن والمعالجة السطحية (SS 316, Inconel...)"],
        tag: "Technical Card"
      },
      {
        title: "التسلسل الرقمي المنظم والتحقق الذكي",
        description: "نظام ترقيم تسلسلي ذكي يمنع تكرار المواد ويضمن سهولة الفهرسة والبحث السريع.",
        points: ["توليد تسلسل تلقائي فريد لكل صنف", "فحص منع التكرار (Duplicate Detection)", "دعم الأرقام المؤقتة للمواد قيد التسجيل"],
        tag: "Unique ID"
      },
      {
        title: "محددات الأمان وإعادة الطلب",
        description: "إعدادات حد أدنى وحد أقصى ديناميكية لكل صنف لضمان استمرارية التشغيل دون تكدس رأس المال.",
        points: ["حساب نقطة إعادة الطلب التلقائية (Reorder Point)", "تحديد الكمية الاقتصادية للطلب (EOQ)", "ربط الصنف بالموردين المعتمدين وسجل الأسعار"],
        tag: "Stock Control"
      }
    ],
    systemImpact: "إدارة أكثر من 30 حقلاً بيانياً لكل قطعة مع توفير بيئة خالية من التكرار والازدواجية."
  },
  {
    number: 4,
    category: "المسح الضوئي والرؤية الحاسوبية",
    titleAr: "ماسح الباركود ولوحات المواد الذكي (OCR + Barcode)",
    titleEn: "Intelligent Nameplate & Multi-Pass Scanner",
    subtitle: "محرك مسح هجين يجمع بين قراءة الباركود التقليدي وقراءة اللوحات المعدنية بالذكاء الاصطناعي",
    icon: Camera,
    accentColor: "from-cyan-600 to-blue-700",
    pillars: [
      {
        title: "فك تشفير الرموز متعدد الصيغ (Multi-Format)",
        description: "دعم كافة أنواع الباركود الصناعي ورموز الاستجابة السريعة وكبسولات البيانات المصفوفية.",
        points: ["الباركود الخطي (Code 128, Code 39, EAN)", "الرموز ثنائية الأبعاد (QR Code, Data Matrix)", "فك تشفير روابط جواز السفر الرقمي للمواد"],
        tag: "Instant Decode"
      },
      {
        title: "معالجة وتحسين الصور الميدانية",
        description: "حزمة أدوات بصرية مدمجة لتحسين جودة الصور الميدانية الملتقطة في بيئات العمل الصعبة.",
        points: ["تدوير الصورة متعدد الزوايا (90°، 180°، 270°)", "تعزيز التباين وإزالة الظلال والانعكاسات", "عكس ألوان اللوحات المعدنية الداكنة (Inversion)"],
        tag: "Image Optimizer"
      },
      {
        title: "القراءة العميقة للوحات المحفورة (Gemini Vision)",
        description: "استخراج الأرقام المحفورة والمطبوعة على لوحات المحركات والصمامات والمحولات تلقائياً.",
        points: ["استخراج رقم القطعة، الموديل، والرقم التسلسلي", "تحديد الصانع ومواصفات الجهد والضغط والحرارة", "مطابقة فورية لمنع إدخال مواد خاطئة"],
        tag: "Gemini OCR"
      }
    ],
    systemImpact: "التعرف على القطع الميدانية خلال ثوانٍ معدودة دون الحاجة للبحث اليدوي في آلاف الملفات."
  },
  {
    number: 5,
    category: "سلسلة الحيازة والمسار الزمني",
    titleAr: "تتبع مسار المواد والدفعات (Material Traceability)",
    titleEn: "Lifecycle Traceability & Chain of Custody",
    subtitle: "سجل تدقيق زمني غير قابل للتعديل يوثق كل حركة، فحص، أو صرف حدث على المادة منذ وصولها",
    icon: GitBranch,
    accentColor: "from-teal-600 to-emerald-700",
    pillars: [
      {
        title: "المخطط الزمني الشامل (Timeline Trail)",
        description: "عرض تسلسلي رسومي يوضح تاريخ استلام القطعة، جهة الشراء، الفحص الهندسي، وآخر تعديل.",
        points: ["توثيق هوية المستخدم الذي أجرى كل حركة", "سجل التعديلات الفنية السابقة مع القيم القديمة والجديدة", "ربط الحركة برقم أمر العمل أو إذن الصرف"],
        tag: "Audit Trail"
      },
      {
        title: "إدارة الدفعات وتواريخ الإنتاج (Batches)",
        description: "تتبع دقيق لدفعات التوريد المختلفة للصنف الواحد ومراقبة أرقام الشحنات والموردين.",
        points: ["تتبع شهادات اختبار الصانع (MTC) لكل دفعة", "فصل الدفعات المعتمدة عن الدفعات تحت الاختبار", "مراقبة تاريخ انتهاء شهادات المعايرة والفحص"],
        tag: "Batch Control"
      },
      {
        title: "سلسلة الحيازة والاستخدام الميداني",
        description: "معرفة المعدة أو الوحدة الإنتاجية التي تم تركيب القطعة عليها وتاريخ التركيب.",
        points: ["ربط الصنف بتاج المعدة (Equipment Tag)", "تاريخ الصرف واسم الفني أو المهندس المستلم", "إمكانية الاسترجاع أو الإرجاع إلى المستودع"],
        tag: "Installed Asset"
      }
    ],
    systemImpact: "الامتثال الكامل لمتطلبات التدقيق الدولي (ISO 9001 / API) وتوفير شفافية مطلقة لسلسلة الإمداد."
  },
  {
    number: 6,
    category: "الذكاء الاصطناعي والاستخبارات الفنية",
    titleAr: "استخبارات المواد الفنية والمساعد الذكي (AI Co-Pilot)",
    titleEn: "Multilingual Material Intelligence & AI Co-Pilot",
    subtitle: "قدرات ذكاء اصطناعي متخصصة لتحليل وتصنيف المواد الهندسية ومساعدة المهندسين لحظياً",
    icon: Zap,
    accentColor: "from-purple-600 to-indigo-700",
    pillars: [
      {
        title: "الترجمة الهندسية الذكية (Port 9)",
        description: "ترجمة دقيقة لمصطلحات الأجهزة والمعدات والصمامات بين الإنجليزية والعربية دون تشويه المعنى.",
        points: ["قاموس هندسي صناعي مدمج لمعايير النفط والغاز", "توضيح الاستخدام العملي لكل قطعة باللغة العربية", "تحويل الرموز التراكمية إلى مواصفات واضحة للمستودع"],
        tag: "Port 9 Translation"
      },
      {
        title: "المساعد الهندسي التفاعلي (AI Co-Pilot)",
        description: "مساعد دردشة هندسي يجيب عن استفسارات المهندسين بناءً على محتويات المخزون الفعلية.",
        points: ["البحث عن البدائل الهندسية المتوفرة في المخزن", "التحقق من توافق القطعة مع ظروف التشغيل (ضغط/حرارة)", "توليد توصيات إعادة الطلب والصيانة الوقائية"],
        tag: "Interactive Bot"
      },
      {
        title: "الاستخبارات السوقية وتحليل الأسعار",
        description: "مقارنة الأسعار التاريخية والمؤشرات التنبؤية لتكاليف القطع وسلاسل التوريد العالمية.",
        points: ["تحليل الفروقات السعرية بين أوامر الشراء المختلفة", "التنبؤ بمهل التوريد (Lead Times)", "اقتراح استراتيجيات التخزين الاقتصادية"],
        tag: "Market Intel"
      }
    ],
    systemImpact: "تمكين موظفي المخازن غير المتخصصين من فهم المواصفات الهندسية المعقدة والتعامل معها باحترافية."
  },
  {
    number: 7,
    category: "العمليات التشغيلية والمستودعية",
    titleAr: "العمليات المؤسسية وإدارة أذونات المخازن (Enterprise Ops)",
    titleEn: "Enterprise Operations & Goods Movement",
    subtitle: "إدارة دورة حركة المواد الكاملة: أذونات الاستلام، الصرف، التحويل، والحجر الفني",
    icon: Building2,
    accentColor: "from-amber-600 to-orange-700",
    pillars: [
      {
        title: "أذونات الاستلام والصرف والتحويل",
        description: "سير عمل رقمي منظم لإدخال المواد الجديدة أو صرفها للمشاريع أو نقلها بين المستودعات.",
        points: ["إذن استلام بضاعة رسمي (Goods Receipt Voucher)", "إذن صرف مواد معتمد برقم أمر العمل (Material Issuance)", "أوامر التحويل التخزيني الداخلي بين الفروع والرفوف"],
        tag: "Voucher Workflow"
      },
      {
        title: "إدارة طلبات المواد والشراء (MR / PO / WO)",
        description: "ربط وثيق بين طلبات المهندسين، أوامر الشراء، وفحص الاستلام للتأكد من مطابقة الشحنات.",
        points: ["تتبع حالة طلب المادة من الشراء حتى التخزين", "مطابقة الكميات المستلمة مع الكميات المطلوبة", "رصد التوريد الجزئي والمتبقيات"],
        tag: "Procurement Sync"
      },
      {
        title: "الحجر الفني والمواد المحظورة (Quarantine & Blacklist)",
        description: "عزل فوري للمواد المرفوضة أو المشبوهة لمنع تداولها أو استخدامها بطريق الخطأ.",
        points: ["سجل القائمة السوداء للمصنعين والمواد غير المطابقة", "أسباب الحجر الفني وتقارير عدم المطابقة المرفقة", "إجراءات الإرجاع للمورد أو التخريد المعتمد"],
        tag: "Quarantine Safe"
      }
    ],
    systemImpact: "إحكام الرقابة على حركة المخزون بنسبة 100% ومنع الفقد أو الصرف غير المصرح به."
  },
  {
    number: 8,
    category: "الرقابة الميدانية والتدقيق",
    titleAr: "الجرد الدوري، استوديو الملصقات، وإدارة الصلاحية",
    titleEn: "Field Counting, Label Studio & Shelf-Life",
    subtitle: "أدوات ميدانية متقدمة لتسهيل أعمال الجرد الفعلي، طباعة الباركود، ومراقبة تقادم المواد",
    icon: ClipboardCheck,
    accentColor: "from-lime-600 to-emerald-700",
    pillars: [
      {
        title: "الجرد الدوري والتدقيق الميداني (Cycle Count)",
        description: "إجراء جرد مستمر وسريع للرفوف ومقارنة الأرصدة الفعلية مع السجلات تلقائياً.",
        points: ["حساب الفروقات المخزنية الفورية (Variances)", "تسوية الفروقات مع توثيق أسباب العجز أو الزيادة", "تقارير تدقيق معتمدة للجان الجرد السنوية"],
        tag: "Cycle Audit"
      },
      {
        title: "استوديو طباعة ملصقات الباركود والرفوف (Barcode Studio)",
        description: "مصمم ومولد ملصقات صناعية حرارية بجودة طباعة عالية (DPI) مخصصة للبيئات القاسية.",
        points: ["طباعة ملصقات الرفوف والعلب بمقاسات معيارية متعددة", "تضمين كود المادة، الوصف، والباركود القابل للمسح", "دعم طابعات الباركود الحرارية (Zebra / TSC)"],
        tag: "Thermal Labels"
      },
      {
        title: "إدارة الصلاحية والمخزون الراكد (Shelf-Life & Aging)",
        description: "مراقبة المواد الحساسة للتقادم مثل موانع التسرب (O-Rings) والكيماويات والزيوت.",
        points: ["تنبيهات مسبقة قبل انتهاء فترة الصلاحية المخزنية", "تحليل المواد بطيئة الحركة والراكدة (Dead Stock)", "توصيات بإعادة تدوير أو تسييل المخزون الراكد"],
        tag: "Aging Monitor"
      }
    ],
    systemImpact: "رفع دقة الجرد الفعلي إلى أكثر من 98% وتفادي خسائر تلف المواد منتهية الصلاحية."
  },
  {
    number: 9,
    category: "الحوكمة والاعتماد الرقمي",
    titleAr: "دورة الموافقات الإلكترونية والقرارات الهندسية",
    titleEn: "Workflow Approvals & Engineering Decisions",
    subtitle: "مسارات اعتماد متعددة المستويات تضمن توثيق القرارات الفنية وتوقيعها رقمياً",
    icon: FileCheck2,
    accentColor: "from-blue-600 to-indigo-700",
    pillars: [
      {
        title: "دورة الموافقات الرقمية (Workflow Approvals)",
        description: "إرسال طلبات الصرف، الاستلام، أو التعديل للمسؤولين لاعتمادها بلمسة واحدة.",
        points: ["مسارات اعتماد متدرجة (مهندس -> مشرف -> مدير)", "إشعار فوري عند صدور الموافقة أو الرفض", "إمكانية إرفاق مبررات القرار والملاحظات الفنية"],
        tag: "Sign-off Chains"
      },
      {
        title: "سجل القرارات الفنية المعتمدة (Decisions Log)",
        description: "أرشيف مركزي للقرارات الهندسية المتخذة بشأن قبول المواد أو التجاوز عن انحرافات طفيفة.",
        points: ["توثيق مبررات القبول المشروط (Concession)", "حفظ مراجع المواصفات والمراسلات ذات الصلة", "منع تكرار النقاشات الفنية السابقة عبر استرجاع السوابق"],
        tag: "Decisions Log"
      },
      {
        title: "الهوية المؤسسية وترويسة الوثائق (Branding)",
        description: "تخصيص كامل لشعار المؤسسة، الاسم الرسمي، وترويسة كافة التقارير والشهادات المصدرة.",
        points: ["ترويسة رسمية على جميع مستندات الـ PDF", "تذييل معتمد مع التوقيعات الرقمية المعتمدة", "مظهر احترافي أمام العملاء والجهات الرقابية"],
        tag: "Official Branding"
      }
    ],
    systemImpact: "تسريع وتيرة اتخاذ القرارات من أيام إلى دقائق مع حفظ المسؤولية والمساءلة الإدارية."
  },
  {
    number: 10,
    category: "الوثائق والتكامل السحابي",
    titleAr: "مركز الوثائق، استيراد إكسل، والتكامل السحابي",
    titleEn: "Document Vault, Excel Ingestion & Cloud Sync",
    subtitle: "أرشفة المستندات والكتالوجات مع إمكانية استيراد وتصدير آلاف المواد ومزامنتها سحابياً",
    icon: Cloud,
    accentColor: "from-sky-600 to-cyan-700",
    pillars: [
      {
        title: "خزينة الوثائق والمستندات (PDF / Datasheets)",
        description: "ربط شهادات الاختبار وكتالوجات المصنعين مباشرة مع بطاقة كل مادة في المخزن.",
        points: ["تخزين كتالوجات المصنعين (Vendor Datasheets)", "شهادات المعايرة والفحص الصادرة من المختبرات", "استعراض المستندات فورياً بضغطة زر دون مغادرة التطبيق"],
        tag: "Document Vault"
      },
      {
        title: "مركز استيراد ملفات إكسل الذكي (Excel Ingestion)",
        description: "رفع وتحديث آلاف الأصناف دفعة واحدة من ملفات Excel و CSV مع التحقق التلقائي من البيانات.",
        points: ["مطابقة أعمدة الجدول تلقائياً بذكاء", "كشف الأخطاء الإملائية والبيانات الناقصة قبل الحفظ", "تحديث الأرصدة والأسعار دفعة واحدة بثوانٍ معدودة"],
        tag: "Bulk Ingestion"
      },
      {
        title: "المزامنة السحابية مع Google Drive",
        description: "تكامل سلس وآمن مع خدمة التخزين السحابي لأرشفة تقارير وشهادات المنظومة تلقائياً.",
        points: ["نسخ احتياطي فوري للمستندات والوثائق", "مشاركة الملفات المعتمدة مع فرق العمل الميدانية", "حماية البيانات ضد التلف أو الفقدان المحلي"],
        tag: "Drive Cloud Sync"
      }
    ],
    systemImpact: "القدرة على إدخال وتحديث أرصدة أكثر من 10,000 صنف خلال دقائق معدودة بأمان تام."
  },
  {
    number: 11,
    category: "الجودة والشهادات الهندسية",
    titleAr: "إدارة تقارير عدم المطابقة (NCR) وجواز السفر الرقمي",
    titleEn: "Non-Conformance Reporting & Material Passport",
    subtitle: "منظومة رقابة صارمة على الجودة تشمل تقارير العيوب وجواز السفر الرقمي المشفر للمواد",
    icon: ShieldCheck,
    accentColor: "from-teal-600 to-indigo-700",
    pillars: [
      {
        title: "تقارير عدم المطابقة الفنية (NCR)",
        description: "توثيق رسمي للانحرافات والمخالفات الفنية المكتشفة أثناء استلام المواد أو فحصها.",
        points: ["تسجيل نوع الانحراف (أبعاد، مادة، شهادات، تلف شحن)", "تحديد الإجراءات التصحيحية والوقائية (CAPA)", "متابعة إغلاق التقرير بعد موافقة مهندس الجودة"],
        tag: "NCR System"
      },
      {
        title: "جواز السفر الرقمي للمادة (Digital Passport)",
        description: "هوية رقمية فريدة ومشفرة لكل قطعة تحتوي على تاريخ تصنيعها، فحصها، وموقع تركيبها.",
        points: ["رمز QR مشفر مطبوع على القطعة للتحقق الفوري", "إثبات أصالة القطعة وعدم تزويرها (Anti-Counterfeit)", "استعراض شهادة الصانع الموثقة من أي جهاز ذكي"],
        tag: "Material Passport"
      },
      {
        title: "منشئ شهادات الفحص الهندسي (Certificate Builder)",
        description: "أداة لتوليد وطباعة شهادات الفحص والمطابقة (CoC / Inspection Certificates) بنقرة زر.",
        points: ["تضمين نتائج الاختبارات الميكانيكية والكهربائية", "توقيع المفتش الهندسي واعتماد مدير الجودة", "تصدير بصيغة PDF قابلة للطباعة والأرشفة"],
        tag: "Cert Builder"
      }
    ],
    systemImpact: "إغلاق دائرة الجودة وضمان عدم استخدام أي قطعة غير معتمدة أو مشكوك في أصلها ومواصفاتها."
  },
  {
    number: 12,
    category: "البنية التحتية والأمان والموثوقية",
    titleAr: "الأمان، إدارة الصلاحيات (RBAC)، والعمل بدون إنترنت (PWA)",
    titleEn: "System Architecture, Security & Offline PWA",
    subtitle: "بنية برمجية فائقة الاستقرار تعمل على كافة الأجهزة مع حماية البيانات والنسخ الاحتياطي",
    icon: Shield,
    accentColor: "from-rose-600 to-red-700",
    pillars: [
      {
        title: "إدارة الصلاحيات الدقيقة (RBAC)",
        description: "تحديد ما يمكن لكل مستخدم رؤيته أو تعديله بناءً على دوره الوظيفي في المنظومة.",
        points: ["أدوار مخصصة: مدير، مشرف، مهندس جودة، أمين مستودع، قارئ فقط", "حماية العمليات الحساسة (الحذف، الاعتماد، التعديل)", "سجل أمني لتسجيل الدخول والأنشطة الإدارية"],
        tag: "Role-Based Access"
      },
      {
        title: "العمل بدون اتصال بالإنترنت (Offline PWA)",
        description: "تثبيت المنظومة كتطبيق مستقل على أجهزة أندرويد والكمبيوتر مع إمكانية العمل في المواقع النائية.",
        points: ["تخزين محلي ذكي لكافة البيانات على الجهاز", "مزامنة تلقائية بمجرد عودة الاتصال بالإنترنت", "عدم توقف أعمال الجرد والفحص في الصحراء أو الحقول"],
        tag: "Full Offline PWA"
      },
      {
        title: "الأمان وسلة المحذوفات والنسخ الاحتياطي",
        description: "حماية مطلقة من الحذف الخاطئ أو فقدان السجلات مع أدوات استرجاع فورية.",
        points: ["سلة محذوفات آمنة تتيح استعادة أي صنف تم حذفه بالخطأ", "تصدير نسخ احتياطية مشفرة بضغطة زر واحدة", "توافق تام مع معايير أمن المعلومات والحفاظ على الخصوصية"],
        tag: "Data Vault"
      }
    ],
    systemImpact: "استمرارية أعمال بنسبة 99.9% وتشغيل ميداني مستقل دون الحاجة لاتصال دائم بالشبكة."
  }
];

export default function SystemPresentationModal({ isOpen, onClose }: SystemPresentationModalProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  if (!isOpen) return null;

  const currentSlide = PRESENTATION_SLIDES[currentSlideIndex];
  const totalSlides = PRESENTATION_SLIDES.length;
  const SlideIcon = currentSlide.icon;

  const handleNext = () => {
    if (currentSlideIndex < totalSlides - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-industrial-950/80 backdrop-blur-md overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-5xl h-[92vh] max-h-[820px] bg-industrial-900 border border-industrial-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white select-none"
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-industrial-800 bg-industrial-950/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-gradient-to-tr ${currentSlide.accentColor} shadow-md`}>
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base tracking-tight">العرض التقديمي لخواص منظومة EMIS v3.1</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  Slide {currentSlideIndex + 1} / {totalSlides}
                </span>
              </div>
              <p className="text-[11px] text-industrial-400 font-sans">
                دليل المواصفات والأدوات والقدرات التشغيلية الشاملة للبرنامج
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-industrial-800 hover:bg-industrial-750 border border-industrial-700 text-industrial-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="طباعة / تصدير العرض"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">طباعة / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-industrial-800 hover:bg-industrial-750 border border-industrial-700 text-industrial-400 hover:text-white transition-all cursor-pointer"
              title="إغلاق العرض"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Slide Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 flex flex-col justify-between space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide.number}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 flex-1 flex flex-col"
            >
              {/* Slide Header */}
              <div className="space-y-2 border-b border-industrial-800 pb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-gradient-to-r ${currentSlide.accentColor} text-white shadow-sm`}>
                    الشريحة #{currentSlide.number} • {currentSlide.category}
                  </span>
                  <span className="text-xs text-industrial-400 font-mono">
                    {currentSlide.titleEn}
                  </span>
                </div>

                <div className="flex items-start gap-3 mt-1">
                  <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${currentSlide.accentColor} text-white shrink-0 mt-1 shadow-lg`}>
                    <SlideIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {currentSlide.titleAr}
                    </h2>
                    <p className="text-xs sm:text-sm text-industrial-300 font-medium mt-1 leading-relaxed">
                      {currentSlide.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Pillars / Key Capabilities */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 flex-1">
                {currentSlide.pillars.map((pillar, idx) => (
                  <div 
                    key={idx}
                    className="p-4 sm:p-5 rounded-2xl bg-industrial-850/80 border border-industrial-750/70 hover:border-industrial-600 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-industrial-800 text-brand-300 border border-industrial-700">
                          {pillar.tag}
                        </span>
                        <span className="text-xs font-mono font-bold text-industrial-500">
                          0{idx + 1}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white leading-snug">
                        {pillar.title}
                      </h3>
                      <p className="text-xs text-industrial-300 leading-relaxed font-sans">
                        {pillar.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-industrial-800/80 space-y-1.5">
                      {pillar.points.map((pt, pIdx) => (
                        <div key={pIdx} className="flex items-start gap-1.5 text-[11px] text-industrial-200">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-tight">{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Operational Impact Highlight */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-industrial-950 via-industrial-850 to-industrial-950 border border-brand-500/30 flex items-center gap-3 shrink-0">
                <div className="p-2 rounded-xl bg-brand-500/20 text-brand-400 shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-300 block font-mono">
                    الأثر التشغيلي على بيئة العمل / Operational Impact:
                  </span>
                  <p className="text-xs font-semibold text-industrial-100 truncate sm:whitespace-normal">
                    {currentSlide.systemImpact}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Slide Navigation Bar */}
        <div className="px-5 py-3 border-t border-industrial-800 bg-industrial-950/80 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentSlideIndex === 0}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentSlideIndex === 0
                ? 'opacity-40 cursor-not-allowed bg-industrial-850 text-industrial-500 border border-industrial-800'
                : 'bg-industrial-800 hover:bg-industrial-750 text-white border border-industrial-700 active:scale-95'
            }`}
          >
            <ChevronRight className="h-4 w-4" />
            <span>الشريحة السابقة</span>
          </button>

          {/* Quick Slide Dots / Progress */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-[50%] no-scrollbar px-2">
            {PRESENTATION_SLIDES.map((s, idx) => (
              <button
                key={s.number}
                type="button"
                onClick={() => setCurrentSlideIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentSlideIndex === idx 
                    ? 'w-7 bg-brand-500 shadow-sm shadow-brand-500/50' 
                    : 'w-2 bg-industrial-700 hover:bg-industrial-600'
                }`}
                title={`الانتقال إلى شريحة ${s.number}: ${s.titleAr}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentSlideIndex === totalSlides - 1}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentSlideIndex === totalSlides - 1
                ? 'opacity-40 cursor-not-allowed bg-industrial-850 text-industrial-500 border border-industrial-800'
                : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-md shadow-brand-600/30 active:scale-95'
            }`}
          >
            <span>الشريحة التالية</span>
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
