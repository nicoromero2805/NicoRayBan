// app.js

// ✅ Local: front en 5500 + back en 8000
//    => API_BASE = "http://127.0.0.1:8000"
// ✅ Producción (Render / mismo dominio): API_BASE = ""
const API_BASE = "";

// WhatsApp del vendedor (sin +, sin espacios). Ej: 5493513562759
const WHATSAPP_NUMBER = "5493512070090";
const SHIPPING_COST = 0; // Costo envio
const CART_KEY = "lentes_cart_v2";
let ALL = [];
let ACTIVE_CATEGORY = "FERRARI"; // Para iniciar en una categoria Colocamos la categoria que queremos , sino ponemos INICIO y CARGA TODOS
let VIEW_MODE = "grid"; // grid | list
let CART = {}; // sku -> {sku, description, qty}

let PM_SKU = null;
let PM_GALLERY = [];
let PM_PRODUCT = null;
//let ACTIVE_PRODUCT = null;

function $(id){ return document.getElementById(id); }

// =========================
// ✅ Popup "Agregado correctamente"
// =========================
let ADD_POP_TIMEOUT = null;

function openAddPopup(p){
  const bd  = $("addPopBackdrop");
  const pop = $("addPop");
  const sub = $("apSub");

  // Si por algún motivo no existe el HTML, no rompemos la app
  if(!bd || !pop || !sub) return;

  sub.textContent = p ? `${p.description || ""} (SKU: ${p.sku})` : "";

  bd.classList.remove("hidden");
  pop.classList.remove("hidden");

  clearTimeout(ADD_POP_TIMEOUT);
  ADD_POP_TIMEOUT = setTimeout(closeAddPopup, 15000); // auto-cierre opcional
}

function closeAddPopup(){
  const bd  = $("addPopBackdrop");
  const pop = $("addPop");
  if(!bd || !pop) return;

  clearTimeout(ADD_POP_TIMEOUT);
  bd.classList.add("hidden");
  pop.classList.add("hidden");
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function moneyARS(n){
  const v = Number(n);
  if(!Number.isFinite(v)) return "";
  try{
    return v.toLocaleString("es-AR", { style:"currency", currency:"ARS", maximumFractionDigits: 0 });
  }catch{
    return "$ " + Math.round(v);
  }
}

function inferCategory(desc){
  const t = String(desc || "").trim().toUpperCase();
  if(!t) return "OTROS";
  const parts = t.split(/\s+/);
  if (parts[0] === "THE" && parts[1] === "JA") return "THE JA-JO";
  if (parts[0] === "THE" && parts[1]) return `THE ${parts[1]}`;
  if (parts[0] === "BIL" || parts[0] === "BILL") return "BILL";
  if (parts[0] === "FERRARI" || parts[0] === "SCUDERIA") return "FERRARI";
  if (parts[0] === "CAT") return "CAT EYE";
  if (parts[0] === "CATS") return "CAT 5000";
  return parts[0];
}

function loadCart(){
  try{ CART = JSON.parse(localStorage.getItem(CART_KEY) || "{}") || {}; }
  catch{ CART = {}; }
}
function saveCart(){ localStorage.setItem(CART_KEY, JSON.stringify(CART)); }

function totalQty(){
  return Object.values(CART).reduce((a,b)=> a + Number(b.qty||0), 0);
}

function findProduct(sku){
  return ALL.find(p => String(p.sku) === String(sku));
}

function canAdd(sku){
  const p = findProduct(sku);
  const stock = Number(p?.stock ?? 0);
  if(stock <= 0) return false;
  const qty = Number(CART[String(sku)]?.qty ?? 0);
  return qty < stock;
}

function addToCart(sku){
  const p = findProduct(sku);
  if(!p) return;
  const stock = Number(p.stock ?? 0);
  if(stock <= 0) return;

  const key = String(sku);
  if(!CART[key]){
    CART[key] = { sku:key, description: String(p.description||""), qty:1 };
  }else{
    if(CART[key].qty >= stock) return;
    CART[key].qty++;
  }
  saveCart();
  renderCart();
  updateCartBadge();

  // ✅ Popup confirmación
  openAddPopup(p);
}

function incFromCart(sku){
  if(!canAdd(sku)) return;
  CART[String(sku)].qty++;
  saveCart();
  renderCart();
  updateCartBadge();
}

function decFromCart(sku){
  const key = String(sku);
  if(!CART[key]) return;
  CART[key].qty = Math.max(0, Number(CART[key].qty||0) - 1);
  if(CART[key].qty === 0) delete CART[key];
  saveCart();
  renderCart();
  updateCartBadge();
}

function removeFromCart(sku){
  delete CART[String(sku)];
  saveCart();
  renderCart();
  updateCartBadge();
}

function clearCart(){
  CART = {};
  saveCart();
  renderCart();
  updateCartBadge();
  goStep("cart");
}

function updateCartBadge(){
  const n = totalQty();
  const b = $("cartBadge");
  if(n > 0){
    b.style.display = "inline-block";
    b.textContent = n;
  }else{
    b.style.display = "none";
    b.textContent = "0";
  }
  $("cartTitle").textContent = `Carrito (${n})`;
}

function buildCategories(){
  const counts = new Map();
  for(const p of ALL){
    p._category = inferCategory(p.description);
    counts.set(p._category, (counts.get(p._category) || 0) + 1);
  }
  const cats = Array.from(counts.entries()).sort((a,b)=> a[0].localeCompare(b[0],"es"));
  return { cats, counts };
}

function selectCategory(cat){
  ACTIVE_CATEGORY = cat;
  renderCategoriesUI();
  applyFilters();
}

function renderCategoriesUI(){
  const { cats, counts } = buildCategories();

  $("chips").innerHTML =
    `<button class="chip ${ACTIVE_CATEGORY==="INICIO"?"active":""}" type="button" onclick="selectCategory('INICIO')">INICIO</button>` +
    cats.map(([name]) =>
      `<button class="chip ${ACTIVE_CATEGORY===name?"active":""}" type="button" onclick="selectCategory('${escapeHtml(name)}')">${escapeHtml(name)}</button>`
    ).join("");

  $("catVertical").innerHTML =
    `<button class="cat-v-btn ${ACTIVE_CATEGORY==="INICIO"?"active":""}" type="button" onclick="selectCategory('INICIO')">INICIO</button>` +
    cats.map(([name]) =>
      `<button class="cat-v-btn ${ACTIVE_CATEGORY===name?"active":""}" type="button" onclick="selectCategory('${escapeHtml(name)}')">${escapeHtml(name)} <span class="muted">(${counts.get(name)})</span></button>`
    ).join("");

  $("sectionTitle").textContent = ACTIVE_CATEGORY;
}

// ✅ Exponer funciones usadas por onclick inline (esto arregla el “no funciona añadir” en iPhone/desktop)
window.selectCategory = selectCategory;
window.addToCart = addToCart;
window.incFromCart = incFromCart;
window.decFromCart = decFromCart;
window.removeFromCart = removeFromCart;

function getQuery(){ return ($("q").value || "").trim().toLowerCase(); }

function applyFilters(){
  let items = ALL;
  if(ACTIVE_CATEGORY !== "INICIO"){
    items = items.filter(p => p._category === ACTIVE_CATEGORY);
  }
  const q = getQuery();
  if(q){
    items = items.filter(p => {
      const sku = String(p.sku||"").toLowerCase();
      const desc = String(p.description||"").toLowerCase();
      return sku.includes(q) || desc.includes(q);
    });
  }
  $("meta").textContent = `Productos: ${items.length} / ${ALL.length}`;

  if(VIEW_MODE === "grid"){
    $("grid").classList.remove("hidden");
    $("list").classList.add("hidden");
    renderGrid(items);
  }else{
    $("grid").classList.add("hidden");
    $("list").classList.remove("hidden");
    renderList(items);
  }
}

function mainImage(p){
  const g = Array.isArray(p.gallery) ? p.gallery : [];
  return g[0] || p.foto_url || "";
}

function renderGrid(items){
  $("grid").innerHTML = items.map(p=>{
    const img = mainImage(p);
    const stock = Number(p.stock||0);
    const disabled = stock <= 0;
    const price = moneyARS(p.price);

    return `
      <div class="pcard">
        <div class="pimg" onclick="openProduct('${escapeHtml(p.sku)}')" title="Ver detalle">
          ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(p.description||"")}" loading="lazy">` : ``}
          <button class="plus" ${disabled ? "disabled":""} onclick="event.stopPropagation(); addToCart('${escapeHtml(p.sku)}')" type="button">+</button>
        </div>
        <div class="pname">${escapeHtml(p.description||"")}</div>
        <div class="pmeta">
          <div class="${disabled ? "no" : "pstock"}">${disabled ? "No disponible" : ("Stock: " + stock)}</div>
          <div class="price">${price}</div>
        </div>
      </div>
    `;
  }).join("");
}

function renderList(items){
  $("list").innerHTML = items.map(p=>{
    const img = mainImage(p);
    const stock = Number(p.stock||0);
    const disabled = stock <= 0;
    const price = moneyARS(p.price);

    return `
      <div class="lrow">
        <div class="limg" onclick="openProduct('${escapeHtml(p.sku)}')" title="Ver detalle">
          ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(p.description||"")}" loading="lazy">` : ``}
        </div>
        <div class="linfo" onclick="openProduct('${escapeHtml(p.sku)}')">
          <div class="ltitle">${escapeHtml(p.description||"")}</div>
          <div class="lsub">${disabled ? "No disponible" : ("Stock: " + stock)} · ${price}</div>
        </div>
        <button class="lplus" ${disabled ? "disabled":""} type="button" onclick="addToCart('${escapeHtml(p.sku)}')">+</button>
      </div>
    `;
  }).join("");
}

/* Product modal */
function openProduct(sku){
  const p = findProduct(sku);
  if(!p) return;
  PM_PRODUCT = p;

  PM_SKU = String(sku);
  PM_GALLERY = Array.isArray(p.gallery) && p.gallery.length ? p.gallery : (p.foto_url ? [p.foto_url] : []);
  const stock = Number(p.stock||0);
  const cat = p._category || inferCategory(p.description);

  $("pmSub").textContent = `SKU: ${p.sku}`;
  $("pmCat").textContent = cat;
  $("pmDesc").textContent = p.description || "";
  $("pmStockPill").textContent = `Stock: ${stock}`;
  $("pmPrice").textContent = moneyARS(p.price);

  const main = $("pmImg");
  main.src = PM_GALLERY[0] || "";

  const thumbs = $("pmThumbs");
  thumbs.innerHTML = PM_GALLERY.map((u,i)=>`
    <div class="pm-thumb ${i===0?"active":""}" data-i="${i}">
      <img src="${escapeHtml(u)}" alt="thumb" loading="lazy">
    </div>
  `).join("");

  thumbs.querySelectorAll(".pm-thumb").forEach(t=>{
    t.addEventListener("click", ()=>{
      const i = Number(t.getAttribute("data-i")||0);
      main.src = PM_GALLERY[i] || PM_GALLERY[0] || "";
      thumbs.querySelectorAll(".pm-thumb").forEach(x=>x.classList.remove("active"));
      t.classList.add("active");
    });
  });

  const btn = $("pmAdd");
  btn.disabled = stock <= 0;
  btn.textContent = stock > 0 ? "Añadir al carrito" : "Sin stock";
  $("pmHint").textContent = stock > 0 ? "Podés añadir desde acá o desde el botón + en la card." : "No se puede agregar si no hay stock.";

  $("backdrop").classList.remove("hidden");
  $("pmodal").classList.remove("hidden");
}
window.openProduct = openProduct;

function closeProduct(){
  $("backdrop").classList.add("hidden");
  $("pmodal").classList.add("hidden");
  PM_SKU = null;
  PM_GALLERY = [];
}

/* Cart drawer */
function openCart(){
  $("cartDrawer").classList.add("open");
  renderCart();
}
function closeCart(){
  $("cartDrawer").classList.remove("open");
}
function goStep(step){
  const isCart = step === "cart";
  $("stepCart").classList.toggle("step-active", isCart);
  $("stepData").classList.toggle("step-active", !isCart);

  // ✅ 1 botón por paso
  $("btnContinue").style.display = isCart ? "block" : "none";
  $("btnSend").style.display = isCart ? "none" : "block";

  $("cartBack").style.visibility = isCart ? "hidden" : "visible";

  if(!isCart) renderCheckout();
}

function deliveryIsOn(){
  return $("optDelivery").classList.contains("active");
}

function renderCart(){
  const items = Object.values(CART);
  updateCartBadge();

  const box = $("cartItems");
  if(items.length === 0){
    box.innerHTML = `<div class="muted" style="padding:12px 0;">Carrito vacío</div>`;
    $("btnContinue").disabled = true;
    goStep("cart");
  }else{
    $("btnContinue").disabled = false;
    box.innerHTML = items.map(it=>{
      const p = findProduct(it.sku);
      const stock = Number(p?.stock ?? 0);
      const incDisabled = !(Number(it.qty||0) < stock);
      const img = p ? mainImage(p) : "";
      const subtotal = Number(p?.price || 0) * Number(it.qty||0);

      return `
        <div class="cart-item">
          <div class="ci-img">
            ${img ? `<img src="${escapeHtml(img)}" alt="img" loading="lazy">` : ``}
          </div>
          <div class="ci-left">
            <div class="ci-name">${escapeHtml(it.description)}</div>
            <div class="ci-price">${moneyARS(subtotal)}</div>
          </div>
          <div class="ci-actions">
            <button class="del" type="button" onclick="removeFromCart('${escapeHtml(it.sku)}')" aria-label="Eliminar">✕</button>
            <div class="qty">
              <button type="button" onclick="decFromCart('${escapeHtml(it.sku)}')">−</button>
              <div class="val">${Number(it.qty||0)}</div>
              <button type="button" ${incDisabled ? "disabled":""} onclick="incFromCart('${escapeHtml(it.sku)}')">+</button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  $("noteCount").textContent = ($("cartNote").value || "").length;

  let subtotal = 0;
  for(const it of items){
    const p = findProduct(it.sku);
    subtotal += Number(p?.price || 0) * Number(it.qty || 0);
  }

													   
								  

  const shipping = items.length > 0 ? SHIPPING_COST : 0;
  const total = subtotal + shipping;
													  

  $("cartSubtotal").textContent = moneyARS(subtotal) || "$ 0";
  $("cartShipping").textContent = moneyARS(shipping) || "$ 0";
  $("cartTotal").textContent = moneyARS(total) || "$ 0";

  $("addrBlock").style.display = deliveryIsOn() ? "block" : "none";

  renderCheckout();
}

function renderCheckout(){
  const items = Object.values(CART);
  const box = $("checkoutSummary");
  if(items.length === 0){
    box.innerHTML = `<div class="muted">No hay productos.</div>`;
    return;
  }
  box.innerHTML = items.map(it => {
    const p = findProduct(it.sku);
    const unit = Number(p?.price || 0);
    const subtotal = unit * Number(it.qty||0);
    return `
      <div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #eee;">
        <div style="min-width:0;">
          <div style="font-weight:1000;">${escapeHtml(it.description)}</div>
          <div class="muted" style="font-weight:800;font-size:12px;">${escapeHtml(it.sku)} · ${Number(it.qty||0)}x</div>
        </div>
        <div style="font-weight:1000;white-space:nowrap;">${moneyARS(subtotal)}</div>
      </div>
    `;
  }).join("");
}

function setErr(id, msg){
  const el = $(id);
  el.textContent = msg || "";
  el.style.display = msg ? "block" : "none";
}

function validateCheckout(){
  const name = ($("custName").value || "").trim();
  const phone = ($("custPhone").value || "").trim();
  const address = ($("custAddress").value || "").trim();

  let ok = true;
  setErr("errName", "");
  setErr("errPhone", "");
  setErr("errAddress", "");

  if(Object.keys(CART).length === 0) ok = false;

  if(!name){
    setErr("errName", "Ingresá tu nombre y apellido.");
    ok = false;
  }
  if(!phone){
    setErr("errPhone", "Ingresá tu teléfono.");
    ok = false;
  }
  if(deliveryIsOn() && !address){
    setErr("errAddress", "Ingresá tu dirección para Entrega.");
    ok = false;
  }
  return ok;
}

function buildWhatsAppMessage(){
  const name = ($("custName").value || "").trim();
  const phone = ($("custPhone").value || "").trim();
  const address = ($("custAddress").value || "").trim();
  const delivery = deliveryIsOn() ? "Entrega" : "Retiro";

  // Fecha formato ddMMHHmm (ej: 07011433)
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const orderId =
    pad(now.getDate()) +
    pad(now.getMonth() + 1) +
    pad(now.getHours()) +
    pad(now.getMinutes());

  const items = Object.values(CART);

  let subtotal = 0;
  const lines = [];

  lines.push(`PEDIDO #${orderId}`);
  lines.push(`-------------------------------`);
  lines.push(`➜ *DETALLES DEL PEDIDO*`);

  items.forEach((it, i) => {
    const p = findProduct(it.sku);
    const unit = Number(p?.price || 0);
    const lineTotal = unit * Number(it.qty || 0);
    subtotal += lineTotal;

    lines.push(
      `${it.qty}x ${it.description} (Cód: ${it.sku}) - ${moneyARS(unit)}/unid`
    );
  });

  const shipping = items.length > 0 ? SHIPPING_COST : 0;
  const total = subtotal + shipping;

  lines.push(`-------------------------------`);
  lines.push(`➜ *DATOS DEL CLIENTE*`);
  lines.push(`Nombre: ${name}`);
  lines.push(`Teléfono: +${phone}`);
  if(deliveryIsOn()){
    lines.push(`Dirección: ${address}`);
  }

  lines.push(`------------------------------`);
  lines.push(`➜ *DETALLES DE ENVÍO*`);
  lines.push(`Método: ${delivery}`);

  lines.push(`-------------------------------`);
  lines.push(`➜ *VALORES*`);
  const totalItems = items.reduce((acc, it) => acc + Number(it.qty || 0), 0);
  lines.push(`${totalItems} artículos: ${moneyARS(subtotal)}`);
  lines.push(`Envio: ${moneyARS(shipping)}`);
  lines.push(`Total: ${moneyARS(total)}`);

  return lines.join("\n");
}

function sendWhatsApp(){
  if(!validateCheckout()){
    return;
  }
  if(!WHATSAPP_NUMBER){
    alert("Configurá WHATSAPP_NUMBER en app.js");
    return;
  }
  const msg = buildWhatsAppMessage();
  const url = `https://wa.me/${encodeURIComponent(WHATSAPP_NUMBER)}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/* Load products */
async function loadCatalog(){
  const url = (API_BASE ? API_BASE : "") + "/products";
  const r = await fetch(url, { cache:"no-store" });
  if(!r.ok) throw new Error("HTTP " + r.status);
  const data = await r.json();
  const items = data.items || data.products || data.data || data || [];
  ALL = Array.isArray(items) ? items : [];
  renderCategoriesUI();
  applyFilters();
  renderCart();
  updateCartBadge();
}

function toggleView(){
  VIEW_MODE = (VIEW_MODE === "grid") ? "list" : "grid";
  $("viewIcon").textContent = (VIEW_MODE === "grid") ? "▦" : "≡";
  applyFilters();
}

document.addEventListener("DOMContentLoaded", async () => {
  loadCart();
  updateCartBadge();

  // Header
  $("btnBackTop").addEventListener("click", () => history.back());

  // Cart
  $("btnOpenCart").addEventListener("click", openCart);
  $("cartClose").addEventListener("click", closeCart);
  $("cartBack").addEventListener("click", () => goStep("cart"));

  // Cart buttons
  $("btnContinue").addEventListener("click", () => {
    if(Object.keys(CART).length === 0) return;
    goStep("data");
  });
  $("btnSend").addEventListener("click", sendWhatsApp);

  $("btnClearCart").addEventListener("click", clearCart);
  $("btnMoreProducts").addEventListener("click", () => {
    closeCart();
    // scroll al top de productos
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Note count
  $("cartNote").addEventListener("input", () => {
    $("noteCount").textContent = ($("cartNote").value || "").length;
  });

  // Delivery radios
  $("optDelivery").addEventListener("click", () => {
    $("optDelivery").classList.add("active");
    $("optPickup").classList.remove("active");
    renderCart();
  });
  $("optPickup").addEventListener("click", () => {
    $("optPickup").classList.add("active");
    $("optDelivery").classList.remove("active");
    renderCart();
  });

  // Modal
  $("pmClose").addEventListener("click", closeProduct);
  $("backdrop").addEventListener("click", closeProduct);
  $("pmAdd").addEventListener("click", () => {
    if(!PM_SKU) return;
    addToCart(PM_SKU);
  });

  // Filters / view
  $("q").addEventListener("input", applyFilters);
  $("btnToggleView").addEventListener("click", toggleView);

  // Hide send button until step 2
  $("btnSend").style.display = "none";
  $("btnContinue").style.display = "block";
  $("cartBack").style.visibility = "hidden";
					 
									
				   
												
						   

  // ✅ Popup "Agregado correctamente"
  const bd = $("addPopBackdrop");
  const b1 = $("apContinue");
  const b2 = $("apGoCart");

  if(bd) bd.addEventListener("click", closeAddPopup);

  if(b1){
    b1.addEventListener("click", () => {
      closeAddPopup();
    });
  }

  if(b2){
    b2.addEventListener("click", () => {
      closeAddPopup();
      openCart();
      goStep("cart");
    });
  }

  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape") closeAddPopup();
  });

  // consulta Productos
  const pmConsultBtn = $("pmConsult");
  if (pmConsultBtn) {
    pmConsultBtn.addEventListener("click", () => {
      if(!PM_PRODUCT) return;

      const msg = `Tengo una consulta sobre el lente : ${PM_PRODUCT.sku} - ${PM_PRODUCT.description}`;
      const url = `https://wa.me/${encodeURIComponent(WHATSAPP_NUMBER)}?text=${encodeURIComponent(msg)}`;

      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  try{
    await loadCatalog();
  }catch(err){
    console.error(err);
    $("meta").textContent = "Error cargando /products: " + err.message;
  }
});
