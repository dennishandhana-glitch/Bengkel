import catalog from './catalog.json';
export type Product=typeof catalog[number]&{archived?:number,photo?:string,qty:number,approved:number};
export type Line={sourceRow?:number,id:number,qty:number,price:number};
export type Entry={hasProof?:boolean,id:string,time:number,kind:string,role:string,payment:string,lines:Line[],labor:number,total:number,memo:string};
export const money=(v:number)=>'Rp'+Math.round(v).toLocaleString('id-ID');
export const dateKey=(v:number)=>new Date(v+7*3600000).toISOString().slice(0,10);
export const dateText=(v:number,options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',...options}).format(v);
export const baseProducts=catalog.map(p=>({...p,qty:0,approved:p.review?0:1}));
export function sample(now:number){
 const products=baseProducts.map((p,i)=>({...p,qty:8+(i*11)%31})),events:Entry[]=[];
 const start=Date.parse(dateKey(now)+'T00:00:00+07:00');
 for(let day=0;day<30;day++){for(let j=0;j<[4,6,3,7,4,6,5][day%7];j++){
 const p=products[[3,17,9,22,32,18,13,23,14,16,20,30,28,38][(day*3+j)%14]];
 const qty=1+((day+j)%5===0?1:0),labor=(day+j)%3===0?15000:0;
 const time=Math.min(now,start-day*86400000+(9+j)*3600000+((day+j)*13%60)*60000);
 events.push({id:'demo'+String(9000-day*10+j),time,kind:'sale',payment:(day+j)%3===1?'Transfer':'Cash',role:j%2?'Admin':'Teknisi',lines:[{id:p.id,qty,price:p.price}],labor,total:p.price*qty+labor,memo:''});}}
 events.sort((a,b)=>b.time-a.time);return {products,events};
}
export function lastDays(now:number,count:number){return Array.from({length:count},(_,i)=>dateKey(now-(count-1-i)*86400000));}
