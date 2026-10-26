import{o as e}from"./chunk-zsgVPwQN.js";import{t}from"./index.esm-Ba059CQw.js";import{r as n,t as r}from"./jsx-runtime-B_pW9uh6.js";import{n as i}from"./esm-DEL2YjwI.js";var a=e(n(),1),o=r();function s({academicClass:e,students:n,settings:r}){let[s,c]=(0,a.useState)(`h`);return(0,o.jsxs)(`div`,{className:`min-h-screen bg-slate-100 p-8`,children:[(0,o.jsx)(t,{title:`Cetak Kartu - ${e.name}`}),(0,o.jsxs)(`div`,{className:`max-w-4xl mx-auto no-print bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row items-center justify-between gap-6`,children:[(0,o.jsxs)(`div`,{children:[(0,o.jsxs)(`h2`,{className:`text-xl font-bold text-slate-800`,children:[`Cetak Kartu Kelas: `,e.name]}),(0,o.jsxs)(`p`,{className:`text-slate-500 text-sm`,children:[`Total `,n.length,` siswa siap dicetak.`]})]}),(0,o.jsxs)(`div`,{className:`flex bg-slate-100 p-1.5 rounded-xl gap-1`,children:[(0,o.jsx)(`button`,{onClick:()=>c(`h`),className:`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${s===`h`?`bg-white text-indigo-600 shadow-sm`:`text-slate-500 hover:text-slate-700`}`,children:`Horizontal`}),(0,o.jsx)(`button`,{onClick:()=>c(`v`),className:`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${s===`v`?`bg-white text-indigo-600 shadow-sm`:`text-slate-500 hover:text-slate-700`}`,children:`Vertikal`})]}),(0,o.jsxs)(`button`,{onClick:()=>{window.print()},className:`bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2`,children:[(0,o.jsx)(`svg`,{className:`w-5 h-5`,fill:`none`,stroke:`currentColor`,viewBox:`0 0 24 24`,children:(0,o.jsx)(`path`,{strokeLinecap:`round`,strokeLinejoin:`round`,strokeWidth:2,d:`M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z`})}),`CETAK SEKARANG`]})]}),(0,o.jsx)(`div`,{className:`max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none print:bg-transparent overflow-hidden print:overflow-visible`,children:s===`h`?(0,o.jsx)(`div`,{className:`card-grid-h`,children:n.map(e=>(0,o.jsx)(`div`,{className:`card-container-h card-avoid-break`,children:(0,o.jsxs)(`div`,{className:`card-h-inner bg-emerald-800 text-white`,children:[(0,o.jsxs)(`div`,{className:`card-h-qr-section`,children:[(0,o.jsx)(`div`,{className:`card-qr-box`,children:(0,o.jsx)(i,{value:e.qr_token,size:70,style:{width:`100%`,height:`100%`}})}),(0,o.jsx)(`p`,{className:`card-qr-text`,children:`Secured Token`})]}),(0,o.jsxs)(`div`,{className:`card-h-info-section`,children:[(0,o.jsxs)(`div`,{className:`flex justify-between items-start`,children:[(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`h3`,{className:`card-h-school`,children:r.school_name}),(0,o.jsx)(`p`,{className:`card-h-subtitle`,children:`Digital Student Identification`})]}),r.school_logo&&(0,o.jsx)(`img`,{src:r.school_logo,className:`card-h-logo`,alt:`Logo`})]}),(0,o.jsxs)(`div`,{className:`flex justify-between items-end mt-auto gap-2`,children:[(0,o.jsxs)(`div`,{className:`flex-1 min-w-0`,children:[(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`p`,{className:`card-h-label`,children:`Nama Lengkap`}),(0,o.jsx)(`h4`,{className:`card-h-name`,children:e.name})]}),(0,o.jsxs)(`div`,{className:`flex gap-4 mt-2`,children:[(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`p`,{className:`card-h-label`,children:`NIS`}),(0,o.jsx)(`p`,{className:`card-h-nis`,children:e.nis})]}),(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`p`,{className:`card-h-label`,children:`Status`}),(0,o.jsx)(`span`,{className:`card-h-status`,children:`Active`})]})]})]}),e.photo_url&&(0,o.jsx)(`img`,{src:e.photo_url,className:`w-[42px] h-[42px] rounded-lg object-cover border border-white/20 shadow-md mr-1 flex-shrink-0`,alt:`Foto`})]})]})]})},e.id))}):(0,o.jsx)(`div`,{className:`card-grid-v`,children:n.map(e=>(0,o.jsx)(`div`,{className:`card-container-v card-avoid-break`,children:(0,o.jsxs)(`div`,{className:`card-v-inner bg-emerald-900 text-white`,children:[(0,o.jsxs)(`div`,{className:`card-v-header`,children:[r.school_logo&&(0,o.jsx)(`img`,{src:r.school_logo,className:`card-v-logo`,alt:`Logo`}),(0,o.jsx)(`h3`,{className:`card-v-school`,children:r.school_name})]}),(0,o.jsxs)(`div`,{className:`card-v-body`,children:[e.photo_url?(0,o.jsx)(`img`,{src:e.photo_url,className:`w-[50px] h-[50px] rounded-full object-cover border-2 border-white/20 shadow-md mb-2 flex-shrink-0`,alt:`Foto`}):(0,o.jsx)(`div`,{className:`w-[50px] h-[50px] rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center text-white text-xs font-bold mb-2 flex-shrink-0`,children:e.name.charAt(0)}),(0,o.jsx)(`h4`,{className:`card-v-name`,children:e.name}),(0,o.jsx)(`p`,{className:`card-v-nis`,children:e.nis}),(0,o.jsx)(`div`,{className:`card-qr-box my-1.5`,children:(0,o.jsx)(i,{value:e.qr_token,size:42,style:{width:`100%`,height:`100%`}})}),(0,o.jsx)(`div`,{className:`card-v-divider`}),(0,o.jsxs)(`p`,{className:`card-v-footer-text`,children:[`Valid ID Card`,(0,o.jsx)(`br`,{}),`SALIRA Academic Portal`]})]}),(0,o.jsx)(`div`,{className:`card-v-footer`,children:(0,o.jsx)(`span`,{className:`card-v-status`,children:`Verified Student`})})]})},e.id))})}),(0,o.jsx)(`style`,{children:`
                @media print {
                    @page {
                        margin: 0;
                        size: A4 portrait; /* Force A4 portrait for bulk printing */
                    }
                    body {
                        background: transparent;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .card-avoid-break {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                    .min-h-screen {
                        min-height: auto !important;
                        padding: 0 !important;
                        background: transparent !important;
                    }
                }

                /* GRID LAYOUTS FOR A4 */
                .card-grid-h {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                    padding: 15px;
                    justify-items: center;
                }
                
                .card-grid-v {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 15px;
                    padding: 15px;
                    justify-items: center;
                }

                /* HORIZONTAL CARD (CR80: 85.6mm x 53.98mm) */
                .card-container-h {
                    width: 86mm;
                    height: 54mm;
                    border: 1px dashed #ccc; /* Cut guide */
                    padding: 0;
                    box-sizing: border-box;
                    background: white;
                }
                .card-h-inner {
                    display: flex;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                }
                .card-h-qr-section {
                    width: 32%;
                    background: rgba(255,255,255,0.12);
                    border-right: 1px solid rgba(255,255,255,0.2);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 8px;
                    text-align: center;
                }
                .card-qr-box {
                    background: white;
                    padding: 4px;
                    border-radius: 8px;
                    margin-bottom: 6px;
                }
                .card-qr-text {
                    font-size: 6px;
                    font-weight: 900;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    opacity: 0.7;
                    margin: 0;
                }
                .card-h-info-section {
                    flex: 1;
                    padding: 12px 14px;
                    display: flex;
                    flex-direction: column;
                }
                .card-h-school {
                    margin: 0;
                    font-size: 13px;
                    font-weight: 900;
                    letter-spacing: -0.02em;
                }
                .card-h-subtitle {
                    margin: 2px 0 0;
                    font-size: 6px;
                    opacity: 0.7;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                }
                .card-h-logo {
                    height: 38px;
                    width: auto;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
                }
                .card-h-label {
                    margin: 0 0 2px;
                    font-size: 6px;
                    opacity: 0.6;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.12em;
                }
                .card-h-name {
                    margin: 0;
                    font-size: 14px; /* Reduced to fit long names */
                    font-weight: 900;
                    letter-spacing: -0.02em;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .card-h-nis {
                    margin: 0;
                    font-size: 11px;
                    font-weight: 900;
                    font-family: monospace;
                    letter-spacing: -0.02em;
                }
                .card-h-status {
                    font-size: 7px;
                    font-weight: 700;
                    background: rgba(255,255,255,0.2);
                    padding: 2px 6px;
                    border-radius: 4px;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }

                /* VERTICAL CARD (CR80: 53.98mm x 85.6mm) */
                .card-container-v {
                    width: 54mm;
                    height: 86mm;
                    border: 1px dashed #ccc;
                    box-sizing: border-box;
                    background: white;
                }
                .card-v-inner {
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    height: 100%;
                    box-sizing: border-box;
                }
                .card-v-header {
                    padding: 10px;
                    text-align: center;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                .card-v-logo {
                    height: 48px;
                    width: auto;
                    display: block;
                    margin: 0 auto 8px;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
                }
                .card-v-school {
                    margin: 0;
                    font-size: 11px;
                    font-weight: 900;
                    line-height: 1.2;
                }
                .card-v-body {
                    flex: 1;
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                }
                .card-v-name {
                    margin: 0 0 3px;
                    font-size: 12px;
                    font-weight: 900;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 100%;
                }
                .card-v-nis {
                    margin: 0 0 8px;
                    font-size: 9px;
                    font-family: monospace;
                    letter-spacing: 0.1m;
                    color: #818cf8;
                    font-weight: 900;
                }
                .card-v-divider {
                    width: 80%;
                    height: 1px;
                    background: rgba(255,255,255,0.2);
                    margin-bottom: 6px;
                }
                .card-v-footer-text {
                    margin: 0;
                    font-size: 6px;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.12em;
                    line-height: 1.6;
                }
                .card-v-footer {
                    padding: 8px;
                    background: rgba(255,255,255,0.05);
                    border-top: 1px solid rgba(255,255,255,0.05);
                    text-align: center;
                }
                .card-v-status {
                    padding: 3px 10px;
                    background: rgba(16,185,129,0.1);
                    color: #34d399;
                    border-radius: 9999px;
                    font-size: 6px;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.12em;
                    border: 1px solid rgba(16,185,129,0.2);
                    display: inline-block;
                }
            `})]})}export{s as default};