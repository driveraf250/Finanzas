/* ==========================================================================
   Finanzas Daniela - Core Application Logic
   ========================================================================== */

// --- Category Configuration ---
const categoriesConfig = {
    expense: [
        { value: 'food', label: 'Comida y Súper', icon: 'utensils', class: 'cat-food' },
        { value: 'rent', label: 'Alquiler y Hogar', icon: 'home', class: 'cat-rent' },
        { value: 'transport', label: 'Transporte', icon: 'car', class: 'cat-transport' },
        { value: 'utilities', label: 'Servicios', icon: 'plug', class: 'cat-utilities' },
        { value: 'entertainment', label: 'Entretenimiento', icon: 'tv', class: 'cat-entertainment' },
        { value: 'shopping', label: 'Compras', icon: 'shopping-bag', class: 'cat-shopping' },
        { value: 'others', label: 'Otros Gastos', icon: 'help-circle', class: 'cat-others' }
    ],
    income: [
        { value: 'salary', label: 'Salario', icon: 'briefcase', class: 'cat-salary' },
        { value: 'investments', label: 'Inversiones', icon: 'trending-up', class: 'cat-investments' },
        { value: 'others', label: 'Otros Ingresos', icon: 'dollar-sign', class: 'cat-others' }
    ]
};

// --- Supabase Client ---
const SUPABASE_URL = 'https://jcwzgzwnwwaypshfchfs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FZyfUSZPyfFULmP17qvSDg_jT-ScqGg';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Application State ---
let transactions = [];
let goals = [];
let currentTheme = 'dark';
let activeFilter = 'all';

// --- Chart Instances ---
let cashflowChartInstance = null;
let categoryChartInstance = null;

// --- DOM Elements ---
const totalBalanceEl = document.getElementById('total-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const savingsRateEl = document.getElementById('savings-rate');
const savingsBarEl = document.getElementById('savings-bar');
const balanceTrendEl = document.getElementById('balance-trend');
const incomePercentageEl = document.getElementById('income-percentage');
const expensePercentageEl = document.getElementById('expense-percentage');

const currentDateEl = document.getElementById('current-date');
const transactionsListEl = document.getElementById('transactions-list');
const transactionForm = document.getElementById('transaction-form');
const amountInput = document.getElementById('amount-input');
const categorySelect = document.getElementById('category-select');
const dateInput = document.getElementById('date-input');
const descInput = document.getElementById('desc-input');
const typeExpenseRadio = document.getElementById('type-expense');
const typeIncomeRadio = document.getElementById('type-income');

const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
const themeBtn = document.getElementById('theme-btn');
const themeIcon = document.getElementById('theme-icon');

// Goals Elements
const btnAddGoal = document.getElementById('btn-add-goal');
const goalForm = document.getElementById('goal-form');
const btnCancelGoal = document.getElementById('btn-cancel-goal');
const goalsListEl = document.getElementById('goals-list');

// Toast Notification
const toastEl = document.getElementById('toast-notification');
const toastMessageEl = document.getElementById('toast-message');
const toastIconEl = document.getElementById('toast-icon');

// --- Helper Functions ---

// Show Toast Notification
function showToast(message, type = 'info') {
    toastMessageEl.innerText = message;
    toastEl.className = `toast toast-${type} show`;
    
    // Set matching icon
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'danger') iconName = 'alert-triangle';
    toastIconEl.setAttribute('data-lucide', iconName);
    lucide.createIcons({
        attrs: { class: 'lucide-icon' },
        nameAttr: 'data-lucide'
    });

    setTimeout(() => {
        toastEl.classList.remove('show');
    }, 3500);
}

// Format numbers to Currency ($USD)
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Generate Month Labels for the last 6 months
function getLast6MonthsLabels() {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const labels = [];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
        const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
        labels.push(`${months[m.getMonth()]} ${m.getFullYear().toString().substr(-2)}`);
    }
    return labels;
}

// Parse date string to relative descriptive string
function formatDateString(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

// --- Sample Data Generator ---
async function loadSampleData() {
    const now = new Date();
    
    // Helper to generate ISO Date strings relative to today
    const daysAgo = (num) => {
        const d = new Date();
        d.setDate(now.getDate() - num);
        return d.toISOString().split('T')[0];
    };

    // Helper to generate dates in previous months
    const monthsAgo = (mOffset, day) => {
        const d = new Date(now.getFullYear(), now.getMonth() - mOffset, day);
        return d.toISOString().split('T')[0];
    };

    transactions = [
        // Current Month
        { id: '1', type: 'income', amount: 3500, category: 'salary', date: monthsAgo(0, 1), description: 'Nómina Finanzas Daniela' },
        { id: '2', type: 'expense', amount: 950, category: 'rent', date: monthsAgo(0, 2), description: 'Renta Alquiler Departamento' },
        { id: '3', type: 'expense', amount: 120.50, category: 'food', date: daysAgo(2), description: 'Supermercado Semanal' },
        { id: '4', type: 'expense', amount: 65, category: 'utilities', date: daysAgo(5), description: 'Recibo de Electricidad y Agua' },
        { id: '5', type: 'expense', amount: 15.99, category: 'entertainment', date: daysAgo(7), description: 'Suscripción Netflix Familiar' },
        { id: '6', type: 'income', amount: 480, category: 'investments', date: daysAgo(10), description: 'Rendimientos Cripto/Acciones' },
        { id: '7', type: 'expense', amount: 84.50, category: 'food', date: daysAgo(1), description: 'Cena Restaurante Italiana' },
        { id: '8', type: 'expense', amount: 45, category: 'transport', date: daysAgo(4), description: 'Recarga de Gasolina' },
        { id: '9', type: 'expense', amount: 125, category: 'shopping', date: daysAgo(12), description: 'Zapatos Deportivos Nuevos' },
        
        // Month -1
        { id: '10', type: 'income', amount: 3200, category: 'salary', date: monthsAgo(1, 1), description: 'Nómina Finanzas Daniela' },
        { id: '11', type: 'expense', amount: 950, category: 'rent', date: monthsAgo(1, 2), description: 'Renta Alquiler Departamento' },
        { id: '12', type: 'expense', amount: 240, category: 'food', date: monthsAgo(1, 12), description: 'Compras de Alimentos' },
        { id: '13', type: 'expense', amount: 180, category: 'shopping', date: monthsAgo(1, 18), description: 'Regalo de Cumpleaños' },
        { id: '14', type: 'expense', amount: 80, category: 'utilities', date: monthsAgo(1, 10), description: 'Factura de Teléfono e Internet' },
        { id: '15', type: 'income', amount: 350, category: 'others', date: monthsAgo(1, 25), description: 'Venta de Ropa Usada' },
        
        // Month -2
        { id: '16', type: 'income', amount: 3200, category: 'salary', date: monthsAgo(2, 1), description: 'Nómina Finanzas Daniela' },
        { id: '17', type: 'expense', amount: 950, category: 'rent', date: monthsAgo(2, 2), description: 'Renta Alquiler Departamento' },
        { id: '18', type: 'expense', amount: 310, category: 'food', date: monthsAgo(2, 10), description: 'Supermercado Mensual' },
        { id: '19', type: 'expense', amount: 120, category: 'transport', date: monthsAgo(2, 15), description: 'Mantenimiento del Vehículo' },
        { id: '20', type: 'expense', amount: 95, category: 'entertainment', date: monthsAgo(2, 22), description: 'Concierto Fin de Semana' },

        // Month -3
        { id: '21', type: 'income', amount: 3200, category: 'salary', date: monthsAgo(3, 1), description: 'Nómina Finanzas' },
        { id: '22', type: 'expense', amount: 950, category: 'rent', date: monthsAgo(3, 2), description: 'Renta Alquiler Departamento' },
        { id: '23', type: 'expense', amount: 195, category: 'food', date: monthsAgo(3, 15), description: 'Compras Varias Hogar' },
        { id: '24', type: 'income', amount: 500, category: 'investments', date: monthsAgo(3, 28), description: 'Retiro Fondos Inversión' },

        // Month -4
        { id: '25', type: 'income', amount: 3200, category: 'salary', date: monthsAgo(4, 1), description: 'Nómina Finanzas' },
        { id: '26', type: 'expense', amount: 950, category: 'rent', date: monthsAgo(4, 2), description: 'Renta Alquiler' },
        { id: '27', type: 'expense', amount: 280, category: 'shopping', date: monthsAgo(4, 8), description: 'Renovación Ropa de Cama' },
        { id: '28', type: 'expense', amount: 140, category: 'food', date: monthsAgo(4, 14), description: 'Cenas fuera' },

        // Month -5
        { id: '29', type: 'income', amount: 3200, category: 'salary', date: monthsAgo(5, 1), description: 'Nómina Finanzas' },
        { id: '30', type: 'expense', amount: 950, category: 'rent', date: monthsAgo(5, 2), description: 'Renta Alquiler' },
        { id: '31', type: 'expense', amount: 150, category: 'food', date: monthsAgo(5, 10), description: 'Alimentos Semanales' }
    ];

    goals = [
        { id: 'g1', name: 'Viaje de Fin de Año', target: 2000, current: 850 },
        { id: 'g2', name: 'Fondo de Emergencias', target: 5000, current: 3200 },
        { id: 'g3', name: 'Laptop Pro Nueva', target: 1800, current: 400 }
    ];

    await sb.from('transactions').insert(transactions);
    await sb.from('goals').insert(goals);
}

// --- Data Operations & Math ---

function calculateKPIs() {
    let totalIncome = 0;
    let totalExpense = 0;
    
    // Filter transactions for current month to calculate monthly stats
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Overall historical totals
    transactions.forEach(t => {
        if (t.type === 'income') {
            totalIncome += parseFloat(t.amount);
        } else {
            totalExpense += parseFloat(t.amount);
        }
    });

    const balance = totalIncome - totalExpense;

    // Set balances in DOM
    totalBalanceEl.innerText = formatCurrency(balance);
    totalIncomeEl.innerText = formatCurrency(totalIncome);
    totalExpenseEl.innerText = formatCurrency(totalExpense);

    // Dynamic classes/styles for balance
    if (balance < 0) {
        totalBalanceEl.className = "stat-value text-danger";
        balanceTrendEl.className = "stat-trend trend-down";
        balanceTrendEl.innerHTML = '<i data-lucide="alert-triangle"></i> En déficit';
    } else if (balance > 0) {
        totalBalanceEl.className = "stat-value text-success";
        balanceTrendEl.className = "stat-trend trend-up";
        balanceTrendEl.innerHTML = '<i data-lucide="trending-up"></i> Saldo positivo';
    } else {
        totalBalanceEl.className = "stat-value";
        balanceTrendEl.className = "stat-trend trend-neutral";
        balanceTrendEl.innerHTML = '<i data-lucide="activity"></i> En balance';
    }

    // Savings Rate Math
    let savingsRate = 0;
    if (totalIncome > 0) {
        savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100;
        savingsRate = Math.max(0, Math.round(savingsRate)); // Clamp positive
    }
    
    savingsRateEl.innerText = `${savingsRate}%`;
    savingsBarEl.style.width = `${Math.min(savingsRate, 100)}%`;

    // Calculate dynamic comparisons (Current month vs Previous Month as demonstration)
    const currentMonthT = transactions.filter(t => {
        const d = new Date(t.date + 'T00:00:00');
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    let currentMonthIncome = 0;
    let currentMonthExpense = 0;
    currentMonthT.forEach(t => {
        if (t.type === 'income') currentMonthIncome += t.amount;
        else currentMonthExpense += t.amount;
    });

    // Update trend labels dynamically
    const expensePercentVal = currentMonthIncome > 0 ? Math.round((currentMonthExpense / currentMonthIncome) * 100) : 0;
    expensePercentageEl.innerHTML = `<i data-lucide="arrow-down-right"></i> ${expensePercentVal}% del ingreso este mes`;

    // Count income items for trend placeholder
    const incomeItemsCount = currentMonthT.filter(t => t.type === 'income').length;
    incomePercentageEl.innerHTML = `<i data-lucide="arrow-up-right"></i> ${incomeItemsCount} depósito(s) este mes`;

    lucide.createIcons();
}

// --- UI Rendering ---

// Populate Category dropdown based on selected type (expense / income)
function populateCategories(type) {
    categorySelect.innerHTML = '';
    categoriesConfig[type].forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.value;
        option.textContent = cat.label;
        categorySelect.appendChild(option);
    });
}

// Get category details by value
function getCategoryDetails(val, type) {
    const list = categoriesConfig[type];
    return list.find(c => c.value === val) || { label: 'Otros', icon: 'help-circle', class: 'cat-others' };
}

// Render Transactions List
function renderTransactions() {
    transactionsListEl.innerHTML = '';
    
    // Sort: most recent first
    let filtered = [...transactions].sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00'));

    // Apply filters
    if (activeFilter !== 'all') {
        filtered = filtered.filter(t => t.type === activeFilter);
    }

    // Apply Search
    const searchVal = searchInput.value.toLowerCase().trim();
    if (searchVal !== '') {
        filtered = filtered.filter(t => 
            t.description.toLowerCase().includes(searchVal) || 
            getCategoryDetails(t.category, t.type).label.toLowerCase().includes(searchVal) ||
            t.amount.toString().includes(searchVal)
        );
    }

    if (filtered.length === 0) {
        transactionsListEl.innerHTML = `
            <div class="empty-state">
                <i data-lucide="inbox"></i>
                <p>No se encontraron transacciones</p>
                <span class="subtitle">Registra un nuevo movimiento en el formulario lateral</span>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    filtered.forEach(t => {
        const cat = getCategoryDetails(t.category, t.type);
        const li = document.createElement('li');
        li.className = 'transaction-item';
        li.setAttribute('data-id', t.id);

        const isIncome = t.type === 'income';
        const sign = isIncome ? '+' : '-';
        const amountClass = isIncome ? 'text-success' : 'text-danger';

        li.innerHTML = `
            <div class="transaction-left">
                <div class="transaction-category-icon ${cat.class}">
                    <i data-lucide="${cat.icon}"></i>
                </div>
                <div class="transaction-details">
                    <span class="transaction-desc">${t.description}</span>
                    <div class="transaction-meta">
                        <span class="category-tag">${cat.label}</span>
                        <span class="separator">•</span>
                        <span class="transaction-date">${formatDateString(t.date)}</span>
                    </div>
                </div>
            </div>
            <div class="transaction-right">
                <span class="transaction-amount ${amountClass}">${sign}${formatCurrency(t.amount)}</span>
                <button class="transaction-delete-btn" title="Eliminar" aria-label="Eliminar transacción">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `;

        // Register Delete event
        const delBtn = li.querySelector('.transaction-delete-btn');
        delBtn.addEventListener('click', () => deleteTransaction(t.id));

        transactionsListEl.appendChild(li);
    });

    lucide.createIcons();
}

// Delete transaction with exit animation
function deleteTransaction(id) {
    const itemEl = document.querySelector(`.transaction-item[data-id="${id}"]`);
    if (itemEl) {
        itemEl.classList.add('item-exit');

        // Wait for animation to finish
        itemEl.addEventListener('animationend', async () => {
            const { error } = await sb.from('transactions').delete().eq('id', id);
            if (error) {
                showToast('Error al eliminar la transacción', 'danger');
                return;
            }
            transactions = transactions.filter(t => t.id !== id);
            calculateKPIs();
            renderTransactions();
            updateCharts();
            showToast('Transacción eliminada con éxito', 'info');
        });
    }
}

// Render Goals List
function renderGoals() {
    goalsListEl.innerHTML = '';
    
    if (goals.length === 0) {
        goalsListEl.innerHTML = `
            <div class="empty-state" style="padding: 1.5rem 0;">
                <i data-lucide="target" style="width:36px;height:36px;"></i>
                <p style="font-size:0.85rem;">No tienes metas activas</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    goals.forEach(goal => {
        const percent = Math.min(100, Math.round((goal.current / goal.target) * 100));
        const div = document.createElement('div');
        div.className = 'goal-item';
        div.innerHTML = `
            <div class="goal-header">
                <div class="goal-title-wrapper">
                    <i data-lucide="flag" class="text-primary" style="width:16px;height:16px;"></i>
                    <span class="goal-title">${goal.name}</span>
                </div>
                <span class="goal-progress-percent">${percent}%</span>
            </div>
            <div class="goal-bar-container">
                <div class="goal-bar" style="width: ${percent}%"></div>
            </div>
            <div class="goal-amounts">
                <span>Ahorrado: ${formatCurrency(goal.current)}</span>
                <span>Objetivo: ${formatCurrency(goal.target)}</span>
            </div>
            <div class="goal-actions-overlay">
                <button class="goal-action-btn add-funds-btn" title="Sumar Fondos" onclick="addFundsToGoal('${goal.id}')">
                    <i data-lucide="coins" style="width:14px;height:14px;"></i>
                </button>
                <button class="goal-action-btn delete-goal-btn" title="Eliminar Meta" onclick="deleteGoal('${goal.id}')">
                    <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                </button>
            </div>
        `;
        goalsListEl.appendChild(div);
    });

    lucide.createIcons();
}

// Add funds to a savings goal
window.addFundsToGoal = async function(id) {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    const amountToAdd = prompt(`¿Cuánto deseas abonar a la meta "${goal.name}"?`);
    if (amountToAdd === null) return; // Cancelled

    const funds = parseFloat(amountToAdd);
    if (isNaN(funds) || funds <= 0) {
        showToast('Monto inválido para sumar a la meta', 'danger');
        return;
    }

    // Verify if we have sufficient general balance or just add to goal anyway
    const newCurrent = Math.min(goal.current + funds, goal.target);

    // Register a matching savings expense transaction to deduct from general balance
    const newTx = {
        id: Date.now().toString(),
        type: 'expense',
        amount: funds,
        category: 'others',
        date: new Date().toISOString().split('T')[0],
        description: `Ahorro meta: ${goal.name}`
    };

    const { error: goalError } = await sb.from('goals').update({ current: newCurrent }).eq('id', id);
    const { error: txError } = await sb.from('transactions').insert(newTx);
    if (goalError || txError) {
        showToast('Error al abonar a la meta', 'danger');
        return;
    }

    goal.current = newCurrent;
    if (goal.current >= goal.target) {
        showToast(`¡Felicidades! Completaste tu meta: "${goal.name}"`, 'success');
    } else {
        showToast(`Se abonaron ${formatCurrency(funds)} a la meta "${goal.name}"`, 'success');
    }

    transactions.push(newTx);

    calculateKPIs();
    renderTransactions();
    renderGoals();
    updateCharts();
};

// Delete Goal
window.deleteGoal = async function(id) {
    if (confirm('¿Estás seguro de que deseas eliminar esta meta de ahorro?')) {
        const { error } = await sb.from('goals').delete().eq('id', id);
        if (error) {
            showToast('Error al eliminar la meta', 'danger');
            return;
        }
        goals = goals.filter(g => g.id !== id);
        renderGoals();
        showToast('Meta eliminada', 'info');
    }
};

// --- Chart.js Configuration & Operations ---

// Get theme colors for Charts
function getChartColors() {
    const isDark = currentTheme === 'dark';
    return {
        text: isDark ? '#94a3b8' : '#64748b',
        grid: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)',
        income: '#10b981',
        incomeGradientStart: 'rgba(16, 185, 129, 0.25)',
        expense: '#f43f5e',
        expenseGradientStart: 'rgba(244, 63, 94, 0.25)',
        accentColors: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#6b7280']
    };
}

// Calculate aggregations for Line & Doughnut Charts
function getChartsData() {
    const last6Months = getLast6MonthsLabels(); // Array of "Month YY"
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    // Initialize monthly aggregates
    const incomeMonthly = [0, 0, 0, 0, 0, 0];
    const expenseMonthly = [0, 0, 0, 0, 0, 0];

    // Initialize category aggregates
    const categoryTotals = {};
    categoriesConfig.expense.forEach(c => categoryTotals[c.value] = 0);

    transactions.forEach(t => {
        const d = new Date(t.date + 'T00:00:00');
        const tMonthLabel = `${months[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`;
        
        // Match transactions with last 6 months list
        const mIdx = last6Months.indexOf(tMonthLabel);
        if (mIdx !== -1) {
            if (t.type === 'income') {
                incomeMonthly[mIdx] += parseFloat(t.amount);
            } else {
                expenseMonthly[mIdx] += parseFloat(t.amount);
            }
        }

        // Category breakdown for expenses
        if (t.type === 'expense') {
            const cat = t.category;
            if (categoryTotals[cat] !== undefined) {
                categoryTotals[cat] += parseFloat(t.amount);
            } else {
                categoryTotals['others'] = (categoryTotals['others'] || 0) + parseFloat(t.amount);
            }
        }
    });

    return {
        labels: last6Months,
        incomeMonthly,
        expenseMonthly,
        categories: categoryTotals
    };
}

// Draw/Redraw Charts
function initCharts() {
    const colors = getChartColors();
    const data = getChartsData();

    // 1. Cashflow Line Chart
    const cashflowCtx = document.getElementById('cashflow-chart').getContext('2d');
    
    // Create Gradients
    const incGradient = cashflowCtx.createLinearGradient(0, 0, 0, 250);
    incGradient.addColorStop(0, colors.incomeGradientStart);
    incGradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    const expGradient = cashflowCtx.createLinearGradient(0, 0, 0, 250);
    expGradient.addColorStop(0, colors.expenseGradientStart);
    expGradient.addColorStop(1, 'rgba(244, 63, 94, 0.0)');

    cashflowChartInstance = new Chart(cashflowCtx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Ingresos',
                    data: data.incomeMonthly,
                    borderColor: colors.income,
                    borderWidth: 3,
                    backgroundColor: incGradient,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: colors.income,
                    pointHoverRadius: 7
                },
                {
                    label: 'Gastos',
                    data: data.expenseMonthly,
                    borderColor: colors.expense,
                    borderWidth: 3,
                    backgroundColor: expGradient,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: colors.expense,
                    pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    padding: 12,
                    titleFont: { family: 'Outfit', size: 14, weight: 'bold' },
                    bodyFont: { family: 'Inter', size: 13 },
                    callbacks: {
                        label: function(context) {
                            return ` ${context.dataset.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: colors.text, font: { family: 'Inter' } }
                },
                y: {
                    grid: { color: colors.grid },
                    ticks: {
                        color: colors.text,
                        font: { family: 'Inter' },
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });

    // 2. Category Doughnut Chart
    const categoryCtx = document.getElementById('category-chart').getContext('2d');
    
    // Prepare doughnut data
    const catLabels = [];
    const catValues = [];
    const catColors = [];

    let idx = 0;
    for (const [key, value] of Object.entries(data.categories)) {
        if (value > 0) {
            const config = categoriesConfig.expense.find(c => c.value === key);
            catLabels.push(config ? config.label : 'Otros');
            catValues.push(value);
            catColors.push(colors.accentColors[idx % colors.accentColors.length]);
            idx++;
        }
    }

    // Default if no expense data
    if (catValues.length === 0) {
        catLabels.push('Sin gastos');
        catValues.push(1);
        catColors.push(colors.text);
    }

    categoryChartInstance = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: catLabels,
            datasets: [{
                data: catValues,
                backgroundColor: catColors,
                borderWidth: currentTheme === 'dark' ? 2 : 1,
                borderColor: currentTheme === 'dark' ? '#0f1626' : '#ffffff',
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    padding: 10,
                    bodyFont: { family: 'Inter', size: 13 },
                    callbacks: {
                        label: function(context) {
                            if (context.label === 'Sin gastos') return ' Sin gastos registrados';
                            return ` ${context.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            }
        }
    });
}

// Update charts with new data
function updateCharts() {
    if (!cashflowChartInstance || !categoryChartInstance) return;
    
    const colors = getChartColors();
    const data = getChartsData();

    // Update Line Chart
    cashflowChartInstance.data.datasets[0].data = data.incomeMonthly;
    cashflowChartInstance.data.datasets[1].data = data.expenseMonthly;
    
    // Redraw gradients if colors changed
    const cashflowCtx = document.getElementById('cashflow-chart').getContext('2d');
    const incGradient = cashflowCtx.createLinearGradient(0, 0, 0, 250);
    incGradient.addColorStop(0, colors.incomeGradientStart);
    incGradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
    const expGradient = cashflowCtx.createLinearGradient(0, 0, 0, 250);
    expGradient.addColorStop(0, colors.expenseGradientStart);
    expGradient.addColorStop(1, 'rgba(244, 63, 94, 0.0)');
    
    cashflowChartInstance.data.datasets[0].backgroundColor = incGradient;
    cashflowChartInstance.data.datasets[1].backgroundColor = expGradient;
    
    cashflowChartInstance.data.datasets[0].borderColor = colors.income;
    cashflowChartInstance.data.datasets[1].borderColor = colors.expense;
    cashflowChartInstance.options.scales.x.ticks.color = colors.text;
    cashflowChartInstance.options.scales.y.ticks.color = colors.text;
    cashflowChartInstance.options.scales.y.grid.color = colors.grid;
    cashflowChartInstance.update();

    // Update Doughnut Chart
    const catLabels = [];
    const catValues = [];
    const catColors = [];

    let idx = 0;
    for (const [key, value] of Object.entries(data.categories)) {
        if (value > 0) {
            const config = categoriesConfig.expense.find(c => c.value === key);
            catLabels.push(config ? config.label : 'Otros');
            catValues.push(value);
            catColors.push(colors.accentColors[idx % colors.accentColors.length]);
            idx++;
        }
    }

    if (catValues.length === 0) {
        catLabels.push('Sin gastos');
        catValues.push(1);
        catColors.push(colors.text);
    }

    categoryChartInstance.data.labels = catLabels;
    categoryChartInstance.data.datasets[0].data = catValues;
    categoryChartInstance.data.datasets[0].backgroundColor = catColors;
    categoryChartInstance.data.datasets[0].borderColor = currentTheme === 'dark' ? '#0f1626' : '#ffffff';
    categoryChartInstance.update();
}

// --- Theme Switching ---
function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    
    // Update theme icons
    if (currentTheme === 'dark') {
        themeIcon.setAttribute('data-lucide', 'moon');
    } else {
        themeIcon.setAttribute('data-lucide', 'sun');
    }
    lucide.createIcons();

    // Redraw charts with theme specific scales/grids
    updateCharts();
}

// Set Today's Date
function setTodayDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const localeString = today.toLocaleDateString('es-ES', options);
    
    // Capitalize first letter
    currentDateEl.innerText = localeString.charAt(0).toUpperCase() + localeString.slice(1);
}

// --- Initializing App ---
async function init() {
    // 1. Theme Configuration
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        currentTheme = savedTheme;
        document.documentElement.setAttribute('data-theme', currentTheme);
        if (currentTheme === 'light') {
            themeIcon.setAttribute('data-lucide', 'sun');
        }
    }

    // Set form date default to today
    dateInput.value = new Date().toISOString().split('T')[0];

    // 2. Fetch Data from Supabase or Load Samples
    const { data: txData, error: txError } = await sb.from('transactions').select('*');
    const { data: goalsData, error: goalsError } = await sb.from('goals').select('*');

    if (txError || goalsError) {
        showToast('Error al conectar con la base de datos', 'danger');
    }

    if (!txData || txData.length === 0) {
        await loadSampleData();
    } else {
        transactions = txData.map(t => ({ ...t, amount: parseFloat(t.amount) }));
        goals = (goalsData || []).map(g => ({ ...g, target: parseFloat(g.target), current: parseFloat(g.current) }));
    }

    // Populate default categories
    populateCategories('expense'); // expense radio is checked by default
    
    // Set headers
    setTodayDate();

    // Calculate figures
    calculateKPIs();
    
    // Render templates
    renderTransactions();
    renderGoals();

    // Load Charts
    initCharts();

    // Create icons globally
    lucide.createIcons();
}

// --- Event Listeners ---

// Type Toggle (Expense / Income)
typeExpenseRadio.addEventListener('change', () => {
    populateCategories('expense');
});

typeIncomeRadio.addEventListener('change', () => {
    populateCategories('income');
});

// Transaction Form Submit
transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amountVal = parseFloat(amountInput.value);
    const categoryVal = categorySelect.value;
    const dateVal = dateInput.value;
    const descVal = descInput.value.trim();
    const typeVal = typeExpenseRadio.checked ? 'expense' : 'income';

    if (isNaN(amountVal) || amountVal <= 0) {
        showToast('Por favor introduce un monto válido', 'danger');
        return;
    }

    // Add new Transaction to state
    const newTx = {
        id: Date.now().toString(),
        type: typeVal,
        amount: amountVal,
        category: categoryVal,
        date: dateVal,
        description: descVal
    };

    const { error } = await sb.from('transactions').insert(newTx);
    if (error) {
        showToast('Error al registrar la transacción', 'danger');
        return;
    }

    transactions.push(newTx);
    calculateKPIs();
    renderTransactions();
    updateCharts();

    // Reset Form
    transactionForm.reset();
    dateInput.value = new Date().toISOString().split('T')[0];
    if (typeVal === 'expense') {
        typeExpenseRadio.checked = true;
        populateCategories('expense');
    } else {
        typeIncomeRadio.checked = true;
        populateCategories('income');
    }

    showToast('Transacción registrada con éxito', 'success');
});

// Search input keyup
searchInput.addEventListener('input', () => {
    renderTransactions();
});

// Filter Buttons Click
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.getAttribute('data-filter');
        renderTransactions();
    });
});

// Theme button click
themeBtn.addEventListener('click', toggleTheme);

// Goal Form Toggle
btnAddGoal.addEventListener('click', () => {
    goalForm.classList.toggle('hidden');
});

btnCancelGoal.addEventListener('click', () => {
    goalForm.classList.add('hidden');
    goalForm.reset();
});

// Goal Form Submit
goalForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('goal-name').value.trim();
    const target = parseFloat(document.getElementById('goal-target').value);
    const current = parseFloat(document.getElementById('goal-current').value) || 0;

    if (!name || isNaN(target) || target <= 0 || current < 0) {
        showToast('Datos de meta inválidos', 'danger');
        return;
    }

    const newGoal = {
        id: Date.now().toString(),
        name,
        target,
        current: Math.min(current, target)
    };

    const { error } = await sb.from('goals').insert(newGoal);
    if (error) {
        showToast('Error al crear la meta', 'danger');
        return;
    }

    goals.push(newGoal);
    renderGoals();

    goalForm.reset();
    goalForm.classList.add('hidden');
    showToast(`Meta "${name}" creada con éxito`, 'success');
});

// Start the application
document.addEventListener('DOMContentLoaded', init);
