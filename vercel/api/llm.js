// Vercel Serverless Function (Node) — /api/llm.js
// Deploy on Vercel and set environment variable OPENAI_API_KEY in project settings

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')
  try {
    const { drugA, drugB, labelA = '', labelB = '' } = req.body || {}
    const prompt = `You are a concise, cautious medical summarizer.\n\nSummarize the interaction risk between the following two medicines. Return ONLY valid JSON with keys: severity (\"Mild\"|\"Moderate\"|\"Severe\"|\"Unknown\"), explanation (1-2 sentences), recommendation (1 sentence). Do NOT give medical advice; be conservative and suggest consulting a clinician.\n\nDrug A: ${drugA}\nDrug B: ${drugB}\n\nLabel A:\n${labelA}\n\nLabel B:\n${labelB}`

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a concise, cautious medical summarizer. Avoid medical advice; encourage consultation.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 400,
        temperature: 0.2
      })
    })

    if (!resp.ok) {
      const text = await resp.text()
      return res.status(502).json({ error: 'LLM provider error', detail: text })
    }

    const j = await resp.json()
    const assistant = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content
    try {
      const parsed = JSON.parse(assistant)
      return res.status(200).json(parsed)
    } catch (e) {
      return res.status(200).json({ severity: 'Unknown', explanation: assistant || 'No response', recommendation: 'Consult a clinician.' })
    }
  } catch (err) {
    return res.status(400).json({ error: 'Invalid request', detail: String(err) })
  }
}
