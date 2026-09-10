/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TechnicalAbbreviation, ManufacturerIntelligence } from '../types';

export interface IndustrialDictionaryEntry {
  englishTerm: string;
  arabicTerm: string;
  technicalMeaningArabic: string;
  technicalMeaningEnglish: string;
  category: string;
  keywords: string[];
}

export const INDUSTRIAL_ABBREVIATIONS: TechnicalAbbreviation[] = [
  {
    code: 'PT',
    englishName: 'Pressure Transmitter',
    arabicName: 'مرسل ضغط',
    category: 'INSTRUMENTATION',
    descriptionEnglish: 'Process instrument measuring gauge, absolute, or differential pressure and converting it to 4-20mA / HART / Foundation Fieldbus electrical signals for DCS / PLC systems.',
    descriptionArabic: 'جهاز حقلي يستخدم لقياس الضغط (النسبي، المطلق، أو التفاضلي) للعملية وتحويله إلى إشارة كهربائية قياسية (4-20 مللي أمبير / هارت) لنظام التحكم والمراقبة.'
  },
  {
    code: 'PIT',
    englishName: 'Pressure Indicating Transmitter',
    arabicName: 'مرسل ومبين ضغط',
    category: 'INSTRUMENTATION',
    descriptionEnglish: 'Pressure transmitter equipped with an integral local LCD indicator showing live process pressure at the field tapping point.',
    descriptionArabic: 'مرسل ضغط مزود بشاشة عرض محلية مدمجة لإظهار قراءة الضغط الفعلي مباشرة في الموقع بجانب نقطة القياس.'
  },
  {
    code: 'TT',
    englishName: 'Temperature Transmitter',
    arabicName: 'مرسل حرارة',
    category: 'INSTRUMENTATION',
    descriptionEnglish: 'Instrument converting RTD (Pt100) or Thermocouple (Type K/J) micro-volt/resistance signals into calibrated industrial output.',
    descriptionArabic: 'جهاز يقيس درجات الحرارة بواسطة حساسات المقاومة (Pt100) أو المزدوجات الحرارية ويحولها لإشارة تحكم معيارية.'
  },
  {
    code: 'TIT',
    englishName: 'Temperature Indicating Transmitter',
    arabicName: 'مرسل ومبين حرارة',
    category: 'INSTRUMENTATION',
    descriptionEnglish: 'Temperature transmitter with local display showing process temperature.',
    descriptionArabic: 'مرسل حرارة مزود بشاشة قراءة محلية في موقع التركيب.'
  },
  {
    code: 'FT',
    englishName: 'Flow Transmitter',
    arabicName: 'مرسل تدفق',
    category: 'INSTRUMENTATION',
    descriptionEnglish: 'Flow rate transmitter utilizing Coriolis, Magnetic, Vortex, Ultrasonic, or Differential Pressure principles.',
    descriptionArabic: 'مرسل تدفق يقيس معدل سريان السوائل أو الغازات (كوريوليس، كهرومغناطيسي، دوامي، أو بالموجات فوق الصوتية).'
  },
  {
    code: 'FIT',
    englishName: 'Flow Indicating Transmitter',
    arabicName: 'مرسل ومبين تدفق',
    category: 'INSTRUMENTATION',
    descriptionEnglish: 'Flow transmitter with direct totalizer and instantaneous volumetric/mass rate readout.',
    descriptionArabic: 'مرسل تدفق مزود بشاشة عرض لمعدل الجريان اللحظي والكمية التراكمية الكلية.'
  },
  {
    code: 'LT',
    englishName: 'Level Transmitter',
    arabicName: 'مرسل مستوى',
    category: 'INSTRUMENTATION',
    descriptionEnglish: 'Process level instrument utilizing Guided Wave Radar (GWR), Free-space Radar, Hydrostatic pressure, or Ultrasonic wave reflection.',
    descriptionArabic: 'جهاز قياس مستوى السوائل أو الحبيبات في الخزانات والأوعية باستخدام الرادار الموجه، الضغط الهيدروستاتيكي، أو الموجات الصوتية.'
  },
  {
    code: 'LIT',
    englishName: 'Level Indicating Transmitter',
    arabicName: 'مرسل ومبين مستوى',
    category: 'INSTRUMENTATION',
    descriptionEnglish: 'Level transmitter with onboard digital indicator percentage and millimeter/meter scale readout.',
    descriptionArabic: 'مرسل مستوى مجهز بشاشة رقمية تعرض نسبة الامتلاء والارتفاع بالميليمتر أو المتر.'
  },
  {
    code: 'PSV',
    englishName: 'Pressure Safety Valve',
    arabicName: 'صمام أمان الضغط',
    category: 'VALVES',
    descriptionEnglish: 'Automatic spring-loaded overpressure relief valve protecting piping and pressure vessels from catastrophic over-pressurization.',
    descriptionArabic: 'صمام أمان ميكانيكي بنابض يفتح تلقائياً لتصريف الضغط الزائد وحماية خطوط الأنابيب والأوعية المضغوطة من الانفجار.'
  },
  {
    code: 'PRV',
    englishName: 'Pressure Reducing Valve',
    arabicName: 'صمام تخفيض الضغط',
    category: 'VALVES',
    descriptionEnglish: 'Self-operating or pilot-operated regulatory valve maintaining a steady downstream pressure regardless of upstream fluctuations.',
    descriptionArabic: 'صمام منظم ذاتي أو تجريبي يخفض ضغط الدخول العالي ويحافظ على ضغط خروج ثابت ومستقر.'
  },
  {
    code: 'MOV',
    englishName: 'Motor Operated Valve',
    arabicName: 'صمام بمحرك كهربائي',
    category: 'VALVES',
    descriptionEnglish: 'Quarter-turn or multi-turn valve actuated by an electric multi-phase motor for remote open/close isolation or throttling.',
    descriptionArabic: 'صمام عزل أو تحكم يُدار بمحرك كهربائي مدمج للتشغيل والتحكم عن بُعد من غرف التحكم.'
  },
  {
    code: 'AOV',
    englishName: 'Air Operated Valve',
    arabicName: 'صمام يعمل بالهواء المضغوط',
    category: 'VALVES',
    descriptionEnglish: 'Pneumatically actuated control or shut-off valve operated via instrument air supply and solenoid/positioner.',
    descriptionArabic: 'صمام تحكم أو قطع يعمل بضغط هواء الأجهزة الدقيقة عبر مشغل نيوماتيكي ومحدد موضع.'
  },
  {
    code: 'ESDV',
    englishName: 'Emergency Shutdown Valve',
    arabicName: 'صمام إيقاف الطوارئ',
    category: 'SAFETY',
    descriptionEnglish: 'Fail-safe high-integrity isolation valve that isolates hydrocarbon or toxic process streams immediately upon trip signal.',
    descriptionArabic: 'صمام عزل فائق الموثوقية وذاتي الأمان يغلق أو يفتح تلقائياً لعزل خطوط الغاز والنفط عند حدوث طارئ.'
  },
  {
    code: 'DCS',
    englishName: 'Distributed Control System',
    arabicName: 'نظام التحكم الموزع',
    category: 'AUTOMATION',
    descriptionEnglish: 'Multi-tiered computerized plant automation architecture distributing control processors across plant areas with central operator consoles.',
    descriptionArabic: 'نظام تحكم حاسوبي متكامل وموزع لإدارة ومراقبة كامل العمليات الإنتاجية بالمصانع والمصافي.'
  },
  {
    code: 'PLC',
    englishName: 'Programmable Logic Controller',
    arabicName: 'وحدة التحكم المنطقية القابلة للبرمجة',
    category: 'AUTOMATION',
    descriptionEnglish: 'Industrial hardened digital computer for discrete and continuous machine logic, interlocks, and sequence operations.',
    descriptionArabic: 'حاسب صناعي رقمي متين مبرمج لتنفيذ منطق التحكم، القفل البيني التتابعي، وحماية المعدات.'
  },
  {
    code: 'PAGA',
    englishName: 'Public Address and General Alarm',
    arabicName: 'نظام النداء العام والإنذار الصوتي',
    category: 'SAFETY',
    descriptionEnglish: 'Plant-wide critical life safety broadcast and acoustic evacuation alarm network with acoustic beacon flashers.',
    descriptionArabic: 'شبكة إنذار صوتي ونداء عام حرجة لإخلاء الأفراد وبث تنبيهات الطوارئ في جميع أرجاء المنشأة.'
  },
  {
    code: 'F&G',
    englishName: 'Fire and Gas System',
    arabicName: 'نظام كشف الحريق والغاز',
    category: 'SAFETY',
    descriptionEnglish: 'Dedicated safety instrumented system monitoring optical flame, toxic H2S/CO, and combustible hydrocarbon gas detectors.',
    descriptionArabic: 'نظام أمان مخصص لمراقبة كواشف اللهب البصرية وكواشف الغازات السامة (H2S) والقابلة للاشتعال.'
  },
  {
    code: 'ESD',
    englishName: 'Emergency Shutdown System',
    arabicName: 'نظام إيقاف الطوارئ',
    category: 'SAFETY',
    descriptionEnglish: 'High-integrity Safety Instrumented System (SIS, SIL-2/SIL-3) configured to bring the plant safely to a shutdown state.',
    descriptionArabic: 'نظام أدوات السلامة المعتمد ذو الموثوقية العالية لنقل المنشأة الصناعية إلى وضع آمن فور حدوث خطر.'
  },
  {
    code: 'MTR',
    englishName: 'Mill Test Report',
    arabicName: 'تقرير اختبار المواد من المصنع',
    category: 'DOCUMENTATION',
    descriptionEnglish: 'Certified quality document detailing chemical composition, tensile strength, yield strength, heat number, and metallurgical test results per EN 10204 3.1 / 3.2.',
    descriptionArabic: 'وثيقة جودة معتمدة صادرة من مصنع الصلب توضح التركيب الكيميائي، الخواص الميكانيكية، رقم الصهر، وشهادات الفحص.'
  },
  {
    code: 'CoC',
    englishName: 'Certificate of Conformity',
    arabicName: 'شهادة المطابقة',
    category: 'DOCUMENTATION',
    descriptionEnglish: 'Official manufacturer certificate affirming that the supplied product meets all applicable project engineering specifications, codes, and standards.',
    descriptionArabic: 'شهادة رسمية من المصنع تؤكد مطابقة المادة الموردة لجميع المواصفات الهندسية والمعايير الفنية للمشروع.'
  },
  {
    code: 'CoO',
    englishName: 'Certificate of Origin',
    arabicName: 'شهادة المنشأ',
    category: 'DOCUMENTATION',
    descriptionEnglish: 'Authenticated document certifying the country in which the material was manufactured or assembled.',
    descriptionArabic: 'وثيقة رسمية مصدقة تثبت وتحدد بلد التصنيع أو تجميع المعدة.'
  },
  {
    code: 'MR',
    englishName: 'Material Requisition',
    arabicName: 'طلب المواد',
    category: 'DOCUMENTATION',
    descriptionEnglish: 'Engineering procurement document detailing technical line items requested for project or maintenance works.',
    descriptionArabic: 'طلب رسمي صادر من الإدارة الهندسية أو العمليات لصرف أو شراء مواد ومعدات محددة.'
  },
  {
    code: 'PO',
    englishName: 'Purchase Order',
    arabicName: 'أمر الشراء',
    category: 'DOCUMENTATION',
    descriptionEnglish: 'Commercial procurement contract issued to a supplier binding delivery terms, quantities, line numbers, and pricing.',
    descriptionArabic: 'عقد شراء رسمي ملزم صادر إلى المورد يتضمن الكميات، المواصفات الفنية، والأسعار المتفق عليها.'
  },
  {
    code: 'WO',
    englishName: 'Work Order',
    arabicName: 'أمر العمل',
    category: 'DOCUMENTATION',
    descriptionEnglish: 'Authorized maintenance or construction task assignment linking specific materials and equipment tags.',
    descriptionArabic: 'أمر تفويض رسمي لتنفيذ أعمال صيانة أو تركيبات محددة مرتبط برقم المعدة والمواد المطلوبة.'
  },
  {
    code: 'PN',
    englishName: 'Part Number',
    arabicName: 'رقم الجزء',
    category: 'DOCUMENTATION',
    descriptionEnglish: 'Manufacturer specific catalogue or model code representing the exact physical component.',
    descriptionArabic: 'الرقم المعرف الفريد الخاص بالشركة المصنعة للقطعة أو المكون.'
  },
  {
    code: 'SN',
    englishName: 'Serial Number',
    arabicName: 'الرقم التسلسلي',
    category: 'DOCUMENTATION',
    descriptionEnglish: 'Unique individual tracking serial number stamped on equipment nameplate.',
    descriptionArabic: 'الرقم التسلسلي الفريد المختوم على لوحة بيانات المعدة لتمييزها وتتبعها فردياً.'
  }
];

export const INDUSTRIAL_TERMS_DICTIONARY: IndustrialDictionaryEntry[] = [
  {
    englishTerm: 'Pressure Transmitter',
    arabicTerm: 'مرسل ضغط',
    technicalMeaningArabic: 'جهاز يستخدم لقياس ضغط العملية وتحويل القياس إلى إشارة كهربائية قياسية تستخدم في أنظمة التحكم والمراقبة.',
    technicalMeaningEnglish: 'Instrument that measures process fluid/gas pressure and outputs standard 4-20mA/HART signals.',
    category: 'Instrumentation',
    keywords: ['pressure', 'transmitter', 'rosemount', 'yokogawa', 'eja', '3051', 'hart', 'gauge']
  },
  {
    englishTerm: 'Differential Pressure Transmitter',
    arabicTerm: 'مرسل ضغط تفاضلي',
    technicalMeaningArabic: 'جهاز يقيس الفرق بين نقطتي ضغط على جانبي عنصر تضييق (أورفيس) أو خزان لقياس التدفق أو المستوى.',
    technicalMeaningEnglish: 'Instrument measuring delta P across primary flow elements or pressurized tank taps.',
    category: 'Instrumentation',
    keywords: ['dp', 'differential', 'differential pressure', 'orifice', 'delta p', '3051cd', 'ejx110a']
  },
  {
    englishTerm: 'Temperature Transmitter',
    arabicTerm: 'مرسل حرارة',
    technicalMeaningArabic: 'جهاز لتحويل إشارة مجس الحرارة (مقاومة حرارية Pt100 أو مزدوج حراري) إلى إشارة كهربائية رقمية أو تناظرية لنظام التحكم.',
    technicalMeaningEnglish: 'Sensor converter transmitting temperature data from RTDs or thermocouples.',
    category: 'Instrumentation',
    keywords: ['temperature', 'transmitter', 'rtd', 'pt100', 'thermocouple', '644', '3144p', 'tmt']
  },
  {
    englishTerm: 'Coriolis Mass Flow Meter',
    arabicTerm: 'مقياس تدفق كوريوليس الكتلي',
    technicalMeaningArabic: 'مقياس تدفق دقيق للغاية يعتمد على ظاهرة تسارع كوريوليس لقياس التدفق الكتلي والكثافة والحرارة مباشرة دون الحاجة للتعويض.',
    technicalMeaningEnglish: 'High-precision direct mass flow, density, and temperature metering device based on Coriolis forces.',
    category: 'Flow Metering',
    keywords: ['coriolis', 'mass flow', 'micromotion', 'promass', 'rotamass', 'density']
  },
  {
    englishTerm: 'Electromagnetic Flow Meter',
    arabicTerm: 'مقياس تدفق كهرومغناطيسي',
    technicalMeaningArabic: 'مقياس تدفق للسوائل الموصلة للكهرباء يعتمد على قانون فاراداي للحث الكهرومغناطيسي دون التسبب في هبوط بالضغط.',
    technicalMeaningEnglish: 'Obstructionless flow meter for conductive liquids based on Faraday\'s Law of induction.',
    category: 'Flow Metering',
    keywords: ['magnetic', 'electromagnetic', 'magmeter', 'promag', 'optiflux', '8705']
  },
  {
    englishTerm: 'Guided Wave Radar Level Transmitter',
    arabicTerm: 'مرسل مستوى بالرادار الموجه',
    technicalMeaningArabic: 'جهاز لقياس مستوى السوائل أو السطح الفاصل بين سائلين عبر إرسال نبضات ميكروويف عالية التردد موجهة على طول مجس (سلك أو قضيب).',
    technicalMeaningEnglish: 'TDR-based level instrument sending high-frequency microwave pulses along a probe guide.',
    category: 'Level Measurement',
    keywords: ['radar', 'gwr', 'guided wave', '5300', 'levelflex', 'optiflex', 'interface']
  },
  {
    englishTerm: 'Non-Contact Radar Level Transmitter',
    arabicTerm: 'مرسل مستوى راداري لاسلكي/غير تلامسي',
    technicalMeaningArabic: 'مرسل مستوى غير تلامسي يرسل موجات كهرومغناطيسية (تردد 80 جيجاهرتز) باتجاه سطح المادة ويقيس زمن ارتدادها.',
    technicalMeaningEnglish: '80 GHz FMCW free-space radar gauge for non-intrusive tank level gauging.',
    category: 'Level Measurement',
    keywords: ['radar', 'non-contact', '5408', 'micropilot', 'optiwav', '80ghz']
  },
  {
    englishTerm: 'Pressure Safety Valve',
    arabicTerm: 'صمام أمان الضغط',
    technicalMeaningArabic: 'صمام ميكانيكي ذاتي الفتح مصمم لتصريف الضغط الزائد عن الحد المسموح به لحماية الأوعية وخطوط الأنابيب من الانفجار.',
    technicalMeaningEnglish: 'Overpressure protection spring-loaded relief valve ensuring plant safety integrity.',
    category: 'Valves & Safety',
    keywords: ['psv', 'safety valve', 'relief', 'crosby', 'leser', 'farris', 'set pressure']
  },
  {
    englishTerm: 'Control Valve with Smart Positioner',
    arabicTerm: 'صمام تحكم مزود بمحدد موضع ذكي',
    technicalMeaningArabic: 'صمام تنفيذي آلي يتحكم في معدل التدفق أو الضغط أو الحرارة عبر محرك هوائي ومحدد موضع رقمي يتواصل ببروتوكول HART.',
    technicalMeaningEnglish: 'Pneumatic final control element throttling flow regulated by digital positioner.',
    category: 'Valves & Actuators',
    keywords: ['control valve', 'positioner', 'fisher', 'fieldvue', 'masoneilan', 'dvc6200', 'samson']
  },
  {
    englishTerm: 'Emergency Shutdown Ball Valve',
    arabicTerm: 'صمام إغلاق طوارئ كروي',
    technicalMeaningArabic: 'صمام كروي عالي التحمل مجهز بمشغل هواء سريع الإغلاق لعزل السوائل الهيدروكربونية فور انطلاق إشارة الطوارئ (SIL-3).',
    technicalMeaningEnglish: 'Quarter-turn trunnion ball valve engineered for instant emergency fail-safe isolation.',
    category: 'Valves & Safety',
    keywords: ['esdv', 'shutdown', 'ball valve', 'trunnion', 'cameron', 'rotork', 'bettis', 'sil3']
  },
  {
    englishTerm: 'Flame Detector (Triple IR / Multi-Spectrum)',
    arabicTerm: 'كاشف لهب ثلاثي الأشعة تحت الحمراء',
    technicalMeaningArabic: 'كاشف بصري ذكي يحلل إشعاعات الأشعة تحت الحمراء في ثلاثة أطوال موجية مميزة لكشف حرائق الهيدروكربونات وتفادي الإنذارات الكاذبة.',
    technicalMeaningEnglish: 'Multi-spectrum optical IR3 flame detection device for high-speed fire detection.',
    category: 'Safety Systems',
    keywords: ['flame detector', 'ir3', 'spectrex', 'sharpeye', 'det-tronics', 'fire']
  },
  {
    englishTerm: 'Toxic Gas Detector (H2S)',
    arabicTerm: 'كاشف غاز كبريتيد الهيدروجين السام',
    technicalMeaningArabic: 'مستشعر إلكتروكيميائي متخصص للكشف المستمر عن تركيزات غاز H2S السام بالأجزاء في المليون (PPM) في بيئات حقول النفط والغاز.',
    technicalMeaningEnglish: 'Electrochemical toxic H2S ppm safety gas monitor with local display and strobe relay.',
    category: 'Safety Systems',
    keywords: ['h2s', 'toxic', 'gas detector', 'draeger', 'sensitron', 'det-tronics', 'ppm']
  },
  {
    englishTerm: 'Combustible Hydrocarbon Gas Detector (LEL)',
    arabicTerm: 'كاشف الغازات القابلة للاشتعال (مستوى LEL)',
    technicalMeaningArabic: 'كاشف غازات هيدروكربونية يعتمد على تقنية الأشعة تحت الحمراء البصرية أو الاحتراق التحفيزي لقياس نسبة الحد الأدنى للاشتعال (%LEL).',
    technicalMeaningEnglish: 'Point infrared or catalytic bead LEL explosive gas detection monitor.',
    category: 'Safety Systems',
    keywords: ['lel', 'combustible', 'gas detector', 'pointwatch', 'pir9400', 'draeger', 'flammable']
  },
  {
    englishTerm: 'Vibration Transmitter / Proximity Probe',
    arabicTerm: 'مجس / مرسل اهتزاز بالموجات الحثية',
    technicalMeaningArabic: 'مستشعر يقيس الإزاحة أو سرعة الاهتزاز للمحاور الدوارة في التوربينات والمضخات الضخمة للتنبؤ بالأعطال الميكانيكية.',
    technicalMeaningEnglish: 'Eddy current proximity probe system monitoring shaft vibration and radial displacement.',
    category: 'Condition Monitoring',
    keywords: ['vibration', 'proximity', 'bently nevada', '3300', '3500', 'accelerometer', 'eddy']
  },
  {
    englishTerm: 'Mill Test Certificate (MTR) EN 10204 3.1',
    arabicTerm: 'شهادة فحص مصنعي للصلب EN 10204 3.1',
    technicalMeaningArabic: 'وثيقة جودة معتمدة وموقعة من مفتش مستقل في المصنع تتضمن التحليل الكيميائي لعينات الصهر واختبارات الشد والصدم للمعدن.',
    technicalMeaningEnglish: 'Inspection certificate 3.1 validating chemical composition, heat number, and mechanical tensile properties.',
    category: 'Quality Documentation',
    keywords: ['mtr', 'mill test', 'en 10204', '3.1', 'heat number', 'chemical composition', 'tensile']
  },
  {
    englishTerm: 'Flange ASME B16.5 Weld Neck Class 300',
    arabicTerm: 'شفة لحام رقبة ASME B16.5 فئة ضغط 300',
    technicalMeaningArabic: 'شفة ربط أنابيب فولاذية مطروقة ذات رقبة لحام تناكبي متوافقة مع معايير ASME لتحمل الضغوط المتوسطة حتى 300 رطل.',
    technicalMeaningEnglish: 'Forged steel piping flange with tapered neck for butt-welding according to ASME B16.5 standard.',
    category: 'Piping & Fittings',
    keywords: ['flange', 'weld neck', 'wn', 'asme b16.5', 'class 300', 'rf', 'raised face', 'a105']
  },
  {
    englishTerm: 'Spiral Wound Gasket 316SS with Graphite Filler',
    arabicTerm: 'حشية إحكام لولبية من الفولاذ المقاوم للصدأ 316 مع حشو الجرافيت',
    technicalMeaningArabic: 'حشية إحكام بين الشفاه تتكون من شريط معدني متموج ملفوف لولبياً مع الجرافيت المرن لتحمل درجات الحرارة والضغوط العالية.',
    technicalMeaningEnglish: 'Semi-metallic sealing gasket engineered with V-shaped metal windings and flexible graphite.',
    category: 'Piping & Fittings',
    keywords: ['gasket', 'spiral wound', 'swg', 'flexitallic', 'graphite', '316ss', 'inner ring']
  }
];

export const OFFICIAL_MANUFACTURERS_REGISTRY: Record<string, ManufacturerIntelligence> = {
  rosemount: {
    name: 'Rosemount',
    normalizedName: 'rosemount',
    officialWebsite: 'https://www.emerson.com/en-us/brands/rosemount',
    headquarters: 'Shakopee, Minnesota, USA (Emerson Automation Solutions)',
    supportPortalUrl: 'https://www.emerson.com/en-us/support',
    productFamilies: ['3051 Pressure Transmitters', '644/3144P Temperature Transmitters', '5300 Guided Wave Radar', '8705 Magnetic Flowmeters'],
    knownCatalogUrls: ['https://www.emerson.com/documents/automation/product-data-sheet-rosemount-3051-pressure-transmitter-family-en-74070.pdf'],
    isVerifiedDomain: true,
    notes: 'Major global instrumentation brand owned by Emerson Automation Solutions.'
  },
  emerson: {
    name: 'Emerson Automation Solutions',
    normalizedName: 'emerson',
    officialWebsite: 'https://www.emerson.com',
    headquarters: 'St. Louis, Missouri, USA',
    supportPortalUrl: 'https://www.emerson.com/en-us/support',
    productFamilies: ['Rosemount', 'Micro Motion', 'Fisher Valves', 'DeltaV DCS', 'Ovation'],
    isVerifiedDomain: true
  },
  yokogawa: {
    name: 'Yokogawa Electric Corporation',
    normalizedName: 'yokogawa',
    officialWebsite: 'https://www.yokogawa.com',
    headquarters: 'Musashino, Tokyo, Japan',
    supportPortalUrl: 'https://www.yokogawa.com/solutions/services/',
    productFamilies: ['DPharp EJA/EJX Pressure Transmitters', 'CENTUM VP DCS', 'ROTAMASS Coriolis', 'YTA Temperature'],
    isVerifiedDomain: true
  },
  endress: {
    name: 'Endress+Hauser',
    normalizedName: 'endress',
    officialWebsite: 'https://www.endress.com',
    headquarters: 'Reinach, Switzerland',
    supportPortalUrl: 'https://www.endress.com/en/service-support',
    productFamilies: ['Cerabar Pressure', 'Promag / Promass Flow', 'Levelflex / Micropilot Radar', 'iTEMP Transmitters'],
    isVerifiedDomain: true
  },
  siemens: {
    name: 'Siemens Process Instrumentation',
    normalizedName: 'siemens',
    officialWebsite: 'https://www.siemens.com/processinstrumentation',
    headquarters: 'Munich, Germany',
    supportPortalUrl: 'https://support.industry.siemens.com',
    productFamilies: ['SITRANS P / F / L / T Instruments', 'SIMATIC S7 / PCS 7', 'SIPART PS2 Positioners'],
    isVerifiedDomain: true
  },
  abb: {
    name: 'ABB Measurement & Analytics',
    normalizedName: 'abb',
    officialWebsite: 'https://new.abb.com/products/measurement-products',
    headquarters: 'Zurich, Switzerland',
    supportPortalUrl: 'https://new.abb.com/service',
    productFamilies: ['266 Pressure Transmitters', 'CoriolisMaster', 'SensyTemp', 'System 800xA DCS'],
    isVerifiedDomain: true
  },
  krohne: {
    name: 'KROHNE Messtechnik',
    normalizedName: 'krohne',
    officialWebsite: 'https://krohne.com',
    headquarters: 'Duisburg, Germany',
    supportPortalUrl: 'https://krohne.com/en/services',
    productFamilies: ['OPTIFLUX Flowmeters', 'OPTIMASS Coriolis', 'OPTIFLEX Guided Wave Radar', 'OPTIBAR Pressure'],
    isVerifiedDomain: true
  },
  vega: {
    name: 'VEGA Grieshaber KG',
    normalizedName: 'vega',
    officialWebsite: 'https://www.vega.com',
    headquarters: 'Schiltach, Germany',
    supportPortalUrl: 'https://www.vega.com/en-de/service',
    productFamilies: ['VEGAPULS 80 GHz Radar', 'VEGABAR Pressure', 'VEGAFLEX GWR', 'VEGASWING Level Switch'],
    isVerifiedDomain: true
  },
  honeywell: {
    name: 'Honeywell Process Solutions',
    normalizedName: 'honeywell',
    officialWebsite: 'https://process.honeywell.com',
    headquarters: 'Charlotte, North Carolina, USA',
    supportPortalUrl: 'https://process.honeywell.com/us/en/support',
    productFamilies: ['SmartLine ST800/ST700 Transmitters', 'Experion PKS DCS', 'Safety Manager ESD'],
    isVerifiedDomain: true
  },
  fisher: {
    name: 'Fisher Valves & Instruments (Emerson)',
    normalizedName: 'fisher',
    officialWebsite: 'https://www.emerson.com/en-us/brands/fisher',
    headquarters: 'Marshalltown, Iowa, USA',
    supportPortalUrl: 'https://www.emerson.com/en-us/support',
    productFamilies: ['Control Valves (ED, ET, GX)', 'FIELDVUE Digital Valve Controllers (DVC6200)', 'Regulators'],
    isVerifiedDomain: true
  },
  wika: {
    name: 'WIKA Alexander Wiegand SE & Co. KG',
    normalizedName: 'wika',
    officialWebsite: 'https://www.wika.com',
    headquarters: 'Klingenberg, Germany',
    supportPortalUrl: 'https://www.wika.com/en-en/services.WIKA',
    productFamilies: ['Pressure Gauges (232.50)', 'Diaphragm Seals', 'Thermowells', 'Bimetal Thermometers'],
    isVerifiedDomain: true
  },
  swagelok: {
    name: 'Swagelok Company',
    normalizedName: 'swagelok',
    officialWebsite: 'https://www.swagelok.com',
    headquarters: 'Solon, Ohio, USA',
    supportPortalUrl: 'https://www.swagelok.com/en/services',
    productFamilies: ['Tube Fittings', 'Manifolds (2-valve, 3-valve, 5-valve)', 'Needle & Ball Valves', 'Seamless Tubing'],
    isVerifiedDomain: true
  },
  rotork: {
    name: 'Rotork plc',
    normalizedName: 'rotork',
    officialWebsite: 'https://www.rotork.com',
    headquarters: 'Bath, United Kingdom',
    supportPortalUrl: 'https://www.rotork.com/en/service-support',
    productFamilies: ['IQ3 Electric Actuators', 'GP/CP Pneumatic Actuators', 'Electro-hydraulic Actuators'],
    isVerifiedDomain: true
  },
  schneider: {
    name: 'Schneider Electric / Foxboro',
    normalizedName: 'schneider',
    officialWebsite: 'https://www.se.com',
    headquarters: 'Rueil-Malmaison, France',
    supportPortalUrl: 'https://www.se.com/ww/en/work/services/',
    productFamilies: ['Foxboro Pressure & Temperature', 'Modicon PLCs', 'Triconex Safety Systems (SIS)'],
    isVerifiedDomain: true
  }
};

/**
 * Normalizes input text and finds known industrial technical terms
 */
export function lookupIndustrialDictionary(query: string): IndustrialDictionaryEntry | null {
  if (!query || typeof query !== 'string') return null;
  const q = query.toLowerCase().trim();

  // Direct English check
  const exact = INDUSTRIAL_TERMS_DICTIONARY.find(
    entry => entry.englishTerm.toLowerCase() === q || entry.arabicTerm === query.trim()
  );
  if (exact) return exact;

  // Keyword / Substring check
  for (const entry of INDUSTRIAL_TERMS_DICTIONARY) {
    if (q.includes(entry.englishTerm.toLowerCase())) return entry;
    if (query.includes(entry.arabicTerm)) return entry;
    for (const kw of entry.keywords) {
      if (q.includes(kw.toLowerCase()) && kw.length > 3) {
        return entry;
      }
    }
  }

  return null;
}

/**
 * Look up technical abbreviation
 */
export function lookupAbbreviation(code: string): TechnicalAbbreviation | null {
  if (!code) return null;
  const cleanCode = code.toUpperCase().trim();
  return INDUSTRIAL_ABBREVIATIONS.find(a => a.code === cleanCode) || null;
}

/**
 * Identifies likely official manufacturer info from name or query
 */
export function lookupManufacturer(manufacturerName: string): ManufacturerIntelligence | null {
  if (!manufacturerName) return null;
  const clean = manufacturerName.toLowerCase().trim();
  
  for (const [key, info] of Object.entries(OFFICIAL_MANUFACTURERS_REGISTRY)) {
    if (clean.includes(key) || info.name.toLowerCase().includes(clean)) {
      return info;
    }
  }
  return null;
}

/**
 * Checks typo tolerance for common industrial brands
 */
export function checkBrandTypo(text: string): { original: string; suggested: string; manufacturer?: ManufacturerIntelligence } | null {
  const lower = text.toLowerCase();
  const typoMap: Record<string, string> = {
    'rosemont': 'Rosemount',
    'rosmount': 'Rosemount',
    'yokogwa': 'Yokogawa',
    'yokogawaa': 'Yokogawa',
    'endres': 'Endress+Hauser',
    'endress': 'Endress+Hauser',
    'endress hauser': 'Endress+Hauser',
    'seimens': 'Siemens',
    'seimans': 'Siemens',
    'kronhe': 'KROHNE',
    'krohne': 'KROHNE',
    'swagelock': 'Swagelok',
    'swaglock': 'Swagelok',
    'honeywel': 'Honeywell',
    'foxborro': 'Foxboro'
  };

  for (const [typo, correct] of Object.entries(typoMap)) {
    if (lower.includes(typo)) {
      const manufacturer = lookupManufacturer(correct);
      return {
        original: typo,
        suggested: correct,
        manufacturer: manufacturer || undefined
      };
    }
  }
  return null;
}

/**
 * Generates verified search queries for official sources
 */
export function generateSearchQueries(params: {
  materialName?: string;
  manufacturer?: string;
  model?: string;
  partNumber?: string;
}): {
  generalQuery: string;
  datasheetQuery: string;
  manufacturerQuery: string;
  specificationQuery: string;
  manualQuery: string;
  pdfQuery: string;
} {
  const parts = [
    params.manufacturer || '',
    params.model || '',
    params.partNumber || '',
    params.materialName || ''
  ].filter(Boolean);

  const base = parts.join(' ').trim();
  const primaryId = params.partNumber ? `"${params.partNumber}"` : (params.model ? `"${params.model}"` : base);

  return {
    generalQuery: base,
    datasheetQuery: `${base} datasheet PDF`,
    manufacturerQuery: params.manufacturer ? `${params.manufacturer} official ${params.model || params.materialName || ''}` : `${base} manufacturer official website`,
    specificationQuery: `${primaryId} technical specifications`,
    manualQuery: `${base} user manual installation guide PDF`,
    pdfQuery: `${primaryId} filetype:pdf`
  };
}
