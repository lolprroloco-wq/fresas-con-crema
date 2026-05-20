# FresaConta 🍓📈 | Contabilidad, Ventas y Costos de Fresas con Crema

¡Bienvenido a **FresaConta**! Una herramienta premium de contabilidad y proyecciones diseñada de forma específica y a medida para negocios de **Fresas con Crema**. 

Esta aplicación está optimizada con un diseño visual espectacular de alto impacto (**Strawberry Velvet Dark Mode**), diseño responsivo avanzado (móvil y escritorio), integración en tiempo real con el tipo de cambio oficial del BCV (Banco Central de Venezuela) y análisis estadísticos completos mediante gráficos dinámicos animados.

---

## ✨ Características Clave

1. **Dashboard Financiero de Hoy:** Monitorea de un vistazo rápido tus ventas totales del día (en copas, USD y VES), tu margen de utilidad bruta acumulado y el costo total de los materiales consumidos hoy.
2. **Registro de Ventas Inteligente:** Ingresa de manera sencilla las copas vendidas. El sistema captura la tasa oficial del BCV en tiempo real de forma automática en segundo plano y calcula los totales tanto en dólares como en bolívares.
3. **Control de Receta / Insumos:** Define el costo de compra de tus ingredientes (Fresas, Crema de leche, Leche condensada, Envases) y la cantidad precisa que requiere cada copa de fresas con crema. La app calcula el **Costo Unitario de Materiales** en tiempo real.
4. **Registro de Gastos Fijos:** Registra de manera sencilla alquileres, sueldos y servicios de tu local.
5. **Simulador de Proyecciones Interactivo:** Ajusta mediante barras deslizantes tu meta de copas vendidas diarias y tu precio de venta unitario. Ve proyectarse al instante tus ingresos, costos de insumos, costos fijos operacionales, tu **Utilidad Neta Mensual** y tu **Punto de Equilibrio (Break-even)**.
6. **Portabilidad de Datos (Respaldo JSON):** Exporta toda tu base de datos a un archivo JSON con un solo clic y restáurala en cualquier dispositivo (computadora, Android o iPhone) para sincronizar tu contabilidad sin pagar costosos servidores.
7. **Diseño Móvil y Responsive de Vidrio:** Barra lateral de control en escritorio y barra flotante táctil inferior en móviles para una navegación ergonómica en el día a día de tu negocio.

---

## 🛠️ Estructura del Código (Arquitectura Limpia No-Build)

El proyecto está diseñado bajo una **arquitectura estática modular**, eliminando la necesidad de compiladores o dependencias locales pesadas:

- [index.html](file:///C:/Users/Usuario/.gemini/antigravity/scratch/fresas-con-crema-app/index.html): Esqueleto semántico, importación de fuentes modernas (Outfit/Inter), Chart.js y Lucide Icons vía CDN.
- [style.css](file:///C:/Users/Usuario/.gemini/antigravity/scratch/fresas-con-crema-app/style.css): Sistema de diseño de modo oscuro con degradados en colores fresa, glassmorphic blur y reglas responsive avanzadas.
- [db.js](file:///C:/Users/Usuario/.gemini/antigravity/scratch/fresas-con-crema-app/db.js): Capa de datos en LocalStorage con semillero dinámico automático de 7 días.
- [api.js](file:///C:/Users/Usuario/.gemini/antigravity/scratch/fresas-con-crema-app/api.js): Cliente HTTP con resiliencia y caché diaria para la tasa oficial BCV de DolarApi.com.
- [charts.js](file:///C:/Users/Usuario/.gemini/antigravity/scratch/fresas-con-crema-app/charts.js): Capa gráfica optimizada en color morado, rosa fresa y verde neón.
- [app.js](file:///C:/Users/Usuario/.gemini/antigravity/scratch/fresas-con-crema-app/app.js): Controlador principal de lógica de negocio, formularios e interacción.
- [vercel.json](file:///C:/Users/Usuario/.gemini/antigravity/scratch/fresas-con-crema-app/vercel.json): Configuración de cabeceras para despliegue de alta eficiencia en Vercel.

---

## 🚀 Cómo Ejecutar el Proyecto Localmente

Debido a que el código utiliza **módulos de JavaScript nativos** (`type="module"`), por seguridad los navegadores modernos restringen la carga de estos archivos directamente con el protocolo `file://` (hacer doble clic directo sobre `index.html` puede dar un error de CORS). 

Para abrirlo localmente en tu computadora de forma perfecta, utiliza cualquiera de estos dos métodos sencillos:

### Método A: Extensión de Navegador o Editor (Súper fácil)
Si utilizas **VS Code**, simplemente instala la extensión **Live Server** y haz clic en **"Go Live"** en la parte inferior. Esto abrirá la app en `http://5500`.

### Método B: Servidor Local Rápido (Línea de Comandos)
Si tienes Python instalado, abre una terminal en la carpeta del proyecto y escribe:
```bash
python -m http.server 8000
```
Y abre tu navegador en `http://localhost:8000`.

---

## ⚡ Guía de Despliegue en Vercel (En 10 Segundos)

Vercel permite desplegar aplicaciones estáticas de forma 100% gratuita y sin límites de tiempo. Sigue cualquiera de estos métodos para tener tu app online:

### Método Estilo Drag & Drop (El más rápido y sin código)
1. Entra a tu cuenta en [vercel.com](https://vercel.com) (puedes registrarte gratis con tu correo).
2. Ve a tu panel (Dashboard) y entra a [vercel.com/import/project](https://vercel.com/import/project) o simplemente navega a tu área de proyectos.
3. Busca la sección **Vercel Ship** o arrastra y suelta tu carpeta entera `fresas-con-crema-app` directamente sobre la zona de arrastre del navegador en la web de Vercel.
4. **¡Listo!** En 10 segundos Vercel te dará un enlace público seguro (`https://tu-proyecto.vercel.app`) que podrás abrir en tu teléfono, computadora o compartir con tus socios.

### Método Mediante Git / GitHub
1. Sube esta carpeta a un repositorio en tu cuenta de GitHub (puedes crearlo privado).
2. En Vercel, selecciona **"Add New Project"** y conecta tu cuenta de GitHub.
3. Importa el repositorio de `fresas-con-crema-app`.
4. Deja la configuración por defecto (Vercel detecta automáticamente que es un proyecto estático) y haz clic en **"Deploy"**.
5. ¡Cada vez que subas cambios a GitHub, tu página en Vercel se actualizará sola!
