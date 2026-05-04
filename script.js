const DATA_URL = "https://raw.githubusercontent.com/encoremed-io/mysihatpal-public-data/master/institutes.json";

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

const TRACKING_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_id",
  "utm_term",
  "utm_content",
  "gclid",
]);

const cleanSearchString = (search) => {
  if (!search) return "";
  const trimmed = search.trim();
  if (!trimmed) return "";

  // Normalize malformed query prefixes to a single leading "?" for clean parsing.
  return trimmed
    .replace(/^\?%3f/i, "?")
    .replace(/^\?{2,}/, "?");
};

const getCapturedParams = () => {
  const cleanedSearch = cleanSearchString(window.location.search);
  const params = new URLSearchParams(cleanedSearch);
  const cleaned = new Map();

  for (const [key, value] of params.entries()) {
    const cleanedValue = typeof value === "string" ? value.trim() : "";
    if (!cleanedValue || cleanedValue.toLowerCase() === "undefined") {
      continue;
    }
    if (!cleaned.has(key)) {
      cleaned.set(key, cleanedValue);
    }
  }

  return cleaned;
};

const capturedParams = getCapturedParams();

const uniqueSorted = (values) =>
  Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));

const normalize = (value) => value.toLowerCase().trim();

const buildBookingUrl = (item) => {
  const bookingUrl = new URL(CONFIG.BOOKING_URL, window.location.origin);
  const basePath = bookingUrl.pathname.replace(/\/+$/, "");
  const codePath = `/${(item?.code || "").trim()}`;
  bookingUrl.pathname = `${basePath}${codePath}`;
  capturedParams.forEach((value, key) => {
    bookingUrl.searchParams.set(key, value);
  });
  return bookingUrl.toString();
};

const trackBookingClick = (item) => {
  const bookingUrl = buildBookingUrl(item);
  const queryPayload = {};
  let didRedirect = false;

  capturedParams.forEach((value, key) => {
    if (TRACKING_KEYS.has(key)) {
      queryPayload[key] = value;
    }
  });

  const redirectToBooking = () => {
    if (didRedirect) return;
    didRedirect = true;
    window.location.href = bookingUrl;
  };

  if (typeof gtag === "function") {
    gtag("get", "G-1FVP3S48ST", "linker_param", (linkerParam) => {
      const finalUrl = linkerParam ? `${bookingUrl}&${linkerParam}` : bookingUrl;
      
      console.log("Megat Local Test - Final URL with Linker:", finalUrl);

      gtag("event", "appointment_initiation", {
        institute_name: item.name,
        institute_code: item.code,
        event_callback: () => { window.location.href = finalUrl; }
      });

      // Safety timeout
      setTimeout(() => { window.location.href = finalUrl; }, 1000);
    });
  } else {
    window.location.href = bookingUrl;
  }

  setTimeout(() => {
    redirectToBooking();
  }, 1000);
};

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
      .map((speciality) => `<option value="${speciality}">${speciality}</option>`)
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

    card.innerHTML = `
      <h3>${item.name}</h3>
      <div class="card-meta">
        <span>${item.state}</span>
        <span>${item.country}</span>
      </div>
      <div class="card-meta" id="tags-${index}"></div>
      <span class="tag code-pill">${item.code}</span>
      <button type="button" class="cta" id="btn-${index}">Book now</button>
    `;

    // Render Specialities Tags
    const tagsContainer = card.querySelector(`#tags-${index}`);
    (item.specialities || []).forEach((speciality) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = speciality;
      tagsContainer.appendChild(tag);
    });

    card.querySelector(`#btn-${index}`).addEventListener("click", () => trackBookingClick(item));

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
    const matchesSpeciality = !specialityValue || (item.specialities || []).includes(specialityValue);

    return matchesSearch && matchesState && matchesSpeciality;
  });

  renderCards(filtered);
};

const loadData = async () => {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load institutes data.");
    
    const data = await response.json();
    dataset = Array.isArray(data) ? data : [];
    buildFilters(dataset);
    renderCards(dataset);
  } catch (error) {
    elements.cards.innerHTML = "<p>Unable to load data.</p>";
    elements.resultCount.textContent = "Error";
    elements.emptyState.hidden = false;
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