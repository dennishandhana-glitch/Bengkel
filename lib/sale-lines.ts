import type {Line, Product} from './workshop';

export function selectedLines(cart:Line[], product:Product | undefined, qty:number, sale:boolean) {
  if (!product || !Number.isInteger(qty) || qty < 1 || qty > 100000)
    throw Error('Pilih barang dan isi jumlah yang valid.');
  const previous = cart.find(line => line.id === product.id);
  const totalQty = (previous?.qty ?? 0) + qty;
  if (totalQty > 100000 || (sale && (!product.approved || totalQty > product.qty)))
    throw Error('Periksa jumlah stok dan harga barang.');
  const updated = {id:product.id, qty:totalQty, price:product.price};
  return previous ? cart.map(line => line.id === product.id ? updated : line) : [...cart, updated];
}
