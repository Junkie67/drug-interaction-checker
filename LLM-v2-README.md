# LLM v2 — Serverless proxy templates (Cloudflare Worker & Vercel)

This folder contains templates and instructions to add an LLM-powered summarization layer to the openFDA demo without exposing API keys client-side.

Overview
- The static frontend (GitHub Pages) fetches label text from openFDA (already implemented in index.html).
- To get richer plain-language explanations, the frontend POSTs the label text to a small serverless proxy.
- The proxy holds your OpenAI API key as a secret (environment variable) and calls the OpenAI LLM, returning a small JSON result: { severity, explanation, recommendation }.

Two deployment options (pick one):

A) Cloudflare Workers (recommended — fast, free tier)
1. Log in to Cloudflare Dashboard → Workers
2. Create a new Worker and paste the contents of `cloudflare-worker/llm-proxy.js` into the script area.
3. Add a secret variable named `OPENAI_API_KEY` in the Worker’s Settings → Variables (the value is your OpenAI API key).
4. Deploy the worker and note the script URL (e.g., `https://<your-worker>.<your-subdomain>.workers.dev/`).
5. On the frontend, send POST requests to that URL with JSON { drugA, drugB, labelA, labelB } and show the returned JSON.

B) Vercel Serverless Function (if you prefer Vercel)
1. Add the file `vercel/api/llm.js` to your Vercel project (already included in this repo under `vercel/api/llm.js`).
2. In the Vercel project settings, add an environment variable `OPENAI_API_KEY` with your key.
3. Deploy the project. Your function will be available at `https://<your-vercel-deploy>/api/llm`.
4. The frontend POSTs JSON { drugA, drugB, labelA, labelB } to that endpoint.

Frontend example (call your deployed worker/function)

```javascript
async function callLLMProxy(url, payload){
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(payload)
  })
  if (!r.ok) throw new Error('Proxy error')
  return r.json()
}

// payload example
const payload = { drugA: 'Warfarin', drugB: 'Aspirin', labelA: '...text from openFDA...', labelB: '...text...' }
const result = await callLLMProxy('https://your-worker.workers.dev/', payload)
// result: { severity, explanation, recommendation }
```

Prompting & safety notes
- The templates use conservative prompts (temperature 0.2) and request JSON-only output. However, LLMs can still hallucinate — always show a clear disclaimer and suggest consulting healthcare professionals.
- Monitor API usage and add rate limiting or caching if traffic grows.

If you’d like, I can:
- Help you deploy the Cloudflare Worker step-by-step.
- Deploy the Vercel function if you provide access to the Vercel project (or I can give exact CLI commands).
- Add optional client-side UI wiring to call the deployed proxy and display LLM results alongside the current rule-based output.
