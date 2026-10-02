import test from 'node:test';
import assert from 'node:assert/strict';
import {orchestrate,parseSelection} from '../orchestrator.js';
test('router selections are allowlisted, unique and capped',()=>{
 assert.deepEqual(parseSelection('{"agents":["coder","coder","fake","planner","analyst","skeptic","writer"]}'),['coder','planner','analyst','skeptic']);
});
test('specialists run concurrently and failed notes are disclosed in synthesis',async()=>{
 let pending=0,maxPending=0;const events=[];
 const client=async(messages,options)=>{
  if(options.json)return '{"agents":["coder","skeptic"]}';
  if(messages[0].content.startsWith('Reply naturally')){
    assert.match(messages.at(-1).content,/Unavailable/);return 'Final answer';
  }
  pending++;maxPending=Math.max(maxPending,pending);
  await new Promise(resolve=>setTimeout(resolve,10));pending--;
  if(messages[0].content.includes('Skeptic'))throw new Error('Unavailable');
  return 'Code notes';
 };
 assert.equal(await orchestrate([{role:'user',content:'Fix code'}],(type,data)=>events.push({type,...data}),{client}), 'Final answer');
 assert.equal(maxPending,2);assert.ok(events.some(e=>e.failed));assert.equal(events.at(-1).type,'reply');
});
test('demo mode never calls provider and labels illustrative output',async()=>{
 const reply=await orchestrate([{role:'user',content:'Write a draft'}],()=>{}, {demo:true,client:()=>{throw new Error('Must not call provider');}});
 assert.match(reply,/No model was called/);
});

test('500-agent roster is unique and includes the complete domain matrix',async()=>{
 const {specialists,router,AGENT_COUNT}=await import('../agents.js');
 assert.equal(AGENT_COUNT,500);
 assert.equal(new Set([router.id,...specialists.map(a=>a.id)]).size,500);
 assert.equal(specialists.filter(a=>a.category!=='General').length,480);
 assert.ok(specialists.every(a=>a.prompt && a.name && a.blurb));
 assert.deepEqual(parseSelection('{"agents":["software-risk","medicine-ethics"]}'),['software-risk','medicine-ethics']);
 assert.throws(()=>parseSelection('null'),/Invalid router selection/);
});
test('large roster routing calls only four specialists plus router and synthesis',async()=>{
 let calls=0;const notes=[];
 const client=async(messages,{json})=>{
  calls++;
  if(json){assert.match(messages[0].content,/sports-resources/);return JSON.stringify({agents:['software-risk','medicine-ethics','web-practice','data-analysis','coder']});}
  if(messages[0].content.startsWith('Reply naturally'))return 'Synthesized reply';
  notes.push(messages[0].content);return 'Specialist notes';
 };
 const events=[];
 await orchestrate([{role:'user',content:'Compare these ideas'}],(type,data)=>events.push({type,...data}),{client});
 assert.equal(calls,6);assert.equal(notes.length,4);
 assert.equal(events.find(e=>e.phase==='specialists').agents.length,4);
});
