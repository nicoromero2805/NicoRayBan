
const $=id=>document.getElementById(id);
const escapeHTML=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>Number(n||0).toLocaleString("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0});
const params=new URLSearchParams(location.search);
const vendedor=params.get("vendedor")||"";
const API="/products"+(vendedor?"?vendedor="+encodeURIComponent(vendedor):"");
let all=[],selected="TODOS",cart={};
const key="lentes_cart_v2"; // compartido con la versión actual
try{cart=JSON.parse(localStorage.getItem(key)||"{}")||{}}catch{cart={}}
let phone="5493512070090";
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
const product=sku=>all.find(p=>String(p.sku)===String(sku));
const available=p=>Number(p.stock||0)>0;
function save(){localStorage.setItem(key,JSON.stringify(cart));updateCart()}
function updateCart(){
 const n=Object.values(cart).reduce((s,p)=>s+Number(p.qty||0),0);
 $("cartCount").textContent=n;$("drawerCount").textContent="("+n+")";
 let sum=0;
 $("cartItems").innerHTML=Object.values(cart).map(c=>{
 const p=product(c.sku);if(!p)return "";
 sum+=Number(p.price||0)*Number(c.qty||0);
 return `<div class="cart-item"><img src="${escapeHTML(p.foto_url||"")}" alt=""><div><strong>${escapeHTML(p.description)}</strong><p>${money(p.price)} · Stock ${Number(p.stock||0)}</p><button data-dec="${escapeHTML(p.sku)}">−</button> <span>${Number(c.qty)}</span> <button data-inc="${escapeHTML(p.sku)}">+</button> <button data-remove="${escapeHTML(p.sku)}">Quitar</button></div></div>`;
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
function wa(text){window.open("https://wa.me/"+phone+"?text="+encodeURIComponent(text),"_blank","noopener")}
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
 $("products").innerHTML=items.map(p=>{
 const sku=escapeHTML(p.sku),name=escapeHTML(p.description),img=escapeHTML(p.foto_url||"");
 return `<article class="product"><div class="photo" data-detail="${sku}">${img?`<img loading="lazy" src="${img}" alt="${name}">`:"<span>Imagen no disponible</span>"}${!available(p)?'<span class="stock-label">Sin stock</span>':""}</div><div class="category">${escapeHTML(p._category)}</div><h3>${name}</h3><div class="price">${money(p.price)}</div><div class="actions"><button class="secondary" data-detail="${sku}">Ver detalle</button><button data-add="${sku}" ${available(p)?"":"disabled"}>${available(p)?"Agregar +":"Sin stock"}</button></div></article>`;
 }).join("");
}
function detail(sku){
 const p=product(sku);if(!p)return;
 const imgs=Array.isArray(p.gallery)&&p.gallery.length?p.gallery:[p.foto_url].filter(Boolean);
 $("detailContent").innerHTML=`<div class="detail-layout"><div><img id="mainDetailImage" src="${escapeHTML(imgs[0]||"")}" alt="${escapeHTML(p.description)}"><div class="detail-thumbs">${imgs.slice(0,6).map(url=>`<button data-img="${escapeHTML(url)}">◦</button>`).join("")}</div></div><div><span class="eyebrow">${escapeHTML(p._category)}</span><h2>${escapeHTML(p.description)}</h2><p>SKU ${escapeHTML(p.sku)} · ${available(p)?"Disponible":"Sin stock"}</p><p>${money(p.price)}</p><button class="primary" data-add="${escapeHTML(p.sku)}" ${available(p)?"":"disabled"}>Agregar al carrito</button><p><button class="secondary" data-consult="${escapeHTML(p.sku)}">Consultar por WhatsApp ↗</button></p></div></div>`;
 $("detail").showModal();
}
document.addEventListener("click",e=>{
 const el=e.target.closest("[data-category],[data-add],[data-detail],[data-inc],[data-dec],[data-remove],[data-consult],[data-img]");
 if(!el)return;
 if(el.dataset.category){selected=el.dataset.category;$("categoryPanel").hidden=true;render();$("catalogo").scrollIntoView({behavior:"smooth"})}
 if(el.dataset.add){add(el.dataset.add)}
 if(el.dataset.detail){detail(el.dataset.detail)}
 if(el.dataset.consult){const p=product(el.dataset.consult);if(p)wa(`Hola! Quiero consultar por ${p.description} (SKU ${p.sku}).`)}
 if(el.dataset.img)$("mainDetailImage").src=el.dataset.img;
 if(el.dataset.inc||el.dataset.dec||el.dataset.remove){
 const k=el.dataset.inc||el.dataset.dec||el.dataset.remove,p=product(k);
 if(el.dataset.remove)delete cart[k];
 else if(el.dataset.inc&&p&&Number(cart[k]?.qty||0)<Number(p.stock))cart[k].qty++;
 else if(el.dataset.dec&&cart[k]){cart[k].qty--;if(cart[k].qty<=0)delete cart[k]}
 save();
 }
});
$("search").addEventListener("input",render);
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
async function init(){
 try{
 const res=await fetch(API);if(!res.ok)throw Error("HTTP "+res.status);
 const data=await res.json();all=(data.items||[]).map(p=>({...p,_category:category(p.description)}));
 if(!all.length)throw Error("No se recibieron productos");
 render();updateCart();
 }catch(err){$("message").textContent="No se pudo cargar el catálogo: "+err.message;}
 // El vendedor principal puede seguir usando el número actual; los enlaces con ?vendedor
 // requieren configurar el número correspondiente antes de usar esta versión.
}
init();
