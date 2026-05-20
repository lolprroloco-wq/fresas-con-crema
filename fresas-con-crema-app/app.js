/**
 * FresaConta 🍓📈 - app.js (Versión Unificada y Auto-ejecutable)
 * 
 * Este archivo consolida toda la lógica de la aplicación:
 * 1. db (Capa de Datos en LocalStorage + Seeder histórico de 7 días + Respaldos JSON)
 * 2. api (Conexión resiliente a DolarApi.com para obtener la tasa del BCV)
 * 3. charts (Configurador gráfico premium basado en Chart.js)
 * 4. Controlador de la SPA (Enrutador de pestañas, tablas, formularios y proyecciones)
 * 
 * ALERTA DE COMPATIBILIDAD: Se han eliminado los "imports" y "exports" de ES6.
 * Esto soluciona por completo el error de seguridad CORS de los navegadores cuando se abre
 * la aplicación haciendo doble clic directo (protocolo file://) en el index.html en Windows.
 * ¡Ahora funciona de forma instantánea tanto a nivel local como desplegado en Vercel!
 */

// ============================================================================
// 1. CAPA DE BASE DE DATOS Y ALMACENAMIENTO (db)
// ============================================================================

const STORAGE_KEYS = {
  SALES: 'fresas_sales',
  INVENTORY: 'fresas_inventory',
  FIXED_COSTS: 'fresas_fixed_costs',
  SETTINGS: 'fresas_settings',
  PRODUCTS: 'fresas_products',
  SESSION: 'fresas_session'
};

const VALID_USERS = {
  admin: 'admin',
  vendedor: '123'
};

// Estructuras por defecto (Semillero de datos iniciales)
const DEFAULT_INVENTORY = [
  { id: '1', name: 'Fresas Frescas', costUSD: 3.5, unit: 'kg', quantityUsedPerUnit: 0.15 }, // 150g por copa
  { id: '2', name: 'Crema de Leche', costUSD: 4.0, unit: 'L', quantityUsedPerUnit: 0.1 },  // 100ml por copa
  { id: '3', name: 'Leche Condensada', costUSD: 3.0, unit: 'Lata (395g)', quantityUsedPerUnit: 0.08 }, // ~30g por copa
  { id: '4', name: 'Envase y Cuchara', costUSD: 0.15, unit: 'Kit', quantityUsedPerUnit: 1.0 } // 1 kit por copa
];

const DEFAULT_PRODUCTS = [
  {
    id: 'prod_small',
    name: 'Vaso Pequeño 🍓 (7oz)',
    priceUSD: 1.50,
    recipe: { '1': 0.08, '2': 0.05, '3': 0.04, '4': 1.0 }
  },
  {
    id: 'prod_medium',
    name: 'Vaso Mediano 🍓 (10oz)',
    priceUSD: 2.50,
    recipe: { '1': 0.12, '2': 0.08, '3': 0.06, '4': 1.0 }
  },
  {
    id: 'prod_large',
    name: 'Vaso Grande 🍓 (14oz)',
    priceUSD: 4.00,
    recipe: { '1': 0.18, '2': 0.12, '3': 0.10, '4': 1.0 }
  }
];

const DEFAULT_FIXED_COSTS = [
  { id: '1', name: 'Renta del Local', costUSD: 120.0, frequency: 'mensual' },
  { id: '2', name: 'Electricidad y Agua', costUSD: 45.0, frequency: 'mensual' },
  { id: '3', name: 'Sueldo de Ayudante', costUSD: 150.0, frequency: 'mensual' }
];

const DEFAULT_SETTINGS = {
  sellingPriceUSD: 2.50, // Precio sugerido por defecto
  bcvRate: 36.58, // Tasa BCV inicial
  bcvRateDate: new Date().toISOString().split('T')[0], // Fecha de tasa
  theme: 'dark'
};

// Generador de ventas ficticias de los últimos 7 días
function generateSeedSales() {
  const sales = [];
  const today = new Date();
  const rates = [36.42, 36.45, 36.48, 36.50, 36.50, 36.52, 36.55, 36.58]; // Tasas BCV
  const baseQty = [24, 28, 45, 52, 32, 27, 35, 15]; // Copas por día
  const productIds = ['prod_small', 'prod_medium', 'prod_large'];
  const productNames = {
    prod_small: 'Vaso Pequeño 🍓 (7oz)',
    prod_medium: 'Vaso Mediano 🍓 (10oz)',
    prod_large: 'Vaso Grande 🍓 (14oz)'
  };
  const productPrices = {
    prod_small: 1.50,
    prod_medium: 2.50,
    prod_large: 4.00
  };
  const productCosts = {
    prod_small: 0.65,
    prod_medium: 0.95,
    prod_large: 1.45
  };
  
  for (let i = 7; i >= 0; i--) {
    const saleDate = new Date();
    saleDate.setDate(today.getDate() - i);
    const dateStr = saleDate.toISOString().split('T')[0];
    const rate = rates[7 - i] || 36.58;
    const qty = baseQty[7 - i] || 20;
    
    // Distribuir cantidad del día en transacciones individuales realistas
    const numTx = Math.min(3, Math.max(1, Math.ceil(qty / 10)));
    let remainingQty = qty;
    
    for (let t = 0; t < numTx; t++) {
      const pId = productIds[Math.floor(Math.random() * productIds.length)];
      const pQty = t === numTx - 1 ? remainingQty : Math.ceil(remainingQty / (numTx - t));
      if (pQty <= 0) continue;
      remainingQty -= pQty;
      
      const priceUSD = productPrices[pId];
      const unitCostUSD = productCosts[pId];
      const hour = 10 + Math.floor(Math.random() * 9); // de 10:00 a 18:00
      const minute = Math.floor(Math.random() * 60);
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

      sales.push({
        id: `seed_${i}_${t}_${Date.now()}_${Math.random()}`,
        productId: pId,
        productName: productNames[pId],
        qty: pQty,
        priceUSD: priceUSD,
        totalUSD: pQty * priceUSD,
        totalVES: pQty * priceUSD * rate,
        bcvRate: rate,
        date: dateStr,
        time: timeStr,
        unitCostUSD: unitCostUSD,
        isSeed: true
      });
    }
  }
  return sales;
}

const db = {
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.INVENTORY)) {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(DEFAULT_INVENTORY));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.FIXED_COSTS)) {
      localStorage.setItem(STORAGE_KEYS.FIXED_COSTS, JSON.stringify(DEFAULT_FIXED_COSTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SALES)) {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(generateSeedSales()));
    }
  },

  getSales() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES)) || [];
  },

  saveSale(productId, productName, qty, priceUSD, bcvRate, dateStr, timeStr, unitCostUSD) {
    const sales = this.getSales();
    const newSale = {
      id: 'sale_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      productId: productId,
      productName: productName,
      qty: parseInt(qty, 10),
      priceUSD: parseFloat(priceUSD),
      totalUSD: parseInt(qty, 10) * parseFloat(priceUSD),
      totalVES: parseInt(qty, 10) * parseFloat(priceUSD) * parseFloat(bcvRate),
      bcvRate: parseFloat(bcvRate),
      date: dateStr || new Date().toISOString().split('T')[0],
      time: timeStr || new Date().toTimeString().split(' ')[0].substring(0, 5),
      unitCostUSD: parseFloat(unitCostUSD)
    };
    sales.push(newSale);
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    return newSale;
  },

  deleteSale(id) {
    let sales = this.getSales();
    sales = sales.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    return true;
  },

  getInventory() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.INVENTORY)) || [];
  },

  saveMaterial(id, name, costUSD, unit, quantityUsedPerUnit) {
    const materials = this.getInventory();
    const index = materials.findIndex(m => m.id === id);
    
    const materialData = {
      id: id || 'mat_' + Date.now(),
      name,
      costUSD: parseFloat(costUSD),
      unit,
      quantityUsedPerUnit: parseFloat(quantityUsedPerUnit)
    };

    if (index > -1) {
      materials[index] = materialData;
    } else {
      materials.push(materialData);
    }

    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(materials));
    return materialData;
  },

  calculateUnitCost() {
    // Retorna el promedio ponderado o costo del producto por defecto mediano para mantener compatibilidad
    return this.calculateProductUnitCost('prod_medium') || 0.95;
  },

  getProducts() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS)) || [];
  },

  saveProduct(id, name, priceUSD, recipe) {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === id);
    const prodData = {
      id: id || 'prod_' + Date.now(),
      name,
      priceUSD: parseFloat(priceUSD),
      recipe: recipe
    };

    if (index > -1) {
      products[index] = prodData;
    } else {
      products.push(prodData);
    }

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    return prodData;
  },

  deleteProduct(id) {
    let products = this.getProducts();
    products = products.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    return true;
  },

  calculateProductUnitCost(productId) {
    const products = this.getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    
    const inventory = this.getInventory();
    let totalCost = 0;
    
    for (const [matId, qtyUsed] of Object.entries(product.recipe)) {
      const mat = inventory.find(m => m.id === matId);
      if (mat) {
        totalCost += mat.costUSD * parseFloat(qtyUsed);
      }
    }
    return totalCost;
  },

  getFixedCosts() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.FIXED_COSTS)) || [];
  },

  saveFixedCost(id, name, costUSD, frequency = 'mensual') {
    const costs = this.getFixedCosts();
    const index = costs.findIndex(c => c.id === id);

    const costData = {
      id: id || 'fc_' + Date.now(),
      name,
      costUSD: parseFloat(costUSD),
      frequency
    };

    if (index > -1) {
      costs[index] = costData;
    } else {
      costs.push(costData);
    }

    localStorage.setItem(STORAGE_KEYS.FIXED_COSTS, JSON.stringify(costs));
    return costData;
  },

  deleteFixedCost(id) {
    let costs = this.getFixedCosts();
    costs = costs.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.FIXED_COSTS, JSON.stringify(costs));
    return true;
  },

  calculateTotalFixedCostsMonthly() {
    const costs = this.getFixedCosts();
    return costs.reduce((acc, c) => {
      if (c.frequency === 'diario') return acc + (c.costUSD * 30);
      if (c.frequency === 'semanal') return acc + (c.costUSD * 4.33);
      if (c.frequency === 'anual') return acc + (c.costUSD / 12);
      return acc + c.costUSD; // mensual
    }, 0);
  },

  getSettings() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || DEFAULT_SETTINGS;
  },

  saveSettings(newSettings) {
    const settings = { ...this.getSettings(), ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return settings;
  },

  // --- LÓGICA DE USUARIOS Y AUTENTICACIÓN ---
  getSession() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION)) || null;
  },

  saveSession(session) {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  },

  clearSession() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  },

  login(username, password) {
    const normalizedUser = username.trim().toLowerCase();
    if (VALID_USERS[normalizedUser] && VALID_USERS[normalizedUser] === password) {
      const session = {
        username: normalizedUser,
        role: normalizedUser === 'admin' ? 'admin' : 'vendedor',
        loggedInAt: new Date().toISOString()
      };
      this.saveSession(session);
      return { success: true, session };
    }
    return { success: false, error: 'Usuario o contraseña incorrectos.' };
  },

  logout() {
    this.clearSession();
    return true;
  },

  exportBackup() {
    const data = {
      sales: this.getSales(),
      inventory: this.getInventory(),
      products: this.getProducts(),
      fixedCosts: this.getFixedCosts(),
      settings: this.getSettings(),
      exportedAt: new Date().toISOString()
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `fresas_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  importBackup(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.sales && parsed.inventory && parsed.fixedCosts && parsed.settings) {
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(parsed.sales));
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(parsed.inventory));
        localStorage.setItem(STORAGE_KEYS.FIXED_COSTS, JSON.stringify(parsed.fixedCosts));
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed.settings));
        if (parsed.products) {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(parsed.products));
        }
        return { success: true };
      }
      return { success: false, error: 'Estructura de respaldo inválida.' };
    } catch (e) {
      return { success: false, error: 'No es un archivo JSON válido.' };
    }
  },

  resetAllData() {
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.INVENTORY);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.FIXED_COSTS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    this.init();
    return true;
  }
};

// ============================================================================
// 2. INTEGRACIÓN CON TASA OFICIAL BCV (api)
// ============================================================================

const DOLAR_API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';

const api = {
  async getBcvRate(forceRefresh = false) {
    const settings = db.getSettings();
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Caché del día
    if (!forceRefresh && settings.bcvRateDate === todayStr && settings.bcvRate) {
      console.log('BCV Rate cargada de caché local:', settings.bcvRate);
      return {
        rate: settings.bcvRate,
        date: settings.bcvRateDate,
        source: 'cache'
      };
    }

    // 2. Consultar API
    try {
      console.log('Consultando tasa BCV oficial en DolarApi.com...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(DOLAR_API_URL, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && typeof data.promedio === 'number') {
        const freshRate = parseFloat(data.promedio.toFixed(2));
        
        db.saveSettings({
          bcvRate: freshRate,
          bcvRateDate: todayStr
        });

        return {
          rate: freshRate,
          date: todayStr,
          source: 'api'
        };
      } else {
        throw new Error('Formato de tasa desconocido.');
      }

    } catch (error) {
      console.warn('Error al conectar con la API, usando respaldo:', error.message);
      
      // 3. Respaldo Local
      return {
        rate: settings.bcvRate || 36.58,
        date: settings.bcvRateDate || todayStr,
        source: 'fallback',
        error: error.message
      };
    }
  },

  saveManualRate(rate) {
    const todayStr = new Date().toISOString().split('T')[0];
    const parsedRate = parseFloat(parseFloat(rate).toFixed(2));
    
    db.saveSettings({
      bcvRate: parsedRate,
      bcvRateDate: todayStr
    });
    
    return parsedRate;
  }
};

// ============================================================================
// 3. CAPA DE GRÁFICOS INTERACTIVOS (charts)
// ============================================================================

const chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

const charts = {
  renderSalesTrend(canvasId, sales) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const sortedSales = [...sales]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-7);

    const labels = sortedSales.map(s => {
      const dateParts = s.date.split('-');
      return `${dateParts[2]}/${dateParts[1]}`;
    });
    
    const dataCups = sortedSales.map(s => s.qty);
    const ctx = canvas.getContext('2d');
    
    const colors = getThemeColors();
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(255, 46, 99, 0.35)');
    gradient.addColorStop(1, 'rgba(255, 46, 99, 0.00)');

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Copas',
          data: dataCups,
          borderColor: colors.strawberryRed,
          backgroundColor: gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: colors.strawberryRed,
          pointBorderColor: colors.borderColor,
          pointBorderWidth: 2,
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            titleFont: { family: colors.fontFamily },
            bodyFont: { family: colors.fontFamily },
            titleColor: colors.textColor,
            bodyColor: colors.textColor
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: colors.textColor, font: { family: colors.fontFamily } }
          },
          y: {
            grid: { color: colors.gridColor },
            ticks: { color: colors.textColor, font: { family: colors.fontFamily } }
          }
        }
      }
    });
  },

  renderCostVsPrice(canvasId, unitCost, sellingPrice) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const margin = Math.max(0, sellingPrice - unitCost);
    const marginPercent = sellingPrice > 0 ? ((margin / sellingPrice) * 100).toFixed(1) : 0;

    const colors = getThemeColors();

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Costo Receta', 'Precio Venta', 'Margen Bruto'],
        datasets: [{
          data: [unitCost, sellingPrice, margin],
          backgroundColor: [colors.creamGold, colors.strawberryRed, colors.profitGreen],
          borderRadius: 6,
          barPercentage: 0.6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            titleFont: { family: colors.fontFamily },
            bodyFont: { family: colors.fontFamily },
            titleColor: colors.textColor,
            bodyColor: colors.textColor,
            callbacks: {
              label: function(context) {
                let val = context.raw.toFixed(2);
                if (context.label === 'Margen Bruto') {
                  return ` Ganancia: $${val} (${marginPercent}%)`;
                }
                return ` Valor: $${val}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: colors.textColor, font: { family: colors.fontFamily, weight: 'bold' } }
          },
          y: {
            grid: { color: colors.gridColor },
            ticks: {
              color: colors.textColor,
              font: { family: colors.fontFamily },
              callback: val => '$' + val.toFixed(2)
            }
          }
        }
      }
    });
  },

  renderEstructuraPrecio(canvasId, costMaterial, fixedCostPerCup, sellingPrice) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const netProfit = Math.max(0, sellingPrice - costMaterial - fixedCostPerCup);
    const loss = Math.max(0, (costMaterial + fixedCostPerCup) - sellingPrice);
    
    const colors = getThemeColors();
    
    const labels = ['Insumos', 'Costos Fijos', netProfit > 0 ? 'Ganancia Neta' : 'Pérdida'];
    const data = [costMaterial, fixedCostPerCup, netProfit > 0 ? netProfit : loss];
    const itemColors = [colors.creamGold, colors.purpleAccent, netProfit > 0 ? colors.profitGreen : colors.strawberryRed];

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: itemColors,
          borderWidth: 2,
          borderColor: colors.borderColor
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: colors.textColor, font: { family: colors.fontFamily, size: 10 } }
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            titleFont: { family: colors.fontFamily },
            bodyFont: { family: colors.fontFamily },
            titleColor: colors.textColor,
            bodyColor: colors.textColor,
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                return ` $${context.raw.toFixed(2)} (${pct}%)`;
              }
            }
          }
        },
        cutout: '70%'
      }
    });
  }
};

// ============================================================================
// 4. CONTROLADOR PRINCIPAL DE LA SPA
// ============================================================================

// Referencias del DOM
const DOM = {
  navItems: document.querySelectorAll('.nav-menu .nav-item'),
  viewPanes: document.querySelectorAll('.view-pane'),
  viewTitle: document.getElementById('view-title'),
  viewSubtitle: document.getElementById('view-subtitle'),
  currentDateDisplay: document.getElementById('current-date-display'),
  
  sidebarBcvRate: document.getElementById('sidebar-bcv-rate'),
  sidebarBcvStatus: document.getElementById('sidebar-bcv-status'),
  btnOpenBcvModal: document.getElementById('btn-open-bcv-modal'),
  bcvModal: document.getElementById('bcv-modal'),
  btnCloseBcvModal: document.getElementById('btn-close-bcv-modal'),
  formManualBcv: document.getElementById('form-manual-bcv'),
  manualBcvRateInput: document.getElementById('manual-bcv-rate'),
  btnFetchBcvAuto: document.getElementById('btn-fetch-bcv-auto'),

  kpiSalesQty: document.getElementById('kpi-sales-qty'),
  kpiSalesCash: document.getElementById('kpi-sales-cash'),
  kpiMarginPercent: document.getElementById('kpi-margin-percent'),
  kpiMarginValue: document.getElementById('kpi-margin-value'),
  kpiCostUsd: document.getElementById('kpi-cost-usd'),
  kpiCostVes: document.getElementById('kpi-cost-ves'),
  kpiSalesIndicator: document.getElementById('kpi-sales-indicator'),
  kpiMarginIndicator: document.getElementById('kpi-margin-indicator'),
  kpiCostIndicator: document.getElementById('kpi-cost-indicator'),
  dashboardSalesTable: document.getElementById('dashboard-sales-table').querySelector('tbody'),
  btnQuickSales: document.getElementById('btn-quick-sales'),

  formAddSale: document.getElementById('form-add-sale'),
  saleProductSelect: document.getElementById('sale-product-select'),
  saleQtyInput: document.getElementById('sale-qty'),
  salePriceInput: document.getElementById('sale-price'),
  saleDateInput: document.getElementById('sale-date'),
  saleTimeInput: document.getElementById('sale-time'),
  saleBcvInput: document.getElementById('sale-bcv'),
  salesHistoryTable: document.getElementById('sales-history-table').querySelector('tbody'),

  inventoryTable: document.getElementById('inventory-table').querySelector('tbody'),
  recipeCostUsd: document.getElementById('recipe-cost-usd'),
  recipeCostVes: document.getElementById('recipe-cost-ves'),
  
  materialEditorCard: document.getElementById('material-editor-card'),
  materialEditorTitle: document.getElementById('material-editor-title'),
  formEditMaterial: document.getElementById('form-edit-material'),
  editMatId: document.getElementById('edit-mat-id'),
  editMatName: document.getElementById('edit-mat-name'),
  editMatCost: document.getElementById('edit-mat-cost'),
  editMatUnit: document.getElementById('edit-mat-unit'),
  editMatUsed: document.getElementById('edit-mat-used'),
  btnCancelMatEdit: document.getElementById('btn-cancel-mat-edit'),

  productsTable: document.getElementById('products-table'),
  productEditorCard: document.getElementById('product-editor-card'),
  productEditorTitle: document.getElementById('product-editor-title'),
  formEditProduct: document.getElementById('form-edit-product'),
  editProdId: document.getElementById('edit-prod-id'),
  editProdName: document.getElementById('edit-prod-name'),
  editProdPrice: document.getElementById('edit-prod-price'),
  recipeIngredientsContainer: document.getElementById('recipe-ingredients-container'),
  btnCancelProdEdit: document.getElementById('btn-cancel-prod-edit'),
  btnAddProductUi: document.getElementById('btn-add-product-ui'),

  fixedCostsTable: document.getElementById('fixed-costs-table').querySelector('tbody'),
  totalFixedCostMonthly: document.getElementById('total-fixed-cost-monthly'),
  formAddFixedCost: document.getElementById('form-add-fixed-cost'),
  fcNameInput: document.getElementById('fc-name'),
  fcCostInput: document.getElementById('fc-cost'),
  fcFrequencyInput: document.getElementById('fc-frequency'),

  simQty: document.getElementById('sim-qty'),
  simPrice: document.getElementById('sim-price'),
  lblSimQty: document.getElementById('lbl-sim-qty'),
  lblSimPrice: document.getElementById('lbl-sim-price'),
  resMonthlyQty: document.getElementById('res-monthly-qty'),
  resMonthlyRevenue: document.getElementById('res-monthly-revenue'),
  resMonthlyMaterialsCost: document.getElementById('res-monthly-materials-cost'),
  resMonthlyFixedCost: document.getElementById('res-monthly-fixed-cost'),
  resBreakEven: document.getElementById('res-break-even'),
  resMonthlyProfit: document.getElementById('res-monthly-profit'),

  formSettingsGeneral: document.getElementById('form-settings-general'),
  settingsPriceInput: document.getElementById('settings-price'),
  btnExportDb: document.getElementById('btn-export-db'),
  importDbFile: document.getElementById('import-db-file'),
  btnResetDb: document.getElementById('btn-reset-db'),

  // Elementos del Login
  loginScreen: document.getElementById('login-screen'),
  formLogin: document.getElementById('form-login'),
  loginUsername: document.getElementById('login-username'),
  loginPassword: document.getElementById('login-password'),
  loginError: document.getElementById('login-error'),
  appWrapper: document.getElementById('app-wrapper'),
  btnLogout: document.getElementById('btn-logout'),
  btnThemeToggle: document.getElementById('btn-theme-toggle')
};

// Estado Local
const STATE = {
  currentTab: 'dashboard',
  bcv: {
    rate: 36.58,
    date: '',
    source: 'cache'
  }
};

// Obtener colores dinámicos según el tema actual
function getThemeColors() {
  const isLight = document.body.classList.contains('light-theme');
  return {
    fontFamily: "'Outfit', 'Inter', sans-serif",
    textColor: isLight ? '#5e4953' : '#b5afbc',
    gridColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.07)',
    strawberryRed: '#ff2e5c',
    strawberryRedLight: 'rgba(255, 46, 99, 0.2)',
    creamGold: isLight ? '#d63e65' : '#ffecd2',
    creamGoldLight: isLight ? 'rgba(214, 62, 101, 0.2)' : 'rgba(255, 236, 210, 0.2)',
    profitGreen: isLight ? '#2ed573' : '#00f2fe',
    profitGreenLight: isLight ? 'rgba(46, 213, 115, 0.2)' : 'rgba(0, 242, 254, 0.2)',
    purpleAccent: '#a855f7',
    tooltipBg: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 7, 14, 0.95)',
    tooltipBorder: isLight ? 'rgba(214, 62, 101, 0.2)' : 'rgba(255, 46, 99, 0.2)',
    borderColor: isLight ? '#ffffff' : '#0c070e'
  };
}

// Aplicar el tema seleccionado
function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-theme');
    if (DOM.btnThemeToggle) {
      DOM.btnThemeToggle.innerHTML = '<i data-lucide="moon"></i>';
    }
  } else {
    document.body.classList.remove('light-theme');
    if (DOM.btnThemeToggle) {
      DOM.btnThemeToggle.innerHTML = '<i data-lucide="sun"></i>';
    }
  }
  lucide.createIcons();
}

// Aplicar sesión de usuario
function applySession(session) {
  const isVendedor = session.role === 'vendedor';
  if (isVendedor) {
    document.body.classList.add('role-vendedor');
    STATE.currentTab = 'sales';
  } else {
    document.body.classList.remove('role-vendedor');
    STATE.currentTab = 'dashboard';
  }
  
  // Activar la pestaña correcta
  DOM.navItems.forEach(item => {
    const tab = item.getAttribute('data-tab');
    if (tab === STATE.currentTab) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  DOM.viewPanes.forEach(pane => {
    pane.classList.remove('active');
    if (pane.id === `view-${STATE.currentTab}`) {
      pane.classList.add('active');
    }
  });

  updateHeaderTitles(STATE.currentTab);
  
  // Mostrar app y ocultar login
  DOM.loginScreen.style.display = 'none';
  DOM.appWrapper.style.display = '';
  
  renderActiveTab();
  lucide.createIcons();
}

// Inicialización de la Aplicación
window.addEventListener('load', async () => {
  db.init();
  renderCurrentDate();
  
  // Cargar Tasa BCV
  await refreshBcvRate(false);
  
  // Cargar Tema
  const settings = db.getSettings();
  applyTheme(settings.theme || 'dark');
  
  // Verificar Sesión Activa
  const session = db.getSession();
  if (session) {
    applySession(session);
  } else {
    DOM.loginScreen.style.display = 'flex';
    DOM.appWrapper.style.display = 'none';
  }
  
  setupTabs();
  setupEventListeners();
  
  lucide.createIcons();
});

// Cargar Fecha formateada
function renderCurrentDate() {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const today = new Date();
  DOM.currentDateDisplay.textContent = today.toLocaleDateString('es-ES', options);
}

// Actualizar BCV
async function refreshBcvRate(forceRefresh = false) {
  DOM.sidebarBcvStatus.textContent = 'Actualizando...';
  const bcvData = await api.getBcvRate(forceRefresh);
  STATE.bcv = bcvData;

  DOM.sidebarBcvRate.textContent = `${bcvData.rate.toFixed(2)} VES`;
  
  if (bcvData.source === 'api') {
    DOM.sidebarBcvStatus.textContent = 'Oficial BCV';
    DOM.sidebarBcvStatus.className = 'bcv-status';
  } else if (bcvData.source === 'cache') {
    DOM.sidebarBcvStatus.textContent = 'Oficial BCV (Hoy)';
    DOM.sidebarBcvStatus.className = 'bcv-status';
  } else {
    DOM.sidebarBcvStatus.textContent = 'Tasa Manual / Resp.';
    DOM.sidebarBcvStatus.className = 'bcv-status manual';
  }

  if (DOM.saleBcvInput) {
    DOM.saleBcvInput.value = bcvData.rate.toFixed(2);
  }
  
  if (STATE.currentTab === 'dashboard') {
    renderDashboard();
  }
}

// Configurar Pestañas
function setupTabs() {
  DOM.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.getAttribute('data-tab');
      if (tab === STATE.currentTab) return;

      // Restricción rápida si es vendedor
      const session = db.getSession();
      if (session && session.role === 'vendedor' && tab !== 'sales') {
        return;
      }

      DOM.navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      DOM.viewPanes.forEach(pane => {
        pane.classList.remove('active');
        if (pane.id === `view-${tab}`) {
          pane.classList.add('active');
        }
      });

      STATE.currentTab = tab;
      updateHeaderTitles(tab);
      renderActiveTab();
      
      lucide.createIcons();
    });
  });

  if (DOM.btnQuickSales) {
    DOM.btnQuickSales.addEventListener('click', () => {
      const salesTab = Array.from(DOM.navItems).find(i => i.getAttribute('data-tab') === 'sales');
      if (salesTab) salesTab.click();
    });
  }
}

function updateHeaderTitles(tab) {
  const titles = {
    dashboard: { title: 'Dashboard', sub: 'Resumen rápido y rentabilidad del día.' },
    sales: { title: 'Registros de Ventas', sub: 'Controla las ventas de copas y captura tasas cambiarias automáticamente.' },
    costs: { title: 'Estructura de Costos', sub: 'Administra tus ingredientes (receta) y los gastos operacionales fijos.' },
    analysis: { title: 'Análisis y Proyecciones', sub: 'Gráficos interactivos de ganancias y simulador de punto de equilibrio.' },
    settings: { title: 'Ajustes del Sistema', sub: 'Modifica parámetros base del negocio e importa/exporta tus datos.' }
  };

  if (titles[tab]) {
    DOM.viewTitle.textContent = titles[tab].title;
    DOM.viewSubtitle.textContent = titles[tab].sub;
  }
}

function renderActiveTab() {
  switch (STATE.currentTab) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'sales':
      renderSales();
      break;
    case 'costs':
      renderCosts();
      break;
    case 'analysis':
      renderAnalysis();
      break;
    case 'settings':
      renderSettings();
      break;
  }
}

// --- RENDERS DE CADA VISTA ---

function renderDashboard() {
  const sales = db.getSales();
  const settings = db.getSettings();
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.date === todayStr);

  const totalCupsToday = todaySales.reduce((acc, s) => acc + s.qty, 0);
  const totalUSDToday = todaySales.reduce((acc, s) => acc + s.totalUSD, 0);
  const totalVESToday = todaySales.reduce((acc, s) => acc + s.totalVES, 0);
  
  // Calcular costo real basado en el costo unitario guardado
  const totalCostsToday = todaySales.reduce((acc, s) => acc + (s.qty * (s.unitCostUSD || 0.95)), 0);

  DOM.kpiSalesQty.textContent = `${totalCupsToday} ${totalCupsToday === 1 ? 'copa' : 'copas'}`;
  DOM.kpiSalesCash.textContent = `$${totalUSDToday.toFixed(2)} / ${totalVESToday.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} VES`;

  // Costo promedio hoy o fallback al vaso mediano
  const avgUnitCostToday = totalCupsToday > 0 ? (totalCostsToday / totalCupsToday) : db.calculateProductUnitCost('prod_medium');
  const avgUnitCostTodayVES = avgUnitCostToday * STATE.bcv.rate;
  DOM.kpiCostUsd.textContent = `$${avgUnitCostToday.toFixed(2)}`;
  DOM.kpiCostVes.textContent = `${avgUnitCostTodayVES.toFixed(2)} VES / copa`;

  // Margen de utilidad bruto de hoy
  const totalProfitToday = totalUSDToday - totalCostsToday;
  const marginPercent = totalUSDToday > 0 ? (totalProfitToday / totalUSDToday) * 100 : 0;
  DOM.kpiMarginPercent.textContent = `${marginPercent.toFixed(1)}%`;
  DOM.kpiMarginValue.textContent = `Ganancia de $${totalProfitToday.toFixed(2)} total hoy`;

  const kpiMarginIndicator = DOM.kpiMarginIndicator;
  if (marginPercent >= 60) {
    kpiMarginIndicator.className = 'kpi-indicator positive';
    kpiMarginIndicator.innerHTML = '<i data-lucide="check-circle"></i><span>Excelente margen bruto</span>';
  } else if (marginPercent >= 45) {
    kpiMarginIndicator.className = 'kpi-indicator neutral';
    kpiMarginIndicator.innerHTML = '<i data-lucide="activity"></i><span>Margen saludable</span>';
  } else {
    kpiMarginIndicator.className = 'kpi-indicator negative';
    kpiMarginIndicator.innerHTML = '<i data-lucide="alert-triangle"></i><span>Margen bajo, revisa costos</span>';
  }

  const kpiSalesIndicator = DOM.kpiSalesIndicator;
  if (totalCupsToday >= 35) {
    kpiSalesIndicator.className = 'kpi-indicator positive';
    kpiSalesIndicator.innerHTML = '<i data-lucide="trending-up"></i><span>¡Excelente volumen hoy!</span>';
  } else if (totalCupsToday > 0) {
    kpiSalesIndicator.className = 'kpi-indicator neutral';
    kpiSalesIndicator.innerHTML = '<i data-lucide="check"></i><span>Registrando ventas</span>';
  } else {
    kpiSalesIndicator.className = 'kpi-indicator negative';
    kpiSalesIndicator.innerHTML = '<i data-lucide="alert-circle"></i><span>Sin ventas registradas hoy</span>';
  }

  DOM.dashboardSalesTable.innerHTML = '';
  if (todaySales.length === 0) {
    DOM.dashboardSalesTable.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          No hay ventas registradas el día de hoy. ¡Empieza a vender! 🍓
        </td>
      </tr>
    `;
  } else {
    todaySales.forEach(sale => {
      const timeDisplay = sale.time || '--:--';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${timeDisplay}</td>
        <td><strong>${sale.productName || 'Copa Genérica'}</strong> x${sale.qty}</td>
        <td>${sale.bcvRate.toFixed(2)} VES</td>
        <td>$${sale.totalUSD.toFixed(2)}</td>
        <td>${sale.totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} VES</td>
        <td>
          <button class="btn-danger btn-delete-sale" data-id="${sale.id}">
            <i data-lucide="trash-2"></i>
          </button>
        </td>
      `;
      DOM.dashboardSalesTable.appendChild(tr);
    });

    document.querySelectorAll('.btn-delete-sale').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('¿Deseas eliminar este registro de venta?')) {
          db.deleteSale(id);
          renderDashboard();
          lucide.createIcons();
        }
      });
    });
  }

  const totalFixedCostsMonthly = db.calculateTotalFixedCostsMonthly();
  const fixedCostPerCup = totalFixedCostsMonthly / 900; // Carga fija en base a 30 copas/día promedio
  
  // Utilizar precio promedio hoy o precio por defecto de ajustes
  const avgSellingPrice = totalCupsToday > 0 ? (totalUSDToday / totalCupsToday) : settings.sellingPriceUSD;
  
  charts.renderEstructuraPrecio('chart-estructura-precio', avgUnitCostToday, fixedCostPerCup, avgSellingPrice);
}

function renderSales() {
  const sales = db.getSales();
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  // Rellenar formulario
  DOM.saleDateInput.value = todayStr;
  DOM.saleTimeInput.value = timeStr;
  DOM.saleBcvInput.value = STATE.bcv.rate.toFixed(2);
  DOM.saleQtyInput.value = '';

  // Cargar productos en el selector
  const products = db.getProducts();
  DOM.saleProductSelect.innerHTML = products.map(p => `
    <option value="${p.id}">${p.name} ($${p.priceUSD.toFixed(2)})</option>
  `).join('');

  // Sincronizar precio unitario por defecto
  if (products.length > 0) {
    const defaultProd = products.find(p => p.id === DOM.saleProductSelect.value);
    if (defaultProd) {
      DOM.salePriceInput.value = defaultProd.priceUSD.toFixed(2);
    }
  }

  // Historial
  DOM.salesHistoryTable.innerHTML = '';
  const sortedSales = [...sales].sort((a, b) => {
    const dateDiff = new Date(b.date) - new Date(a.date);
    if (dateDiff !== 0) return dateDiff;
    return (b.time || '').localeCompare(a.time || '');
  });

  if (sortedSales.length === 0) {
    DOM.salesHistoryTable.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          No hay registros de ventas en el historial.
        </td>
      </tr>
    `;
  } else {
    sortedSales.forEach(sale => {
      const dateParts = sale.date.split('-');
      const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
      const timeDisplay = sale.time ? ` ${sale.time}` : '';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formattedDate}${timeDisplay}${sale.isSeed ? ' <span style="font-size:0.65rem; color:var(--text-muted); border:1px solid rgba(255,255,255,0.1); border-radius:3px; padding:1px 3px;">Demo</span>' : ''}</td>
        <td><strong>${sale.productName || 'Copa Genérica'}</strong> x${sale.qty}</td>
        <td>$${sale.priceUSD.toFixed(2)}</td>
        <td>${sale.bcvRate.toFixed(2)} VES</td>
        <td>$${sale.totalUSD.toFixed(2)}</td>
        <td>${sale.totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} VES</td>
        <td>
          <button class="btn-danger btn-delete-sale-hist" data-id="${sale.id}">
            <i data-lucide="trash-2"></i>
          </button>
        </td>
      `;
      DOM.salesHistoryTable.appendChild(tr);
    });

    document.querySelectorAll('.btn-delete-sale-hist').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('¿Eliminar esta venta del historial?')) {
          db.deleteSale(id);
          renderSales();
          lucide.createIcons();
        }
      });
    });
  }
}

function renderCosts() {
  const materials = db.getInventory();
  const fixedCosts = db.getFixedCosts();
  
  // Costo del vaso mediano para mantener consistencia visual en el widget de costo general
  const unitCostUSD = db.calculateProductUnitCost('prod_medium');
  const unitCostVES = unitCostUSD * STATE.bcv.rate;

  DOM.inventoryTable.innerHTML = '';
  materials.forEach(mat => {
    // Uso por Copa Mediana por defecto para la vista de ingredientes general
    const quantityUsedMed = mat.quantityUsedPerUnit;
    const contribution = mat.costUSD * quantityUsedMed;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${mat.name}</strong></td>
      <td>$${mat.costUSD.toFixed(2)}</td>
      <td>por ${mat.unit}</td>
      <td>${quantityUsedMed} ${mat.unit}</td>
      <td style="color: var(--strawberry); font-weight:700;">$${contribution.toFixed(3)}</td>
      <td>
        <button class="btn-secondary btn-icon btn-edit-material" data-id="${mat.id}" title="Editar insumo">
          <i data-lucide="edit"></i>
        </button>
      </td>
    `;
    DOM.inventoryTable.appendChild(tr);
  });

  document.querySelectorAll('.btn-edit-material').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const mat = materials.find(m => m.id === id);
      if (mat) {
        DOM.editMatId.value = mat.id;
        DOM.editMatName.value = mat.name;
        DOM.editMatCost.value = mat.costUSD.toFixed(2);
        DOM.editMatUnit.value = mat.unit;
        DOM.editMatUsed.value = mat.quantityUsedPerUnit;
        DOM.materialEditorTitle.innerHTML = `<i data-lucide="edit-3"></i> Editar Insumo: ${mat.name}`;
        DOM.materialEditorCard.style.border = '1px solid var(--strawberry)';
        lucide.createIcons();
        DOM.materialEditorCard.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  DOM.recipeCostUsd.textContent = `$${unitCostUSD.toFixed(2)}`;
  DOM.recipeCostVes.textContent = `${unitCostVES.toFixed(2)} VES por copa (Vaso Mediano)`;

  // Renderizar la tabla de productos dinámicos
  const products = db.getProducts();
  const productsTableBody = DOM.productsTable.querySelector('tbody');
  
  if (productsTableBody) {
    productsTableBody.innerHTML = '';
    products.forEach(prod => {
      const recipeCost = db.calculateProductUnitCost(prod.id);
      const margin = prod.priceUSD - recipeCost;
      const marginPct = prod.priceUSD > 0 ? (margin / prod.priceUSD) * 100 : 0;
      const isSeeded = ['prod_small', 'prod_medium', 'prod_large'].includes(prod.id);
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${prod.name}</strong></td>
        <td>$${prod.priceUSD.toFixed(2)}</td>
        <td>$${recipeCost.toFixed(2)}</td>
        <td style="color: ${marginPct >= 50 ? 'var(--success)' : 'var(--strawberry)'}; font-weight:700;">
          $${margin.toFixed(2)} (${marginPct.toFixed(1)}%)
        </td>
        <td>
          <button class="btn-secondary btn-icon btn-edit-product" data-id="${prod.id}" title="Editar receta y precio">
            <i data-lucide="edit"></i>
          </button>
          <button class="btn-danger btn-icon btn-delete-product" data-id="${prod.id}" ${isSeeded ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''} title="Eliminar producto">
            <i data-lucide="trash-2"></i>
          </button>
        </td>
      `;
      productsTableBody.appendChild(tr);
    });

    document.querySelectorAll('.btn-edit-product').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const prod = products.find(p => p.id === id);
        if (prod) {
          openProductEditor(prod);
        }
      });
    });

    document.querySelectorAll('.btn-delete-product').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('¿Seguro que deseas eliminar este producto de la tienda?')) {
          db.deleteProduct(id);
          renderCosts();
          lucide.createIcons();
        }
      });
    });
  }

  DOM.fixedCostsTable.innerHTML = '';
  if (fixedCosts.length === 0) {
    DOM.fixedCostsTable.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
          No hay gastos fijos registrados.
        </td>
      </tr>
    `;
  } else {
    fixedCosts.forEach(fc => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fc.name}</td>
        <td>$${fc.costUSD.toFixed(2)}</td>
        <td><span style="font-size:0.75rem; text-transform:uppercase; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px; color:var(--cream-muted);">${fc.frequency}</span></td>
        <td>
          <button class="btn-danger btn-delete-fc" data-id="${fc.id}">
            <i data-lucide="trash-2"></i>
          </button>
        </td>
      `;
      DOM.fixedCostsTable.appendChild(tr);
    });

    document.querySelectorAll('.btn-delete-fc').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('¿Eliminar este gasto fijo?')) {
          db.deleteFixedCost(id);
          renderCosts();
          lucide.createIcons();
        }
      });
    });
  }

  const totalFixedCostUSD = db.calculateTotalFixedCostsMonthly();
  DOM.totalFixedCostMonthly.textContent = `$${totalFixedCostUSD.toFixed(2)}`;
}

// Abrir editor de producto
function openProductEditor(prod = null) {
  DOM.productEditorCard.style.display = 'block';
  const inventory = db.getInventory();
  
  if (prod) {
    DOM.productEditorTitle.innerHTML = `<i data-lucide="edit-3"></i> Editar Producto: ${prod.name}`;
    DOM.editProdId.value = prod.id;
    DOM.editProdName.value = prod.name;
    DOM.editProdPrice.value = prod.priceUSD.toFixed(2);
    
    DOM.recipeIngredientsContainer.innerHTML = inventory.map(mat => {
      const qtyUsed = prod.recipe[mat.id] || 0;
      return `
        <div class="recipe-ingredient-row">
          <label>${mat.name}</label>
          <input type="number" class="input-style recipe-qty-input" data-mat-id="${mat.id}" step="0.0001" min="0" value="${qtyUsed}" style="padding: 6px 10px; width: 120px;" required>
          <span>en ${mat.unit}</span>
        </div>
      `;
    }).join('');
  } else {
    DOM.productEditorTitle.innerHTML = '<i data-lucide="plus-circle"></i> Nuevo Producto';
    DOM.editProdId.value = '';
    DOM.editProdName.value = '';
    DOM.editProdPrice.value = '2.50';
    
    DOM.recipeIngredientsContainer.innerHTML = inventory.map(mat => {
      return `
        <div class="recipe-ingredient-row">
          <label>${mat.name}</label>
          <input type="number" class="input-style recipe-qty-input" data-mat-id="${mat.id}" step="0.0001" min="0" value="0" style="padding: 6px 10px; width: 120px;" required>
          <span>en ${mat.unit}</span>
        </div>
      `;
    }).join('');
  }
  
  lucide.createIcons();
  DOM.productEditorCard.scrollIntoView({ behavior: 'smooth' });
}

function renderAnalysis() {
  const sales = db.getSales();
  const unitCost = db.calculateProductUnitCost('prod_medium');
  const settings = db.getSettings();
  
  charts.renderSalesTrend('chart-sales-trend', sales);
  charts.renderCostVsPrice('chart-cost-vs-price', unitCost, settings.sellingPriceUSD);
  updateProjectionsSimulator();
}

function updateProjectionsSimulator() {
  // Simulador basado en la receta del vaso mediano
  const unitCost = db.calculateProductUnitCost('prod_medium');
  const totalFixedCostsMonthly = db.calculateTotalFixedCostsMonthly();

  const simQtyVal = parseInt(DOM.simQty.value, 10);
  const simPriceVal = parseFloat(DOM.simPrice.value);

  DOM.lblSimQty.textContent = `${simQtyVal} ${simQtyVal === 1 ? 'copa' : 'copas'} / día`;
  DOM.lblSimPrice.textContent = `$${simPriceVal.toFixed(2)} USD`;

  const monthlyQty = simQtyVal * 30;
  const monthlyRevenue = monthlyQty * simPriceVal;
  const monthlyMaterialsCost = monthlyQty * unitCost;
  const monthlyProfit = monthlyRevenue - monthlyMaterialsCost - totalFixedCostsMonthly;

  const unitContribution = simPriceVal - unitCost;
  let breakEvenCups = 0;
  if (unitContribution > 0) {
    breakEvenCups = Math.ceil(totalFixedCostsMonthly / unitContribution);
  }

  DOM.resMonthlyQty.textContent = `${monthlyQty.toLocaleString()} copas`;
  DOM.resMonthlyRevenue.textContent = `$${monthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  DOM.resMonthlyMaterialsCost.textContent = `$${monthlyMaterialsCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  DOM.resMonthlyFixedCost.textContent = `$${totalFixedCostsMonthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  if (unitContribution <= 0) {
    DOM.resBreakEven.textContent = 'Inviable (Precio ≤ Costo)';
    DOM.resBreakEven.style.color = 'var(--danger)';
  } else {
    DOM.resBreakEven.textContent = `${breakEvenCups.toLocaleString()} copas / mes`;
    DOM.resBreakEven.style.color = 'var(--cream)';
  }

  DOM.resMonthlyProfit.textContent = `$${monthlyProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  if (monthlyProfit >= 0) {
    DOM.resMonthlyProfit.style.color = '#00f2fe';
    DOM.resMonthlyProfit.style.textShadow = '0 0 12px rgba(0, 242, 254, 0.25)';
  } else {
    DOM.resMonthlyProfit.style.color = 'var(--danger)';
    DOM.resMonthlyProfit.style.textShadow = 'none';
  }
}

function renderSettings() {
  const settings = db.getSettings();
  DOM.settingsPriceInput.value = settings.sellingPriceUSD.toFixed(2);
}

// --- CONFIGURACIÓN DE ESCUCHADORES DE EVENTOS (EVENT HANDLERS) ---

function setupEventListeners() {
  // Autenticación de Usuarios
  DOM.formLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = DOM.loginUsername.value;
    const password = DOM.loginPassword.value;
    
    const result = db.login(username, password);
    if (result.success) {
      DOM.loginError.style.display = 'none';
      DOM.loginUsername.value = '';
      DOM.loginPassword.value = '';
      applySession(result.session);
    } else {
      DOM.loginError.textContent = result.error;
      DOM.loginError.style.display = 'block';
      // Animación shake
      const card = document.querySelector('.login-card');
      card.style.animation = 'none';
      card.offsetHeight; // forzar reflow
      card.style.animation = 'shake 0.3s ease-in-out';
    }
  });

  DOM.btnLogout.addEventListener('click', () => {
    db.logout();
    document.body.classList.remove('role-vendedor');
    DOM.loginScreen.style.display = 'flex';
    DOM.appWrapper.style.display = 'none';
    DOM.loginUsername.value = '';
    DOM.loginPassword.value = '';
  });

  // Alternar Tema (Claro / Oscuro)
  DOM.btnThemeToggle.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-theme');
    const themeStr = isLight ? 'light' : 'dark';
    db.saveSettings({ theme: themeStr });
    applyTheme(themeStr);
    
    if (STATE.currentTab === 'dashboard') {
      renderDashboard();
    } else if (STATE.currentTab === 'analysis') {
      renderAnalysis();
    }
  });

  // Modal BCV
  DOM.btnOpenBcvModal.addEventListener('click', () => {
    DOM.manualBcvRateInput.value = STATE.bcv.rate.toFixed(2);
    DOM.bcvModal.classList.add('active');
  });

  DOM.btnCloseBcvModal.addEventListener('click', () => {
    DOM.bcvModal.classList.remove('active');
  });

  DOM.bcvModal.addEventListener('click', (e) => {
    if (e.target === DOM.bcvModal) {
      DOM.bcvModal.classList.remove('active');
    }
  });

  DOM.formManualBcv.addEventListener('submit', (e) => {
    e.preventDefault();
    const manualRate = parseFloat(DOM.manualBcvRateInput.value);
    if (!isNaN(manualRate) && manualRate > 0) {
      api.saveManualRate(manualRate);
      refreshBcvRate(false);
      DOM.bcvModal.classList.remove('active');
    }
  });

  DOM.btnFetchBcvAuto.addEventListener('click', async () => {
    DOM.btnFetchBcvAuto.innerHTML = '<i data-lucide="refresh-cw" class="animate-spin"></i> Buscando...';
    lucide.createIcons();
    await refreshBcvRate(true);
    DOM.manualBcvRateInput.value = STATE.bcv.rate.toFixed(2);
    DOM.btnFetchBcvAuto.innerHTML = '<i data-lucide="refresh-cw"></i> Forzar API';
    lucide.createIcons();
  });

  // Nueva Venta
  DOM.formAddSale.addEventListener('submit', (e) => {
    e.preventDefault();
    const productId = DOM.saleProductSelect.value;
    const products = db.getProducts();
    const product = products.find(p => p.id === productId);
    
    if (!product) {
      alert('Por favor selecciona un producto válido.');
      return;
    }

    const qty = parseInt(DOM.saleQtyInput.value, 10);
    const price = parseFloat(DOM.salePriceInput.value);
    const rate = parseFloat(DOM.saleBcvInput.value);
    const date = DOM.saleDateInput.value;
    const time = DOM.saleTimeInput.value;
    const unitCost = db.calculateProductUnitCost(productId);

    if (qty > 0 && price > 0 && rate > 0) {
      db.saveSale(productId, product.name, qty, price, rate, date, time, unitCost);
      alert('¡Venta guardada con éxito! 🍓');
      DOM.saleQtyInput.value = '';
      
      const now = new Date();
      DOM.saleTimeInput.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      renderSales();
    }
  });

  // Cambiar precio sugerido según producto en el select
  DOM.saleProductSelect.addEventListener('change', () => {
    const productId = DOM.saleProductSelect.value;
    const products = db.getProducts();
    const product = products.find(p => p.id === productId);
    if (product) {
      DOM.salePriceInput.value = product.priceUSD.toFixed(2);
    }
  });

  // Editar Insumo
  DOM.formEditMaterial.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = DOM.editMatId.value;
    const name = DOM.editMatName.value;
    const cost = parseFloat(DOM.editMatCost.value);
    const unit = DOM.editMatUnit.value;
    const used = parseFloat(DOM.editMatUsed.value);

    if (id && cost > 0 && used > 0) {
      db.saveMaterial(id, name, cost, unit, used);
      alert(`¡Insumo "${name}" actualizado!`);
      resetMaterialEditor();
      renderCosts();
    }
  });

  DOM.btnCancelMatEdit.addEventListener('click', resetMaterialEditor);

  function resetMaterialEditor() {
    DOM.editMatId.value = '';
    DOM.editMatName.value = '';
    DOM.editMatCost.value = '';
    DOM.editMatUnit.value = '';
    DOM.editMatUsed.value = '';
    DOM.materialEditorTitle.innerHTML = '<i data-lucide="edit"></i> Editar Insumo';
    DOM.materialEditorCard.style.border = '1px solid var(--border-glass)';
    lucide.createIcons();
  }

  // Visual Product Recipe Editor Submit
  DOM.formEditProduct.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = DOM.editProdId.value || null;
    const name = DOM.editProdName.value.trim();
    const price = parseFloat(DOM.editProdPrice.value);
    
    const recipe = {};
    document.querySelectorAll('.recipe-qty-input').forEach(input => {
      const matId = input.getAttribute('data-mat-id');
      const val = parseFloat(input.value);
      if (val >= 0) {
        recipe[matId] = val;
      }
    });

    if (name && price > 0) {
      db.saveProduct(id, name, price, recipe);
      alert(`¡Producto "${name}" registrado correctamente!`);
      DOM.productEditorCard.style.display = 'none';
      renderCosts();
      lucide.createIcons();
    }
  });

  DOM.btnCancelProdEdit.addEventListener('click', () => {
    DOM.productEditorCard.style.display = 'none';
  });

  DOM.btnAddProductUi.addEventListener('click', () => {
    openProductEditor(null);
  });

  // Gasto Fijo
  DOM.formAddFixedCost.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = DOM.fcNameInput.value.trim();
    const cost = parseFloat(DOM.fcCostInput.value);
    const freq = DOM.fcFrequencyInput.value;

    if (name && cost > 0) {
      db.saveFixedCost(null, name, cost, freq);
      alert('¡Gasto Fijo registrado correctamente!');
      DOM.fcNameInput.value = '';
      DOM.fcCostInput.value = '';
      renderCosts();
      lucide.createIcons();
    }
  });

  // Sliders Simulación
  DOM.simQty.addEventListener('input', updateProjectionsSimulator);
  DOM.simPrice.addEventListener('input', updateProjectionsSimulator);

  // Guardar Ajustes
  DOM.formSettingsGeneral.addEventListener('submit', (e) => {
    e.preventDefault();
    const defaultPrice = parseFloat(DOM.settingsPriceInput.value);
    if (defaultPrice > 0) {
      db.saveSettings({ sellingPriceUSD: defaultPrice });
      alert('¡Ajustes generales guardados! 🍓');
    }
  });

  // Exportar / Importar Base de Datos
  DOM.btnExportDb.addEventListener('click', () => {
    db.exportBackup();
  });

  DOM.importDbFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      const res = db.importBackup(evt.target.result);
      if (res.success) {
        alert('¡Base de datos restaurada con éxito! La página se reiniciará.');
        window.location.reload();
      } else {
        alert(`Error al importar: ${res.error}`);
      }
    };
    reader.readAsText(file);
  });

  // Restablecer DB
  DOM.btnResetDb.addEventListener('click', () => {
    if (confirm('¿Seguro que deseas restablecer los datos de prueba históricos? Tus ventas actuales se borrarán.')) {
      db.resetAllData();
      alert('Datos restablecidos con éxito.');
      window.location.reload();
    }
  });
}
