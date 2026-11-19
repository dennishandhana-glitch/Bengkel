import {createProduct,validImage} from './products';
import { env } from 'cloudflare:workers';
import catalog from '../../../lib/catalog.json';
export const dynamic='force-dynamic';
import {accountIds,initializeWorkshop} from './opening';
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
async function digest(password:string,salt:string){const enc=new TextEncoder(); const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(salt),iterations:100000},key,256));}
function reply(data:unknown,status=200,cookie?:string){const h:Record<string,string>={'Cache-Control':'no-store'};if(cookie)h['Set-Cookie']=cookie;return Response.json(data,{status,headers:h});}
const bad=(s:string,n=400)=>reply({error:s},n);
function actor(r:Request){return r.headers.get('oai-authenticated-user-id')||'';}
function sid(r:Request){return /(?:^|; )pitlog=([a-f0-9-]{36})/.exec(r.headers.get('cookie')||'')?.[1]||'';}
async function session(r:Request){return env.DB!.prepare('SELECT role FROM sessions WHERE id=? AND expires>? AND actor=?').bind(sid(r),Date.now(),actor(r)).first<{role:string}>();}
export async function GET(r:Request){const db=env.DB!;await initializeWorkshop(db,env.DOKTER_BAN_INITIAL_ACCOUNTS,digest);const s=await session(r);if(!s)return reply({role:null});const img=new URL(r.url).searchParams.get('image');
if(img){
 if(!img.startsWith('product-')){
 const event=await db.prepare('SELECT role FROM events WHERE id=?').bind(img.replace(/^proof-/, '')).first();
 if(!event||s.role==='Teknisi'||(s.role==='Admin'&&event.role!=='Admin'))return bad('Akses dibatasi.',403);
 }
 const media=await db.prepare('SELECT data FROM images WHERE id=?').bind(img).first<{data:string}>();
 if(!media)return bad('Foto tidak tersedia.',404);
 return new Response(Uint8Array.from(atob(media.data),c=>c.charCodeAt(0)),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
const products=(await db.prepare('SELECT p.*, EXISTS(SELECT 1 FROM archived_products a WHERE a.id=p.id) AS archived, v.name,v.category,v.size,v.photo FROM products p LEFT JOIN variants v ON p.id=v.id').all()).results.map(p=>({...catalog.find(x=>x.id===p.id),...Object.fromEntries(Object.entries(p).filter(([,v])=>v!==null)),uom:catalog.find(x=>x.id===p.id)?.uom||'item'}));
const events=s.role==='Teknisi'?[]:(await (s.role==='Admin'?db.prepare('SELECT events.*, EXISTS(SELECT 1 FROM images WHERE images.id=\'proof-\'||events.id) AS hasProof FROM events WHERE kind IN (\'stock\',\'sale\') AND role=? ORDER BY time DESC').bind('Admin'):db.prepare('SELECT events.*, EXISTS(SELECT 1 FROM images WHERE images.id=\'proof-\'||events.id) AS hasProof FROM events WHERE kind IN (\'stock\',\'sale\') ORDER BY time DESC')).all()).results.map(e=>({...e,lines:JSON.parse(String(e.lines))}));return reply({role:s.role,products,events});}
async function openSession(r:Request,role:string){const id=crypto.randomUUID();await env.DB!.prepare('INSERT INTO sessions VALUES(?,?,?,?)').bind(id,role,Date.now()+8*3600000,actor(r)).run();return reply({ok:true},200,'pitlog='+id+'; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800'+(new URL(r.url).protocol==='https:'?'; Secure':''));}
const isPrice=(v:unknown)=>typeof v==='number' && Number.isSafeInteger(v)&&v>0&&v<=1000000000;
export async function POST(r:Request){
 const origin=r.headers.get('origin');if(origin && new URL(origin).host!==new URL(r.url).host && new URL(origin).host!==r.headers.get('x-forwarded-host'))return bad('Permintaan tidak valid.',403);
 if(!r.headers.get('content-type')?.includes('application/json'))return bad('Format tidak valid.');
 const db=env.DB!,q=await r.json() as any;const act=q.action;
 await initializeWorkshop(db,env.DOKTER_BAN_INITIAL_ACCOUNTS,digest);
 if(act==='login'){
 const typedId=typeof q.username==='string'?q.username.trim().toLowerCase():'';
 const role=Object.entries(accountIds).find(([,id])=>id===typedId)?.[0];
 if(typeof q.password!=='string'||q.password.length>128)return bad('ID atau password salah.',401);
 const now=Date.now(),key=actor(r)||r.headers.get('cf-connecting-ip')||'local';
 const hit=await db.prepare('INSERT INTO attempts VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN until<=? THEN 1 ELSE count+1 END, until=CASE WHEN until<=? THEN excluded.until ELSE until END RETURNING count').bind(key,now+900000,now,now).first<{count:number}>();
 if(hit && hit.count>12)return bad('Terlalu banyak percobaan. Coba lagi dalam 15 menit.',429);
 const a=await db.prepare('SELECT * FROM roles WHERE role=?').bind(role??'').first<{salt:string,digest:string}>();
 if(!a||await digest(q.password,a.salt)!==a.digest)return bad('ID atau password salah.',401);
 await db.prepare('DELETE FROM attempts WHERE id=?').bind(key).run();return openSession(r,role!);}
 const s=await session(r);if(!s)return bad('Silakan masuk kembali.',401);
 if(act==='deleteProduct'||act==='deleteSale'){
   if(s.role!=='Supervisor')return bad('Hanya Supervisor dapat menghapus.',403);
   if(act==='deleteProduct'){
     if(!Number.isSafeInteger(q.id))return bad('Produk tidak valid.');
     await db.prepare('INSERT OR IGNORE INTO archived_products SELECT id FROM products WHERE id=?').bind(q.id).run();
     return reply({ok:true});
   }
   const event=await db.prepare('SELECT kind,lines FROM events WHERE id=?').bind(q.id).first<{kind:string,lines:string}>();
   if(!event||!['sale','void'].includes(event.kind))return bad('Penjualan tidak ditemukan.',404);
   if(event.kind==='void')return reply({ok:true});
   const reversal=JSON.parse(event.lines).map((l:{id:number,qty:number})=>db.prepare("UPDATE products SET qty=qty+? WHERE id=? AND EXISTS(SELECT 1 FROM events WHERE id=? AND kind='sale')").bind(l.qty,l.id,q.id));
   reversal.push(db.prepare("UPDATE events SET kind='void' WHERE id=? AND kind='sale'").bind(q.id));
   await db.batch(reversal);return reply({ok:true});
 }
 if(act==='logout'){await db.prepare('DELETE FROM sessions WHERE id=?').bind(sid(r)).run();return reply({ok:true},200,'pitlog=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict');}
 if((['stock','price','product'].includes(act))&&s.role==='Teknisi')return bad('Akses dibatasi.',403);
 if(act==='product'){try{await createProduct(db,q,s.role);return reply({ok:true});}catch(e){return bad((e as Error).message);}}
 if(act==='price'){if(!(await db.prepare('SELECT id FROM products WHERE id=?').bind(q.id).first())||!isPrice(q.price))return bad('Harga tidak valid.');await db.prepare('UPDATE products SET price=?, approved=1 WHERE id=?').bind(q.price,q.id).run();return reply({ok:true});}
 if(!['stock','sale'].includes(act))return bad('Aksi tidak dikenal.');
 if(!Array.isArray(q.lines)||q.lines.length===0||q.lines.length>50||new Set(q.lines.map((x:any)=>x.id)).size!==q.lines.length||typeof q.key!=='string'||!/^[-a-f0-9]{36}$/.test(q.key))return bad('Daftar barang tidak valid.');
 async function saved(){const e=await db.prepare('SELECT * FROM events WHERE id=? AND role=? AND kind=?').bind(q.key,s!.role,act).first();return e?reply({ok:true,entry:{...e,lines:JSON.parse(String(e.lines)),hasProof:act==='sale'&&e.payment!=='Cash'}}):null;}
 const previous=await saved();if(previous)return previous;
 const selling=act==='sale';const labor=selling&&q.install?q.labor:0;if(selling&&(!['Cash','Transfer','QRIS'].includes(q.payment)||(q.install&&!isPrice(labor))))return bad('Periksa pembayaran dan jasa pemasangan.');
 const stm=[],lines=[];let total=labor;
 if(selling&&q.payment!=='Cash'){if(!validImage(q.proof))return bad('Unggah bukti pembayaran Transfer atau QRIS.');stm.push(db.prepare('INSERT INTO images VALUES(?,?)').bind('proof-'+q.key,q.proof));}
 for(const ln of q.lines){if(!Number.isSafeInteger(ln.qty)||ln.qty<=0||ln.qty>100000)return bad('Jumlah barang tidak valid.');const p=await db.prepare('SELECT * FROM products WHERE id=?').bind(ln.id).first<{price:number,qty:number,approved:number}>();if(!p)return bad('Barang tidak ditemukan.');
 if(selling && (!p.approved||p.price<=0||p.price!==ln.price))return bad('Harga berubah atau belum dikonfirmasi. Muat ulang katalog.',409);
 if(selling && ln.qty>p.qty)return bad('Stok barang tidak cukup.',409);
 lines.push({id:ln.id,qty:ln.qty,price:p.price});if(selling)total+=p.price*ln.qty;
 stm.push(db.prepare('UPDATE products SET qty=CASE WHEN id IN (SELECT id FROM archived_products) THEN -1 ELSE qty+? END WHERE id=?').bind((selling?-1:1)*ln.qty,ln.id));}
 if(!Number.isSafeInteger(total))return bad('Total terlalu besar.');
 stm.push(db.prepare('INSERT INTO events VALUES(?,?,?,?,?,?,?,?,?)').bind(q.key,Date.now(),act,s.role,selling?q.payment:'',JSON.stringify(lines),labor,total,String(q.memo||'').slice(0,120)));
 try{await db.batch(stm);}catch{const prior=await saved();if(prior)return prior;return bad('Transaksi belum tersimpan. Periksa stok terbaru.',409);}
 return (await saved())!;}
