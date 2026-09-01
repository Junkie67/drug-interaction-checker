// Cloudflare Worker: llm-proxy.js
// Deploy in Cloudflare Workers and set a secret named OPENAI_API_KEY
addEventListener('fetch', event => {
  event.respondWith(handle(event.request))
})

async function handle(request) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  try {
    const payload = await request.json()
    const { drugA, drugB, labelA = '', labelB = '' } = payload

    // Build a careful prompt — ask for JSON only
    const prompt = `You are a concise, cautious medical summarizer.\n\nSummarize the interaction risk between the following two medicines. Return ONLY valid JSON with keys: severity ("Mild"|"Moderate"|"Severe"|"Unknown"), explanation (1-2 sentences), recommendation (1 sentence). Do NOT give medical advice; be conservative and suggest consulting a clinician.\n\nDrug A: ${drugA}\nDrug B: ${drugB}\n\nLabel A:\n${labelA}\n\nLabel B:\n${labelB}`

    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
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

    if (!openaiResp.ok) {
      const t = await openaiResp.text()
      return new Response(JSON.stringify({ error: 'LLM provider error', detail: t }), { status: 502, headers: { 'content-type': 'application/json' } })
    }

    const openaiJson = await openaiResp.json()
    const assistant = openaiJson.choices && openaiJson.choices[0] && openaiJson.choices[0].message && openaiJson.choices[0].message.content
    // Try to parse JSON from assistant's content
    let parsed = null
    try { parsed = JSON.parse(assistant) } catch (e) {
      // fallback: return assistant as text
      parsed = { severity: 'Unknown', explanation: assistant || 'No response', recommendation: 'Consult a clinician.' }
    }

    return new Response(JSON.stringify(parsed), { status: 200, headers: { 'content-type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid request', detail: String(err) }), { status: 400, headers: { 'content-type': 'application/json' } })
  }
}
