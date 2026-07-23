/* ==========================================================================
   Control de Gastos del Hogar - David & Daniela
   ========================================================================== */

// --- Supabase Client ---
const SUPABASE_URL = 'https://jcwzgzwnwwaypshfchfs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FZyfUSZPyfFULmP17qvSDg_jT-ScqGg';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Config ---
const EXCHANGE_RATE = 520; // CRC per USD, fixed rate for aggregation
const tiposConfig = {
    'Comida': { icon: 'utensils', class: 'cat-food' },
    'Transporte': { icon: 'car', class: 'cat-transport' },
    'Viaje': { icon: 'plane', class: 'cat-viaje' },
    'Gasolina': { icon: 'fuel', class: 'cat-gasolina' },
    'Otro': { icon: 'help-circle', class: 'cat-others' }
};
const colorPalette = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#f43f5e'];

// --- Application State ---
let gastos = [];
let creditos = [];
let currentTheme = 'dark';
let gastoActiveFilter = 'all';
let trendRange = 'weekly';
let processTargetIds = [];
const personaColors = {};

// --- Chart Instances ---
let trendChartInstance = null;
let tipoChartInstance = null;
let personaChartInstance = null;
let creditoChartInstance = null;

// --- DOM Elements ---
const currentDateEl = document.getElementById('current-date');
const pageTitleEl = document.getElementById('page-title');
const pageSubtitleEl = document.getElementById('page-subtitle');
const themeBtn = document.getElementById('theme-btn');
const themeIcon = document.getElementById('theme-icon');
const menuToggleBtn = document.getElementById('menu-toggle');
const sidebarEl = document.getElementById('sidebar');
const sidebarOverlayEl = document.getElementById('sidebar-overlay');

const pageDashboardEl = document.getElementById('page-dashboard');
const pageGastosEl = document.getElementById('page-gastos');
const pageCreditosEl = document.getElementById('page-creditos');

const kpiSemanaEl = document.getElementById('kpi-semana');
const kpiSaldoNetoEl = document.getElementById('kpi-saldo-neto');
const kpiSaldoDetalleEl = document.getElementById('kpi-saldo-detalle');
const kpiCreditoPendienteEl = document.getElementById('kpi-credito-pendiente');
const kpiMesEl = document.getElementById('kpi-mes');

const pendingListEl = document.getElementById('pending-list');
const btnProcessAll = document.getElementById('btn-process-all');

const gastosListEl = document.getElementById('gastos-list');
const gastoSearchInput = document.getElementById('gasto-search');
const gastoForm = document.getElementById('gasto-form');
const gastoMoneda = document.getElementById('gasto-moneda');
const gastoCurrencySymbol = document.getElementById('gasto-currency-symbol');
const gastoMonto = document.getElementById('gasto-monto');
const gastoTipo = document.getElementById('gasto-tipo');
const gastoDetalle = document.getElementById('gasto-detalle');
const gastoQuien = document.getElementById('gasto-quien');
const gastoQuienOtroWrapper = document.getElementById('gasto-quien-otro-wrapper');
const gastoQuienOtro = document.getElementById('gasto-quien-otro');
const gastoCuenta = document.getElementById('gasto-cuenta');
const gastoPctWrapper = document.getElementById('gasto-pct-wrapper');
const gastoPct = document.getElementById('gasto-pct');

const creditosListEl = document.getElementById('creditos-list');
const creditoForm = document.getElementById('credito-form');
const creditoMoneda = document.getElementById('credito-moneda');
const creditoMontoOriginal = document.getElementById('credito-monto-original');
const creditoMeses = document.getElementById('credito-meses');
const creditoTipo = document.getElementById('credito-tipo');
const creditoDetalle = document.getElementById('credito-detalle');
const creditoQuien = document.getElementById('credito-quien');
const creditoQuienOtroWrapper = document.getElementById('credito-quien-otro-wrapper');
const creditoQuienOtro = document.getElementById('credito-quien-otro');
const creditoCuenta = document.getElementById('credito-cuenta');

const processModal = document.getElementById('process-modal');
const processModalTitle = document.getElementById('process-modal-title');
const processForm = document.getElementById('process-form');
const processUsuario = document.getElementById('process-usuario');
const processDetalle = document.getElementById('process-detalle');
const btnCancelProcess = document.getElementById('btn-cancel-process');

const toastEl = document.getElementById('toast-notification');
const toastMessageEl = document.getElementById('toast-message');
const toastIconEl = document.getElementById('toast-icon');

// --- Helper Functions ---

function showToast(message, type = 'info') {
    toastMessageEl.innerText = message;
    toastEl.className = `toast toast-${type} show`;

    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'danger') iconName = 'alert-triangle';
    toastIconEl.setAttribute('data-lucide', iconName);
    lucide.createIcons({ attrs: { class: 'lucide-icon' }, nameAttr: 'data-lucide' });

    setTimeout(() => {
        toastEl.classList.remove('show');
    }, 3500);
}

function formatCRC(amount) {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 2 }).format(amount || 0);
}

function formatUSD(amount) {
    return new Intl.NumberFormat('es-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}

function formatDateString(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatShortDate(d) {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
}

function getTipoConfig(tipo) {
    return tiposConfig[tipo] || tiposConfig['Otro'];
}

function getPersonaColor(nombre) {
    if (!personaColors[nombre]) {
        const idx = Object.keys(personaColors).length % colorPalette.length;
        personaColors[nombre] = colorPalette[idx];
    }
    return personaColors[nombre];
}

function getWeekRange(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
}

function getChartColors() {
    const isDark = currentTheme === 'dark';
    return {
        text: isDark ? '#94a3b8' : '#64748b',
        grid: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)'
    };
}

// --- Debt Calculation ---

// Determines who owes whom for a single gasto.
// Cuenta 'DyD' is already split at the source -> no debt.
// Otherwise, the reimbursement amount (monto_crc * porcentaje_reembolso%) is owed
// to whoever paid (realizado_por). If a third party paid, both David and Daniela
// owe that third party using the same configurable percentage.
function calcularDeudas(gasto) {
    if (gasto.cuenta === 'DyD') return [];
    const reembolso = gasto.monto_crc * (gasto.porcentaje_reembolso / 100);
    if (reembolso <= 0) return [];
    const pagador = gasto.realizado_por;

    if (pagador === 'David') return [{ deudor: 'Daniela', acreedor: 'David', monto: reembolso }];
    if (pagador === 'Daniela') return [{ deudor: 'David', acreedor: 'Daniela', monto: reembolso }];

    return [
        { deudor: 'David', acreedor: pagador, monto: reembolso },
        { deudor: 'Daniela', acreedor: pagador, monto: reembolso }
    ];
}

// --- Trend Data Builders ---

function getWeeklyTrendData() {
    const weeks = [];
    const today = new Date();
    for (let i = 7; i >= 0; i--) {
        const refDate = new Date(today);
        refDate.setDate(today.getDate() - i * 7);
        const { start, end } = getWeekRange(refDate);
        weeks.push({ start, end, label: `${formatShortDate(start)} - ${formatShortDate(end)}`, total: 0 });
    }
    gastos.forEach(g => {
        const d = new Date(g.fecha + 'T00:00:00');
        const week = weeks.find(w => d >= w.start && d <= w.end);
        if (week) week.total += g.monto_crc;
    });
    return { labels: weeks.map(w => w.label), data: weeks.map(w => w.total) };
}

function getMonthlyTrendData() {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const today = new Date();
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        buckets.push({ month: d.getMonth(), year: d.getFullYear(), label: `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`, total: 0 });
    }
    gastos.forEach(g => {
        const d = new Date(g.fecha + 'T00:00:00');
        const bucket = buckets.find(b => b.month === d.getMonth() && b.year === d.getFullYear());
        if (bucket) bucket.total += g.monto_crc;
    });
    return { labels: buckets.map(b => b.label), data: buckets.map(b => b.total) };
}

// --- KPI Rendering ---

function renderKPIs() {
    const now = new Date();
    const { start: weekStart, end: weekEnd } = getWeekRange(now);

    const gastosSemana = gastos.filter(g => {
        const d = new Date(g.fecha + 'T00:00:00');
        return d >= weekStart && d <= weekEnd;
    });
    kpiSemanaEl.textContent = formatCRC(gastosSemana.reduce((sum, g) => sum + g.monto_crc, 0));

    const gastosMes = gastos.filter(g => {
        const d = new Date(g.fecha + 'T00:00:00');
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    kpiMesEl.textContent = formatCRC(gastosMes.reduce((sum, g) => sum + g.monto_crc, 0));

    const pendientes = gastos.filter(g => g.estado === 'Pendiente');
    let netDavidDebeADaniela = 0;
    const deudasTerceros = {};

    pendientes.forEach(g => {
        calcularDeudas(g).forEach(d => {
            if (d.deudor === 'David' && d.acreedor === 'Daniela') {
                netDavidDebeADaniela += d.monto;
            } else if (d.deudor === 'Daniela' && d.acreedor === 'David') {
                netDavidDebeADaniela -= d.monto;
            } else {
                const key = `${d.deudor} → ${d.acreedor}`;
                deudasTerceros[key] = (deudasTerceros[key] || 0) + d.monto;
            }
        });
    });

    if (Math.abs(netDavidDebeADaniela) < 0.01) {
        kpiSaldoNetoEl.textContent = formatCRC(0);
        kpiSaldoNetoEl.className = 'stat-value';
        kpiSaldoDetalleEl.textContent = 'Sin pendientes entre David y Daniela';
    } else if (netDavidDebeADaniela > 0) {
        kpiSaldoNetoEl.textContent = formatCRC(netDavidDebeADaniela);
        kpiSaldoNetoEl.className = 'stat-value text-danger';
        kpiSaldoDetalleEl.textContent = 'David le debe a Daniela';
    } else {
        kpiSaldoNetoEl.textContent = formatCRC(Math.abs(netDavidDebeADaniela));
        kpiSaldoNetoEl.className = 'stat-value text-danger';
        kpiSaldoDetalleEl.textContent = 'Daniela le debe a David';
    }

    const terceroKeys = Object.keys(deudasTerceros);
    if (terceroKeys.length > 0) {
        const extra = terceroKeys.map(k => `${k}: ${formatCRC(deudasTerceros[k])}`).join(' · ');
        kpiSaldoDetalleEl.textContent += ` — ${extra}`;
    }

    const creditoPendiente = gastos
        .filter(g => g.cuenta === 'Crédito' && g.estado === 'Pendiente')
        .reduce((sum, g) => sum + g.monto_crc, 0);
    kpiCreditoPendienteEl.textContent = formatCRC(creditoPendiente);
}

// --- Chart Rendering ---

function renderTrendChart() {
    const { labels, data } = trendRange === 'weekly' ? getWeeklyTrendData() : getMonthlyTrendData();
    const colors = getChartColors();

    if (trendChartInstance) {
        trendChartInstance.data.labels = labels;
        trendChartInstance.data.datasets[0].data = data;
        trendChartInstance.options.scales.x.ticks.color = colors.text;
        trendChartInstance.options.scales.y.ticks.color = colors.text;
        trendChartInstance.options.scales.y.grid.color = colors.grid;
        trendChartInstance.update();
        return;
    }

    const ctx = document.getElementById('trend-chart').getContext('2d');
    trendChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Gastos',
                data,
                backgroundColor: 'rgba(139, 92, 246, 0.55)',
                borderRadius: 6,
                barThickness: 28
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => ` ${formatCRC(ctx.raw)}` } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: colors.text, font: { family: 'Inter' } } },
                y: { grid: { color: colors.grid }, ticks: { color: colors.text, font: { family: 'Inter' } } }
            }
        }
    });
}

function renderTipoChart() {
    const { start, end } = getWeekRange(new Date());
    const gastosSemana = gastos.filter(g => {
        const d = new Date(g.fecha + 'T00:00:00');
        return d >= start && d <= end;
    });

    const totals = {};
    gastosSemana.forEach(g => { totals[g.tipo] = (totals[g.tipo] || 0) + g.monto_crc; });

    const labels = [];
    const data = [];
    const colors = [];
    let idx = 0;
    Object.entries(totals).forEach(([tipo, total]) => {
        if (total > 0) {
            labels.push(tipo);
            data.push(total);
            colors.push(colorPalette[idx % colorPalette.length]);
            idx++;
        }
    });
    if (data.length === 0) {
        labels.push('Sin gastos');
        data.push(1);
        colors.push('#64748b');
    }

    const borderColor = currentTheme === 'dark' ? '#0f1626' : '#ffffff';

    if (tipoChartInstance) {
        tipoChartInstance.data.labels = labels;
        tipoChartInstance.data.datasets[0].data = data;
        tipoChartInstance.data.datasets[0].backgroundColor = colors;
        tipoChartInstance.data.datasets[0].borderColor = borderColor;
        tipoChartInstance.update();
        return;
    }

    const ctx = document.getElementById('tipo-chart').getContext('2d');
    tipoChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor, hoverOffset: 6 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { color: getChartColors().text, boxWidth: 10, font: { size: 11 } } },
                tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${formatCRC(ctx.raw)}` } }
            }
        }
    });
}

function renderPersonaChart() {
    const { start, end } = getWeekRange(new Date());
    const gastosSemana = gastos.filter(g => {
        const d = new Date(g.fecha + 'T00:00:00');
        return d >= start && d <= end;
    });

    const totals = {};
    gastosSemana.forEach(g => { totals[g.realizado_por] = (totals[g.realizado_por] || 0) + g.monto_crc; });

    let labels = Object.keys(totals);
    let data = Object.values(totals);
    let colors = labels.map(getPersonaColor);

    if (labels.length === 0) {
        labels = ['Sin gastos'];
        data = [0];
        colors = ['#64748b'];
    }

    const colorsTheme = getChartColors();

    if (personaChartInstance) {
        personaChartInstance.data.labels = labels;
        personaChartInstance.data.datasets[0].data = data;
        personaChartInstance.data.datasets[0].backgroundColor = colors;
        personaChartInstance.options.scales.x.ticks.color = colorsTheme.text;
        personaChartInstance.options.scales.y.ticks.color = colorsTheme.text;
        personaChartInstance.options.scales.y.grid.color = colorsTheme.grid;
        personaChartInstance.update();
        return;
    }

    const ctx = document.getElementById('persona-chart').getContext('2d');
    personaChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 6, barThickness: 36 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => ` ${formatCRC(ctx.raw)}` } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: colorsTheme.text } },
                y: { grid: { color: colorsTheme.grid }, ticks: { color: colorsTheme.text } }
            }
        }
    });
}

function renderCreditoChart() {
    const pendientesCredito = gastos.filter(g => g.cuenta === 'Crédito' && g.estado === 'Pendiente');
    const totals = {};
    pendientesCredito.forEach(g => { totals[g.realizado_por] = (totals[g.realizado_por] || 0) + g.monto_crc; });

    let labels = Object.keys(totals);
    let data = Object.values(totals);
    let colors = labels.map(getPersonaColor);

    if (labels.length === 0) {
        labels = ['Sin pendientes'];
        data = [0];
        colors = ['#64748b'];
    }

    const colorsTheme = getChartColors();

    if (creditoChartInstance) {
        creditoChartInstance.data.labels = labels;
        creditoChartInstance.data.datasets[0].data = data;
        creditoChartInstance.data.datasets[0].backgroundColor = colors;
        creditoChartInstance.options.scales.x.ticks.color = colorsTheme.text;
        creditoChartInstance.options.scales.y.ticks.color = colorsTheme.text;
        creditoChartInstance.options.scales.x.grid.color = colorsTheme.grid;
        creditoChartInstance.update();
        return;
    }

    const ctx = document.getElementById('credito-chart').getContext('2d');
    creditoChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 6, barThickness: 36 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => ` ${formatCRC(ctx.raw)}` } }
            },
            scales: {
                x: { grid: { color: colorsTheme.grid }, ticks: { color: colorsTheme.text } },
                y: { grid: { display: false }, ticks: { color: colorsTheme.text } }
            }
        }
    });
}

// --- List Rendering ---

function buildGastoRow(g) {
    const cfg = getTipoConfig(g.tipo);
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.setAttribute('data-id', g.id);

    const badgeClass = g.estado === 'Pendiente' ? 'badge-pendiente' : 'badge-procesado';
    const montoLabel = g.moneda === 'USD' ? `${formatUSD(g.monto)} (${formatCRC(g.monto_crc)})` : formatCRC(g.monto);

    li.innerHTML = `
        <div class="transaction-left">
            <div class="transaction-category-icon ${cfg.class}">
                <i data-lucide="${cfg.icon}"></i>
            </div>
            <div class="transaction-details">
                <span class="transaction-desc">${g.detalle}</span>
                <div class="transaction-meta">
                    <span class="category-tag">${g.tipo}</span>
                    <span class="separator">•</span>
                    <span>${g.realizado_por}</span>
                    <span class="separator">•</span>
                    <span>${g.cuenta}</span>
                    <span class="separator">•</span>
                    <span class="transaction-date">${formatDateString(g.fecha)}</span>
                    <span class="badge ${badgeClass}">${g.estado}</span>
                </div>
            </div>
        </div>
        <div class="transaction-right">
            <span class="transaction-amount text-danger">${montoLabel}</span>
            ${g.estado === 'Pendiente' ? '<button class="transaction-delete-btn btn-process-single" title="Procesar"><i data-lucide="check"></i></button>' : ''}
            <button class="transaction-delete-btn btn-delete-gasto" title="Eliminar"><i data-lucide="trash-2"></i></button>
        </div>
    `;

    const processBtn = li.querySelector('.btn-process-single');
    if (processBtn) {
        processBtn.addEventListener('click', () => openProcessModal([g.id], 'Procesar Gasto Pendiente'));
    }
    li.querySelector('.btn-delete-gasto').addEventListener('click', () => eliminarGasto(g.id));

    return li;
}

function renderPendingList() {
    const pendientes = gastos.filter(g => g.estado === 'Pendiente').sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    pendingListEl.innerHTML = '';

    if (pendientes.length === 0) {
        pendingListEl.innerHTML = `
            <div class="empty-state">
                <i data-lucide="check-circle"></i>
                <p>No hay gastos pendientes</p>
                <span class="subtitle">Todo está al día</span>
            </div>`;
        lucide.createIcons();
        return;
    }

    pendientes.forEach(g => pendingListEl.appendChild(buildGastoRow(g)));
    lucide.createIcons();
}

function renderGastosList() {
    gastosListEl.innerHTML = '';
    let filtered = [...gastos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (gastoActiveFilter !== 'all') {
        filtered = filtered.filter(g => g.estado === gastoActiveFilter);
    }

    const searchVal = gastoSearchInput.value.toLowerCase().trim();
    if (searchVal !== '') {
        filtered = filtered.filter(g =>
            g.detalle.toLowerCase().includes(searchVal) ||
            g.tipo.toLowerCase().includes(searchVal) ||
            g.realizado_por.toLowerCase().includes(searchVal) ||
            g.cuenta.toLowerCase().includes(searchVal)
        );
    }

    if (filtered.length === 0) {
        gastosListEl.innerHTML = `
            <div class="empty-state">
                <i data-lucide="inbox"></i>
                <p>No se encontraron gastos</p>
                <span class="subtitle">Registra un nuevo gasto en el formulario lateral</span>
            </div>`;
        lucide.createIcons();
        return;
    }

    filtered.forEach(g => gastosListEl.appendChild(buildGastoRow(g)));
    lucide.createIcons();
}

function renderCreditos() {
    creditosListEl.innerHTML = '';

    if (creditos.length === 0) {
        creditosListEl.innerHTML = `
            <div class="empty-state" style="padding: 1.5rem 0;">
                <i data-lucide="credit-card" style="width:36px;height:36px;"></i>
                <p style="font-size:0.85rem;">No hay créditos registrados</p>
            </div>`;
        lucide.createIcons();
        return;
    }

    creditos.forEach(c => {
        const percent = Math.min(100, Math.round((c.meses_pagados / c.meses_totales) * 100));
        const montoActualLabel = c.moneda === 'USD' ? formatUSD(c.monto_actual) : formatCRC(c.monto_actual);
        const montoOriginalLabel = c.moneda === 'USD' ? formatUSD(c.monto_original) : formatCRC(c.monto_original);

        const div = document.createElement('div');
        div.className = 'goal-item';
        div.innerHTML = `
            <div class="goal-header">
                <div class="goal-title-wrapper">
                    <i data-lucide="credit-card" class="text-primary" style="width:16px;height:16px;"></i>
                    <span class="goal-title">${c.detalle}</span>
                </div>
                <span class="goal-progress-percent">${percent}%</span>
            </div>
            <div class="goal-bar-container">
                <div class="goal-bar" style="width: ${percent}%"></div>
            </div>
            <div class="goal-amounts">
                <span>Actual: ${montoActualLabel}</span>
                <span>Original: ${montoOriginalLabel}</span>
            </div>
            <div class="credit-progress-meta">
                <span>${c.realizado_por} • ${c.cuenta}</span>
                <span>${c.meses_pagados}/${c.meses_totales} meses</span>
            </div>
            <div class="goal-actions-overlay">
                <button class="goal-action-btn add-funds-btn" title="Marcar mes pagado" onclick="marcarMesPagado('${c.id}')">
                    <i data-lucide="calendar-check" style="width:14px;height:14px;"></i>
                </button>
                <button class="goal-action-btn delete-goal-btn" title="Eliminar" onclick="eliminarCredito('${c.id}')">
                    <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                </button>
            </div>
        `;
        creditosListEl.appendChild(div);
    });

    lucide.createIcons();
}

function renderAll() {
    renderKPIs();
    renderTrendChart();
    renderTipoChart();
    renderPersonaChart();
    renderCreditoChart();
    renderPendingList();
    renderGastosList();
    lucide.createIcons();
}

// --- Gasto CRUD ---

window.eliminarGasto = async function (id) {
    if (!confirm('¿Eliminar este gasto?')) return;
    const { error } = await sb.from('gastos').delete().eq('id', id);
    if (error) {
        showToast('Error al eliminar el gasto', 'danger');
        return;
    }
    gastos = gastos.filter(g => g.id !== id);
    renderAll();
    showToast('Gasto eliminado', 'info');
};

// --- Credito CRUD ---

window.marcarMesPagado = async function (id) {
    const credito = creditos.find(c => c.id === id);
    if (!credito) return;
    if (credito.meses_pagados >= credito.meses_totales) {
        showToast('Este crédito ya está completamente pagado', 'info');
        return;
    }

    const nuevosMesesPagados = credito.meses_pagados + 1;
    const nuevoMontoActual = Math.max(0, credito.monto_original - credito.cuota_mensual * nuevosMesesPagados);

    const { error } = await sb.from('creditos_tasa_cero')
        .update({ meses_pagados: nuevosMesesPagados, monto_actual: nuevoMontoActual })
        .eq('id', id);

    if (error) {
        showToast('Error al actualizar el crédito', 'danger');
        return;
    }

    credito.meses_pagados = nuevosMesesPagados;
    credito.monto_actual = nuevoMontoActual;
    renderCreditos();
    showToast('Mes marcado como pagado', 'success');
};

window.eliminarCredito = async function (id) {
    if (!confirm('¿Eliminar este crédito?')) return;
    const { error } = await sb.from('creditos_tasa_cero').delete().eq('id', id);
    if (error) {
        showToast('Error al eliminar el crédito', 'danger');
        return;
    }
    creditos = creditos.filter(c => c.id !== id);
    renderCreditos();
    showToast('Crédito eliminado', 'info');
};

// --- Process Modal ---

function openProcessModal(ids, title) {
    processTargetIds = ids;
    processModalTitle.textContent = title;
    processModal.classList.remove('hidden');
}

function closeProcessModal() {
    processModal.classList.add('hidden');
    processForm.reset();
}

// --- Theme Switching ---

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    themeIcon.setAttribute('data-lucide', currentTheme === 'dark' ? 'moon' : 'sun');
    lucide.createIcons();
    renderTrendChart();
    renderTipoChart();
    renderPersonaChart();
    renderCreditoChart();
}

// --- Date & Navigation ---

function setTodayDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const localeString = today.toLocaleDateString('es-ES', options);
    currentDateEl.innerText = localeString.charAt(0).toUpperCase() + localeString.slice(1);
}

const pageTitles = {
    dashboard: ['Resumen Semanal', 'Control de gastos compartidos y reembolsos pendientes'],
    gastos: ['Gastos del Hogar', 'Registro y control de gastos compartidos'],
    creditos: ['Créditos Tasa 0%', 'Control de cuotas y saldo pendiente']
};

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    const pages = { dashboard: pageDashboardEl, gastos: pageGastosEl, creditos: pageCreditosEl };

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const key = item.getAttribute('data-page');
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            Object.entries(pages).forEach(([k, el]) => el.classList.toggle('hidden', k !== key));
            pageTitleEl.textContent = pageTitles[key][0];
            pageSubtitleEl.textContent = pageTitles[key][1];
            closeMobileMenu();
        });
    });
}

function openMobileMenu() {
    sidebarEl.classList.add('open');
    sidebarOverlayEl.classList.add('open');
}

function closeMobileMenu() {
    sidebarEl.classList.remove('open');
    sidebarOverlayEl.classList.remove('open');
}

// --- Form Field Toggling ---

function setupQuienToggle(selectEl, wrapperEl) {
    selectEl.addEventListener('change', () => {
        wrapperEl.classList.toggle('hidden', selectEl.value !== 'Otro');
    });
}

// --- Initializing App ---

async function init() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        currentTheme = savedTheme;
        document.documentElement.setAttribute('data-theme', currentTheme);
        if (currentTheme === 'light') themeIcon.setAttribute('data-lucide', 'sun');
    }

    setTodayDate();
    setupNavigation();
    setupQuienToggle(gastoQuien, gastoQuienOtroWrapper);
    setupQuienToggle(creditoQuien, creditoQuienOtroWrapper);

    const { data: gastosData, error: gastosError } = await sb.from('gastos').select('*');
    const { data: creditosData, error: creditosError } = await sb.from('creditos_tasa_cero').select('*');

    if (gastosError || creditosError) {
        showToast('Error al conectar con la base de datos', 'danger');
    }

    gastos = (gastosData || []).map(g => ({
        ...g,
        monto: parseFloat(g.monto),
        monto_crc: parseFloat(g.monto_crc),
        porcentaje_reembolso: parseFloat(g.porcentaje_reembolso)
    }));

    creditos = (creditosData || []).map(c => ({
        ...c,
        monto_original: parseFloat(c.monto_original),
        monto_actual: parseFloat(c.monto_actual),
        cuota_mensual: parseFloat(c.cuota_mensual)
    }));

    renderAll();
    renderCreditos();
    lucide.createIcons();
}

// --- Event Listeners ---

themeBtn.addEventListener('click', toggleTheme);
menuToggleBtn.addEventListener('click', openMobileMenu);
sidebarOverlayEl.addEventListener('click', closeMobileMenu);

document.querySelectorAll('#trend-range-toggle .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#trend-range-toggle .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        trendRange = btn.getAttribute('data-range');
        renderTrendChart();
    });
});

document.querySelectorAll('#gasto-estado-filter .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#gasto-estado-filter .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gastoActiveFilter = btn.getAttribute('data-filter');
        renderGastosList();
    });
});

gastoSearchInput.addEventListener('input', renderGastosList);

gastoMoneda.addEventListener('change', () => {
    gastoCurrencySymbol.textContent = gastoMoneda.value === 'USD' ? '$' : '₡';
});

gastoCuenta.addEventListener('change', () => {
    gastoPctWrapper.style.display = gastoCuenta.value === 'DyD' ? 'none' : 'flex';
});

btnProcessAll.addEventListener('click', () => {
    const pendingIds = gastos.filter(g => g.estado === 'Pendiente').map(g => g.id);
    if (pendingIds.length === 0) {
        showToast('No hay gastos pendientes', 'info');
        return;
    }
    openProcessModal(pendingIds, `Procesar ${pendingIds.length} gasto(s) pendiente(s)`);
});

btnCancelProcess.addEventListener('click', closeProcessModal);

processForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usuario = processUsuario.value;
    const detalle = processDetalle.value.trim();
    const fechaProceso = new Date().toISOString();

    const { error } = await sb.from('gastos').update({
        estado: 'Procesado',
        procesado_por: usuario,
        procesado_fecha: fechaProceso,
        procesado_detalle: detalle || null
    }).in('id', processTargetIds);

    if (error) {
        showToast('Error al procesar el/los gasto(s)', 'danger');
        return;
    }

    gastos.forEach(g => {
        if (processTargetIds.includes(g.id)) {
            g.estado = 'Procesado';
            g.procesado_por = usuario;
            g.procesado_fecha = fechaProceso;
            g.procesado_detalle = detalle || null;
        }
    });

    closeProcessModal();
    renderAll();
    showToast('Gasto(s) procesado(s) con éxito', 'success');
});

gastoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const moneda = gastoMoneda.value;
    const monto = parseFloat(gastoMonto.value);
    const tipo = gastoTipo.value;
    const detalle = gastoDetalle.value.trim();
    const cuenta = gastoCuenta.value;
    const pct = cuenta === 'DyD' ? 0 : (parseFloat(gastoPct.value) || 0);

    let realizadoPor = gastoQuien.value;
    if (realizadoPor === 'Otro') {
        realizadoPor = gastoQuienOtro.value.trim();
        if (!realizadoPor) {
            showToast('Indica el nombre de la persona', 'danger');
            return;
        }
    }

    if (isNaN(monto) || monto <= 0 || !detalle) {
        showToast('Completa todos los campos correctamente', 'danger');
        return;
    }

    const montoCrc = moneda === 'USD' ? monto * EXCHANGE_RATE : monto;

    const nuevoGasto = {
        moneda, monto, monto_crc: montoCrc, tipo, detalle,
        realizado_por: realizadoPor, cuenta, porcentaje_reembolso: pct
    };

    const { data, error } = await sb.from('gastos').insert(nuevoGasto).select().single();
    if (error) {
        showToast('Error al registrar el gasto', 'danger');
        return;
    }

    gastos.unshift({
        ...data,
        monto: parseFloat(data.monto),
        monto_crc: parseFloat(data.monto_crc),
        porcentaje_reembolso: parseFloat(data.porcentaje_reembolso)
    });

    renderAll();

    gastoForm.reset();
    gastoMoneda.value = 'CRC';
    gastoCurrencySymbol.textContent = '₡';
    gastoQuienOtroWrapper.classList.add('hidden');
    gastoPct.value = 50;
    gastoPctWrapper.style.display = 'flex';

    showToast('Gasto registrado con éxito', 'success');
});

creditoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const moneda = creditoMoneda.value;
    const montoOriginal = parseFloat(creditoMontoOriginal.value);
    const meses = parseInt(creditoMeses.value, 10);
    const tipo = creditoTipo.value;
    const detalle = creditoDetalle.value.trim();
    const cuenta = creditoCuenta.value;

    let realizadoPor = creditoQuien.value;
    if (realizadoPor === 'Otro') {
        realizadoPor = creditoQuienOtro.value.trim();
        if (!realizadoPor) {
            showToast('Indica el nombre de la persona', 'danger');
            return;
        }
    }

    if (isNaN(montoOriginal) || montoOriginal <= 0 || isNaN(meses) || meses <= 0 || !detalle) {
        showToast('Completa todos los campos correctamente', 'danger');
        return;
    }

    const cuotaMensual = montoOriginal / meses;

    const nuevoCredito = {
        moneda, monto_original: montoOriginal, monto_actual: montoOriginal,
        cuota_mensual: cuotaMensual, meses_totales: meses, meses_pagados: 0,
        tipo, detalle, realizado_por: realizadoPor, cuenta
    };

    const { data, error } = await sb.from('creditos_tasa_cero').insert(nuevoCredito).select().single();
    if (error) {
        showToast('Error al registrar el crédito', 'danger');
        return;
    }

    creditos.unshift({
        ...data,
        monto_original: parseFloat(data.monto_original),
        monto_actual: parseFloat(data.monto_actual),
        cuota_mensual: parseFloat(data.cuota_mensual)
    });

    renderCreditos();

    creditoForm.reset();
    creditoMoneda.value = 'CRC';
    creditoQuienOtroWrapper.classList.add('hidden');

    showToast('Crédito registrado con éxito', 'success');
});

// Start the application
document.addEventListener('DOMContentLoaded', init);