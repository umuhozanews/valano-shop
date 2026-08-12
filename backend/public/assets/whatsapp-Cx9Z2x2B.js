function f(o){if(!o)return"";let t=String(o).replace(/[^\d+]/g,"");return/^07\d{8}$/.test(t)&&(t="250"+t.slice(1)),t.replace(/^\+/,"")}function S(o,t=""){const a=f(o),c=t?`?text=${encodeURIComponent(t)}`:"",r=a?`https://wa.me/${a}${c}`:`https://wa.me/${c}`;window.open(r,"_blank")}function w({supplierName:o,supplierPhone:t,orderId:a,orderDate:c,expectedArrival:r,items:p=[],totalAmount:s,notes:i}){const l=f(t);let n=`🛒 *PURCHASE ORDER — INZIRA INSIGHTS*
`;n+=`===================================
`,a&&(n+=`📋 *Order Ref:* #${a}
`),c&&(n+=`📅 *Order Date:* ${new Date(c).toLocaleDateString("en-RW")}
`),r&&(n+=`🚚 *Expected Arrival:* ${new Date(r).toLocaleDateString("en-RW")}
`),n+=`👤 *Supplier:* ${o||"Valued Supplier"}

`,p&&p.length>0&&(n+=`📦 *ORDERED ITEMS:*
`,p.forEach((e,$)=>{const R=e.quantity||e.qty||1,d=e.unit||"pcs",m=e.item_name||e.name||`Item #${$+1}`,u=e.unit_price||e.unit_cost||0;n+=`  ${$+1}. *${m}* — ${R} ${d} ${u?`(${Number(u).toLocaleString()} RWF)`:""}
`}),n+=`
`),s&&(n+=`💰 *TOTAL AMOUNT:* ${Number(s).toLocaleString()} RWF
`),i&&(n+=`📝 *Notes/Instructions:* ${i}
`),n+=`
Please confirm receipt, item availability & dispatch schedule. Thank you!`;const h=l?`https://wa.me/${l}?text=${encodeURIComponent(n)}`:`https://wa.me/?text=${encodeURIComponent(n)}`;window.open(h,"_blank")}export{S as o,w as s};
