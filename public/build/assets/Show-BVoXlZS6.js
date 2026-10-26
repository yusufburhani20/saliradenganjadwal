import{o as e}from"./chunk-zsgVPwQN.js";import{a as t,i as n,t as r}from"./index.esm-Ba059CQw.js";import{r as i,t as a}from"./jsx-runtime-B_pW9uh6.js";import{t as o}from"./AuthenticatedLayout-NfKM3SrT.js";import{t as s}from"./ArrowLeftIcon-D2Cg3eGj.js";import{t as c}from"./CheckCircleIcon-MLy7YXXq.js";import{t as l}from"./ClockIcon-Cw9J-Qwn.js";import{t as u}from"./PlusIcon-C_x3k8nx.js";import{t as d}from"./PrinterIcon-Dgkm-D-k.js";import{t as f}from"./QrCodeIcon-CriR1PAR.js";import{t as p}from"./TrashIcon-DL9QCgVa.js";import{t as m}from"./XCircleIcon-h03nFJX6.js";var h=e(i(),1),g=a(),_={tersedia:`bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200`,dipinjam:`bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200`,perbaikan:`bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200`,dihapus:`bg-slate-100 text-slate-500 border border-slate-200`},v={tersedia:`Tersedia`,dipinjam:`Dipinjam`,perbaikan:`Perbaikan`,dihapus:`Dihapus`},y={masuk:`bg-emerald-100 text-emerald-700`,keluar:`bg-red-100 text-red-700`,pinjam:`bg-blue-100 text-blue-700`,kembali:`bg-indigo-100 text-indigo-700`,perbaikan:`bg-amber-100 text-amber-700`,pemusnahan:`bg-slate-100 text-slate-500`},b={tersedia:[{action:`pinjam`,label:`Pinjam`,icon:null,color:`bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400`},{action:`perbaikan`,label:`Kirim Perbaikan`,icon:null,color:`bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400`}],dipinjam:[{action:`kembali`,label:`Kembalikan`,icon:null,color:`bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400`},{action:`perbaikan`,label:`Kirim Perbaikan`,icon:null,color:`bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400`}],perbaikan:[{action:`kembali`,label:`Selesai Perbaikan`,icon:null,color:`bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400`},{action:`pemusnahan`,label:`Musnahkan`,icon:null,color:`bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400`}],dihapus:[]};function x({barcode:e,selected:t,onToggleSelect:n,onDelete:r,onAction:i,schoolName:a,schoolLogo:o,itemName:s}){let c=(0,h.useRef)(null),[l,u]=(0,h.useState)(null),[f,m]=(0,h.useState)(null),[y,x]=(0,h.useState)(``),[S,C]=(0,h.useState)(e.status);(0,h.useEffect)(()=>{let t=()=>{if(c.current&&typeof JsBarcode<`u`)try{JsBarcode(c.current,e.barcode_value,{format:`CODE128`,width:1.4,height:36,displayValue:!0,fontSize:9,margin:4})}catch{}};if(typeof JsBarcode>`u`){let e=document.createElement(`script`);e.src=`https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js`,e.onload=t,document.head.appendChild(e)}else t()},[e.barcode_value]);let w=()=>{let t=window.open(``,`_blank`,`width=450,height=320`);if(!t||!c.current)return;let n=`<!DOCTYPE html><html><head><title>${e.barcode_value}</title>
        <style>
            body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:Arial,sans-serif;}
            .barcode-box{border:1.5px solid #000;border-radius:6px;padding:10px;width:280px;display:flex;flex-direction:column;align-items:center;background:#fff;box-sizing:border-box;}
            .header{display:flex;align-items:center;width:100%;gap:8px;margin-bottom:4px;}
            .logo{width:28px;height:28px;object-fit:contain;}
            .school-info{text-align:left;line-height:1.1;}
            .school-name{font-size:9px;font-weight:800;text-transform:uppercase;color:#000;}
            .tagline{font-size:7px;color:#666;font-weight:600;}
            .divider{width:100%;border-top:1.5px solid #000;margin:6px 0;}
            .item-name{font-size:9px;font-weight:700;text-align:center;margin-bottom:4px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;}
            svg{max-width:100%;height:35px;}
            .serial{font-size:9px;font-weight:700;font-family:monospace;margin-top:4px;}
        </style></head>
        <body>
            <div class="barcode-box">
                <div class="header">
                    <img src="${o}" class="logo" />
                    <div class="school-info">
                        <div class="school-name">${a}</div>
                        <div class="tagline">INVENTARIS SEKOLAH</div>
                    </div>
                </div>
                <div class="divider"></div>
                <div class="item-name">${s}</div>
                ${c.current.outerHTML}
                <div class="serial">${e.serial_number||e.barcode_value}</div>
            </div>
            <script>window.print();window.close();<\/script>
        </body></html>`;t.document.write(n),t.document.close()},T=async t=>{u(t),await i(e.id,t,y)&&C({pinjam:`dipinjam`,kembali:`tersedia`,perbaikan:`perbaikan`,pemusnahan:`dihapus`}[t]??S),u(null),m(null),x(``)},E=b[S]??[];return(0,g.jsxs)(`div`,{className:`bg-white dark:bg-slate-800 border ${t?`border-indigo-500 ring-1 ring-indigo-500`:`border-slate-100 dark:border-slate-700/50`} rounded-2xl p-4 flex flex-col gap-3 relative transition-all`,children:[(0,g.jsx)(`div`,{className:`absolute top-2 left-2 z-10`,children:(0,g.jsx)(`input`,{type:`checkbox`,checked:t,onChange:n,className:`rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4 cursor-pointer bg-white`})}),(0,g.jsx)(`div`,{className:`flex items-center justify-center bg-slate-50 dark:bg-slate-900/30 rounded-xl py-2 px-1 mt-3`,children:(0,g.jsx)(`svg`,{ref:c,className:`max-w-full`})}),(0,g.jsxs)(`div`,{className:`flex items-center justify-between gap-2`,children:[(0,g.jsxs)(`div`,{className:`min-w-0`,children:[(0,g.jsx)(`p`,{className:`text-[10px] font-mono text-slate-500 truncate`,children:e.barcode_value}),e.serial_number&&(0,g.jsx)(`p`,{className:`text-[10px] text-slate-400`,children:e.serial_number})]}),(0,g.jsx)(`span`,{className:`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-lg ${_[S]??``}`,children:v[S]??S})]}),f&&(0,g.jsxs)(`div`,{className:`space-y-1.5 p-2.5 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700`,children:[(0,g.jsxs)(`p`,{className:`text-[10px] font-bold text-slate-600 dark:text-slate-400`,children:[`Konfirmasi: `,b[S]?.find(e=>e.action===f)?.label]}),(0,g.jsx)(`textarea`,{rows:2,value:y,onChange:e=>x(e.target.value),placeholder:`Catatan (opsional)...`,className:`w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 resize-none focus:ring-1 focus:ring-indigo-400`}),(0,g.jsxs)(`div`,{className:`flex gap-1.5`,children:[(0,g.jsx)(`button`,{onClick:()=>{m(null),x(``)},className:`flex-1 text-[10px] font-bold py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 hover:bg-slate-100 transition-all`,children:`Batal`}),(0,g.jsx)(`button`,{onClick:()=>T(f),disabled:!!l,className:`flex-1 text-[10px] font-bold py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all`,children:l?`...`:`Ya, Konfirmasi`})]})]}),!f&&S!==`dihapus`&&(0,g.jsx)(`div`,{className:`flex flex-col gap-1.5`,children:E.map(e=>(0,g.jsx)(`button`,{onClick:()=>m(e.action),disabled:!!l,className:`w-full text-[10px] font-bold py-1.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 ${e.color}`,children:e.label},e.action))}),(0,g.jsxs)(`div`,{className:`flex gap-2`,children:[(0,g.jsxs)(`button`,{onClick:w,className:`flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-xl transition-all`,children:[(0,g.jsx)(d,{className:`w-3 h-3`}),` Cetak`]}),(0,g.jsx)(`button`,{onClick:r,className:`px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-500 text-[10px] font-bold rounded-xl transition-all`,children:(0,g.jsx)(p,{className:`w-3 h-3`})})]})]})}function S({item:e,schoolName:i,schoolLogo:a}){let[p,_]=(0,h.useState)(!1),[v,b]=(0,h.useState)([]),[S,C]=(0,h.useState)(null),{data:w,setData:T,post:E,processing:D,errors:O,reset:k}=t({quantity:1,serial_prefix:``}),A=(e,t)=>{C({type:e,msg:t}),setTimeout(()=>C(null),3500)},j=t=>{t.preventDefault(),E(route(`admin.inventory.barcodes.store`,e.id),{onSuccess:()=>{_(!1),k()}})},M=e=>{confirm(`Hapus barcode ini?`)&&n.delete(route(`admin.inventory.barcodes.destroy`,e))},N=async(e,t,n)=>{try{let r=await(await fetch(route(`admin.inventory.action`),{method:`POST`,headers:{"Content-Type":`application/json`,"X-CSRF-TOKEN":document.querySelector(`meta[name="csrf-token"]`)?.content||``,Accept:`application/json`},body:JSON.stringify({barcode_id:e,action:t,notes:n})})).json();return r.success?(A(`success`,r.message),!0):(A(`error`,r.message),!1)}catch{return A(`error`,`Gagal menghubungi server.`),!1}},P=e=>{b(t=>t.includes(e)?t.filter(t=>t!==e):[...t,e])},F=()=>{v.length===(e.barcodes?.length||0)?b([]):b((e.barcodes||[]).map(e=>e.id))},I=()=>{if(v.length===0)return;let t=window.open(``,`_blank`);if(!t)return;let n=`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cetak Barcode Massal - ${e.name}</title>
            <style>
                @media print {
                    @page { size: A4 portrait; margin: 10mm 8mm; }
                    body { margin: 0; background: white; }
                }
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 10px auto; 
                    max-width: 210mm; /* A4 width */
                    background: #f8fafc;
                }
                .page-container {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 6px;
                    padding: 10px;
                    background: white;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    min-height: 297mm; /* A4 height */
                    box-sizing: border-box;
                }
                @media print {
                    .page-container { box-shadow: none; padding: 0; min-height: auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
                }
                .barcode-box { 
                    border: 1.5px solid #000; 
                    border-radius: 6px; 
                    padding: 8px; 
                    box-sizing: border-box; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    background: white;
                    break-inside: avoid; 
                    page-break-inside: avoid; 
                }
                .header {
                    display: flex;
                    align-items: center;
                    width: 100%;
                    gap: 6px;
                    margin-bottom: 2px;
                }
                .logo {
                    width: 24px;
                    height: 24px;
                    object-fit: contain;
                }
                .school-info {
                    text-align: left;
                    line-height: 1.1;
                }
                .school-name {
                    font-size: 8px;
                    font-weight: 800;
                    text-transform: uppercase;
                    color: #000;
                }
                .tagline {
                    font-size: 6px;
                    color: #666;
                    font-weight: 600;
                }
                .divider {
                    width: 100%;
                    border-top: 1.5px solid #000;
                    margin: 4px 0;
                }
                .item-name {
                    font-size: 8px;
                    font-weight: 700;
                    text-align: center;
                    margin-bottom: 2px;
                    text-transform: uppercase;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    width: 100%;
                }
                svg { max-width: 100%; height: 30px; }
                .serial { font-size: 8px; font-weight: bold; font-family: monospace; margin-top: 2px; }
            </style>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
        </head>
        <body>
            <div class="page-container">
            `+v.map(t=>{let n=e.barcodes.find(e=>e.id===t);return`
                <div class="barcode-box">
                    <div class="header">
                        <img src="${a}" class="logo" />
                        <div class="school-info">
                            <div class="school-name">${i}</div>
                            <div class="tagline">INVENTARIS SEKOLAH</div>
                        </div>
                    </div>
                    <div class="divider"></div>
                    <div class="item-name">${e.name}</div>
                    <svg id="bc-${n.id}"></svg>
                    <div class="serial">${n.serial_number||n.barcode_value}</div>
                </div>`}).join(``)+`
            </div>
            <script>
                window.onload = function() {
                    `+v.map(t=>{let n=e.barcodes.find(e=>e.id===t);return`JsBarcode("#bc-`+n.id+`", "`+n.barcode_value+`", { format: "CODE128", width: 1.5, height: 30, displayValue: false, margin: 4 });`}).join(`
`)+`
                    setTimeout(() => { window.print(); window.close(); }, 500);
                };
            <\/script>
        </body>
        </html>`;t.document.write(n),t.document.close()},L=(e.barcodes||[]).reduce((e,t)=>(e[t.status]=(e[t.status]||0)+1,e),{});return(0,g.jsxs)(o,{header:(0,g.jsxs)(`div`,{className:`flex items-center gap-4`,children:[(0,g.jsx)(`a`,{href:route(`admin.inventory.index`),className:`p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors`,children:(0,g.jsx)(s,{className:`w-5 h-5 text-slate-500`})}),(0,g.jsxs)(`div`,{children:[(0,g.jsx)(`h2`,{className:`text-xl font-black text-slate-800 dark:text-slate-200 tracking-tight`,children:e.name}),(0,g.jsxs)(`p`,{className:`text-xs text-slate-500 font-mono mt-0.5`,children:[e.code,` · `,e.category?.name]})]})]}),children:[(0,g.jsx)(r,{title:`Inventaris: ${e.name}`}),S&&(0,g.jsxs)(`div`,{className:`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-bold ${S.type===`success`?`bg-emerald-600 text-white`:`bg-red-600 text-white`}`,children:[S.type===`success`?(0,g.jsx)(c,{className:`w-5 h-5`}):(0,g.jsx)(m,{className:`w-5 h-5`}),S.msg]}),(0,g.jsxs)(`div`,{className:`space-y-6`,children:[(0,g.jsxs)(`div`,{className:`grid grid-cols-1 lg:grid-cols-3 gap-6`,children:[(0,g.jsxs)(`div`,{className:`lg:col-span-1 space-y-4`,children:[(0,g.jsxs)(`div`,{className:`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm p-6 space-y-4`,children:[(0,g.jsx)(`h3`,{className:`text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3`,children:`Detail Barang`}),(0,g.jsx)(`dl`,{className:`space-y-3`,children:[[`Nama`,e.name],[`Kode`,e.code],[`Merek`,e.brand||`-`],[`Lokasi`,e.location||`-`],[`Harga Satuan`,e.unit_price?`Rp ${Number(e.unit_price).toLocaleString(`id`)}`:`-`],[`Deskripsi`,e.description||`-`]].map(([e,t])=>(0,g.jsxs)(`div`,{className:`flex gap-3`,children:[(0,g.jsx)(`dt`,{className:`text-xs text-slate-400 font-medium w-24 shrink-0`,children:e}),(0,g.jsx)(`dd`,{className:`text-xs text-slate-800 dark:text-slate-200 font-semibold flex-1`,children:t})]},e))})]}),(0,g.jsxs)(`div`,{className:`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm p-5 space-y-3`,children:[(0,g.jsx)(`h3`,{className:`text-sm font-bold text-slate-900 dark:text-white`,children:`Rekapitulasi Unit`}),(0,g.jsxs)(`div`,{className:`space-y-2`,children:[[{key:`tersedia`,label:`Tersedia`,color:`bg-emerald-500`},{key:`dipinjam`,label:`Dipinjam`,color:`bg-blue-500`},{key:`perbaikan`,label:`Perbaikan`,color:`bg-amber-500`},{key:`dihapus`,label:`Dimusnahkan`,color:`bg-slate-400`}].map(({key:t,label:n,color:r})=>{let i=L[t]||0,a=e.barcodes?.length||1,o=a>0?Math.round(i/a*100):0;return(0,g.jsxs)(`div`,{children:[(0,g.jsxs)(`div`,{className:`flex justify-between text-xs mb-1`,children:[(0,g.jsx)(`span`,{className:`text-slate-600 dark:text-slate-400 font-medium`,children:n}),(0,g.jsxs)(`span`,{className:`font-black text-slate-800 dark:text-slate-200`,children:[i,` unit`]})]}),(0,g.jsx)(`div`,{className:`h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden`,children:(0,g.jsx)(`div`,{className:`h-full ${r} rounded-full transition-all`,style:{width:`${o}%`}})})]},t)}),(0,g.jsxs)(`p`,{className:`text-xs text-slate-400 pt-1 text-right`,children:[`Total: `,e.barcodes?.length||0,` unit terdaftar`]})]})]})]}),(0,g.jsxs)(`div`,{className:`lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm overflow-hidden`,children:[(0,g.jsxs)(`div`,{className:`px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`,children:[(0,g.jsxs)(`div`,{children:[(0,g.jsx)(`h3`,{className:`text-sm font-bold text-slate-900 dark:text-white`,children:`Kelola Unit Barcode`}),(0,g.jsx)(`p`,{className:`text-xs text-slate-500 mt-0.5`,children:`Klik tombol aksi pada kartu untuk ubah status unit`})]}),(0,g.jsxs)(`div`,{className:`flex flex-wrap items-center gap-2`,children:[v.length>0&&(0,g.jsxs)(`button`,{onClick:I,className:`flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95`,children:[(0,g.jsx)(d,{className:`w-4 h-4`}),` Cetak `,v.length,` Barcode`]}),(0,g.jsxs)(`button`,{onClick:()=>_(!0),className:`flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-500/20 active:scale-95`,children:[(0,g.jsx)(u,{className:`w-4 h-4`}),` Generate Barcode`]})]})]}),e.barcodes?.length>0&&(0,g.jsxs)(`div`,{className:`px-5 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`,children:[(0,g.jsx)(`div`,{className:`flex items-center gap-2`,children:(0,g.jsxs)(`label`,{className:`flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-700/50 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600`,children:[(0,g.jsx)(`input`,{type:`checkbox`,checked:v.length>0&&v.length===e.barcodes.length,onChange:F,className:`rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4 cursor-pointer`}),(0,g.jsx)(`span`,{className:`text-[10px] font-bold text-slate-600 dark:text-slate-300`,children:`Pilih Semua`})]})}),(0,g.jsxs)(`div`,{className:`flex flex-wrap gap-2 items-center`,children:[[{label:`Tersedia`,color:`bg-emerald-100 text-emerald-700`},{label:`Dipinjam`,color:`bg-blue-100 text-blue-700`},{label:`Perbaikan`,color:`bg-amber-100 text-amber-700`}].map(e=>(0,g.jsx)(`span`,{className:`text-[9px] font-bold px-2 py-0.5 rounded-lg ${e.color}`,children:e.label},e.label)),(0,g.jsx)(`span`,{className:`text-[9px] text-slate-400 ml-1`,children:`← Status di pojok kanan kartu.`})]})]}),e.barcodes?.length===0?(0,g.jsxs)(`div`,{className:`py-16 flex flex-col items-center justify-center text-slate-400 gap-3`,children:[(0,g.jsx)(f,{className:`w-12 h-12 opacity-30`}),(0,g.jsx)(`p`,{className:`text-sm font-semibold`,children:`Belum ada barcode`}),(0,g.jsx)(`p`,{className:`text-xs opacity-60`,children:`Klik "Generate Barcode" untuk mendaftarkan unit`})]}):(0,g.jsx)(`div`,{className:`p-5 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4`,children:e.barcodes.map(t=>(0,g.jsx)(x,{barcode:t,selected:v.includes(t.id),onToggleSelect:()=>P(t.id),onDelete:()=>M(t.id),onAction:N,schoolName:i,schoolLogo:a,itemName:e.name},t.id))})]})]}),(0,g.jsxs)(`div`,{className:`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm overflow-hidden`,children:[(0,g.jsxs)(`div`,{className:`px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center gap-3`,children:[(0,g.jsx)(l,{className:`w-5 h-5 text-slate-400`}),(0,g.jsxs)(`div`,{children:[(0,g.jsx)(`h3`,{className:`text-sm font-bold text-slate-900 dark:text-white`,children:`Riwayat Transaksi`}),(0,g.jsx)(`p`,{className:`text-xs text-slate-500 mt-0.5`,children:`Log semua aktivitas barang ini`})]})]}),e.logs?.length===0?(0,g.jsx)(`div`,{className:`py-10 text-center text-slate-400 text-sm`,children:`Belum ada log transaksi`}):(0,g.jsx)(`div`,{className:`divide-y divide-slate-100 dark:divide-slate-700/30 max-h-72 overflow-y-auto custom-scrollbar`,children:e.logs.map(e=>(0,g.jsxs)(`div`,{className:`px-6 py-3 flex items-center gap-4`,children:[(0,g.jsx)(`span`,{className:`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg ${y[e.action]??`bg-slate-100 text-slate-500`}`,children:e.action}),(0,g.jsxs)(`div`,{className:`flex-1 min-w-0`,children:[(0,g.jsx)(`p`,{className:`text-xs text-slate-800 dark:text-slate-200 font-semibold`,children:e.user?.name}),e.barcode&&(0,g.jsx)(`p`,{className:`text-[10px] font-mono text-slate-400`,children:e.barcode.barcode_value}),e.notes&&(0,g.jsx)(`p`,{className:`text-[10px] text-slate-500`,children:e.notes})]}),(0,g.jsx)(`span`,{className:`shrink-0 text-[10px] text-slate-400`,children:new Date(e.created_at).toLocaleString(`id-ID`)})]},e.id))})]})]}),p&&(0,g.jsx)(`div`,{className:`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4`,children:(0,g.jsxs)(`div`,{className:`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md`,children:[(0,g.jsxs)(`div`,{className:`p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between`,children:[(0,g.jsx)(`h3`,{className:`font-black text-slate-900 dark:text-white`,children:`Generate Barcode`}),(0,g.jsx)(`button`,{onClick:()=>_(!1),className:`text-slate-400 hover:text-slate-600`,children:`✕`})]}),(0,g.jsxs)(`form`,{onSubmit:j,className:`p-6 space-y-4`,children:[(0,g.jsxs)(`div`,{children:[(0,g.jsx)(`label`,{className:`label-form`,children:`Jumlah Unit *`}),(0,g.jsx)(`input`,{type:`number`,min:1,max:100,value:w.quantity,onChange:e=>T(`quantity`,parseInt(e.target.value)),className:`input-form`}),O.quantity&&(0,g.jsx)(`p`,{className:`error-text`,children:O.quantity})]}),(0,g.jsxs)(`div`,{children:[(0,g.jsx)(`label`,{className:`label-form`,children:`Prefix Serial Number (Opsional)`}),(0,g.jsx)(`input`,{value:w.serial_prefix,onChange:e=>T(`serial_prefix`,e.target.value),className:`input-form`,placeholder:`mis: SN2024-A`}),(0,g.jsx)(`p`,{className:`text-[10px] text-slate-400 mt-1`,children:`Hasil: SN2024-A-001, SN2024-A-002, ...`})]}),(0,g.jsxs)(`div`,{className:`flex gap-3 pt-2`,children:[(0,g.jsx)(`button`,{type:`button`,onClick:()=>_(!1),className:`flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all`,children:`Batal`}),(0,g.jsx)(`button`,{type:`submit`,disabled:D,className:`flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all`,children:D?`Generating...`:`Generate ${w.quantity} Unit`})]})]})]})})]})}export{S as default};