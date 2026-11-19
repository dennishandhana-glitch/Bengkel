export const validImage = (value: unknown): value is string =>
  typeof value === 'string' && value.length < 950000 && /^\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length % 4 === 0;

export async function createProduct(db:D1Database, q:any, role:string) {
  const name = String(q.name || '').trim();
  const rows = q.variants;
  if (!/^[a-f0-9-]{36}$/.test(q.key) || !name || name.length>150 ||
      !['Oli','Ban','Kampas Rem','Sparepart Lainnya'].includes(q.category) || !validImage(q.photo))
    throw Error('Lengkapi foto, nama produk, dan kategori.');
  if (!Array.isArray(rows) || !rows.length || rows.length>20 ||
      rows.some(v=>typeof v.size!=='string'||v.size.length>80||(rows.length>1&&!v.size.trim())||
        !Number.isSafeInteger(v.qty)||v.qty<0||v.qty>100000||
        !Number.isSafeInteger(v.price)||v.price<=0||v.price>1e9) ||
      new Set(rows.map(v=>v.size.trim().toLowerCase())).size!==rows.length)
    throw Error('Periksa nama varian, harga, dan stok. Nama varian harus berbeda.');
  const exists=()=>db.prepare('SELECT id FROM events WHERE id=?').bind(q.key).first();
  if(await exists())return;
  const photo='product-'+q.key;
  const stm=[db.prepare('INSERT INTO images VALUES(?,?)').bind(photo,q.photo)];
  const lines=[];
  for(const v of rows){
    const id=parseInt(crypto.randomUUID().replaceAll('-','').slice(0,12),16)+1000;
    stm.push(db.prepare('INSERT INTO variants VALUES(?,?,?,?,?)').bind(id,name,q.category,v.size.trim()||'-',photo));
    stm.push(db.prepare('INSERT INTO products VALUES(?,?,?,1)').bind(id,v.qty,v.price));
    lines.push({id,qty:v.qty,price:v.price});
  }
  stm.push(db.prepare('INSERT INTO events VALUES(?,?,?,?,?,?,?,?,?)').bind(q.key,Date.now(),'stock',role,'',JSON.stringify(lines),0,0,'Stok awal produk baru'));
  try { await db.batch(stm); } catch { if(!await exists())throw Error('Produk belum tersimpan. Coba kembali.'); }
}
