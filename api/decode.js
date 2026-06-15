export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { billType, billText } = req.body;
  if (!billText) return res.status(400).json({ error: "No bill text provided" });

  const apiKey = process.env.GEMINI_API_KEY;

  const prompt = `You are a friendly bill expert helping everyday people understand their bills in plain language.

Bill type: ${billType}

Bill text:
${billText}

Respond ONLY in this exact JSON format (no markdown, no extra text):
{
  "summary": "2-3 sentence plain English summary of what this bill is and the total owed",
  "charges": [
    {"name": "Charge name", "amount": "$X.XX", "explanation": "Plain English explanation"}
  ],
  "hidden_fees": ["Description of any sneaky or unexpected fee"],
  "jargon": [
    {"term": "Technical term", "meaning": "What it actually means in plain English"}
  ],
  "tips": ["Practical tip or action the person can take"]
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1000 }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Gemini API error");

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
