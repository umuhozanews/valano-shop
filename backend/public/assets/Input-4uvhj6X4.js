import{j as e}from"./index-D9RZQE6S.js";function n({label:a,placeholder:x,icon:s,error:t,hint:r,className:d="",...l}){return e.jsxs("div",{className:"flex flex-col gap-1",children:[a&&e.jsx("label",{className:"text-[14px] font-medium text-text-primary",children:a}),e.jsxs("div",{className:"relative",children:[s&&e.jsx("span",{className:"absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary",children:e.jsx(s,{size:15})}),e.jsx("input",{placeholder:x,className:`
            w-full h-9 border border-border rounded-card bg-surface
            text-[15px] text-text-primary placeholder:text-text-secondary
            px-3 ${s?"pl-9":""}
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
            disabled:opacity-50 disabled:bg-background
            ${t?"border-danger focus:ring-danger":""}
            ${d}
          `,...l})]}),t&&e.jsx("p",{className:"text-[13px] text-danger",children:t}),r&&!t&&e.jsx("p",{className:"text-[13px] text-text-secondary",children:r})]})}export{n as I};
