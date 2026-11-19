const initialProducts = [
  {id:1,name:"Clear glass 4mm",price:850,qty:24},
  {id:2,name:"Clear glass 5mm",price:1100,qty:14},
  {id:3,name:"Tinted glass",price:1450,qty:4},
  {id:4,name:"Mirror glass",price:1800,qty:8},
  {id:5,name:"Glass fittings set",price:650,qty:3}
];
const state = {
  products: JSON.parse(localStorage.getItem("glassmart_products") || "null") || initialProducts,
  sales: JSON.parse(localStorage.getItem("glassmart_sales") || "[]"),
  orders: JSON.parse(localStorage.getItem("glassmart_orders") || "[]"),
  alerts: JSON.parse(localStorage.getItem("glassmart_alerts") || "[]"),
};
const money = n => "KSh " + Number(n).toLocaleString("en-KE");
const el = id => document.getElementById(id);
function persist(){for(const key of ["products","sales","orders","alerts"])localStorage.setItem("glassmart_"+key,JSON.stringify(state[key]));}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function toast(message){const t=el("toast");t.textContent=message;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600);}
function showView(view){
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active-view",v.id===view));
  document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  const names={dashboard:"Dashboard",sales:"Sales",inventory:"Inventory",orders:"Remote Orders",alerts:"SMS Alerts"};
  el("page-title").textContent=names[view]||"Dashboard";
}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.go)));

function productOptions(targetId){
  const select=el(targetId), old=select.value;
  select.innerHTML=state.products.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} — ${money(p.price)} (stock: ${p.qty})</option>`).join("");
  if(state.products.some(p=>String(p.id)===old))select.value=old;
}
function recordAlert(title,message){
  state.alerts.unshift({id:Date.now(),title,message,time:new Date().toLocaleString()});
  persist();
}
function renderDashboard(){
  const today=new Date().toDateString();
  const todayTotal=state.sales.filter(s=>new Date(s.time).toDateString()===today).reduce((sum,s)=>sum+s.total,0);
  el("today-sales").textContent=money(todayTotal);
  el("stock-count").textContent=state.products.reduce((sum,p)=>sum+p.qty,0).toLocaleString();
  el("pending-count").textContent=state.orders.filter(o=>o.status==="Pending").length;
  el("low-count").textContent=state.products.filter(p=>p.qty<=5).length;
  el("recent-sales").innerHTML=state.sales.slice(0,5).map(s=>`<tr><td><strong>${s.receipt}</strong></td><td>${escapeHtml(s.product)}</td><td>${money(s.total)}</td><td>${escapeHtml(s.payment)}</td></tr>`).join("")||`<tr><td colspan="4" class="empty">No sales recorded yet.</td></tr>`;
  const low=state.products.filter(p=>p.qty<=5).sort((a,b)=>a.qty-b.qty);
  el("stock-watch").innerHTML=low.map(p=>`<div class="watch-item"><div><div class="watch-name">${escapeHtml(p.name)}</div><div class="watch-price">${money(p.price)} per unit</div></div><span class="pill low">${p.qty} left</span></div>`).join("")||`<div class="empty">All products have more than 5 units in stock.</div>`;
}
function renderSales(){
  el("sales-table").innerHTML=state.sales.map(s=>`<tr><td><strong>${s.receipt}</strong></td><td>${escapeHtml(new Date(s.time).toLocaleString())}</td><td>${escapeHtml(s.product)}</td><td>${s.qty}</td><td>${money(s.total)}</td><td>${escapeHtml(s.payment)}</td><td>${escapeHtml(s.staff)}</td></tr>`).join("")||`<tr><td colspan="7" class="empty">No transactions yet. Record your first sale above.</td></tr>`;
}
function renderInventory(){
  const q=(el("inventory-search").value||"").toLowerCase();
  const list=state.products.filter(p=>p.name.toLowerCase().includes(q));
  el("inventory-table").innerHTML=list.map(p=>`<tr><td><strong>${escapeHtml(p.name)}</strong></td><td>${money(p.price)}</td><td>${p.qty}</td><td><span class="pill ${p.qty<=5?"low":"good"}">${p.qty<=5?"Low stock":"In stock"}</span></td><td><button class="secondary adjust" data-id="${p.id}" data-delta="-1">−</button> <button class="secondary adjust" data-id="${p.id}" data-delta="1">+</button></td></tr>`).join("")||`<tr><td colspan="5" class="empty">No matching products.</td></tr>`;
  document.querySelectorAll(".adjust").forEach(b=>b.addEventListener("click",()=>{
    const p=state.products.find(x=>x.id===Number(b.dataset.id));const next=p.qty+Number(b.dataset.delta);
    if(next<0){toast("Stock cannot be negative.");return;}p.qty=next;persist();renderAll();toast("Stock quantity updated.");
  }));
}
function renderOrders(){
  el("orders-table").innerHTML=state.orders.map(o=>`<tr><td><strong>${o.orderNo}</strong></td><td>${escapeHtml(o.customer)}<br><span class="muted">${escapeHtml(o.phone)}</span></td><td>${escapeHtml(o.product)}</td><td>${o.qty}</td><td>${escapeHtml(o.notes||"—")}</td><td><select class="status-select" data-id="${o.id}"><option ${o.status==="Pending"?"selected":""}>Pending</option><option ${o.status==="Processing"?"selected":""}>Processing</option><option ${o.status==="Completed"?"selected":""}>Completed</option><option ${o.status==="Cancelled"?"selected":""}>Cancelled</option></select></td></tr>`).join("")||`<tr><td colspan="6" class="empty">No remote orders yet.</td></tr>`;
  document.querySelectorAll(".status-select").forEach(s=>s.addEventListener("change",()=>{const o=state.orders.find(x=>x.id===Number(s.dataset.id));o.status=s.value;persist();renderAll();toast("Order status updated.");}));
}
function renderAlerts(){
  el("alerts-list").innerHTML=state.alerts.map(a=>`<div class="alert-item"><div class="alert-symbol">✉</div><div><strong>${escapeHtml(a.title)}</strong><p>${escapeHtml(a.message)}</p><small>${escapeHtml(a.time)} · Demo notification — not sent by SMS</small></div></div>`).join("")||`<div class="empty">No alerts yet. A simulated alert will appear when you record a sale or order.</div>`;
}
function renderAll(){
  productOptions("sale-product");productOptions("order-product");
  renderDashboard();renderSales();renderInventory();renderOrders();renderAlerts();updateSaleTotal();
}
function updateSaleTotal(){
  const p=state.products.find(p=>p.id===Number(el("sale-product").value));
  el("sale-total").textContent=money((p?p.price:0)*Math.max(0,Number(el("sale-quantity").value)||0));
}
el("sale-product").addEventListener("change",updateSaleTotal);
el("sale-quantity").addEventListener("input",updateSaleTotal);
el("sale-form").addEventListener("submit",e=>{
  e.preventDefault();
  const p=state.products.find(p=>p.id===Number(el("sale-product").value)),qty=Number(el("sale-quantity").value);
  if(!p){toast("Add a product to inventory first.");return;}
  if(qty<1||qty>p.qty){toast("Please enter a quantity available in stock.");return;}
  const sale={id:Date.now(),receipt:"GM-"+String(Date.now()).slice(-6),time:new Date().toISOString(),product:p.name,productId:p.id,qty,total:p.price*qty,payment:el("sale-payment").value,staff:el("sale-staff").value.trim()};
  p.qty-=qty;state.sales.unshift(sale);
  recordAlert("Sale recorded",`${sale.receipt}: ${sale.qty} × ${sale.product}; total ${money(sale.total)}; payment ${sale.payment}. Staff: ${sale.staff}.`);
  persist();renderAll();el("sale-form").reset();el("sale-quantity").value=1;updateSaleTotal();toast("Sale saved. Demo alert added.");
});
el("show-product-form").addEventListener("click",()=>el("product-form-panel").classList.toggle("hidden"));
el("cancel-product").addEventListener("click",()=>el("product-form-panel").classList.add("hidden"));
el("product-form").addEventListener("submit",e=>{
  e.preventDefault();const name=el("product-name").value.trim(),price=Number(el("product-price").value),qty=Number(el("product-qty").value);
  if(state.products.some(p=>p.name.toLowerCase()===name.toLowerCase())){toast("A product with that name already exists.");return;}
  state.products.push({id:Date.now(),name,price,qty});persist();renderAll();e.target.reset();el("product-form-panel").classList.add("hidden");toast("Product added.");
});
el("inventory-search").addEventListener("input",renderInventory);
el("order-form").addEventListener("submit",e=>{
  e.preventDefault();const p=state.products.find(p=>p.id===Number(el("order-product").value)),qty=Number(el("order-quantity").value);
  if(!p){toast("Add a product first.");return;}
  if(qty<1){toast("Enter a valid quantity.");return;}
  const order={id:Date.now(),orderNo:"ORD-"+String(Date.now()).slice(-5),customer:el("customer-name").value.trim(),phone:el("customer-phone").value.trim(),product:p.name,productId:p.id,qty,notes:el("order-notes").value.trim(),status:"Pending"};
  state.orders.unshift(order);recordAlert("New remote order",`${order.orderNo}: ${order.customer} ordered ${qty} × ${order.product}. Contact: ${order.phone}.`);
  persist();renderAll();e.target.reset();el("order-quantity").value=1;toast("Order received in demo.");
});
el("clear-alerts").addEventListener("click",()=>{state.alerts=[];persist();renderAlerts();toast("Alert log cleared.");});
renderAll();