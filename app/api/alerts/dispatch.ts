// Ejemplo dentro de /api/alerts/dispatch.ts
export default async function handler(req, res) {
  if (req.query.secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  // tu lógica de envío aquí
  res.json({ ok: true })
}
