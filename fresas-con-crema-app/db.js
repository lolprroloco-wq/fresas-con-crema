/**
 * db.js
 * Capa de Datos (Database Layer) utilizando LocalStorage.
 * Proporciona métodos para registrar ventas, costos, materiales e importar/exportar datos.
 * Incluye un semillero de datos históricos dinámicos para los últimos 7 días.
 */

const STORAGE_KEYS = {
  SALES: 'fresas_sales',
  INVENTORY: 'fresas_inventory',
  FIXED_COSTS: 'fresas_fixed_costs',
  SETTINGS: 'fresas_settings'
};

// --- ESTRUCTURA INICIAL POR DEFECTO (SEMILLERO DE DATOS) ---
const DEFAULT_INVENTORY = [
  { id: '1', name: 'Fresas Frescas', costUSD: 3.5, unit: 'kg', quantityUsedPerUnit: 0.15 }, // 150g por copa
  { id: '2', name: 'Crema de Leche', costUSD: 4.0, unit: 'L', quantityUsedPerUnit: 0.1 },  // 100ml por copa
  { id: '3', name: 'Leche Condensada', costUSD: 3.0, unit: 'Lata (395g)', quantityUsedPerUnit: 0.08 }, // ~30g por copa
  { id: '4', name: 'Envase y Cuchara', costUSD: 0.15, unit: 'Kit', quantityUsedPerUnit: 1.0 } // 1 kit por copa
];

const DEFAULT_FIXED_COSTS = [
  { id: '1', name: 'Renta del Local', costUSD: 120.0, frequency: 'mensual' },
  { id: '2', name: 'Electricidad y Agua', costUSD: 45.0, frequency: 'mensual' },
  { id: '3', name: 'Sueldo de Ayudante', costUSD: 150.0, frequency: 'mensual' }
];

const DEFAULT_SETTINGS = {
  sellingPriceUSD: 3.50, // Precio de venta sugerido por copa
  bcvRate: 36.58, // Tasa BCV inicial por defecto
  bcvRateDate: new Date().toISOString().split('T')[0] // Fecha de la tasa guardada
};

// Generar ventas ficticias para los últimos 7 días
function generateSeedSales() {
  const sales = [];
  const today = new Date();
  const rates = [36.42, 36.45, 36.48, 36.50, 36.50, 36.52, 36.55, 36.58]; // Tasas BCV simuladas
  const baseQty = [24, 28, 45, 52, 32, 27, 35, 15]; // Copas vendidas por día
  
  for (let i = 7; i >= 0; i--) {
    const saleDate = new Date();
    saleDate.setDate(today.getDate() - i);
    const dateStr = saleDate.toISOString().split('T')[0];
    const rate = rates[7 - i] || 36.58;
    const qty = baseQty[7 - i] || 20;
    const priceUSD = 3.50;
    
    sales.push({
      id: `seed_${i}_${Date.now()}`,
      qty: qty,
      priceUSD: priceUSD,
      totalUSD: qty * priceUSD,
      totalVES: qty * priceUSD * rate,
      bcvRate: rate,
      date: dateStr,
      isSeed: true
    });
  }
  return sales;
}

// --- MÉTODOS DE ACCESO Y MANIPULACIÓN ---

export const db = {
  /**
   * Inicializa la base de datos con datos de prueba si está vacía.
   */
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.INVENTORY)) {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(DEFAULT_INVENTORY));
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

  // --- VENTAS ---
  getSales() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES)) || [];
  },

  saveSale(qty, priceUSD, bcvRate, dateStr) {
    const sales = this.getSales();
    const newSale = {
      id: 'sale_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      qty: parseInt(qty, 10),
      priceUSD: parseFloat(priceUSD),
      totalUSD: parseInt(qty, 10) * parseFloat(priceUSD),
      totalVES: parseInt(qty, 10) * parseFloat(priceUSD) * parseFloat(bcvRate),
      bcvRate: parseFloat(bcvRate),
      date: dateStr || new Date().toISOString().split('T')[0]
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

  // --- MATERIALES / INVENTARIO ---
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

  deleteMaterial(id) {
    let materials = this.getInventory();
    materials = materials.filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(materials));
    return true;
  },

  calculateUnitCost() {
    const materials = this.getInventory();
    return materials.reduce((acc, m) => acc + (m.costUSD * m.quantityUsedPerUnit), 0);
  },

  // --- GASTOS FIJOS ---
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
      return acc + c.costUSD; // mensual por defecto
    }, 0);
  },

  // --- SETTINGS (CONFIGURACIÓN) ---
  getSettings() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || DEFAULT_SETTINGS;
  },

  saveSettings(newSettings) {
    const settings = { ...this.getSettings(), ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return settings;
  },

  // --- EXPORTAR E IMPORTAR DATOS (BACKUPS JSON) ---
  exportBackup() {
    const data = {
      sales: this.getSales(),
      inventory: this.getInventory(),
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
        return { success: true };
      }
      return { success: false, error: 'Estructura de archivo de respaldo inválida.' };
    } catch (e) {
      return { success: false, error: 'El archivo no contiene un JSON válido.' };
    }
  },

  resetAllData() {
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.INVENTORY);
    localStorage.removeItem(STORAGE_KEYS.FIXED_COSTS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    this.init();
    return true;
  }
};
