import { useState, useEffect } from "react";
import { ArrowLeft, Printer, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import toast from "react-hot-toast";

export default function LabelPrint() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/stock", { params: { limit: 100 } })
       .then(d => setItems(d.data.data))
       .catch(() => toast.error("Failed to load items"))
       .finally(() => setLoading(false));
  }, []);

  function toggleItem(id) {
    setSelected(s => s[id] ? (() => { const n={...s}; delete n[id]; return n; })() : {...s, [id]:1});
  }

  function printLabels() {
    const ids = Object.keys(selected).map(Number);
    if (!ids.length) return toast.error("Select at least one item");

    // When a real backend is configured it renders barcode labels server-side.
    if (api.hasBackend) {
      const url = `${import.meta.env.VITE_API_URL}/stock/print-labels?ids=${ids.join(",")}`;
      window.open(url, "_blank");
      return;
    }

    // No backend: build a printable label sheet in the browser.
    const chosen = items.filter(i => ids.includes(i.id));
    const win = window.open("", "_blank");
    if (!win) return toast.error("Please allow pop-ups to print labels");
    const labels = chosen.map(i => `
      <div class="label">
        <div class="name">${i.name}</div>
        <div class="meta">${[i.size, i.color].filter(Boolean).join(" · ")}</div>
        <div class="code">${i.barcode || ""}</div>
        <div class="price">${formatRWF(i.sell_price_rwf)}</div>
      </div>`).join("");
    win.document.write(`<!DOCTYPE html><html><head><title>Shelf Labels</title><style>
      body{font-family:Inter,Arial,sans-serif;margin:16px;}
      .sheet{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
      .label{border:1px solid #ccc;border-radius:8px;padding:12px;text-align:center;}
      .name{font-weight:700;font-size:13px;}
      .meta{color:#666;font-size:11px;margin:2px 0;}
      .code{font-family:monospace;font-size:11px;margin-top:4px;}
      .price{font-weight:700;color:#1e3a8a;margin-top:4px;font-size:15px;}
      @media print{button{display:none;}}
    </style></head><body>
      <button onclick="window.print()" style="margin-bottom:12px;padding:8px 14px;">Print</button>
      <div class="sheet">${labels}</div>
    </body></html>`);
    win.document.close();
  }

  const count = Object.keys(selected).length;

  return (
    <PageWrapper title="Label Printing" subtitle="Select items to print shelf labels"
      breadcrumbs={[{label:"Stock",path:"/app/stock"},{label:"Print Labels",path:"/app/stock/labels"}]}>
      <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate("/app/stock")} className="mb-4">Back</Button>

      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] text-text-secondary">{count} item{count!==1?"s":""} selected</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setSelected({})}>Clear</Button>
          <Button variant="primary" size="sm" icon={Printer} onClick={printLabels} disabled={count===0}>
            Print {count > 0 ? `(${count})` : ""} Labels
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map(item => {
          const sel = !!selected[item.id];
          return (
            <div key={item.id} onClick={() => toggleItem(item.id)}
              className={`bg-surface border-2 rounded-card p-4 cursor-pointer transition-all ${sel ? "border-primary" : "border-border"}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-[11px] font-semibold text-text-primary">{item.name}</p>
                  <p className="text-[11px] text-text-secondary">{item.size} · {item.color}</p>
                </div>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${sel?"bg-primary border-primary":"border-border"}`}>
                  {sel && <span className="text-white text-[11px]">✓</span>}
                </div>
              </div>
              <p className="text-[11px] font-mono text-text-secondary text-[11px]">{item.barcode}</p>
              <p className="text-[11px] font-bold text-primary mt-1">{formatRWF(item.sell_price_rwf)}</p>
            </div>
          );
        })}
      </div>
    </PageWrapper>
  );
}
