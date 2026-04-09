import type { Metadata } from "next";
import { Noto_Sans_Thai, Noto_Serif_Thai } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-sans-th",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

const notoSerifThai = Noto_Serif_Thai({
  variable: "--font-serif-th",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "นครินทร์ สตูดิโอ — บายศรีสำหรับทุกงานสำคัญ",
  description:
    "รับทำบายศรีตามงาน แต่งงาน บวช ขึ้นบ้านใหม่ รับปริญญา และอื่นๆ สั่งง่าย จัดส่งถึงงาน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${notoSansThai.variable} ${notoSerifThai.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
