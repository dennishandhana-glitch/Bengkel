'use client';
import {useRef,useState} from 'react';
import {Package,ChevronDown,ChevronRight} from 'lucide-react';
import {Product,Entry,dateText,money} from '../lib/workshop';
export const categories=['Oli','Ban','Kampas Rem','Sparepart Lainnya'];
export function category(p:Product){if(/oli/i.test(p.category))return 'Oli';if(/ban/i.test(p.category))return 'Ban';if(/kampas|disped/i.test(p.name)||p.category==='Kampas Rem')return 'Kampas Rem';return 'Sparepart Lainnya';}
export function Upload({label,value,change}:{label:string,value:string,change:(s:string)=>void}){
 const [message,setMessage]=useState('');const version=useRef(0);
 async function pick(file?:File){const seq=++version.current;change('');setMessage('');if(!file)return;
 try{setMessage('Memproses gambar…');const bitmap=await createImageBitmap(file);
 const scale=Math.min(1,1500/Math.max(bitmap.width,bitmap.height));const c=document.createElement('canvas');
 c.width=Math.max(1,Math.round(bitmap.width*scale));c.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=c.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(bitmap,0,0,c.width,c.height);bitmap.close();
 let data=c.toDataURL('image/jpeg',0.84).split(',')[1];if(data.length>=950000)data=c.toDataURL('image/jpeg',0.55).split(',')[1];if(data.length>=950000)throw Error();
 if(seq===version.current){change(data);setMessage('');}
 }catch{if(seq===version.current)setMessage('Gambar tidak dapat diproses. Pilih JPG, PNG, atau WebP yang lebih kecil.');}}
 return <label className="uploadfield">{label}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>pick(e.target.files?.[0])}/>{value&&<img alt={label} src={'data:image/jpeg;base64,'+value}/>}<small role="status">{message}</small></label>;
}
export function NewProduct({save}:{save:(q:any)=>Promise<void>}){
 const [name,N]=useState(''),[cat,C]=useState('Oli'),[photo,P]=useState(''),[rows,R]=useState([{size:'',price:'',qty:''}]),[err,E]=useState(''),[busy,B]=useState(false);const [key]=useState(()=>crypto.randomUUID());
 function update(i:number,k:string,v:string){R(rows.map((r,j)=>j===i?{...r,[k]:v}:r));}
 return <form className="form" onSubmit={async e=>{e.preventDefault();if(busy)return;E('');if(!photo){E('Pilih foto produk terlebih dahulu.');return;}B(true);try{await save({action:'product',key,name,category:cat,photo,variants:rows.map(r=>({...r,price:Number(r.price),qty:Number(r.qty)}))});}catch(x:any){E(x.message);}finally{B(false);}}}>
 <Upload label="Foto produk" value={photo} change={P}/><label>Nama produk<input required maxLength={150} value={name} onChange={e=>N(e.target.value)}/></label>
 <label>Kategori<select value={cat} onChange={e=>C(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
 {rows.map((r,i)=><fieldset key={i}><legend>{rows.length===1?'Harga dan stok':'Varian '+(i+1)}</legend><label>Nama varian {rows.length===1?'(opsional)':''}<input required={rows.length>1} maxLength={80} value={r.size} onChange={e=>update(i,'size',e.target.value)} placeholder="Contoh: 800 ml"/></label><div className="pair">{[['price','Harga jual (Rp)'],['qty','Stok awal (item)']].map(([k,l])=><label key={k}>{l}<input required type="number" min={k==='price'?1:0} max={k==='price'?1e9:100000} value={r[k as keyof typeof r]} onChange={e=>update(i,k,e.target.value)}/></label>)}</div>{rows.length>1&&<button type="button" className="textbutton" onClick={()=>R(rows.filter((_,j)=>j!==i))}>Hapus varian</button>}</fieldset>)}
 <button type="button" disabled={rows.length>=20} className="secondary" onClick={()=>R([...rows,{size:'',price:'',qty:''}])}>+ Tambah varian</button>
 {err&&<div className="error" role="alert">{err}</div>}<button className="primary full" disabled={busy}>{busy?'Menyimpan…':'Simpan produk dan stok'}</button></form>;
}
export function Catalog({products,edit,remove}:{products:Product[],remove?:(p:Product)=>void,edit:(p:Product)=>void}){
 const [expanded,set]=useState<Record<string,boolean>>({});const groups=new Map<string,Product[]>();
 for(const p of products){const k=p.photo||p.category+' / '+p.name;groups.set(k,[...(groups.get(k)||[]),p]);}
 return <div className="scroll"><table><thead><tr><th>Produk / varian</th><th>Kategori</th><th>Harga jual</th><th>Stok</th><th>Aksi</th></tr></thead><tbody>{Array.from(groups,([k,items])=>{
 const p=items[0],multiple=items.length>1,prices=items.map(p=>p.price).filter(Boolean);const range=prices.length?(Math.min(...prices)===Math.max(...prices)?money(prices[0]):money(Math.min(...prices))+' – '+money(Math.max(...prices))):'Hubungi Admin';
 return [<tr key={k}><td><div className="productcell">{p.photo?<img loading="lazy" alt="" src={'/api/workshop?image='+p.photo}/>:<span><Package size={19}/></span>}<div><b>{p.name}</b><small>{multiple?items.length+' varian':p.size==='-'?p.category:p.size}</small></div></div></td><td>{category(p)}</td><td>{range}{items.some(x=>!x.approved)&&<small className="warning">Perlu konfirmasi</small>}</td><td>{items.reduce((n,x)=>n+x.qty,0)} {p.uom}</td><td>{multiple?<button className="textbutton" onClick={()=>set({...expanded,[k]:!expanded[k]})}>{expanded[k]?<ChevronDown size={14}/>:<ChevronRight size={14}/>}Varian</button>:<button className="textbutton" onClick={()=>edit(p)}>Atur harga</button>}{!multiple&&remove&&<button className="deleteAction" onClick={()=>remove(p)}>Hapus barang</button>}</td></tr>,...(expanded[k]&&multiple?items.map(x=><tr className="variantrow" key={x.id}><td>↳ {x.size} {x.size==='-'?x.name:''}</td><td>{x.category}</td><td>{x.price?money(x.price):'Hubungi Admin'}</td><td>{x.qty} {x.uom}</td><td><button className="textbutton" onClick={()=>edit(x)}>Atur harga</button>{remove&&<button className="deleteAction" onClick={()=>remove(x)}>Hapus varian</button>}</td></tr>):[])];})}</tbody></table>{!products.length&&<div className="empty">Barang tidak ditemukan.</div>}</div>;
}
export function Receipt({entry,product}:{entry:Entry,product:(id:number)=>Product}){
 const [width,W]=useState('58');return <><div className="receiptActions"><label>Lebar kertas <select value={width} onChange={e=>W(e.target.value)}><option value="58">58 mm</option><option value="80">80 mm</option></select></label><button className="primary" onClick={()=>window.print()}>Cetak invoice</button></div><article className="paper" style={{width:width==='58'?'50mm':'72mm'}}><h2>Dokter Ban</h2><b>INVOICE</b><p>{entry.id}</p><p>{dateText(entry.time,{dateStyle:'short',timeStyle:'short'})} WIB · {entry.role}</p><hr/>{entry.lines.map(l=><div key={l.id}><b>{product(l.id).name} {product(l.id).size==='-'?'':product(l.id).size}</b><div>{l.qty} × {money(l.price)}<strong>{money(l.qty*l.price)}</strong></div></div>)}<hr/><div>Jasa pemasangan<strong>{money(entry.labor)}</strong></div><div>Total<strong>{money(entry.total)}</strong></div><div>Pembayaran<strong>{entry.payment}</strong></div>{entry.memo&&<p>{entry.memo}</p>}</article></>;
}
