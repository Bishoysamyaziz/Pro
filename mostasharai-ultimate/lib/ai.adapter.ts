import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const SYSTEM = `أنت "دليل مستشاري"، مساعد ذكي لمنصة Mostasharai — أكبر منصة استشارات مهنية عربية.
قواعد الرد:
- أجب بالعربية دائماً مع إمكانية الرد بالإنجليزية إذا سأل المستخدم بالإنجليزية
- كن ودوداً ومختصراً ومفيداً
- ساعد في: حجز الاستشارات، فهم نظام NEX، التنقل في المنصة، النصائح المهنية العامة
- لا تذكر Gemini أو Google — أنت "دليل مستشاري" فقط
- إذا سئلت عن موضوع قانوني أو مالي معقد، وجّه المستخدم للتواصل مع خبير`;

export const getNexusGuideResponse = async (
  message: string,
  history: Array<{ role: string; parts: Array<{ text: string }> }> = []
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction: SYSTEM,
        maxOutputTokens: 600,
        temperature: 0.7,
      }
    });
    return response.text || 'عذراً، لم أتمكن من الإجابة.';
  } catch (error) {
    console.error('AI error:', error);
    const q = message.toLowerCase();
    if (q.includes('خبير') || q.includes('استشارة') || q.includes('book') || q.includes('session'))
      return 'يمكنك حجز استشارة من صفحة "الخبراء" واختيار الخبير المناسب. 📅';
    if (q.includes('nex') || q.includes('رصيد') || q.includes('محفظة') || q.includes('wallet'))
      return 'لشحن محفظتك، اذهب لصفحة "المحفظة" واضغط "طلب إيداع". 💰';
    if (q.includes('live') || q.includes('فيديو') || q.includes('بث'))
      return 'لبدء جلسة فيديو مباشرة، احجز مع خبير أو ابحث عن "جلساتي" في القائمة. 🎥';
    return 'الخدمة غير متاحة مؤقتاً. يُرجى المحاولة لاحقاً. ⚠️';
  }
};
