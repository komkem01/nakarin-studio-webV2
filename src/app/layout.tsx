import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "นาคารินสตูดิโอ — บายศรีสำหรับทุกงานสำคัญ",
  description:
    "รับทำบายศรีตามงาน แต่งงาน บวช ขึ้นบ้านใหม่ รับปริญญา และอื่นๆ สั่งง่าย จัดส่งถึงงาน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
