'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SupportPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 rounded-3xl p-8 md:p-12 glass-obsidian relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-primary-container/20 rounded-2xl flex items-center justify-center border border-primary-container/30">
              <span className="material-symbols-outlined text-primary-container">support_agent</span>
            </div>
            <h1 className="text-3xl font-bold text-primary font-['Tajawal']">الدعم الفني</h1>
          </div>

          {submitted ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-6xl text-green-500 mb-4">check_circle</span>
              <h2 className="text-2xl font-bold text-on-surface mb-4 font-['Tajawal']">تم إرسال رسالتك بنجاح</h2>
              <p className="text-on-surface-variant mb-8 font-['Tajawal']">سيتواصل معك فريق الدعم في أقرب وقت ممكن عبر بريدك الإلكتروني.</p>
              <Link href="/" className="px-8 py-3 bg-primary-container text-on-primary-container font-bold rounded-xl hover:shadow-[0_0_20px_#00f2ff] transition-all font-['Tajawal']">
                العودة للرئيسية
              </Link>
            </div>
          ) : (
            <>
              <p className="text-on-surface-variant mb-8 font-['Tajawal'] leading-relaxed">
                هل لديك استفسار أو واجهت مشكلة في المنصة؟ فريق دعم نيكسوس هنا لمساعدتك على مدار الساعة.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-2 font-['Tajawal']">الاسم الكامل</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Tajawal']"
                      placeholder="أدخل اسمك"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-2 font-['Tajawal']">البريد الإلكتروني</label>
                    <input 
                      type="email" 
                      required
                      className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Space_Grotesk']"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-2 font-['Tajawal']">نوع المشكلة</label>
                  <select className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Tajawal']">
                    <option>مشكلة في الدفع / المحفظة</option>
                    <option>مشكلة في حجز الاستشارات</option>
                    <option>مشكلة تقنية في الموقع</option>
                    <option>اقتراح أو ملاحظات</option>
                    <option>أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-2 font-['Tajawal']">الرسالة</label>
                  <textarea 
                    required
                    rows={5}
                    className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Tajawal'] resize-none"
                    placeholder="اشرح لنا كيف يمكننا مساعدتك..."
                  ></textarea>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-primary-container text-on-primary-container font-bold rounded-2xl hover:shadow-[0_0_30px_#00f2ff] transition-all font-['Tajawal'] text-lg"
                >
                  إرسال الرسالة
                </button>
              </form>

              <div className="mt-12 pt-8 border-t border-outline-variant/10 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <span className="material-symbols-outlined text-primary-container mb-2">mail</span>
                  <p className="text-xs text-on-surface-variant font-['Space_Grotesk']">support@nexus.com</p>
                </div>
                <div className="text-center">
                  <span className="material-symbols-outlined text-primary-container mb-2">call</span>
                  <p className="text-xs text-on-surface-variant font-['Space_Grotesk']">+966 500 000 000</p>
                </div>
                <div className="text-center">
                  <span className="material-symbols-outlined text-primary-container mb-2">location_on</span>
                  <p className="text-xs text-on-surface-variant font-['Tajawal']">الرياض، المملكة العربية السعودية</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
