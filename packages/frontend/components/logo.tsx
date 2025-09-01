import { JetBrains_Mono } from "next/font/google";
import Link from "next/link";

const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["600"], variable: "--font-logo" });

export function Logo() {
  return (
    <Link href="/" className={`${jetbrains.variable} font-[600] text-lg tracking-tight`}>StreamFi</Link>
  );
}
