import { ImageResponse } from "next/og"

export const alt = "Diario Imparcial — Muchas fuentes. Una lectura clara."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
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
          background: "#f4efe7",
          color: "#171717",
          padding: "72px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: 12, textTransform: "uppercase" }}>Diario</div>
        <div style={{ marginTop: 18, fontFamily: "Georgia", fontSize: 104, fontWeight: 700 }}>Imparcial</div>
        <div style={{ width: 110, height: 4, margin: "34px 0", background: "#c7b089" }} />
        <div style={{ fontSize: 28, letterSpacing: 8, textTransform: "uppercase" }}>
          Muchas fuentes. Una lectura clara.
        </div>
        <div style={{ marginTop: 42, fontSize: 24, color: "#4f6659" }}>
          Noticias cruzadas entre varios medios, con las fuentes a la vista.
        </div>
      </div>
    ),
    size
  )
}
