import type { Metadata } from 'next';
import { Tajawal } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { TelemetryProvider } from '@/telemetry/TelemetryProvider';
import Navigation from '@/components/Navigation';
import AIAssistant from '@/components/AIAssistant';

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '700', '800', '900'],
  variable: '--font-tajawal',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'مستشاري | Mostasharai — منصة الاستشارات المهنية',
  description: 'تواصل مع أفضل الخبراء العرب. استشارات مهنية متخصصة في القانون، المال، الأعمال، التقنية والمزيد.',
  keywords: ['استشارات', 'خبراء', 'قانون', 'مال', 'أعمال', 'consulting', 'experts'],
  openGraph: {
    title: 'مستشاري | Mostasharai',
    description: 'منصة الاستشارات المهنية العربية الأولى',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <head>
        <meta name="theme-color" content="#050505" />
      </head>
      <body className="font-sans antialiased min-h-screen overflow-x-hidden" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <TelemetryProvider>
              <Navigation />
              <main className="lg:mr-64 pt-20 px-4 sm:px-6 pb-28 min-h-screen">
                {children}
              </main>
              <AIAssistant />
            </TelemetryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
