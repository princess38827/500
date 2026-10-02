export async function complete(messages, {json = false, signal} = {}) {
  const {META_API_KEY: key, META_API_BASE_URL: base, MUSE_MODEL_ID: model} = process.env;
  if (!key || !base || !model) throw new Error('Provider configuration is incomplete. Set META_API_KEY, META_API_BASE_URL and MUSE_MODEL_ID.');
  const url = new URL(`${base.replace(/\/$/, '')}/chat/completions`);
  if (url.protocol !== 'https:') throw new Error('The provider URL must use HTTPS.');
  const response = await fetch(url, {
    method:'POST', signal: AbortSignal.any([AbortSignal.timeout(45000), ...(signal ? [signal] : [])]),
    headers:{Authorization:`Bearer ${key}`, 'Content-Type':'application/json'},
    body:JSON.stringify({model, messages, max_tokens:1200, ...(json ? {response_format:{type:'json_object'}} : {})})
  });
  if (!response.ok) throw new Error(`Provider request failed (HTTP ${response.status}).`);
  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content;
  if (typeof answer !== 'string' || !answer.trim()) throw new Error('Provider returned an empty or unsupported response.');
  return answer;
}
