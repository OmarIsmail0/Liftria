/**
 * Store-gallery previews are a developer-only marketing aid.
 * These are feature explanations, NOT saved activities, health records or example nutrition totals.
 */
export const storePanelIds = ['today', 'eat', 'train', 'progress', 'privacy', 'hiku'] as const;
export type StorePanelId = (typeof storePanelIds)[number];
export type StoreLocale = 'en' | 'ar';

type Copy = {
  eyebrow: string; title: string; description: string;
  cardTitle: string; cardDescription: string; rows: readonly [string, string][];
  footnote: string;
};
type Entry = { domain: 'eat'|'train'|'health'|'hiku'; en: Copy; ar: Copy };

export const storePanels: Record<StorePanelId, Entry> = {
  today: {
    domain: 'health',
    en: { eyebrow: 'YOUR DAILY SPACE', title: 'Everything, in one place.',
      description: 'See food, training, water and progress together.',
      cardTitle: 'Today', cardDescription: 'An overview that follows your day.',
      rows: [['Food diary', 'Meals and nutrition at a glance'],
        ['Training', 'Plans, sessions and recovery'],
        ['Progress', 'Weight trends and your own goals']],
      footnote: 'Your entries stay yours.' },
    ar: { eyebrow: 'مساحتك اليومية', title: 'كل يومك في مكان واحد.',
      description: 'تابع الطعام والتمارين والماء والتقدم معًا.',
      cardTitle: 'اليوم', cardDescription: 'نظرة سريعة على تفاصيل يومك.',
      rows: [['يوميات الطعام', 'وجباتك وعناصرها الغذائية'],
        ['التمرين', 'خططك وجلساتك والتعافي'],
        ['التقدم', 'اتجاهات الوزن وأهدافك']],
      footnote: 'سجلاتك ملكك.' },
  },
  eat: {
    domain: 'eat',
    en: { eyebrow: 'FOOD & WATER', title: 'Log meals, your way.',
      description: 'Portions, nutrients and familiar Egyptian foods.',
      cardTitle: 'Eat', cardDescription: 'A diary built around real food.',
      rows: [['Meals and portions', 'Breakfast, lunch, dinner and snacks'],
        ['Nutrition detail', 'Unknown values stay unknown'],
        ['Water counter', 'Keep track of each glass']],
      footnote: 'No invented nutrition totals.' },
    ar: { eyebrow: 'الطعام والماء', title: 'سجّل وجباتك بطريقتك.',
      description: 'كميات وعناصر غذائية وأكلات مصرية مألوفة.',
      cardTitle: 'الطعام', cardDescription: 'يوميات تناسب أكلك الحقيقي.',
      rows: [['الوجبات والكميات', 'فطار وغدا وعشا ووجبات خفيفة'],
        ['تفاصيل التغذية', 'المعلومة المفقودة تظل غير معروفة'],
        ['شرب الماء', 'تابع كل كوب بسهولة']],
      footnote: 'بدون أرقام غذائية مختلقة.' },
  },
  train: {
    domain: 'train',
    en: { eyebrow: 'TRAINING', title: 'Every set counts.',
      description: 'Build your workouts and stay focused on progress.',
      cardTitle: 'Train', cardDescription: 'Your own gym training log.',
      rows: [['Workout plans', 'Save exercises and templates'],
        ['Sets and rest', 'Log reps, weight and recovery'],
        ['Helpful tools', 'Warm-ups, plates and supersets']],
      footnote: 'Nothing is logged until you log it.' },
    ar: { eyebrow: 'التمارين', title: 'كل مجموعة تفرق.',
      description: 'نظّم التمارين وتابع تقدمك باستمرار.',
      cardTitle: 'التمرين', cardDescription: 'سجل تمارينك في الجيم.',
      rows: [['خطط التمرين', 'احفظ التمارين والقوالب'],
        ['المجموعات والراحة', 'سجّل التكرارات والأوزان'],
        ['أدوات مفيدة', 'إحماء وأقراص وسوبر سِت']],
      footnote: 'لا يُحفظ تمرين حتى تسجّله.' },
  },
  progress: {
    domain: 'health',
    en: { eyebrow: 'PROGRESS', title: 'See the trend, not noise.',
      description: 'Understand patterns from the history you log.',
      cardTitle: 'Progress', cardDescription: 'Your records, in context.',
      rows: [['Weight history', 'Follow your own weight trend'],
        ['Strength history', 'Review completed workouts'],
        ['Estimated burn', 'Shown only with enough history']],
      footnote: 'No simulated health measurements.' },
    ar: { eyebrow: 'التقدم', title: 'تابع الاتجاه بوضوح.',
      description: 'افهم التغيرات من سجلاتك الحقيقية.',
      cardTitle: 'التقدم', cardDescription: 'شاهد سجلاتك في سياقها.',
      rows: [['سجل الوزن', 'تابع اتجاه وزنك'],
        ['سجل القوة', 'راجع جلسات التمرين'],
        ['الحرق التقديري', 'يظهر فقط عند كفاية البيانات']],
      footnote: 'بدون قياسات صحية افتراضية.' },
  },
  privacy: {
    domain: 'health',
    en: { eyebrow: 'LOCAL FIRST', title: 'Your data stays with you.',
      description: 'No Liftria account, ads or automatic cloud sync.',
      cardTitle: 'Your privacy', cardDescription: 'Control what leaves your phone.',
      rows: [['On-device records', 'Food, workouts and weight are local'],
        ['Your own backups', 'Choose when and where to export'],
        ['Optional AI', 'Send to Anthropic only when requested']],
      footnote: 'Private by design. You stay in control.' },
    ar: { eyebrow: 'خصوصية محلية', title: 'بياناتك على هاتفك.',
      description: 'بدون حساب ليفتريا أو إعلانات أو مزامنة سحابية تلقائية.',
      cardTitle: 'خصوصيتك', cardDescription: 'أنت تتحكم في مشاركة بياناتك.',
      rows: [['سجلات على الجهاز', 'الطعام والتمرين والوزن محليًا'],
        ['نسختك الاحتياطية', 'اختر وقت التصدير ووجهته'],
        ['ذكاء اصطناعي اختياري', 'ترسل إلى Anthropic عند الطلب فقط']],
      footnote: 'خصوصية من التصميم. القرار لك.' },
  },
  hiku: {
    domain: 'hiku',
    en: { eyebrow: 'HIKU · OPTIONAL AI', title: 'From meal idea to diary.',
      description: 'Describe a meal or try photo estimates in Beta.',
      cardTitle: 'Hiku review', cardDescription: 'Check each item before saving.',
      rows: [['You choose', 'Text or photo goes only when sent'],
        ['You review', 'Edit every estimated food and portion'],
        ['You control', 'Use your own Anthropic API key']],
      footnote: 'Photo estimates are Beta and may be inaccurate.' },
    ar: { eyebrow: 'هيكو · ذكاء اصطناعي اختياري', title: 'من وصف الوجبة إلى يومياتك.',
      description: 'اكتب وصفًا أو جرّب تقديرات الصور التجريبية.',
      cardTitle: 'مراجعة هيكو', cardDescription: 'افحص كل عنصر قبل الحفظ.',
      rows: [['أنت تختار', 'يُرسل النص أو الصورة عند الطلب فقط'],
        ['أنت تراجع', 'عدّل الأطعمة والكميات التقديرية'],
        ['أنت تتحكم', 'استخدم مفتاح Anthropic API الخاص بك']],
      footnote: 'تقديرات الصور تجريبية وقد تكون غير دقيقة.' },
  },
};

export function isStorePanel(value: unknown): value is StorePanelId {
  return typeof value === 'string' && (storePanelIds as readonly string[]).includes(value);
}
