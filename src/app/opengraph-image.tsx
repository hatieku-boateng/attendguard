import { ImageResponse } from "next/og";

export const alt = "AttendGuard secure QR attendance management";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f8fafc",
          color: "#0f172a",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: "72px",
          width: "100%",
        }}
      >
        <div style={{ alignItems: "center", display: "flex", gap: 40 }}>
          <div
            style={{
              alignItems: "center",
              background: "#0f766e",
              color: "white",
              display: "flex",
              fontSize: 64,
              fontWeight: 800,
              height: 160,
              justifyContent: "center",
              width: 160,
            }}
          >
            AG
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 76, fontWeight: 800 }}>AttendGuard</div>
            <div style={{ color: "#475569", fontSize: 30, marginTop: 12 }}>
              Secure QR attendance management
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
