import catalog from '../../../lib/catalog.json';
import rows from './opening.json';

export const accountIds = {
  Supervisor: 'supervisor',
  Admin: 'admin',
  Teknisi: 'teknisi',
} as const;
const openingId = 'dokter-ban-opening-2026-11-18';
type Role = keyof typeof accountIds;

export async function initializeWorkshop(db: D1Database, secret: string | undefined, digest: (password: string, salt: string) => Promise<string>) {
  const isApplied = () => db.prepare('SELECT id FROM events WHERE id=?').bind(openingId).first();
  if (await isApplied()) return;
  if (!secret) throw new Error('Konfigurasi akun awal belum tersedia.');
  const accounts = JSON.parse(secret);
  const openingTotals = new Map<number,number>();
  for (const row of rows) openingTotals.set(row.id, (openingTotals.get(row.id) ?? 0) + row.qty);
  const lines = rows.map(row => ({...row, price: catalog.find(p => p.id === row.id)!.price}));
  const statements = [
    db.prepare('INSERT INTO events(id,time,kind,role,payment,lines,labor,total,memo) VALUES(?,?,?,?,?,?,?,?,?)')
      .bind(openingId, Date.now(), 'stock', 'Supervisor', '', JSON.stringify(lines), 0, 0, 'Inisialisasi katalog'),
  ];
  for (const role of Object.keys(accountIds) as Role[]) {
    const account = accounts[role];
    if (account?.id !== accountIds[role] || typeof account.password !== 'string') throw new Error('Konfigurasi akun tidak valid.');
    const salt = crypto.randomUUID();
    statements.push(db.prepare('INSERT INTO roles(role,salt,digest) VALUES(?,?,?) ON CONFLICT(role) DO UPDATE SET salt=excluded.salt,digest=excluded.digest')
      .bind(role, salt, await digest(account.password, salt)));
  }
  statements.push(db.prepare('DELETE FROM sessions'));
  for (let offset=0; offset<catalog.length; offset+=20) {
    const group=catalog.slice(offset,offset+20);
    const values=group.map(()=>'(?,?,?,?)').join(',');
    statements.push(db.prepare('INSERT INTO products(id,qty,price,approved) VALUES '+values+' ON CONFLICT(id) DO UPDATE SET qty=products.qty+excluded.qty')
      .bind(...group.flatMap(p=>[p.id,openingTotals.get(p.id)??0,p.price,p.review?0:1])));
  }
  try { await db.batch(statements); }
  catch (err) { if (!(await isApplied())) throw err; }
}
