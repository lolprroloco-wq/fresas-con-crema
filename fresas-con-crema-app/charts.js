/**
 * charts.js
 * Módulo para gestionar y renderizar gráficos interactivos utilizando Chart.js.
 * Implementa una visualización premium optimizada para el modo oscuro (Strawberry Velvet)
 * y limpia las instancias antiguas para prevenir superposiciones visuales.
 */

// Objeto para almacenar las instancias activas de los gráficos
const chartInstances = {};

// Configuración de estilo global para los gráficos (Modo Oscuro Premium)
const THEME = {
  fontFamily: "'Outfit', 'Inter', sans-serif",
  textColor: '#b5afbc',
  gridColor: 'rgba(255, 255, 255, 0.07)',
  strawberryRed: '#ff2e5c',
  strawberryRedLight: 'rgba(255, 46, 99, 0.2)',
  creamGold: '#ffecd2',
  creamGoldLight: 'rgba(255, 236, 210, 0.2)',
  profitGreen: '#00f2fe',
  profitGreenLight: 'rgba(0, 242, 254, 0.2)',
  purpleAccent: '#a855f7',
  tooltipBg: 'rgba(15, 7, 14, 0.95)',
  tooltipBorder: 'rgba(255, 46, 99, 0.2)'
};

/**
 * Destruye una instancia de gráfico existente para evitar errores de renderizado.
 */
function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

export const charts = {
  /**
   * Renderiza el gráfico de tendencia de ventas (Línea elegante).
   */
  renderSalesTrend(canvasId, sales) {
    destroyChart(canvasId);
    
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Procesar últimos 7 registros ordenados por fecha
    const sortedSales = [...sales]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-7);

    const labels = sortedSales.map(s => {
      const dateParts = s.date.split('-');
      return `${dateParts[2]}/${dateParts[1]}`; // DD/MM
    });
    
    const dataCups = sortedSales.map(s => s.qty);
    const dataRevenue = sortedSales.map(s => s.totalUSD);

    const ctx = canvas.getContext('2d');
    
    // Crear degradado para el área de relleno
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(255, 46, 99, 0.35)');
    gradient.addColorStop(1, 'rgba(255, 46, 99, 0.00)');

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Copas Vendidas',
          data: dataCups,
          borderColor: THEME.strawberryRed,
          backgroundColor: gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: THEME.strawberryRed,
          pointBorderColor: '#0c070e',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          yAxisID: 'y'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: THEME.tooltipBg,
            titleFont: { family: THEME.fontFamily, size: 13, weight: 'bold' },
            bodyFont: { family: THEME.fontFamily, size: 12 },
            borderColor: THEME.tooltipBorder,
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            displayColors: false
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: THEME.textColor,
              font: { family: THEME.fontFamily, size: 11 }
            }
          },
          y: {
            grid: {
              color: THEME.gridColor
            },
            ticks: {
              color: THEME.textColor,
              font: { family: THEME.fontFamily, size: 11 },
              precision: 0
            },
            title: {
              display: true,
              text: 'Cantidad (unidades)',
              color: THEME.textColor,
              font: { family: THEME.fontFamily, size: 12 }
            }
          }
        }
      }
    });
  },

  /**
   * Renderiza el gráfico de Costo vs. Precio (Barras de comparación).
   */
  renderCostVsPrice(canvasId, unitCost, sellingPrice) {
    destroyChart(canvasId);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const margin = sellingPrice - unitCost;
    const marginPercent = ((margin / sellingPrice) * 100).toFixed(1);

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Costo Receta', 'Precio Venta', 'Margen Bruto'],
        datasets: [{
          data: [unitCost, sellingPrice, margin],
          backgroundColor: [
            THEME.creamGold,
            THEME.strawberryRed,
            THEME.profitGreen
          ],
          borderRadius: 6,
          barPercentage: 0.6,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: THEME.tooltipBg,
            titleFont: { family: THEME.fontFamily, size: 13, weight: 'bold' },
            bodyFont: { family: THEME.fontFamily, size: 12 },
            borderColor: THEME.tooltipBorder,
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
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
            grid: {
              display: false
            },
            ticks: {
              color: THEME.textColor,
              font: { family: THEME.fontFamily, size: 11, weight: 'bold' }
            }
          },
          y: {
            grid: {
              color: THEME.gridColor
            },
            ticks: {
              color: THEME.textColor,
              font: { family: THEME.fontFamily, size: 11 },
              callback: function(value) {
                return '$' + value.toFixed(2);
              }
            }
          }
        }
      }
    });
  },

  /**
   * Renderiza el gráfico de Estructura de Ingresos (Dona premium).
   * Muestra cómo se reparte el precio de una copa.
   */
  renderEstructuraPrecio(canvasId, costMaterial, fixedCostPerCup, sellingPrice) {
    destroyChart(canvasId);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Calcular ganancia neta estimada por copa
    const netProfit = Math.max(0, sellingPrice - costMaterial - fixedCostPerCup);
    const loss = Math.max(0, (costMaterial + fixedCostPerCup) - sellingPrice);
    
    const labels = ['Costo Materiales', 'Carga Costos Fijos', netProfit > 0 ? 'Ganancia Neta' : 'Pérdida'];
    const data = [costMaterial, fixedCostPerCup, netProfit > 0 ? netProfit : loss];
    const colors = [
      THEME.creamGold,
      THEME.purpleAccent,
      netProfit > 0 ? THEME.profitGreen : THEME.strawberryRed
    ];

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#0c070e',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: THEME.textColor,
              font: { family: THEME.fontFamily, size: 11 },
              padding: 12
            }
          },
          tooltip: {
            backgroundColor: THEME.tooltipBg,
            titleFont: { family: THEME.fontFamily, size: 13, weight: 'bold' },
            bodyFont: { family: THEME.fontFamily, size: 12 },
            borderColor: THEME.tooltipBorder,
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const pct = ((context.raw / total) * 100).toFixed(1);
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
