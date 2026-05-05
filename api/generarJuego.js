const OpenAI = require("openai");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function extraerJson(texto) {
  const limpio = (texto || "").trim();
  try { return JSON.parse(limpio); } catch (_) {}
  const match = limpio.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("La IA no devolvió JSON válido");
  return JSON.parse(match[0]);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { titulo } = req.body || {};
    if (!titulo || !String(titulo).trim()) {
      return res.status(400).json({ ok: false, error: "Falta el título del juego" });
    }

    const prompt = `
Sos un generador de fichas comerciales para una web argentina de juegos PlayStation.

Título recibido: ${titulo}

Necesito que investigues información actual del juego y devuelvas SOLO JSON válido con estas claves:
{
  "descripcion": "texto listo para copiar",
  "trailer": "url de YouTube verificada y activa"
}

Reglas de descripcion:
- No incluir el título del juego.
- Empezar con emoji.
- Descripción comercial, clara y más completa que una ficha básica.
- Incluir peso aproximado en GB.
- Incluir idioma, aclarando Español latino o Español España cuando aplique.
- Detectar multijugador: no tiene / local / online / ambos.
- Si el online requiere PS Plus, aclararlo.
- Si no tiene multijugador, aclarar que no requiere PS Plus.
- Terminar exactamente con:
✅ Original y completo
⚡ Entrega inmediata

Reglas de trailer:
- Debe ser URL completa de YouTube: https://www.youtube.com/watch?v=...
- Buscar un trailer activo, preferentemente oficial de PlayStation, publisher o canal reconocido.
- No inventar IDs.
- Si no podés verificar un trailer activo, devolver "SIN_TRAILER_VERIFICADO".
`;

    const response = await client.responses.create({
      model: "gpt-5.5",
      tools: [{ type: "web_search" }],
      input: prompt,
    });

    const data = extraerJson(response.output_text);

    return res.status(200).json({
      ok: true,
      descripcion: data.descripcion || "",
      trailer: data.trailer || "SIN_TRAILER_VERIFICADO",
    });
  } catch (err) {
    console.error("Error generando ficha:", err);
    return res.status(500).json({ ok: false, error: err.message || "Error interno" });
  }
};
