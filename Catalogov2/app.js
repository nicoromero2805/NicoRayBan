
const $=id=>document.getElementById(id);
const escapeHTML=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>Number(n||0).toLocaleString("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0});
const params=new URLSearchParams(location.search);
const vendedor=params.get("vendedor")||"";
const API="/products"+(vendedor?"?vendedor="+encodeURIComponent(vendedor):"");
let all=[],selected="TODOS",cart={},page=1,pageSize=20;
const key="lentes_cart_v2"; // compartido con la versión actual
const OWNER_WHATSAPP="5493512070090";
const COEF_MP_1P=145/135, COEF_MP_3P=165/135;
const floorToThousand=n=>Math.floor(Number(n||0)/1000)*1000;
const priceOptions=p=>({transfer:Number(p.price||0),one:floorToThousand(Number(p.price||0)*COEF_MP_1P),three:floorToThousand(Number(p.price||0)*COEF_MP_3P)});
try{cart=JSON.parse(localStorage.getItem(key)||"{}")||{}}catch{cart={}}
let phone=""; // se obtiene siempre de la API del vendedor
function category(desc){
 const t=String(desc||"").trim().toUpperCase();
 if(!t)return "OTROS";
 if(t.startsWith("THE JA"))return "THE JA-JO";
 if(t.startsWith("THE ")){const p=t.split(/\s+/);return p[1]?"THE "+p[1]:"THE"}
 if(t.startsWith("BIL ")||t.startsWith("BILL "))return "BILL";
 if(t.includes("FERRARI")||t.includes("SCUDERIA"))return "FERRARI";
 if(t.includes("CAT EYE"))return "CAT EYE";
 if(t.includes("CAT 5000"))return "CAT 5000";
 if(t.includes("CAT")&&!t.includes("CATCH"))return "CAT EYE";
 return t.split(/\s+/)[0]||"OTROS";
}
// Presentación: la fuente de datos conserva su descripción original.
function displayName(value){
 const special={"ferrari":"Ferrari","scuderia":"Scuderia","ray-ban":"Ray-Ban","rayban":"Ray-Ban","uv":"UV","3d":"3D","marron":"Marrón","degrade":"Degradé"};
 return String(value??"").trim().replace(/\\s+/g," ").toLocaleLowerCase("es-AR")
 .replace(/[^\\s]+/g,w=>special[w]||w.charAt(0).toLocaleUpperCase("es-AR")+w.slice(1));
}
const product=sku=>all.find(p=>String(p.sku)===String(sku));
const available=p=>Number(p.stock||0)>0;
const stockText=p=>available(p)?`Stock disponible: ${Number(p.stock)} ${Number(p.stock)===1?"unidad":"unidades"}`:"Sin stock";
function save(){localStorage.setItem(key,JSON.stringify(cart));updateCart()}
function updateCart(){
 const n=Object.values(cart).reduce((s,p)=>s+Number(p.qty||0),0);
 $("cartCount").textContent=n;$("drawerCount").textContent="("+n+")";
 let sum=0;
 $("cartItems").innerHTML=Object.values(cart).map(c=>{
 const p=product(c.sku);if(!p)return "";
 sum+=Number(p.price||0)*Number(c.qty||0);
 return `<div class="cart-item"><img src="${escapeHTML(p.foto_url||"")}" alt=""><div><strong>${escapeHTML(displayName(p.description))}</strong><p>${money(p.price)} · Stock ${Number(p.stock||0)}</p><button data-dec="${escapeHTML(p.sku)}">−</button> <span>${Number(c.qty)}</span> <button data-inc="${escapeHTML(p.sku)}">+</button> <button data-remove="${escapeHTML(p.sku)}">Quitar</button></div></div>`;
 }).join("")||"<p>Tu carrito está vacío.</p>";
 $("subtotal").textContent=money(sum);
}
function add(sku){
 const p=product(sku);if(!p||!available(p))return;
 const k=String(sku),qty=Number(cart[k]?.qty||0);
 if(qty>=Number(p.stock))return alert("No hay más unidades disponibles.");
 cart[k]={sku:k,description:p.description,qty:qty+1};
 save();openCart();
}
function openCart(){$("overlay").hidden=false;$("drawer").classList.add("open");$("drawer").setAttribute("aria-hidden","false")}
function closeCart(){$("overlay").hidden=true;$("drawer").classList.remove("open");$("drawer").setAttribute("aria-hidden","true")}
function wa(text){if(!phone){alert("No se pudo obtener el teléfono del vendedor.");return}window.open("https://wa.me/"+phone+"?text="+encodeURIComponent(text),"_blank","noopener")}
function renderCategories(){
 const counts={};all.forEach(p=>counts[p._category]=(counts[p._category]||0)+1);
 const cats=Object.keys(counts).sort((a,b)=>a.localeCompare(b,"es"));
 const label=c=>c==="TODOS"?"Todos":c;
 $("chips").innerHTML=["TODOS",...cats].map(c=>`<button class="chip ${selected===c?"active":""}" data-category="${escapeHTML(c)}">${escapeHTML(label(c))}</button>`).join("");
 $("categoryList").innerHTML=["TODOS",...cats].map(c=>`<button data-category="${escapeHTML(c)}">${escapeHTML(label(c))} (${c==="TODOS"?all.length:counts[c]})</button>`).join("");
}
function render(){
 renderCategories();
 const q=$("search").value.trim().toLowerCase();
 let items=all.filter(p=>(selected==="TODOS"?available(p):p._category===selected)&&(!q||(String(p.description||"")+" "+p.sku).toLowerCase().includes(q)));
 if(selected==="TODOS")items.sort((a,b)=>{
 const fa=a._category==="FERRARI",fb=b._category==="FERRARI";if(fa!==fb)return fa?-1:1;
 const na=Number(a.sku)>=100611,nb=Number(b.sku)>=100611;if(na!==nb)return na?-1:1;
 return String(a.description).localeCompare(String(b.description),"es");
 });
 $("categoryTitle").textContent=selected==="TODOS"?"Todos los modelos":selected;
 $("resultCount").textContent=`${items.length} modelos`;
 $("message").textContent=items.length?"":"No encontramos modelos para esta búsqueda.";
 const pages=Math.max(1,Math.ceil(items.length/pageSize));page=Math.min(page,pages);
 const shown=items.slice((page-1)*pageSize,page*pageSize);
 $("pagination").innerHTML=items.length<=pageSize?"":`<button data-page="${page-1}" ${page===1?"disabled":""}>‹</button>${Array.from({length:pages},(_,i)=>i+1).filter(n=>n===1||n===pages||Math.abs(n-page)<=2).map((n,i,arr)=>`${i&&n-arr[i-1]>1?'<span>…</span>':""}<button data-page="${n}" ${n===page?'class="active" aria-current="page"':""}>${n}</button>`).join("")}<button data-page="${page+1}" ${page===pages?"disabled":""}>›</button>`;
 $("products").innerHTML=shown.map(p=>{
 const sku=escapeHTML(p.sku),name=escapeHTML(displayName(p.description)),img=escapeHTML(p.foto_url||"");
 return `<article class="product"><div class="photo" data-detail="${sku}">${img?`<img loading="lazy" src="${img}" alt="${name}">`:"<span>Imagen no disponible</span>"}${!available(p)?'<span class="stock-label">Sin stock</span>':""}</div><div class="product-body"><div class="category">${escapeHTML(p._category)}</div><h3>${name}</h3><div class="price">${money(p.price)}</div><div class="product-stock ${available(p)?"in-stock":"out-stock"}">${stockText(p)}</div><div class="actions"><button class="secondary" data-detail="${sku}">Ver detalle</button><button data-add="${sku}" ${available(p)?"":"disabled"}>${available(p)?"Agregar +":"Sin stock"}</button></div></div></article>`;
 }).join("");
}
function detail(sku){
 const p=product(sku);if(!p)return;
 const imgs=Array.isArray(p.gallery)&&p.gallery.length?p.gallery:[p.foto_url].filter(Boolean);
 const prices=priceOptions(p);
 $("detailContent").dataset.sku=String(p.sku);
 $("detailContent").innerHTML=`<div class="detail-layout">
 <div class="detail-photos">
 <img id="mainDetailImage" src="${escapeHTML(imgs[0]||"")}" alt="${escapeHTML(displayName(p.description))}">
 <div class="detail-thumbs">${imgs.slice(0,6).map((url,i)=>`<button class="thumb ${i===0?"selected":""}" data-img="${escapeHTML(url)}" aria-label="Ver foto ${i+1}"><img src="${escapeHTML(url)}" alt="Vista ${i+1}"></button>`).join("")}</div>
 </div>
 <div class="detail-info">
 <span class="eyebrow">${escapeHTML(p._category)}</span>
 <h2>${escapeHTML(displayName(p.description))}</h2>
 <p class="detail-sku">SKU ${escapeHTML(p.sku)}</p>
 <p class="product-stock ${available(p)?"in-stock":"out-stock"}">${stockText(p)}</p>
 <div class="transfer-price"><span>Precio por transferencia</span><strong>${money(prices.transfer)}</strong></div>
 <details class="payment-options">
   <summary><span>💳 Otras opciones de pago</span><span class="payment-chevron" aria-hidden="true">⌄</span></summary>
   <div class="payment-options-body">
     <label for="mpPlan">Elegí una opción de Mercado Pago</label>
     <select id="mpPlan" class="payment-select">
       <option value="1">1 pago</option>
       <option value="3">3 cuotas</option>
     </select>
     <div class="payment-result" aria-live="polite">
       <span id="mpPriceLabel">Total con Mercado Pago</span>
       <strong id="mpPriceValue">${money(prices.one)}</strong>
       <small id="mpPriceTotal" hidden></small>
     </div>
   </div>
 </details>
 <div class="detail-actions">
 <button class="primary" data-add="${escapeHTML(p.sku)}" ${available(p)?"":"disabled"}>${available(p)?"Agregar al carrito":"Sin stock"}</button>
 <button class="secondary detail-consult" data-consult="${escapeHTML(p.sku)}">Consultar por WhatsApp ↗</button>
 </div>
 </div></div>`;
 $("detail").showModal();
}
document.addEventListener("click",e=>{
 const el=e.target.closest("[data-page],[data-category],[data-add],[data-detail],[data-inc],[data-dec],[data-remove],[data-consult],[data-img]");
 if(!el)return;
 if(el.dataset.page){page=Number(el.dataset.page);render();$("catalogo").scrollIntoView({behavior:"smooth"});return}
 if(el.dataset.category){page=1;selected=el.dataset.category;$("categoryPanel").hidden=true;render();$("catalogo").scrollIntoView({behavior:"smooth"})}
 if(el.dataset.add){add(el.dataset.add)}
 if(el.dataset.detail){detail(el.dataset.detail)}
 if(el.dataset.consult){const p=product(el.dataset.consult);if(p)wa(`Hola! Quiero consultar por ${p.description} (SKU ${p.sku}).`)}
 if(el.dataset.img){$("mainDetailImage").src=el.dataset.img;document.querySelectorAll(".detail-thumbs .thumb").forEach(b=>b.classList.toggle("selected",b.dataset.img===el.dataset.img));}
 if(el.dataset.inc||el.dataset.dec||el.dataset.remove){
 const k=el.dataset.inc||el.dataset.dec||el.dataset.remove,p=product(k);
 if(el.dataset.remove)delete cart[k];
 else if(el.dataset.inc&&p&&Number(cart[k]?.qty||0)<Number(p.stock))cart[k].qty++;
 else if(el.dataset.dec&&cart[k]){cart[k].qty--;if(cart[k].qty<=0)delete cart[k]}
 save();
 }
});
// El selector solo actualiza el precio informativo del detalle.
document.addEventListener("change",e=>{
 if(e.target.id!=="mpPlan")return;
 const p=product($("detailContent").dataset.sku);
 if(!p)return;
 const prices=priceOptions(p);
 const three=e.target.value==="3";
 $("mpPriceLabel").textContent=three?"3 cuotas de":"Total con Mercado Pago";
 $("mpPriceValue").textContent=money(three?prices.three/3:prices.one);
 $("mpPriceTotal").hidden=!three;
 $("mpPriceTotal").textContent=three?"Total financiado: "+money(prices.three):"";
});
$("search").addEventListener("input",()=>{page=1;render()});
$("pageSize").addEventListener("change",e=>{pageSize=Number(e.target.value);page=1;render()});
$("allCategories").onclick=()=>$("categoryPanel").hidden=!$("categoryPanel").hidden;
$("closeCategories").onclick=()=>$("categoryPanel").hidden=true;
$("openCart").onclick=openCart;$("closeCart").onclick=closeCart;$("overlay").onclick=closeCart;
$("closeDetail").onclick=()=>$("detail").close();
$("checkout").onclick=()=>{
 const items=Object.values(cart);if(!items.length)return alert("Tu carrito está vacío.");
 const text="Hola! Quiero hacer un pedido de Lentes CBA:\n"+items.map(c=>`• ${c.description} (SKU ${c.sku}) x${c.qty}`).join("\n")+"\n¿Me ayudan a coordinar la compra?";
 wa(text);
};
$("whatsapp").onclick=e=>{e.preventDefault();wa("Hola! Quería consultar por los lentes de Lentes CBA.")};
const announcements=["🇦🇷 Envíos gratis a todo el país","💳 Todos los medios de pago","📍 Córdoba Capital"];
let announcementIndex=0;
setInterval(()=>{
 const el=$("announcementText");el.classList.add("exit");
 setTimeout(()=>{announcementIndex=(announcementIndex+1)%announcements.length;el.textContent=announcements[announcementIndex];el.classList.remove("exit");el.classList.add("enter");requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.remove("enter")))},350);
},4500);
$("waDismiss").onclick=()=>{$("waBubble").hidden=true};
async function loadSeller(){
 const seller=params.get("vendedor")||"";
 const url="/api/vendedor"+(seller?"/"+encodeURIComponent(seller):"");
 const res=await fetch(url);
 if(!res.ok)throw new Error("No se pudo consultar el vendedor");
 const data=await res.json();
 phone=String(data.telefono||"").replace(/\D/g,"");
 if(!phone)throw new Error("El vendedor no tiene teléfono configurado");
 $("sellerLabel").innerHTML="Vendedor: <strong>"+escapeHTML(seller||data.nombre||data.name||"Lentes CBA")+"</strong>";

}
$("entrepreneur").href="https://wa.me/"+OWNER_WHATSAPP+"?text="+encodeURIComponent("Hola, quiero emprender con Lentes CBA.");
async function init(){
 try{
 await loadSeller();
 const res=await fetch(API);if(!res.ok)throw Error("HTTP "+res.status);
 const data=await res.json();all=(data.items||[]).map(p=>({...p,_category:category(p.description)}));
 if(!all.length)throw Error("No se recibieron productos");
 render();updateCart();
 }catch(err){$("message").textContent="No se pudo cargar el catálogo: "+err.message;}

}
init();
