/**
 * api.js
 * Módulo para interactuar con APIs externas.
 * Obtiene el tipo de cambio oficial del BCV (Banco Central de Venezuela) desde DolarApi.com.
 * Incluye lógica de caché por sesión y control de errores robusto.
 */

import { db } from './db.js';

const DOLAR_API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';

export const api = {
  /**
   * Obtiene la tasa del BCV más reciente.
   * Intenta consultar la API pública; si falla o hay problemas de red,
   * utiliza la tasa persistida en la base de datos local como contingencia.
   * 
   * @param {boolean} forceRefresh - Si es true, ignora la caché local del día.
   * @returns {Promise<{ rate: number, date: string, source: 'api' | 'cache' | 'fallback' }>}
   */
  async getBcvRate(forceRefresh = false) {
    const settings = db.getSettings();
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Usar caché si ya se actualizó hoy y no se fuerza la recarga
    if (!forceRefresh && settings.bcvRateDate === todayStr && settings.bcvRate) {
      console.log('BCV Rate cargada de caché local:', settings.bcvRate);
      return {
        rate: settings.bcvRate,
        date: settings.bcvRateDate,
        source: 'cache'
      };
    }

    // 2. Intentar consultar DolarApi.com
    try {
      console.log('Consultando tasa BCV oficial en DolarApi.com...');
      
      // Controlador de tiempo de espera (timeout) de 6 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(DOLAR_API_URL, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && typeof data.promedio === 'number') {
        const freshRate = parseFloat(data.promedio.toFixed(2));
        
        // Guardar en settings para caché
        db.saveSettings({
          bcvRate: freshRate,
          bcvRateDate: todayStr
        });

        console.log('Tasa BCV obtenida con éxito de la API:', freshRate);
        return {
          rate: freshRate,
          date: todayStr,
          source: 'api'
        };
      } else {
        throw new Error('Estructura de respuesta inesperada en DolarApi.');
      }

    } catch (error) {
      console.warn('Error al obtener tasa BCV de la API:', error.message);
      
      // 3. Fallback: Devolver lo que tenemos guardado
      return {
        rate: settings.bcvRate || 36.58, // Tasa de respaldo por defecto si no hay nada
        date: settings.bcvRateDate || todayStr,
        source: 'fallback',
        error: error.message
      };
    }
  },

  /**
   * Permite guardar manualmente una tasa personalizada fijada por el usuario.
   * Esto sobreescribe la caché del día y actualiza la base de datos.
   * 
   * @param {number} rate - La nueva tasa manual.
   * @returns {number}
   */
  saveManualRate(rate) {
    const todayStr = new Date().toISOString().split('T')[0];
    const parsedRate = parseFloat(parseFloat(rate).toFixed(2));
    
    db.saveSettings({
      bcvRate: parsedRate,
      bcvRateDate: todayStr
    });
    
    console.log('Tasa BCV manual guardada localmente:', parsedRate);
    return parsedRate;
  }
};
