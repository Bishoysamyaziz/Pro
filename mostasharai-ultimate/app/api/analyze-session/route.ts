import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { messages, expertName, clientName, sessionId } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ summary: 'لا توجد رسائل لتحليلها.' });
    }

    const conversation = messages.map((m: any) =>
      `[${m.senderName}]: ${m.content}`
    ).join('\n');

    const prompt = `أنت محلل استشارات مهني. قم بتحليل هذه الجلسة الاستشارية بين الخبير "${expertName}" والعميل "${clientName}" وأنشئ ملخصاً احترافياً باللغة العربية.

المحادثة:
${conversation}

المطلوب (اكتب بتنسيق واضح):
1. **موضوع الجلسة**: (جملة واحدة)
2. **النقاط الرئيسية التي تمت مناقشتها**: (3-5 نقاط)
3. **التوصيات والخطوات العملية**: (3-5 توصيات)
4. **ملاحظات مهمة**: (إن وجدت)

كن موجزاً ومفيداً.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1000, temperature: 0.3 }
        })
      }
    );

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'تعذّر إنشاء الملخص.';

    return NextResponse.json({ summary });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, summary: 'حدث خطأ أثناء التحليل.' }, { status: 500 });
  }
}
