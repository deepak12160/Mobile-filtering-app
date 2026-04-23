const state = {
  home: null,
  mobiles: [],
  wishlist: [],
  compareIds: new Set(),
  compareResult: null,
  productDetail: null,
  auth: {
    accessToken: localStorage.getItem('accessToken') || '',
    refreshToken: localStorage.getItem('refreshToken') || '',
    user: JSON.parse(localStorage.getItem('authUser') || 'null'),
  },
};

const SORT_LABELS = {
  price_inr: 'Price',
  rear_main_mp: 'Camera',
  ram_gb: 'RAM',
  capacity_mah: 'Battery',
  refresh_rate_hz: 'Refresh rate',
  asc: 'Low to high',
  desc: 'High to low',
};

const FILTER_LABELS = {
  search: 'Search',
  brand: 'Brand',
  os: 'OS',
  processor_brand: 'Chip maker',
  panel_type: 'Display',
  min_price: 'Min price',
  max_price: 'Max price',
  min_ram: 'Min RAM',
  min_storage: 'Min storage',
  min_battery_mah: 'Min battery',
  min_refresh_rate: 'Min refresh',
  sort_by: 'Sort',
  sort_order: 'Order',
};

const el = {
  loginGate: document.getElementById('loginGate'),
  appShell: document.getElementById('appShell'),
  gateLoginForm: document.getElementById('gateLoginForm'),
  gateSignupForm: document.getElementById('gateSignupForm'),
  googleAuthBtn: document.getElementById('googleAuthBtn'),
  showSignupBtn: document.getElementById('showSignupBtn'),
  showLoginBtn: document.getElementById('showLoginBtn'),
  heroSearchForm: document.getElementById('heroSearchForm'),
  heroSearchInput: document.getElementById('heroSearchInput'),
  brandRail: document.getElementById('brandRail'),
  trendingSearches: document.getElementById('trendingSearches'),
  heroSummary: document.getElementById('heroSummary'),
  catalogCount: document.getElementById('catalogCount'),
  dealHeadline: document.getElementById('dealHeadline'),
  sessionSummary: document.getElementById('sessionSummary'),
  authToggleBtn: document.getElementById('authToggleBtn'),
  loadWishlistBtn: document.getElementById('loadWishlistBtn'),
  compareCount: document.getElementById('compareCount'),
  refreshHomeBtn: document.getElementById('refreshHomeBtn'),
  scrollToProductsBtn: document.getElementById('scrollToProductsBtn'),
  brandSelect: document.getElementById('brandSelect'),
  osSelect: document.getElementById('osSelect'),
  processorBrandSelect: document.getElementById('processorBrandSelect'),
  panelTypeSelect: document.getElementById('panelTypeSelect'),
  filtersForm: document.getElementById('filtersForm'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
  activeFilters: document.getElementById('activeFilters'),
  wishlistGrid: document.getElementById('wishlistGrid'),
  loadProfileBtn: document.getElementById('loadProfileBtn'),
  topDealTitle: document.getElementById('topDealTitle'),
  topDealMeta: document.getElementById('topDealMeta'),
  premiumTitle: document.getElementById('premiumTitle'),
  premiumMeta: document.getElementById('premiumMeta'),
  topDealsGrid: document.getElementById('topDealsGrid'),
  cameraPicksGrid: document.getElementById('cameraPicksGrid'),
  productsSection: document.getElementById('productsSection'),
  catalogMeta: document.getElementById('catalogMeta'),
  avgPriceInsight: document.getElementById('avgPriceInsight'),
  batteryInsight: document.getElementById('batteryInsight'),
  mobileGrid: document.getElementById('mobileGrid'),
  compareDrawer: document.getElementById('compareDrawer'),
  selectedCompare: document.getElementById('selectedCompare'),
  clearCompareBtn: document.getElementById('clearCompareBtn'),
  compareBtn: document.getElementById('compareBtn'),
  comparisonResults: document.getElementById('comparisonResults'),
  authModal: document.getElementById('authModal'),
  closeAuthModalBtn: document.getElementById('closeAuthModalBtn'),
  loginForm: document.getElementById('loginForm'),
  signupForm: document.getElementById('signupForm'),
  logoutBtn: document.getElementById('logoutBtn'),
  productModal: document.getElementById('productModal'),
  closeProductModalBtn: document.getElementById('closeProductModalBtn'),
  productDetailContent: document.getElementById('productDetailContent'),
  toast: document.getElementById('toast'),
};

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

let toastTimer = null;

const showToast = (message, isError = false) => {
  el.toast.textContent = message;
  el.toast.style.background = isError ? 'rgba(198, 40, 40, 0.94)' : 'rgba(23, 35, 55, 0.94)';
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2600);
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
    throw new Error(payload?.message || 'Request failed');
  }

  return payload;
};

const saveSession = () => {
  localStorage.setItem('accessToken', state.auth.accessToken || '');
  localStorage.setItem('refreshToken', state.auth.refreshToken || '');
  localStorage.setItem('authUser', JSON.stringify(state.auth.user || null));
};

const clearSession = () => {
  state.auth = { accessToken: '', refreshToken: '', user: null };
  state.wishlist = [];
  saveSession();
  renderSession();
  renderWishlist();
};

const setAuthenticatedView = (isAuthenticated) => {
  el.loginGate.classList.toggle('hidden', isAuthenticated);
  el.appShell.classList.toggle('hidden', !isAuthenticated);
  el.compareDrawer.classList.toggle('hidden', !isAuthenticated);
};

const requireAuth = (message = 'Login first to continue.') => {
  if (state.auth.accessToken) return true;
  showToast(message, true);
  setAuthenticatedView(false);
  return false;
};

const setGateMode = (mode) => {
  const showSignup = mode === 'signup';
  el.gateLoginForm.classList.toggle('hidden', showSignup);
  el.gateSignupForm.classList.toggle('hidden', !showSignup);
};

const formatPrice = (value) => value ? money.format(Number(value)) : 'N/A';

const fillSelect = (select, values, key, labelKey = key, fallbackLabel = 'All') => {
  select.innerHTML = `<option value="">${fallbackLabel}</option>`;
  values.forEach((item) => {
    const option = document.createElement('option');
    option.value = item[key];
    option.textContent = item[labelKey];
    select.appendChild(option);
  });
};

const createMiniCard = (phone, type = 'browse') => `
  <article class="${type === 'detail' ? 'similar-card' : 'mini-product-card'}">
    <h4>${phone.brand} ${phone.model}</h4>
    <p class="meta-line">${phone.os || 'OS pending'} · ${phone.processor_brand || phone.chip_name || 'Chip pending'}</p>
    <div class="price-line">${formatPrice(phone.price_inr)}</div>
    <button type="button" data-view-id="${phone.id}">View details</button>
  </article>
`;

const createSpecRows = (phone) => [
  ['Price', formatPrice(phone.price_inr)],
  ['RAM', phone.ram_gb ? `${phone.ram_gb} GB` : 'N/A'],
  ['Storage', phone.internal_gb ? `${phone.internal_gb} GB` : 'N/A'],
  ['Camera', phone.rear_main_mp ? `${phone.rear_main_mp} MP` : 'N/A'],
  ['Battery', phone.capacity_mah ? `${phone.capacity_mah} mAh` : 'N/A'],
  ['Refresh', phone.refresh_rate_hz ? `${phone.refresh_rate_hz} Hz` : 'N/A'],
];

const readFilters = () => {
  const formData = new FormData(el.filtersForm);
  const params = new URLSearchParams({ limit: '24' });

  for (const [key, value] of formData.entries()) {
    if (value !== '') params.append(key, value);
  }

  return params;
};

const renderSession = () => {
  const summary = state.auth.user ? `${state.auth.user.name}` : 'Platform Guest';
  el.sessionSummary.textContent = summary;
  el.authToggleBtn.textContent = state.auth.user ? 'Account' : 'Login';
  setAuthenticatedView(Boolean(state.auth.accessToken));
};

const renderActiveFilters = () => {
  const params = readFilters();
  const chips = [];

  for (const [key, value] of params.entries()) {
    if (key === 'limit') continue;
    const label = FILTER_LABELS[key] || key;
    const displayValue = SORT_LABELS[value] || value;
    chips.push(`<span class="active-filter">${label}: ${displayValue}</span>`);
  }

  el.activeFilters.innerHTML = chips.length
    ? chips.join('')
    : '<span class="active-filter">All products</span>';
};

const renderHome = () => {
  const home = state.home;
  if (!home) return;

  const stats = home.heroStats || {};
  const topDeal = home.sections?.topDeals?.[0];
  const premiumPick = home.sections?.premiumPicks?.[0];

  el.heroSummary.textContent = `Precision Analytics: ${stats.total_models || 0} devices across ${stats.total_brands || 0} manufacturers. Data ranges from ${formatPrice(stats.min_price)} to ${formatPrice(stats.max_price)}.`;
  el.catalogCount.textContent = `${stats.total_models || 0} models`;
  el.dealHeadline.textContent = topDeal ? `${topDeal.brand} ${topDeal.model}` : 'Database active';
  el.topDealTitle.textContent = topDeal ? `${topDeal.brand} ${topDeal.model}` : 'No top deal';
  el.topDealMeta.textContent = topDeal ? `Starts at ${formatPrice(topDeal.price_inr)} with ${topDeal.ram_gb || 'N/A'} GB RAM.` : 'No top deal data available.';
  el.premiumTitle.textContent = premiumPick ? `${premiumPick.brand} ${premiumPick.model}` : 'No premium pick';
  el.premiumMeta.textContent = premiumPick ? `Spec score ${premiumPick.spec_score || 'N/A'} with ${premiumPick.processor_brand || premiumPick.chip_name || 'modern silicon'}.` : 'No premium data available.';

  el.brandRail.innerHTML = (home.brandTiles || []).map((brand) => `
    <button class="rail-item" type="button" data-brand-filter="${brand.brand}">
      <strong>${brand.brand}</strong>
      <span>${brand.total_models} models</span>
      <span>From ${formatPrice(brand.starting_price)}</span>
    </button>
  `).join('');

  el.trendingSearches.innerHTML = (home.trendingSearches || []).map((item) => `
    <button class="tag" type="button" data-search-tag="${item}">${item}</button>
  `).join('');

  el.topDealsGrid.innerHTML = (home.sections?.topDeals || []).map((phone) => createMiniCard(phone)).join('');
  el.cameraPicksGrid.innerHTML = (home.sections?.cameraPicks || []).map((phone) => createMiniCard(phone)).join('');
};

const renderCatalogInsights = () => {
  if (!state.mobiles.length) {
    el.avgPriceInsight.textContent = '-';
    el.batteryInsight.textContent = '-';
    return;
  }

  const priced = state.mobiles.filter((item) => item.price_inr);
  const avg = priced.length
    ? Math.round(priced.reduce((sum, item) => sum + Number(item.price_inr), 0) / priced.length)
    : null;
  const batteryLeader = [...state.mobiles]
    .filter((item) => item.capacity_mah)
    .sort((a, b) => Number(b.capacity_mah) - Number(a.capacity_mah))[0];

  el.avgPriceInsight.textContent = avg ? formatPrice(avg) : 'N/A';
  el.batteryInsight.textContent = batteryLeader ? `${batteryLeader.brand} ${batteryLeader.capacity_mah} mAh` : 'N/A';
};

const renderMobiles = () => {
  if (!state.mobiles.length) {
    el.mobileGrid.innerHTML = '<div class="empty-state">No products matched these filters.</div>';
    el.catalogMeta.textContent = '0 results';
    renderCatalogInsights();
    renderActiveFilters();
    return;
  }

  el.mobileGrid.innerHTML = state.mobiles.map((phone) => {
    const compareLabel = state.compareIds.has(phone.id) ? 'Selected' : 'Compare';
    return `
      <article class="product-card">
        <div class="product-top">
          <div>
            <div class="product-badge">${phone.brand || 'Brand'}</div>
            <h4>${phone.model}</h4>
            <p class="meta-line">${phone.os || 'OS pending'} · ${phone.processor_brand || 'Chipset pending'}</p>
          </div>
          <div class="price-line">${formatPrice(phone.price_inr)}</div>
        </div>

        <div class="product-tags">
          ${[
            phone.panel_type,
            phone.refresh_rate_hz ? `${phone.refresh_rate_hz} Hz` : '',
            phone.capacity_mah ? `${phone.capacity_mah} mAh` : '',
          ].filter(Boolean).map((tag) => `<span class="product-tag">${tag}</span>`).join('')}
        </div>

        <div class="spec-list">
          ${createSpecRows(phone).map(([label, value]) => `
            <div class="spec-row">
              <strong>${label}</strong>
              <span>${value}</span>
            </div>
          `).join('')}
        </div>

        <div class="product-actions">
          <button type="button" class="buy-btn" data-view-id="${phone.id}">View details</button>
          <button type="button" data-wishlist-id="${phone.id}">Wishlist</button>
          <button type="button" data-compare-id="${phone.id}">${compareLabel}</button>
        </div>
      </article>
    `;
  }).join('');

  el.catalogMeta.textContent = `${state.mobiles.length} products in the current view`;
  renderCatalogInsights();
  renderActiveFilters();
};

const renderWishlist = () => {
  if (!state.auth.accessToken) {
    el.wishlistGrid.innerHTML = '<div class="empty-state">Login to keep your shortlist here.</div>';
    return;
  }

  if (!state.wishlist.length) {
    el.wishlistGrid.innerHTML = '<div class="empty-state">Your wishlist is empty.</div>';
    return;
  }

  el.wishlistGrid.innerHTML = state.wishlist.map((item) => `
    <article class="wishlist-item">
      <h4>${item.brand} ${item.model}</h4>
      <p>${formatPrice(item.price_inr)} · ${item.ram_gb ? `${item.ram_gb} GB` : 'RAM N/A'}</p>
      <div class="product-actions">
        <button type="button" data-view-id="${item.id}">View</button>
        <button type="button" data-remove-wishlist-id="${item.id}">Remove</button>
      </div>
    </article>
  `).join('');
};

const renderCompare = () => {
  if (el.compareCount) {
    el.compareCount.textContent = `${state.compareIds.size}`;
  }

  if (!el.selectedCompare || !el.comparisonResults) {
    return;
  }

  if (!state.compareIds.size) {
    el.selectedCompare.innerHTML = '<span class="compare-chip">No phones selected.</span>';
  } else {
    const comparePhones = [...state.compareIds]
      .map((id) => state.mobiles.find((item) => Number(item.id) === Number(id)))
      .filter(Boolean);

    el.selectedCompare.innerHTML = comparePhones.length
      ? comparePhones.map((phone) => `<span class="compare-chip">${phone.brand} ${phone.model}</span>`).join('')
      : [...state.compareIds].map((id) => `<span class="compare-chip">Phone ${id}</span>`).join('');
  }

  if (!state.compareResult?.mobiles?.length) {
    el.comparisonResults.innerHTML = '<div class="empty-state">Select at least two phones to compare.</div>';
    return;
  }

  const diffKeys = Object.entries(state.compareResult.diffs || {})
    .filter(([, detail]) => detail.differs)
    .map(([key]) => key);

  el.comparisonResults.innerHTML = state.compareResult.mobiles.map((phone) => `
    <article class="compare-card">
      <h4>${phone.brand} ${phone.model}</h4>
      <p class="price-line">${formatPrice(phone.price_inr)}</p>
      <div class="spec-list">
        ${createSpecRows(phone).map(([label, value]) => `
          <div class="spec-row">
            <strong>${label}</strong>
            <span>${value}</span>
          </div>
        `).join('')}
      </div>
      <p>${diffKeys.length ? `${diffKeys.length} tracked specs differ` : 'Matching tracked specs'}</p>
    </article>
  `).join('');
};

const renderProductDetail = () => {
  const product = state.productDetail;
  if (!product) {
    el.productDetailContent.innerHTML = '<div class="empty-state">Unable to load this product.</div>';
    return;
  }

  el.productDetailContent.innerHTML = `
    <section class="product-hero">
      <div class="product-title-wrap">
        <div class="product-badge">${product.brand}</div>
        <h3>${product.model}</h3>
        <p class="meta-line">${product.os || 'OS pending'} · ${product.processor_brand || 'Processor'} · ${product.panel_type || 'Display details pending'}</p>
      </div>

      <div class="detail-price-box">
        <div class="product-price">${formatPrice(product.price_inr)}</div>
        <p class="meta-line">Base variant ${product.ram_gb ? `${product.ram_gb} GB` : 'RAM N/A'} / ${product.internal_gb ? `${product.internal_gb} GB` : 'Storage N/A'}</p>
        <div class="product-actions">
          <button type="button" class="buy-btn" data-wishlist-id="${product.id}">Add to wishlist</button>
          <button type="button" data-compare-id="${product.id}">Add to compare</button>
        </div>
      </div>

      <div class="detail-panel">
        <div class="section-head">
          <h3>Highlights</h3>
        </div>
        <div class="product-tags">
          ${[
            product.chip_name,
            product.refresh_rate_hz ? `${product.refresh_rate_hz} Hz display` : '',
            product.capacity_mah ? `${product.capacity_mah} mAh battery` : '',
            product.fast_charge_watts ? `${product.fast_charge_watts} W charging` : '',
            product.rear_main_mp ? `${product.rear_main_mp} MP rear camera` : '',
            product.ois ? 'OIS support' : '',
          ].filter(Boolean).map((tag) => `<span class="product-tag">${tag}</span>`).join('')}
        </div>
      </div>

      <div class="detail-panel">
        <div class="section-head">
          <h3>Specs</h3>
        </div>
        <div class="meta-stack">
          ${[
            ['Processor', product.chip_name || 'N/A'],
            ['Process node', product.process_node_nm ? `${product.process_node_nm} nm` : 'N/A'],
            ['CPU cores', product.cpu_cores || 'N/A'],
            ['Rear camera', product.rear_main_mp ? `${product.rear_main_mp} MP` : 'N/A'],
            ['Front camera', product.front_mp ? `${product.front_mp} MP` : 'N/A'],
            ['Battery', product.capacity_mah ? `${product.capacity_mah} mAh` : 'N/A'],
            ['Wireless charging', product.wireless_charge ? 'Yes' : 'No'],
            ['User rating', product.user_rating || 'N/A'],
            ['Spec score', product.spec_score || 'N/A'],
          ].map(([label, value]) => `
            <div class="spec-row">
              <strong>${label}</strong>
              <span>${value}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <aside class="product-side">
      <div class="detail-panel">
        <div class="section-head">
          <h3>Variants</h3>
        </div>
        <div class="variant-list">
          ${(product.variants || []).length ? product.variants.map((variant) => `
            <span class="variant-pill">${variant.ram_gb} GB / ${variant.internal_gb} GB · ${formatPrice(variant.price_inr)}</span>
          `).join('') : '<span class="variant-pill">No variant data</span>'}
        </div>
      </div>

      <div class="detail-panel">
        <div class="section-head">
          <h3>Similar products</h3>
        </div>
        <div class="similar-grid">
          ${(product.similarProducts || []).length ? product.similarProducts.map((item) => createMiniCard(item, 'detail')).join('') : '<div class="empty-state">No similar phones found.</div>'}
        </div>
      </div>
    </aside>
  `;
};

const openModal = (modal) => modal.classList.remove('hidden');
const closeModal = (modal) => modal.classList.add('hidden');

const loadOptions = async () => {
  const result = await api('/api/mobiles/options');
  const options = result.data;
  fillSelect(el.brandSelect, options.brands, 'brand', 'brand', 'All brands');
  fillSelect(el.osSelect, options.os, 'os', 'os', 'All OS');
  fillSelect(el.processorBrandSelect, options.processor_brands, 'manufacturer', 'manufacturer', 'All makers');
  fillSelect(el.panelTypeSelect, options.panel_types, 'panel_type', 'panel_type', 'All panels');
};

const loadHome = async () => {
  const result = await api('/api/storefront/home');
  state.home = result.data;
  renderHome();
};

const loadCatalog = async () => {
  if (!requireAuth('Login first to use search and filters.')) return;

  try {
    const searchValue = el.heroSearchInput.value.trim();
    const params = readFilters();
    
    // Combine hero search with sidebar filters
    if (searchValue && !params.get('search')) {
      params.set('search', searchValue);
    }

    const result = await api(`/api/mobiles?${params.toString()}`);
    
    // Backend controller uses standardized 'paginated' helper, data is at result.data
    state.mobiles = result.data || (Array.isArray(result) ? result : []);
    renderMobiles();
    renderCompare();
  } catch (error) {
    showToast(error.message || 'Filter request failed.', true);
  }
};

const loadWishlist = async () => {
  if (!requireAuth('Login first to open wishlist.')) return;

  const result = await api('/api/users/wishlist');
  state.wishlist = result.data;
  renderWishlist();
};

const loadProfile = async () => {
  if (!requireAuth('Login first to load your profile.')) return;

  const result = await api('/api/auth/me');
  state.auth.user = result.data;
  saveSession();
  renderSession();
  showToast('Profile loaded.');
};

const loadComparison = async () => {
  if (!requireAuth('Login first to compare phones.')) return;
  if (state.compareIds.size < 2) {
    showToast('Select at least two phones to compare.', true);
    return;
  }

  const ids = [...state.compareIds].join(',');
  const result = await api(`/api/mobiles/compare?ids=${ids}`);
  state.compareResult = result.data;
  renderCompare();
};

const loadProduct = async (id) => {
  if (!requireAuth('Login first to view product details.')) return;
  const result = await api(`/api/storefront/products/${id}`);
  state.productDetail = result.data;
  renderProductDetail();
  openModal(el.productModal);
};

const submitAuthForm = async (event, mode) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const originalLabel = submitButton?.textContent || '';

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = mode === 'signup' ? 'Creating...' : 'Logging in...';
    }

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
    closeModal(el.authModal);
    showToast(mode === 'signup' ? 'Account created.' : 'Logged in.');
    await Promise.all([loadOptions(), loadHome(), loadCatalog()]);
    await loadWishlist();
  } catch (error) {
    showToast(error.message || (mode === 'signup' ? 'Unable to create account.' : 'Unable to log in.'), true);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  }
};

const addToWishlist = async (id) => {
  if (!state.auth.accessToken) {
    showToast('Login first to save products.', true);
    openModal(el.authModal);
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
      // Ignore remote logout failures and clear local session anyway.
    }
  }

  clearSession();
  state.home = null;
  state.mobiles = [];
  state.compareIds.clear();
  state.compareResult = null;
  state.productDetail = null;
  closeModal(el.authModal);
  closeModal(el.productModal);
  renderMobiles();
  renderCompare();
  showToast('Logged out.');
};

document.addEventListener('click', async (event) => {
  const brandFilter = event.target.closest('[data-brand-filter]');
  if (brandFilter) {
    el.brandSelect.value = brandFilter.dataset.brandFilter;
    await loadCatalog();
    return;
  }

  const searchTag = event.target.closest('[data-search-tag]');
  if (searchTag) {
    el.heroSearchInput.value = searchTag.dataset.searchTag;
    await loadCatalog();
    return;
  }

  const viewButton = event.target.closest('[data-view-id]');
  if (viewButton) {
    await loadProduct(Number(viewButton.dataset.viewId));
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
    return;
  }

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
    renderCompare();
    return;
  }

  const sectionFilterButton = event.target.closest('[data-section-filter]');
  if (sectionFilterButton) {
    el.filtersForm.elements.sort_by.value = sectionFilterButton.dataset.sectionFilter;
    el.filtersForm.elements.sort_order.value = 'desc';
    await loadCatalog();
    return;
  }

  const sectionScrollButton = event.target.closest('[data-section-scroll]');
  if (sectionScrollButton) {
    el.productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

el.heroSearchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  el.filtersForm.reset(); // Clear sidebar filters when starting a fresh hero search
  await loadCatalog();
});

el.filtersForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await loadCatalog();
});

el.resetFiltersBtn.addEventListener('click', async () => {
  el.filtersForm.reset();
  el.heroSearchInput.value = '';
  await loadCatalog();
});

el.refreshHomeBtn.addEventListener('click', async () => {
  await loadHome();
  showToast('Device database updated.');
});

el.scrollToProductsBtn.addEventListener('click', () => {
  el.productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

el.loadWishlistBtn.addEventListener('click', loadWishlist);
el.loadProfileBtn.addEventListener('click', loadProfile);
el.clearCompareBtn.addEventListener('click', () => {
  state.compareIds.clear();
  state.compareResult = null;
  renderMobiles();
  renderCompare();
});
el.compareBtn.addEventListener('click', loadComparison);

el.authToggleBtn.addEventListener('click', () => openModal(el.authModal));
el.closeAuthModalBtn.addEventListener('click', () => closeModal(el.authModal));
el.closeProductModalBtn.addEventListener('click', () => closeModal(el.productModal));
el.loginForm.addEventListener('submit', (event) => submitAuthForm(event, 'login'));
el.signupForm.addEventListener('submit', (event) => submitAuthForm(event, 'signup'));
el.gateLoginForm.addEventListener('submit', (event) => submitAuthForm(event, 'login'));
el.gateSignupForm.addEventListener('submit', (event) => submitAuthForm(event, 'signup'));
el.showSignupBtn.addEventListener('click', () => setGateMode('signup'));
el.showLoginBtn.addEventListener('click', () => setGateMode('login'));
el.googleAuthBtn.addEventListener('click', () => {
  showToast('Google login UI is added, but backend Google auth is not connected yet.', true);
});
el.logoutBtn.addEventListener('click', logout);

[el.authModal, el.productModal].forEach((modal) => {
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal(modal);
  });
});

const init = async () => {
  setGateMode('login');
  renderSession();
  renderWishlist();
  renderCompare();
  renderActiveFilters();

  try {
    if (state.auth.accessToken) {
      await loadProfile();
      await Promise.all([loadOptions(), loadHome(), loadCatalog()]);
      await loadWishlist();
    }
  } catch (error) {
    showToast(error.message || 'Unable to load the store.', true);
  }
};

init();
