const state = {
  mobiles: [],
  compareIds: new Set(),
  compareResult: null,
  wishlist: [],
  options: null,
  auth: {
    accessToken: localStorage.getItem('accessToken') || '',
    refreshToken: localStorage.getItem('refreshToken') || '',
    user: JSON.parse(localStorage.getItem('authUser') || 'null'),
  },
};

const el = {
  healthStatus: document.getElementById('healthStatus'),
  catalogCount: document.getElementById('catalogCount'),
  compareCount: document.getElementById('compareCount'),
  catalogMeta: document.getElementById('catalogMeta'),
  sessionSummary: document.getElementById('sessionSummary'),
  mobileGrid: document.getElementById('mobileGrid'),
  wishlistGrid: document.getElementById('wishlistGrid'),
  comparisonResults: document.getElementById('comparisonResults'),
  selectedCompare: document.getElementById('selectedCompare'),
  toast: document.getElementById('toast'),
  signupForm: document.getElementById('signupForm'),
  loginForm: document.getElementById('loginForm'),
  filtersForm: document.getElementById('filtersForm'),
  brandSelect: document.getElementById('brandSelect'),
  osSelect: document.getElementById('osSelect'),
  panelTypeSelect: document.getElementById('panelTypeSelect'),
  processorBrandSelect: document.getElementById('processorBrandSelect'),
  loadCatalogBtn: document.getElementById('loadCatalogBtn'),
  loadWishlistBtn: document.getElementById('loadWishlistBtn'),
  compareBtn: document.getElementById('compareBtn'),
  clearCompareBtn: document.getElementById('clearCompareBtn'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
  loadProfileBtn: document.getElementById('loadProfileBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
};

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

let toastTimer = null;

const showToast = (message, isError = false) => {
  el.toast.textContent = message;
  el.toast.style.background = isError ? 'rgba(132, 24, 24, 0.92)' : 'rgba(30, 31, 28, 0.92)';
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2600);
};

const saveSession = () => {
  localStorage.setItem('accessToken', state.auth.accessToken || '');
  localStorage.setItem('refreshToken', state.auth.refreshToken || '');
  localStorage.setItem('authUser', JSON.stringify(state.auth.user || null));
};

const clearSession = () => {
  state.auth = { accessToken: '', refreshToken: '', user: null };
  saveSession();
  renderSession();
};

const api = async (path, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (state.auth.accessToken) {
    headers.Authorization = `Bearer ${state.auth.accessToken}`;
  }

  const response = await fetch(path, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = payload?.message || 'Request failed';
    throw new Error(message);
  }

  return payload;
};

const fillSelect = (select, values, key, labelKey = key) => {
  select.innerHTML = '<option value="">All</option>';
  values.forEach((item) => {
    const option = document.createElement('option');
    option.value = item[key];
    option.textContent = item[labelKey];
    select.appendChild(option);
  });
};

const updateSummaryStats = () => {
  el.catalogCount.textContent = `${state.mobiles.length} phones`;
  el.compareCount.textContent = `${state.compareIds.size} selected`;
  el.selectedCompare.textContent = state.compareIds.size
    ? `Selected IDs: ${[...state.compareIds].join(', ')}`
    : 'No phones selected yet.';
};

const renderSession = () => {
  el.sessionSummary.textContent = state.auth.user
    ? `Logged in as ${state.auth.user.name} (${state.auth.user.email})`
    : 'Not logged in.';
};

const createSpecRows = (phone) => [
  ['Price', phone.price_inr ? money.format(Number(phone.price_inr)) : 'N/A'],
  ['OS', phone.os || 'N/A'],
  ['Rear camera', phone.rear_main_mp ? `${phone.rear_main_mp} MP` : 'N/A'],
  ['Front camera', phone.front_mp ? `${phone.front_mp} MP` : 'N/A'],
  ['RAM', phone.ram_gb ? `${phone.ram_gb} GB` : 'N/A'],
  ['Storage', phone.internal_gb ? `${phone.internal_gb} GB` : 'N/A'],
  ['Battery', phone.capacity_mah ? `${phone.capacity_mah} mAh` : 'N/A'],
  ['Refresh rate', phone.refresh_rate_hz ? `${phone.refresh_rate_hz} Hz` : 'N/A'],
  ['Chip', phone.chip_name || 'N/A'],
];

const renderMobiles = () => {
  if (!state.mobiles.length) {
    el.mobileGrid.innerHTML = '<div class="empty-state">No phones matched the current filters.</div>';
    el.catalogMeta.textContent = 'No phones found.';
    updateSummaryStats();
    return;
  }

  el.mobileGrid.innerHTML = state.mobiles.map((phone) => `
    <article class="mobile-card">
      <div class="mobile-meta">${phone.brand} • ${phone.os || 'Platform pending'}</div>
      <h3>${phone.model}</h3>
      <div class="spec-list">
        ${createSpecRows(phone).map(([label, value]) => `
          <div class="spec-row">
            <strong>${label}</strong>
            <span>${value}</span>
          </div>
        `).join('')}
      </div>
      <div class="card-actions">
        <button class="chip-btn" data-compare-id="${phone.id}">
          ${state.compareIds.has(phone.id) ? 'Remove from compare' : 'Add to compare'}
        </button>
        <button class="ghost-btn" data-wishlist-id="${phone.id}">Add to wishlist</button>
      </div>
    </article>
  `).join('');

  el.catalogMeta.textContent = `Showing ${state.mobiles.length} phone entries from the current catalog response.`;
  updateSummaryStats();
};

const renderWishlist = () => {
  if (!state.wishlist.length) {
    el.wishlistGrid.innerHTML = '<div class="empty-state">Wishlist is empty or not loaded yet.</div>';
    return;
  }

  el.wishlistGrid.innerHTML = state.wishlist.map((item) => `
    <article class="wishlist-card">
      <div class="wishlist-meta">Saved phone</div>
      <h3>${item.brand} ${item.model}</h3>
      <div class="spec-list">
        <div class="spec-row"><strong>Price</strong><span>${item.price_inr ? money.format(Number(item.price_inr)) : 'N/A'}</span></div>
        <div class="spec-row"><strong>OS</strong><span>${item.os || 'N/A'}</span></div>
        <div class="spec-row"><strong>RAM</strong><span>${item.ram_gb ? `${item.ram_gb} GB` : 'N/A'}</span></div>
        <div class="spec-row"><strong>Storage</strong><span>${item.internal_gb ? `${item.internal_gb} GB` : 'N/A'}</span></div>
      </div>
      <div class="card-actions">
        <button class="ghost-btn" data-remove-wishlist-id="${item.id}">Remove</button>
      </div>
    </article>
  `).join('');
};

const renderComparison = () => {
  if (!state.compareResult?.mobiles?.length) {
    el.comparisonResults.innerHTML = '<div class="empty-state">Choose at least two phones and run compare to see differences.</div>';
    return;
  }

  const diffKeys = Object.entries(state.compareResult.diffs)
    .filter(([, detail]) => detail.differs)
    .map(([key]) => key);

  el.comparisonResults.innerHTML = state.compareResult.mobiles.map((phone) => `
    <article class="compare-card">
      <h3>${phone.brand} ${phone.model}</h3>
      <div class="spec-list">
        ${createSpecRows(phone).map(([label, value]) => `
          <div class="spec-row">
            <strong>${label}</strong>
            <span>${value}</span>
          </div>
        `).join('')}
      </div>
      <div class="diff-pill">
        ${diffKeys.length ? `${diffKeys.length} spec differences detected` : 'All tracked specs match'}
      </div>
    </article>
  `).join('');
};

const loadHealth = async () => {
  try {
    const health = await api('/health', { headers: {} });
    el.healthStatus.textContent = health.status === 'ok' ? 'Healthy' : 'Unknown';
  } catch {
    el.healthStatus.textContent = 'Unavailable';
  }
};

const loadOptions = async () => {
  const result = await api('/api/mobiles/options');
  state.options = result.data;
  fillSelect(el.brandSelect, state.options.brands, 'brand');
  fillSelect(el.osSelect, state.options.os, 'os');
  fillSelect(el.panelTypeSelect, state.options.panel_types, 'panel_type');
  fillSelect(el.processorBrandSelect, state.options.processor_brands, 'manufacturer');
};

const readFilters = () => {
  const formData = new FormData(el.filtersForm);
  const params = new URLSearchParams();

  for (const [key, value] of formData.entries()) {
    if (value !== '') params.append(key, value);
  }

  return params.toString();
};

const loadCatalog = async () => {
  const query = readFilters();
  const path = query ? `/api/mobiles?${query}` : '/api/mobiles';
  const result = await api(path);
  state.mobiles = result.data;
  renderMobiles();
};

const loadComparison = async () => {
  if (state.compareIds.size < 2) {
    showToast('Select at least two phones to compare.', true);
    return;
  }

  const ids = [...state.compareIds].join(',');
  const result = await api(`/api/mobiles/compare?ids=${ids}`);
  state.compareResult = result.data;
  renderComparison();
};

const loadProfile = async () => {
  const result = await api('/api/auth/me');
  state.auth.user = result.data;
  saveSession();
  renderSession();
  showToast('Profile loaded.');
};

const loadWishlist = async () => {
  if (!state.auth.accessToken) {
    showToast('Log in first to load wishlist.', true);
    return;
  }

  const result = await api('/api/users/wishlist');
  state.wishlist = result.data;
  renderWishlist();
};

const submitAuthForm = async (event, mode) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  const result = await api(`/api/auth/${mode}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  state.auth.accessToken = result.data.accessToken;
  state.auth.refreshToken = result.data.refreshToken;
  state.auth.user = result.data.user;
  saveSession();
  renderSession();
  form.reset();
  showToast(mode === 'signup' ? 'Account created.' : 'Logged in.');
};

const addToWishlist = async (id) => {
  if (!state.auth.accessToken) {
    showToast('Log in first to save wishlist items.', true);
    return;
  }

  const result = await api(`/api/users/wishlist/${id}`, { method: 'POST' });
  showToast(result.data.added ? 'Added to wishlist.' : result.data.message);
  await loadWishlist();
};

const removeFromWishlist = async (id) => {
  await api(`/api/users/wishlist/${id}`, { method: 'DELETE' });
  showToast('Removed from wishlist.');
  await loadWishlist();
};

const logout = async () => {
  if (state.auth.accessToken && state.auth.refreshToken) {
    try {
      await api('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: state.auth.refreshToken }),
      });
    } catch {
      // Ignore logout request failures and clear local session anyway.
    }
  }

  clearSession();
  state.wishlist = [];
  renderWishlist();
  showToast('Logged out.');
};

document.addEventListener('click', async (event) => {
  const compareButton = event.target.closest('[data-compare-id]');
  if (compareButton) {
    const id = Number(compareButton.dataset.compareId);
    if (state.compareIds.has(id)) {
      state.compareIds.delete(id);
    } else if (state.compareIds.size < 4) {
      state.compareIds.add(id);
    } else {
      showToast('You can compare up to four phones.', true);
    }

    state.compareResult = null;
    renderMobiles();
    renderComparison();
    return;
  }

  const wishlistButton = event.target.closest('[data-wishlist-id]');
  if (wishlistButton) {
    await addToWishlist(Number(wishlistButton.dataset.wishlistId));
    return;
  }

  const removeWishlistButton = event.target.closest('[data-remove-wishlist-id]');
  if (removeWishlistButton) {
    await removeFromWishlist(Number(removeWishlistButton.dataset.removeWishlistId));
  }
});

el.signupForm.addEventListener('submit', (event) => submitAuthForm(event, 'signup'));
el.loginForm.addEventListener('submit', (event) => submitAuthForm(event, 'login'));
el.filtersForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await loadCatalog();
});
el.loadCatalogBtn.addEventListener('click', loadCatalog);
el.loadWishlistBtn.addEventListener('click', loadWishlist);
el.compareBtn.addEventListener('click', loadComparison);
el.loadProfileBtn.addEventListener('click', loadProfile);
el.logoutBtn.addEventListener('click', logout);
el.clearCompareBtn.addEventListener('click', () => {
  state.compareIds.clear();
  state.compareResult = null;
  renderMobiles();
  renderComparison();
});
el.resetFiltersBtn.addEventListener('click', async () => {
  el.filtersForm.reset();
  await loadCatalog();
});

const init = async () => {
  renderSession();
  renderComparison();
  renderWishlist();
  updateSummaryStats();

  try {
    await Promise.all([loadHealth(), loadOptions(), loadCatalog()]);
    if (state.auth.accessToken) {
      await loadProfile();
      await loadWishlist();
    }
  } catch (error) {
    showToast(error.message || 'Unable to load dashboard.', true);
  }
};

init();
