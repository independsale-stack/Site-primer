"use strict";

/* Приём заявок.
   Пока ENDPOINT пуст, заявки сохраняются в localStorage браузера (прототип).
   Для реального сайта укажите URL сервера, который принимает JSON POST и пересылает на почту/CRM. */
const ENDPOINT = "";
const MAX_SUBMISSIONS = 20;

const PRODUCTS = {
  rope: {
    title: "Стальные канаты",
    desc: "Канаты из стальной проволоки, свитой в пряди вокруг сердечника. Работают в подъёмных механизмах, на буровых и горных установках, в строительстве и такелаже.",
    specs: ["Конструкция: пряди и сердечник подбираются под нагрузку и условия работы", "Сердечник: органический или металлический", "Покрытие: оцинкованная или светлая проволока"],
    uses: ["Краны, лебёдки, подъёмники", "Горнодобывающее оборудование", "Нефтегазовая отрасль", "Такелаж и строительство"]
  },
  strand: {
    title: "Арматурные канаты",
    desc: "Прядь из нескольких проволок, которую натягивают в железобетонной конструкции до заливки бетона или после неё.",
    specs: ["Конструкция: прядь из семи проволок, шесть вокруг центральной", "Назначение: предварительное напряжение железобетона", "Типоразмеры и классы прочности: по запросу"],
    uses: ["Мосты и путепроводы", "Плиты перекрытий", "Железобетонные балки и сваи", "Промышленное строительство"]
  },
  wire: {
    title: "Проволока",
    desc: "Стальная проволока для изготовления метизов и армирования. Заготовка для пружин и изделий, а также самостоятельное применение в сетках и конструкциях.",
    specs: ["Исполнение: оцинкованная или светлая", "Диаметр и прочность: под заказ", "Назначение: самостоятельное применение и дальнейшая переработка"],
    uses: ["Производство метизов и пружин", "Армирование и сетки", "Ограждения и конструкции", "Переработка в изделия"]
  }
};

const $ = (id) => document.getElementById(id);
const form = $("lead-form");
const fields = { name: $("f-name"), phone: $("f-phone"), email: $("f-email") };
const errs = { name: $("e-name"), phone: $("e-phone"), email: $("e-email") };
let interest = "";
let lastFocus = null;

/* ---------- прокрутка к форме ---------- */
function goToForm() {
  closeModal(false);
  $("lead-card").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  setTimeout(() => fields.name.focus({ preventScroll: true }), 350);
}
document.querySelectorAll("[data-goto-form]").forEach((b) => b.addEventListener("click", goToForm));

/* ---------- интерес ---------- */
function setInterest(text) {
  interest = text;
  $("interest").hidden = !text;
  $("interest-name").textContent = text;
}
$("interest-clear").addEventListener("click", () => setInterest(""));

/* ---------- маска телефона ---------- */
function phoneDigits(v) {
  let d = v.replace(/\D/g, "");
  if (d[0] === "7" || d[0] === "8") d = d.slice(1);
  return d.slice(0, 10);
}
function formatPhone(d) {
  if (!d) return "";
  let s = "+7 (" + d.slice(0, 3);
  if (d.length >= 3) s += ")";
  if (d.length > 3) s += " " + d.slice(3, 6);
  if (d.length > 6) s += "-" + d.slice(6, 8);
  if (d.length > 8) s += "-" + d.slice(8, 10);
  return s;
}
fields.phone.addEventListener("input", () => {
  fields.phone.value = formatPhone(phoneDigits(fields.phone.value));
});

/* ---------- валидация ---------- */
function validate() {
  const out = {};
  if (fields.name.value.trim().length < 2) out.name = "Введите имя (не короче 2 символов)";
  if (phoneDigits(fields.phone.value).length !== 10) out.phone = "Введите телефон полностью: +7 (XXX) XXX-XX-XX";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fields.email.value.trim())) out.email = "Введите корректную почту";
  return out;
}
function showError(key, msg) {
  errs[key].textContent = msg || "";
  if (msg) fields[key].setAttribute("aria-invalid", "true");
  else fields[key].removeAttribute("aria-invalid");
}
Object.keys(fields).forEach((k) => fields[k].addEventListener("input", () => { showError(k, ""); $("e-submit").textContent = ""; }));

/* ---------- сохранение ---------- */
function visitorId() {
  try {
    let id = localStorage.getItem("km_visitor");
    if (!id) { id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)); localStorage.setItem("km_visitor", id); }
    return id;
  } catch (e) { return "anon"; }
}
async function saveLead(lead) {
  if (ENDPOINT) {
    const r = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return;
  }
  const key = "leads/" + visitorId();
  const doc = JSON.parse(localStorage.getItem(key) || '{"submissions":[]}');
  doc.submissions.push(lead);
  doc.submissions = doc.submissions.slice(-MAX_SUBMISSIONS);
  doc.updatedAt = lead.createdAt;
  localStorage.setItem(key, JSON.stringify(doc));
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  $("e-submit").textContent = "";
  const problems = validate();
  Object.keys(fields).forEach((k) => showError(k, problems[k]));
  const first = Object.keys(problems)[0];
  if (first) { fields[first].focus(); return; }

  const btn = $("submit-btn");
  btn.disabled = true;
  btn.textContent = "Отправляем…";
  const lead = {
    name: fields.name.value.trim(),
    phone: fields.phone.value,
    email: fields.email.value.trim(),
    product: interest,
    createdAt: new Date().toISOString(),
    status: "new"
  };
  try {
    await saveLead(lead);
    $("s-name").textContent = lead.name;
    const sp = $("s-product");
    sp.hidden = !lead.product;
    sp.textContent = lead.product ? "Интересует: " + lead.product : "";
    form.hidden = true;
    $("success").hidden = false;
  } catch (err) {
    $("e-submit").textContent = "Не удалось отправить заявку. Повторите попытку или свяжитесь с нами по контактам ниже.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Отправить заявку";
  }
});

$("again-btn").addEventListener("click", () => {
  form.reset();
  setInterest("");
  $("success").hidden = true;
  form.hidden = false;
  fields.name.focus();
});

/* ---------- окно продукта ---------- */
const modal = $("modal");
let currentProduct = "";
function fill(ul, items) {
  ul.replaceChildren(...items.map((t) => { const li = document.createElement("li"); li.textContent = t; return li; }));
}
function openModal(key) {
  const p = PRODUCTS[key];
  currentProduct = p.title;
  $("m-title").textContent = p.title;
  $("m-desc").textContent = p.desc;
  fill($("m-specs"), p.specs);
  fill($("m-uses"), p.uses);
  lastFocus = document.activeElement;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  $("m-close").focus();
}
function closeModal(restore = true) {
  if (modal.hidden) return;
  modal.hidden = true;
  document.body.style.overflow = "";
  if (restore && lastFocus) lastFocus.focus();
}
document.querySelectorAll("[data-product]").forEach((b) => b.addEventListener("click", () => openModal(b.dataset.product)));
$("m-close").addEventListener("click", () => closeModal());
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
$("m-request").addEventListener("click", () => {
  if (!$("success").hidden) { $("again-btn").click(); }
  setInterest(currentProduct);
  goToForm();
});

/* ---------- копирование контактов ---------- */
document.querySelectorAll(".copy").forEach((b) => b.addEventListener("click", async () => {
  const text = document.querySelector(b.dataset.copy).textContent.trim();
  try { await navigator.clipboard.writeText(text); b.textContent = "Скопировано"; }
  catch (e) { b.textContent = "Не удалось"; }
  setTimeout(() => { b.textContent = "Скопировать"; }, 1800);
}));
