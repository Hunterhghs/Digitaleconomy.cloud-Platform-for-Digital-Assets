import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const runtime = "edge";
export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0b0f1a 0%, #1f1147 50%, #6b21a8 100%)",
          color: "white",
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          padding: 80,
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: "linear-gradient(135deg, #6366f1, #d946ef)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
            }}
          >
            ◆
          </div>
          <div style={{ display: "flex", fontSize: 36 }}>
            <span>DigitalEconomy</span>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>.cloud</span>
          </div>
        </div>
        <div style={{ display: "flex" }}>{siteConfig.tagline}</div>
        <div
          style={{
            marginTop: 24,
            fontSize: 24,
            fontWeight: 400,
            color: "rgba(255,255,255,0.75)",
            display: "flex",
          }}
        >
          A nonprofit commons for digital assets.
        </div>
      </div>
    ),
    { ...size },
  );
}
