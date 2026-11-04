// دسته‌بندی خودکار اخبار بر اساس کلیدواژه‌ها
const CATEGORIES = [
  { id: 'crypto', name: 'ارز دیجیتال', color: '#d99a00', words: ['ارز دیجیتال', 'بیت کوین', 'bitcoin', 'اتریوم', 'ethereum', 'کریپتو', 'crypto', 'بلاکچین', 'blockchain', 'nft', 'ماینینگ', 'mining', 'تتر', 'usdt', 'هالوینگ', 'توکن'] },
  { id: 'ai', name: 'هوش مصنوعی', color: '#7c5cff', words: ['هوش مصنوعی', 'ai', 'gpt', 'chatgpt', 'openai', 'claude', 'anthropic', 'gemini', 'copilot', 'deepseek', 'llm', 'مدل زبانی', 'یادگیری ماشین', 'چت بات', 'گروک', 'grok', 'midjourney', 'sora', 'یادگیری عمیق', 'شبکه عصبی'] },
  { id: 'security', name: 'امنیت', color: '#e8590c', words: ['امنیت', 'هک', 'هکر', 'باج افزار', 'بدافزار', 'آسیب پذیری', 'حفره امنیتی', 'فیشینگ', 'نشت اطلاعات', 'نفوذ', 'ویروس', 'vpn', 'سایبری', 'رمزنگاری', 'کلاهبرداری', 'جاسوس'] },
  { id: 'games', name: 'بازی', color: '#e03131', words: ['بازی', 'گیم', 'game', 'gaming', 'پلی استیشن', 'playstation', 'ps5', 'ایکس باکس', 'xbox', 'استیم', 'steam', 'نینتندو', 'nintendo', 'گیمینگ', 'esports', 'اسپورت'] },
  { id: 'mobile', name: 'موبایل و تبلت', color: '#17a59a', words: ['گوشی', 'موبایل', 'آیفون', 'iphone', 'سامسونگ', 'samsung', 'galaxy', 'گلکسی', 'شیائومی', 'xiaomi', 'اندروید', 'android', 'ios', 'پیکسل', 'pixel', 'هواوی', 'huawei', 'آنر', 'ریلمی', 'تبلت', 'آیپد', 'ipad', 'اپل', 'apple', 'اسمارتفون', 'smartphone', 'پوکو', 'poco', 'nothing phone'] },
  { id: 'hardware', name: 'سخت‌افزار و کامپیوتر', color: '#1c7ed6', words: ['پردازنده', 'cpu', 'gpu', 'کارت گرافیک', 'rtx', 'radeon', 'انویدیا', 'nvidia', 'amd', 'intel', 'اینتل', 'لپ تاپ', 'لپتاپ', 'laptop', 'کامپیوتر', 'رایانه', 'ram', 'ssd', 'مادربورد', 'تراشه', 'چیپ', 'نیمه هادی', 'کوالکام', 'qualcomm', 'snapdragon', 'مانیتور', 'پرینتر', 'سخت افزار', 'کیس'] },
  { id: 'software', name: 'نرم‌افزار و سیستم‌عامل', color: '#2f9e44', words: ['ویندوز', 'windows', 'لینوکس', 'linux', 'macos', 'مرورگر', 'کروم', 'chrome', 'فایرفاکس', 'firefox', 'نرم افزار', 'اپلیکیشن', 'برنامه نویسی', 'github', 'گیت هاب', 'آپدیت', 'به روزرسانی', 'نسخه جدید', 'اوبونتو', 'مایکروسافت', 'microsoft', 'گوگل', 'google', 'اپن سورس', 'open source', 'برنامه نویس', 'اپ '] },
  { id: 'internet', name: 'اینترنت و شبکه‌های اجتماعی', color: '#d6336c', words: ['اینترنت', 'فیلترینگ', 'فیلتر', 'اینستاگرام', 'instagram', 'تلگرام', 'telegram', 'واتساپ', 'whatsapp', 'توییتر', 'twitter', 'شبکه اجتماعی', 'شبکه های اجتماعی', 'یوتیوب', 'youtube', 'تیک تاک', 'tiktok', '5g', '4g', 'نسل پنجم', 'همراه اول', 'ایرانسل', 'رایتل', 'فیبر نوری', 'مخابرات', 'استارلینک', 'starlink', 'پهنای باند', 'ایتا', 'روبیکا', 'پیام رسان', 'متا', 'meta', 'فیسبوک', 'facebook'] },
  { id: 'gadget', name: 'گجت و لوازم هوشمند', color: '#a9743f', words: ['ساعت هوشمند', 'smartwatch', 'هدفون', 'ایرپاد', 'airpods', 'دوربین', 'تلویزیون', 'اسپیکر', 'ردیاب', 'پهپاد', 'drone', 'دستبند', 'گجت', 'gadget', 'خانه هوشمند', 'ربات جارو', 'هدست', 'واقعیت مجازی', 'واقعیت افزوده', 'vr', 'ساعت', 'پاوربانک', 'شارژر'] },
  { id: 'auto', name: 'خودرو و حمل‌ونقل', color: '#5c6773', words: ['خودرو', 'ماشین', 'تسلا', 'tesla', 'خودروی برقی', 'باتری', 'رانندگی', 'خودران', 'bmw', 'بنز', 'مرسدس', 'byd', 'اسنپ', 'اسکوتر', 'دوچرخه برقی', 'ماشین برقی'] },
  { id: 'space', name: 'علم و فضا', color: '#3b5bdb', words: ['فضا', 'فضایی', 'ناسا', 'nasa', 'اسپیس ایکس', 'spacex', 'مریخ', 'ستاره', 'تلسکوپ', 'کهکشان', 'ماهواره', 'سیاره', 'اخترشناس', 'دانشمندان', 'پژوهشگران', 'فیزیک', 'کوانتوم', 'quantum', 'زیست', 'آزمایش', 'کشف جدید', 'فضانورد'] },
  { id: 'business', name: 'کسب‌وکار و استارتاپ', color: '#868e96', words: ['استارتاپ', 'سرمایه گذاری', 'بورس', 'سهام', 'درآمد', 'تحریم', 'دیجی کالا', 'digikala', 'ارزش بازار', 'میلیارد', 'مدیرعامل', 'ceo', 'اخراج', 'تعرفه', 'خرید شرکت', 'صنعت', 'اقتصاد'] },
  { id: 'other', name: 'سایر', color: '#adb5bd', words: [] },
];

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ۀ/g, 'ه')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[\u200c\u200d\u200e\u200f]/g, ' ')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/\s+/g, ' ');
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// الگوهای از پیش‌ساخته: لاتین با مرز کلمه، فارسی با مرز ابتدای کلمه
const compiled = CATEGORIES.map((c) => ({
  id: c.id,
  patterns: c.words.map((w) => {
    const n = norm(w).trim();
    const latin = /^[a-z0-9 .+\-]+$/.test(n);
    const re = latin
      ? new RegExp('(^|[^a-z0-9])' + esc(n) + '(?![a-z0-9])', 'g')
      : new RegExp('(^|[^\\u0600-\\u06ff])' + esc(n), 'g');
    return re;
  }),
}));

function count(re, text) {
  const m = text.match(re);
  return m ? m.length : 0;
}

function classify({ title, summary, feedCategories }) {
  const t = ' ' + norm(title) + ' ';
  const s = ' ' + norm(summary) + ' ';
  const f = ' ' + norm((feedCategories || []).join(' ، ')) + ' ';
  let best = 'other';
  let bestScore = 0;
  for (const c of compiled) {
    let score = 0;
    for (const re of c.patterns) {
      score += count(re, t) * 3 + count(re, f) * 2 + Math.min(count(re, s), 2);
    }
    if (score > bestScore) {
      best = c.id;
      bestScore = score;
    }
  }
  return best;
}

module.exports = { CATEGORIES, classify };
