import { setupAuth, onAuthStateChanged, signOut } from './auth-client.js';
const $ = id => document.getElementById(id);
const message = $('message');
let auth, user, business, categories = [], suppliers = [], products = [], offset = 0, importRows = [];
const limit = 100;
const units = ['pcs','cartons','boxes','bags','bottles','kg','g','litres','ml','trays','packs'];
function report(error) { const text = error.message || String(error); message.textContent = text; if (document.querySelector('dialog[open]')) alert(text); }
function node(tag, value) { const el = document.createElement(tag); el.textContent = value; return el; }
async function api(path, options = {}) {
  const headers = { Authorization: `Bearer ${await user.getIdToken()}`, ...options.headers };
  if (business) headers['X-Business-ID'] = business;
  if (options.body) headers['Content-Type'] = 'application/json';
  const response = await fetch('/api/v1' + path, {...options, headers});
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.error || 'Request failed');
  return data;
}
function selectOptions(select, rows) { select.replaceChildren(...rows.map(row => { const option = node('option', row.name); option.value = row.id; return option; })); }
async function loadMasters() { [categories, suppliers] = await Promise.all([api('/categories'), api('/suppliers')]); selectOptions($('category'), categories); selectOptions($('supplier'), suppliers); }
async function refresh() {
  message.textContent = '';
  const query = new URLSearchParams({limit, offset, search: $('search').value, status: $('status').value});
  const [data, summary] = await Promise.all([api('/products?' + query), api('/dashboard/summary')]); products = data;
  $('summary').replaceChildren(...Object.entries({'Products':summary.total_products,'Low stock':summary.low_stock,'Out of stock':summary.out_of_stock,'Inventory value':summary.inventory_value}).map(([key,value]) => { const card = node('div', key); card.className='card'; card.append(node('strong', value)); return card; }));
  $('items').replaceChildren(...products.map(p => {
    const tr = document.createElement('tr');
    const cat = categories.find(x => x.id === p.category_id)?.name || '—'; const sup = suppliers.find(x => x.id === p.supplier_id)?.name || '—';
    const status = Number(p.stock) <= 0 ? 'Out of stock' : Number(p.stock) <= Number(p.reorder_level) ? 'Low stock' : 'In stock';
    for (const value of [`${p.name} (${p.sku})`,cat,`${p.stock} ${p.unit}`,p.reorder_level,sup,p.cost_price,status]) tr.append(node('td', value));
    const actions = document.createElement('td');
    for (const [label, action] of [['Edit',()=>edit(p)], ['Stock',()=>movement(p)], ['Archive',()=>archive(p)]]) { const button = node('button',label); button.className='secondary'; button.addEventListener('click',action); actions.append(button); }
    tr.append(actions); return tr;
  }));
  $('page').textContent = `Items ${offset + (products.length ? 1 : 0)}–${offset + products.length}`;
  $('previous').disabled = offset === 0; $('next').disabled = products.length < limit;
}
function edit(p = {}) {
  $('product-form').reset(); $('product-id').value=p.id || ''; $('form-title').textContent=p.id ? 'Edit item' : 'Add item';
  for (const [id,key] of Object.entries({name:'name',sku:'sku',category:'category_id',supplier:'supplier_id',stock:'stock',unit:'unit',reorder:'reorder_level',cost:'cost_price',expiry:'expiry_date'})) if (p[key] != null) $(id).value=p[key];
  $('product-dialog').showModal();
}
function movement(p) { $('movement-form').reset(); $('movement-id').value=p.id; $('movement-dialog').showModal(); }
async function archive(p) { if (!confirm(`Archive ${p.name}?`)) return; try { await api('/products/'+p.id,{method:'DELETE'}); await refresh(); } catch(e){report(e);} }
function payload() { return {name:$('name').value,sku:$('sku').value,category_id:$('category').value,supplier_id:$('supplier').value,stock:$('stock').value,unit:$('unit').value,reorder_level:$('reorder').value,cost_price:$('cost').value,expiry_date:$('expiry').value || null}; }
$('product-form').addEventListener('submit', async e => { e.preventDefault(); try { const id=$('product-id').value; await api('/products'+(id?'/'+id:''),{method:id?'PATCH':'POST',body:JSON.stringify(payload())}); $('product-dialog').close(); await refresh(); } catch(err){report(err);} });
$('movement-form').addEventListener('submit', async e => { e.preventDefault(); try { await api(`/products/${$('movement-id').value}/movements`,{method:'POST',body:JSON.stringify({action:$('action').value,quantity:$('quantity').value,reason:$('reason').value})}); $('movement-dialog').close(); await refresh(); } catch(err){report(err);} });
for (const kind of ['category','supplier']) $(`add-${kind}`).addEventListener('click', async () => { const name=prompt(`New ${kind} name`); if(!name?.trim()) return; try { const created=await api('/'+(kind==='category'?'categories':'suppliers'),{method:'POST',body:JSON.stringify({name})}); await loadMasters(); $(kind).value=created.id; } catch(e){report(e);} });
for (const el of document.querySelectorAll('[data-close]')) el.addEventListener('click',()=>$(el.dataset.close).close());
$('new').onclick=()=>edit(); $('logout').onclick=()=>signOut(auth); $('previous').onclick=()=>{offset=Math.max(0,offset-limit);refresh().catch(report);}; $('next').onclick=()=>{offset+=limit;refresh().catch(report);};
for(const id of ['search','status']) $(id).addEventListener('input',()=>{offset=0;refresh().catch(report);});
$('business').onchange=async e=>{business=e.target.value;offset=0;try{await loadMasters();await refresh();}catch(err){report(err);}};
$('unit').replaceChildren(...units.map(x=>{const o=node('option',x);o.value=x;return o;}));
const headers=['Item Name','SKU','Category','Quantity','Unit','Reorder Level','Supplier','Cost','Expiry Date'];
$('template').onclick=()=>{const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([headers]),'Inventory');XLSX.writeFile(book,'URUS_Inventory_Template.xlsx');};
$('file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>10*1024*1024)throw Error('File exceeds 10 MB');const book=XLSX.read(await file.arrayBuffer(),{type:'array'});const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{defval:'',raw:false});importRows=rows.map(r=>({name:r['Item Name'],sku:r.SKU,category:r.Category,stock:r.Quantity,unit:r.Unit,reorder_level:r['Reorder Level'],supplier:r.Supplier,cost_price:r.Cost,expiry_date:r['Expiry Date']||null}));const result=await api('/imports/products/preview',{method:'POST',body:JSON.stringify({rows:importRows})});$('import-summary').textContent=`${result.valid} of ${result.total} rows ready. `+result.errors.map(x=>`Row ${x.row}: ${x.error}`).join('; ');$('import-confirm').disabled=result.errors.length>0;$('import-dialog').showModal();}catch(err){report(err);}finally{e.target.value='';}};
$('import-confirm').onclick=async()=>{try{await api('/imports/products/commit',{method:'POST',body:JSON.stringify({rows:importRows})});$('import-dialog').close();await loadMasters();await refresh();}catch(err){report(err);}};
$('export').onclick=async()=>{try{let all=[],start=0,batch;do{batch=await api(`/products?limit=500&offset=${start}`);all.push(...batch);start+=batch.length;}while(batch.length===500);const rows=all.map(p=>({'Item Name':p.name,SKU:p.sku,Category:categories.find(c=>c.id===p.category_id)?.name,Quantity:p.stock,Unit:p.unit,'Reorder Level':p.reorder_level,Supplier:suppliers.find(s=>s.id===p.supplier_id)?.name,Cost:p.cost_price,'Expiry Date':p.expiry_date||''}));const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet(rows,{header:headers}),'Inventory');XLSX.writeFile(book,'URUS_Inventory.xlsx');}catch(err){report(err);}};
try { auth=await setupAuth(); onAuthStateChanged(auth,async current=>{if(!current){location.replace('/');return;} user=current;try{const me=await api('/me');selectOptions($('business'),me.businesses);if(!me.businesses.length)throw Error('Your account is not assigned to a business.');business=String(me.businesses[0].id);await loadMasters();await refresh();}catch(err){report(err);}}); } catch(err){report(err);}
