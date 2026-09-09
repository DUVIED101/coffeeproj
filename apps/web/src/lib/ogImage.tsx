import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import React from "react";

export const OG_SIZE = { width: 1200, height: 630 };

type OgImageProps = { title: string; subtitle: string };

// 1200×630 card behind every og:image. Built at compile time by the
// opengraph-image.tsx route; fonts and logo are read from disk because
// Satori cannot fetch them at build.
export async function renderOgImage({
  title,
  subtitle,
}: OgImageProps): Promise<ImageResponse> {
  const root = process.cwd();
  const [bold, medium, logo] = await Promise.all([
    readFile(join(root, "src/assets/fonts/Manrope-800.ttf")),
    readFile(join(root, "src/assets/fonts/Manrope-500.ttf")),
    readFile(join(root, "public/logo.png")),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "linear-gradient(135deg, #fff8f5 0%, #ffdcc3 100%)",
        color: "#251911",
        fontFamily: "Manrope",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          width={96}
          height={96}
          style={{ borderRadius: 48 }}
          alt=""
        />
        <span style={{ fontSize: 44, fontWeight: 800, color: "#8B4513" }}>
          БыстроБариста
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: -2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 34,
            fontWeight: 500,
            color: "#554336",
            lineHeight: 1.3,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: [
        { name: "Manrope", data: bold, weight: 800, style: "normal" },
        { name: "Manrope", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
