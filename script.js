const DATA_URL =
  "https://raw.githubusercontent.com/encoremed-io/mysihatpal-public-data/master/institutes.json";

const elements = {
  cards: document.getElementById("cards"),
  emptyState: document.getElementById("emptyState"),
  resultCount: document.getElementById("resultCount"),
  statTotal: document.getElementById("statTotal"),
  statStates: document.getElementById("statStates"),
  statSpecialties: document.getElementById("statSpecialties"),
  searchInput: document.getElementById("searchInput"),
  stateFilter: document.getElementById("stateFilter"),
  specialityFilter: document.getElementById("specialityFilter"),
  scrollToDirectory: document.getElementById("scrollToDirectory"),
};

let dataset = [];

const uniqueSorted = (values) =>
  Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));

const normalize = (value) => value.toLowerCase().trim();

const buildFilters = (items) => {
  const states = uniqueSorted(items.map((item) => item.state));
  const specialties = uniqueSorted(
    items.flatMap((item) => item.specialities || [])
  );

  elements.stateFilter.innerHTML =
    '<option value="">All states</option>' +
    states.map((state) => `<option value="${state}">${state}</option>`).join("");

  elements.specialityFilter.innerHTML =
    '<option value="">All specialities</option>' +
    specialties
      .map(
        (speciality) =>
          `<option value="${speciality}">${speciality}</option>`
      )
      .join("");

  elements.statTotal.textContent = items.length.toString();
  elements.statStates.textContent = states.length.toString();
  elements.statSpecialties.textContent = specialties.length.toString();
};

const renderCards = (items) => {
  elements.cards.innerHTML = "";
  const fragment = document.createDocumentFragment();

  items.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "card";
    card.style.animationDelay = `${Math.min(index * 0.03, 0.3)}s`;

    const title = document.createElement("h3");
    title.textContent = item.name;

    const meta = document.createElement("div");
    meta.className = "card-meta";
    meta.innerHTML = `<span>${item.state}</span><span>${item.country}</span>`;

    const tags = document.createElement("div");
    tags.className = "card-meta";

    (item.specialities || []).forEach((speciality) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = speciality;
      tags.appendChild(tag);
    });

    const code = document.createElement("span");
    code.className = "tag code-pill";
    code.textContent = item.code;

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(tags);
    card.appendChild(code);
    fragment.appendChild(card);
  });

  elements.cards.appendChild(fragment);
  elements.emptyState.hidden = items.length > 0;
  elements.resultCount.textContent = `Showing ${items.length} of ${dataset.length}`;
};

const applyFilters = () => {
  const searchValue = normalize(elements.searchInput.value);
  const stateValue = elements.stateFilter.value;
  const specialityValue = elements.specialityFilter.value;

  const filtered = dataset.filter((item) => {
    const searchTarget = [
      item.name,
      item.code,
      item.state,
      item.country,
      ...(item.specialities || []),
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchTarget.includes(searchValue);
    const matchesState = !stateValue || item.state === stateValue;
    const matchesSpeciality =
      !specialityValue ||
      (item.specialities || []).includes(specialityValue);

    return matchesSearch && matchesState && matchesSpeciality;
  });

  renderCards(filtered);
};

const loadData = async () => {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load institutes data.");
    }
    const data = await response.json();
    dataset = Array.isArray(data) ? data : [];
    buildFilters(dataset);
    renderCards(dataset);
  } catch (error) {
    elements.cards.innerHTML = "";
    elements.resultCount.textContent = "Unable to load data";
    elements.emptyState.hidden = false;
    elements.emptyState.textContent =
      "Sorry, we could not load the public data right now.";
  }
};

const setupEvents = () => {
  [elements.searchInput, elements.stateFilter, elements.specialityFilter].forEach(
    (element) => {
      element.addEventListener("input", applyFilters);
      element.addEventListener("change", applyFilters);
    }
  );

  elements.scrollToDirectory.addEventListener("click", () => {
    document.getElementById("directory").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
};

setupEvents();
loadData();
