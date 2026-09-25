(() => {
  const cfg = window.REVELACION_CONFIG || {};
  const form = document.getElementById("voteForm");
  const nameInput = document.getElementById("name");
  const babyNameInput = document.getElementById("babyName");
  const errorBox = document.getElementById("formError");
  const submitBtn = document.getElementById("submitBtn");
  const results = document.getElementById("results");
  const changeVote = document.getElementById("changeVote");
  const namesList = document.getElementById("namesList");
  const namesEmpty = document.getElementById("namesEmpty");

  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey ||
      cfg.supabaseUrl.includes("PEGAR_") || cfg.supabaseAnonKey.includes("PEGAR_")) {
    errorBox.textContent = "Falta configurar Supabase en config.js.";
    submitBtn.disabled = true;
    return;
  }

  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  function getDeviceId() {
    const key = "revelacion_device_id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() :
        `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(key, id);
    }
    return id;
  }

  function rememberVote(name, vote, babyName) {
    localStorage.setItem("revelacion_name", name);
    localStorage.setItem("revelacion_vote", vote);
    if (babyName) {
      localStorage.setItem("revelacion_baby_name", babyName);
    } else {
      localStorage.removeItem("revelacion_baby_name");
    }
  }

  function restoreLocalVote() {
    const savedName = localStorage.getItem("revelacion_name");
    const savedVote = localStorage.getItem("revelacion_vote");
    const savedBabyName = localStorage.getItem("revelacion_baby_name");

    if (savedName) nameInput.value = savedName;
    if (savedBabyName) babyNameInput.value = savedBabyName;

    if (savedVote) {
      const radio = document.querySelector(`input[name="vote"][value="${savedVote}"]`);
      if (radio) radio.checked = true;
      submitBtn.textContent = savedBabyName ? "Actualizar mi propuesta" : "Guardar mi propuesta 👶";
      loadResults();
    }
  }

  async function loadNames() {
    const { data, error } = await db.rpc("ranking_nombres");

    if (error) {
      console.error("Error cargando nombres:", error);
      namesList.innerHTML = "";
      namesEmpty.textContent = "No pudimos cargar las propuestas de nombres.";
      namesEmpty.hidden = false;
      return;
    }

    namesList.innerHTML = "";
    const rows = data || [];
    namesEmpty.hidden = rows.length > 0;

    rows.forEach(row => {
      const item = document.createElement("div");
      item.className = "name-item";

      const name = document.createElement("span");
      name.className = "suggested-name";
      name.textContent = row.nombre_bebe;

      const count = document.createElement("strong");
      count.className = "name-count";
      count.textContent = `×${Number(row.cantidad)}`;

      item.append(name, count);
      namesList.appendChild(item);
    });
  }

  async function loadResults() {
    const { data, error } = await db.rpc("resultado_votacion");
    if (error) {
      console.error(error);
      errorBox.textContent = "No pudimos cargar los resultados. Probá de nuevo.";
      return;
    }

    let girls = 0, boys = 0;
    (data || []).forEach(row => {
      if (row.voto === "NINA") girls = Number(row.cantidad);
      if (row.voto === "NINO") boys = Number(row.cantidad);
    });

    const total = girls + boys;
    const girlPct = total ? Math.round((girls * 100) / total) : 0;
    const boyPct = total ? 100 - girlPct : 0;

    document.getElementById("totalVotes").textContent = total;
    document.getElementById("girlPct").textContent = `${girlPct}%`;
    document.getElementById("boyPct").textContent = `${boyPct}%`;

    const donut = document.getElementById("donut");
    donut.style.setProperty("--girl", `${girlPct}%`);
    donut.setAttribute("aria-label", `Niña ${girlPct}%, Niño ${boyPct}%. ${total} votos.`);

    await loadNames();
    results.hidden = false;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.textContent = "";

    const name = nameInput.value.trim();
    const babyName = babyNameInput.value.trim();
    const selected = form.querySelector('input[name="vote"]:checked');

    if (name.length < 2) {
      errorBox.textContent = "Ingresá tu nombre para poder confirmar.";
      nameInput.focus();
      return;
    }

    if (!selected) {
      errorBox.textContent = "Elegí Niña o Niño antes de confirmar.";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Guardando…";

    const { error } = await db.rpc("registrar_voto_v2", {
      p_nombre: name,
      p_voto: selected.value,
      p_dispositivo_id: getDeviceId(),
      p_nombre_bebe: babyName || null
    });

    submitBtn.disabled = false;

    if (error) {
      console.error(error);
      errorBox.textContent = "No pudimos guardar tu predicción. Probá nuevamente.";
      submitBtn.textContent = localStorage.getItem("revelacion_vote")
        ? "Guardar mi propuesta 👶"
        : "Confirmar mi predicción";
      return;
    }

    rememberVote(name, selected.value, babyName);
    submitBtn.textContent = babyName ? "Actualizar mi propuesta" : "Guardar mi propuesta 👶";

    await loadResults();
    results.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  changeVote.addEventListener("click", () => {
    results.hidden = true;
    babyNameInput.focus();
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  restoreLocalVote();
})();
