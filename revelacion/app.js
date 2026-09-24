(() => {
  const cfg = window.REVELACION_CONFIG || {};
  const form = document.getElementById("voteForm");
  const nameInput = document.getElementById("name");
  const errorBox = document.getElementById("formError");
  const submitBtn = document.getElementById("submitBtn");
  const results = document.getElementById("results");
  const changeVote = document.getElementById("changeVote");

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

  function rememberVote(name, vote) {
    localStorage.setItem("revelacion_name", name);
    localStorage.setItem("revelacion_vote", vote);
  }

  function restoreLocalVote() {
    const savedName = localStorage.getItem("revelacion_name");
    const savedVote = localStorage.getItem("revelacion_vote");
    if (savedName) nameInput.value = savedName;
    if (savedVote) {
      const radio = document.querySelector(`input[name="vote"][value="${savedVote}"]`);
      if (radio) radio.checked = true;
      loadResults();
    }
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
    results.hidden = false;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.textContent = "";

    const name = nameInput.value.trim();
    const selected = form.querySelector('input[name="vote"]:checked');

    if (name.length < 2) {
      errorBox.textContent = "Escribí tu nombre para poder votar.";
      nameInput.focus();
      return;
    }
    if (!selected) {
      errorBox.textContent = "Elegí Niña o Niño antes de confirmar.";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Guardando voto…";

    const { error } = await db.rpc("registrar_voto", {
      p_nombre: name,
      p_voto: selected.value,
      p_dispositivo_id: getDeviceId()
    });

    submitBtn.disabled = false;
    submitBtn.textContent = "Confirmar mi voto";

    if (error) {
      console.error(error);
      errorBox.textContent = "No pudimos guardar tu voto. Probá nuevamente.";
      return;
    }

    rememberVote(name, selected.value);
    await loadResults();
    results.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  changeVote.addEventListener("click", () => {
    results.hidden = true;
    document.querySelector('input[name="vote"]:checked')?.focus();
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  restoreLocalVote();
})();
