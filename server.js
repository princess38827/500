import express from 'express';
import {rateLimit} from 'express-rate-limit';
import {fileURLToPath} from 'node:url';
import {specialists, router, AGENT_COUNT, MAX_SPECIALISTS} from './agents.js';
import {orchestrate} from './orchestrator.js';
const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy',1);
app.use((req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'");
  next();
});
app.use(express.json({limit:'32kb'}));
const demo = process.env.DEMO_MODE !== 'false';
app.get('/api/config',(req,res)=>res.json({demo,agentCount:AGENT_COUNT,maxSpecialists:MAX_SPECIALISTS,agents:[router,...specialists].map(({id,name,blurb,category})=>({id,name,blurb,category:category || 'General'}))}));
app.get('/health',(req,res)=>res.json({ok:true}));
app.post('/api/chat',rateLimit({windowMs:60000,limit:20,standardHeaders:'draft-8',legacyHeaders:false}),async(req,res)=>{
  const messages = req.body?.messages;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 20 ||
      messages.some(m=> !m || !['user','assistant'].includes(m.role) || typeof m.content !== 'string' || !m.content.trim() || m.content.length>8000) || messages.at(-1).role !== 'user') {
    return res.status(400).json({error:'Send 1–20 user/assistant messages, each containing 1–8000 characters, ending with a user message.'});
  }
  res.setHeader('Content-Type','application/x-ndjson');
  res.setHeader('Cache-Control','no-cache, no-transform');
  res.setHeader('X-Accel-Buffering','no');
  res.flushHeaders();
  const controller = new AbortController();
  res.on('close',()=>controller.abort());
  const emit = (type,data)=>{if (!res.destroyed) res.write(JSON.stringify({type,...data})+'\n');};
  try {await orchestrate(messages.map(({role,content})=>({role,content})),emit,{demo,signal:controller.signal});}
  catch(error) {emit('error',{message:error.message});}
  finally {res.end();}
});
app.use(express.static(fileURLToPath(new URL('./public',import.meta.url))));
app.use((error,req,res,next)=>{res.status(error.status || 500).json({error:error.status === 413 ? 'Message payload is too large.' : 'Request could not be processed.'});});
export default app;
if (!process.env.VERCEL) {
  app.listen(Number(process.env.PORT || 3000),'0.0.0.0',()=>console.log(`Cluster listening on port ${process.env.PORT || 3000} (${demo ? 'demo' : 'live'} mode)`));
}
