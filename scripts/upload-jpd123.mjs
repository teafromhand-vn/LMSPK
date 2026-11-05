import fs from 'node:fs';
import crypto from 'node:crypto';
const payload=JSON.parse(fs.readFileSync('tmp/import-jpd123/payload.json','utf8'));
const k=JSON.parse(fs.readFileSync(process.env.USERPROFILE+'/.google-credentials/service-account.json','utf8'));
const b=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),now=Math.floor(Date.now()/1000);
const s=b({alg:'RS256',typ:'JWT'})+'.'+b({iss:k.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
const tr=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:s+'.'+crypto.sign('RSA-SHA256',Buffer.from(s),k.private_key).toString('base64url')})});
const token=await tr.json();if(!tr.ok)throw Error('Authentication failed');
async function api(p,body){const r=await fetch('https://sheets.googleapis.com/v4/spreadsheets/1UepauW8YimdhsUmhxCm7YUMCFZpQmz9MR_EYBmC2Q2U'+p,{headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},...(body?{method:'POST',body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw Error(JSON.stringify(d));return d;}
const query='/values:batchGet?ranges=Collections!A:Z&ranges=Questions!A:Z';
const before=await api(query);
fs.writeFileSync(process.env.LOCALAPPDATA+'/Temp/opencode/before-old-jpd123-'+Date.now()+'.json',JSON.stringify(before,null,2));
const data=[];
for(const [j,sheet] of ['Collections','Questions'].entries()){
  const values=before.valueRanges[j].values,h=values[0];
  const key=r=>sheet==='Questions'?r.collectionId+'|'+r.id:r.id;
  const known=new Map(values.slice(1).map((r,i)=>[key(Object.fromEntries(h.map((c,n)=>[c,r[n]??'']))),i+2]));
  let next=values.length+1;
  for(const record of payload[sheet]){
    if(sheet==='Questions'){
      if(!record.prompt||!record.id)throw Error('Empty question');
      if(record.type==='flashcard'&&!record.answer)throw Error('Empty card answer');
      if(record.type==='multiple_choice'){const choices=JSON.parse(record.choices),indices=JSON.parse(record.correctIndices);if(indices.length!==1||!choices[indices[0]])throw Error('Invalid answer');}
    }
    data.push({range:`${sheet}!A${known.get(key(record))??next++}`,values:[h.map(c=>record[c]??'')]});
  }
}
if(!process.argv.includes('--apply')){console.log('Validated',data.length,'records. Pass --apply to upload.');process.exit(0);}
await api('/values:batchUpdate',{valueInputOption:'RAW',data});
const after=await api(query);
for(const [j,sheet] of ['Collections','Questions'].entries()){
  const values=after.valueRanges[j].values,h=values[0];
  for(const expected of payload[sheet]){const actual=values.slice(1).find(r=>r[h.indexOf('id')]===expected.id&&(sheet!=='Questions'||r[h.indexOf('collectionId')]===expected.collectionId));if(!actual||h.some((c,i)=>String(actual[i]??'')!==String(expected[c]??'')))throw Error('Readback mismatch '+expected.id);}
  console.log(sheet+': verified '+payload[sheet].length+' imported records; '+(values.length-1)+' total records');
}
