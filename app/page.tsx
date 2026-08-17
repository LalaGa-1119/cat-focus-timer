import type { Metadata } from "next";
import { headers } from "next/headers";
import { FocusApp } from "./FocusApp";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  const title = "猫猫专注屋｜陪你慢慢做好一件事";
  const description = "轻量、可爱的本地番茄钟，包含今日待办与专注统计。无需登录，数据只留在你的浏览器。";
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: [{ url: image, width: 1730, height: 909, alt: "猫猫专注屋" }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function Home() { return <FocusApp />; }
