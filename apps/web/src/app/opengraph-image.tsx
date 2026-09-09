import type { ImageResponse } from "next/og";
import { OG_SIZE, renderOgImage } from "@/lib/ogImage";

export const alt = "БыстроБариста — биржа смен для бариста и кофеен";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image(): Promise<ImageResponse> {
  return renderOgImage({
    title: "Смены для бариста и кофеен",
    subtitle: "Биржа смен: вакансии рядом и чат — прямо в браузере.",
  });
}
