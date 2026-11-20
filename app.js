/* ==========================================================
   Escandon — app.js
   100% Mobile-First · Tap-to-Select · KDS PIN Lock (12345)
   + 4-State Real-Time Client Tracker with LED Indicator
   + Live In-App Push Alerts & "Listo" Chime Sound
   ========================================================== */

'use strict';

// ══════════════════════════════════════════════
//  CONFIGURACIÓN DE NUBE, MULTI-TENANT Y SEGURIDAD KDS
// ══════════════════════════════════════════════
const KDS_REQUIRED_PIN = '12345';

const CLOUD_CONFIG = {
  channelNamespace: 'escandon-kds-live-mx-v1',
  mqttBrokers: [
    'wss://broker.emqx.io:8084/mqtt',
    'wss://broker.hivemq.com:8884/mqtt',
  ],
  // Base de datos en la nube (Firebase Realtime Database)
  firebaseDatabaseURL: 'https://escandon-taquerias-default-rtdb.firebaseio.com/',
};

// Catálogo de inquilinos (Multi-Tenant SaaS). Cualquier slug nuevo también se aísla automáticamente.
const TENANT_PROFILES = {
  'escandon': {
    id: 'escandon',
    name: 'Escandon',
    accent: '#ff6b1a',
    accentSoft: 'rgba(255, 107, 26, 0.12)',
    pin: '12345',
    stripeAccountId: 'acct_1QEscandonMX01',
    deliveryFee: 25,
  },
  'tacos-rey': {
    id: 'tacos-rey',
    name: 'Tacos Rey',
    accent: '#f59e0b',
    accentSoft: 'rgba(245, 158, 11, 0.14)',
    pin: '12345',
    stripeAccountId: 'acct_1QTacosReyMX02',
    deliveryFee: 25,
  },
  'pescaderia-mar': {
    id: 'pescaderia-mar',
    name: 'Pescadería Mar',
    accent: '#0ea5e9',
    accentSoft: 'rgba(14, 165, 233, 0.14)',
    pin: '12345',
    stripeAccountId: 'acct_1QPescaderiaMX03',
    deliveryFee: 25,
  },
};

// Metadatos de los 4 estados del pedido y colores de LED
const STATUS_META = {
  pending: {
    stepIndex: 0,
    label: 'Pendiente',
    ledClass: 'led-pending',
    desc: 'Tu orden fue enviada y espera confirmación de cocina.',
    pushTitle: 'ORDEN ENVIADA',
    pushMsg: 'Tu pedido está pendiente de recepción',
  },
  received: {
    stepIndex: 1,
    label: 'Recibido',
    ledClass: 'led-received',
    desc: 'La cocina ya recibió tu pedido y pronto comenzará a prepararlo.',
    pushTitle: 'PEDIDO RECIBIDO',
    pushMsg: 'Tu pedido fue recibido en cocina',
  },
  preparing: {
    stepIndex: 2,
    label: 'En preparación',
    ledClass: 'led-preparing',
    desc: 'Estamos preparando tus alimentos al momento.',
    pushTitle: 'EN COCINA',
    pushMsg: 'Tu pedido está en preparación',
  },
  ready: {
    stepIndex: 3,
    label: 'Listo',
    ledClass: 'led-ready',
    desc: '¡Tu pedido está listo! Ya puedes pasar a recogerlo.',
    pushTitle: '¡PEDIDO LISTO!',
    pushMsg: '¡Tu pedido está listo para recoger!',
  },
};

const ORDER_PHASES = ['pending', 'received', 'preparing', 'ready'];

// ══════════════════════════════════════════════
//  ILUSTRACIONES VECTORIALES LIMPIAS (ESTILO HÍBRIDO)
// ══════════════════════════════════════════════
const INGREDIENT_ART = {
  tortilla_sencilla: `
    <svg viewBox="0 0 80 60">
      <defs>
        <radialGradient id="gTort1" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stop-color="#f3d58d"/>
          <stop offset="75%" stop-color="#dfb45b"/>
          <stop offset="100%" stop-color="#c49438"/>
        </radialGradient>
      </defs>
      <ellipse cx="40" cy="30" rx="30" ry="19" fill="url(#gTort1)" stroke="#b38328" stroke-width="1.5"/>
      <circle cx="28" cy="25" r="2" fill="#b8872d" opacity="0.55"/>
      <circle cx="49" cy="34" r="2.4" fill="#b8872d" opacity="0.5"/>
      <circle cx="36" cy="37" r="1.5" fill="#b8872d" opacity="0.5"/>
    </svg>`,
  tortilla_doble: `
    <svg viewBox="0 0 80 60">
      <ellipse cx="36" cy="33" rx="28" ry="18" fill="#d3a347" stroke="#9e7019" stroke-width="1.5"/>
      <ellipse cx="45" cy="27" rx="28" ry="18" fill="#f1d082" stroke="#b38328" stroke-width="1.5"/>
      <circle cx="38" cy="23" r="2" fill="#b8872d" opacity="0.55"/>
      <circle cx="53" cy="31" r="2.2" fill="#b8872d" opacity="0.5"/>
    </svg>`,
  bistec: `
    <svg viewBox="0 0 80 60">
      <g fill="#6e3b23" stroke="#472211" stroke-width="1.2">
        <rect x="16" y="22" width="16" height="11" rx="4" transform="rotate(-8 24 27)"/>
        <rect x="30" y="17" width="18" height="12" rx="4" transform="rotate(6 39 23)"/>
        <rect x="44" y="24" width="17" height="11" rx="4" transform="rotate(-5 52 29)"/>
        <rect x="23" y="30" width="19" height="11" rx="4" transform="rotate(4 32 35)"/>
        <rect x="39" y="31" width="16" height="10" rx="4" transform="rotate(-6 47 36)"/>
      </g>
      <path d="M20 26 l8 0 M34 22 l10 1 M27 35 l9 0" stroke="#9c5b3b" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
  longaniza: `
    <svg viewBox="0 0 80 60">
      <g fill="#a92f1d" stroke="#6b180c" stroke-width="1.2">
        <circle cx="24" cy="28" r="7"/>
        <circle cx="35" cy="23" r="7.5"/>
        <circle cx="47" cy="25" r="7"/>
        <circle cx="55" cy="33" r="6.5"/>
        <circle cx="31" cy="35" r="7.5"/>
        <circle cx="43" cy="36" r="7"/>
      </g>
      <g fill="#d96548" opacity="0.65">
        <circle cx="23" cy="26" r="2"/>
        <circle cx="36" cy="21" r="2.2"/>
        <circle cx="45" cy="34" r="2"/>
      </g>
    </svg>`,
  cilantro: `
    <svg viewBox="0 0 80 60">
      <g fill="#3ca355" stroke="#1e6430" stroke-width="1.1">
        <path d="M26 34 C20 26, 26 18, 33 24 C38 18, 44 26, 37 33 Z"/>
        <path d="M42 38 C36 30, 42 22, 49 28 C54 22, 60 30, 53 37 Z"/>
        <path d="M32 42 C26 35, 32 28, 38 33 C43 28, 49 35, 42 41 Z"/>
      </g>
    </svg>`,
  cebolla: `
    <svg viewBox="0 0 80 60">
      <g fill="#f4f1fa" stroke="#b9accf" stroke-width="1.3">
        <rect x="20" y="22" width="11" height="10" rx="2" transform="rotate(-12 25 27)"/>
        <rect x="34" y="18" width="12" height="11" rx="2" transform="rotate(8 40 23)"/>
        <rect x="47" y="24" width="11" height="10" rx="2" transform="rotate(-6 52 29)"/>
        <rect x="27" y="32" width="12" height="10" rx="2" transform="rotate(10 33 37)"/>
        <rect x="41" y="33" width="11" height="10" rx="2" transform="rotate(-9 46 38)"/>
      </g>
    </svg>`,
  salsa_roja: `
    <svg viewBox="0 0 80 60">
      <path d="M18 30 C18 19, 34 15, 43 20 C54 16, 64 25, 60 35 C57 44, 41 46, 31 42 C21 43, 17 36, 18 30 Z"
            fill="#d63222" stroke="#8f1b10" stroke-width="1.5"/>
      <circle cx="34" cy="27" r="2" fill="#f7b267"/>
      <circle cx="46" cy="33" r="1.8" fill="#f7b267"/>
      <circle cx="48" cy="25" r="1.5" fill="#f7b267"/>
    </svg>`,
  ketchup: `
    <svg viewBox="0 0 80 60">
      <path d="M14 34 Q23 18, 31 33 T48 31 T66 29" fill="none" stroke="#8c140b" stroke-width="8" stroke-linecap="round"/>
      <path d="M14 33 Q23 17, 31 32 T48 30 T66 28" fill="none" stroke="#e02b1d" stroke-width="5.5" stroke-linecap="round"/>
    </svg>`,
  mayonesa: `
    <svg viewBox="0 0 80 60">
      <path d="M14 32 Q24 19, 33 33 T50 30 T66 31" fill="none" stroke="#b8ae93" stroke-width="8" stroke-linecap="round"/>
      <path d="M14 31 Q24 18, 33 32 T50 29 T66 30" fill="none" stroke="#fbf6e6" stroke-width="5.5" stroke-linecap="round"/>
    </svg>`,
  mostaza: `
    <svg viewBox="0 0 80 60">
      <path d="M14 33 Q23 18, 32 33 T49 31 T66 29" fill="none" stroke="#9e7408" stroke-width="8" stroke-linecap="round"/>
      <path d="M14 32 Q23 17, 32 32 T49 30 T66 28" fill="none" stroke="#f5c427" stroke-width="5.5" stroke-linecap="round"/>
    </svg>`,
  chiles: `
    <svg viewBox="0 0 80 60">
      <g stroke="#2c5919" stroke-width="1.5">
        <circle cx="26" cy="30" r="10" fill="#639e3d"/>
        <circle cx="26" cy="30" r="5.5" fill="#9bc96d"/>
        <circle cx="44" cy="26" r="10" fill="#579133"/>
        <circle cx="44" cy="26" r="5.5" fill="#9bc96d"/>
        <circle cx="52" cy="36" r="9" fill="#639e3d"/>
        <circle cx="52" cy="36" r="5" fill="#9bc96d"/>
      </g>
    </svg>`,
  tomate: `
    <svg viewBox="0 0 80 60">
      <g fill="#e03c2b" stroke="#961d11" stroke-width="1.3">
        <rect x="19" y="23" width="12" height="11" rx="3" transform="rotate(-10 25 28)"/>
        <rect x="34" y="19" width="13" height="11" rx="3" transform="rotate(7 40 24)"/>
        <rect x="47" y="25" width="12" height="11" rx="3" transform="rotate(-6 53 30)"/>
        <rect x="28" y="32" width="13" height="11" rx="3" transform="rotate(5 34 37)"/>
      </g>
    </svg>`,
};

// ══════════════════════════════════════════════
//  REGLAS DE PRECIOS FIJOS INTACTAS ($28 / $35 / BEBIDAS)
// ══════════════════════════════════════════════
const TACO_FIXED_PRICE   = 28;
const HOTDOG_FIXED_PRICE = 35;

const TACO_CONFIG = {
  basePrice: TACO_FIXED_PRICE,
  base: [
    { id: 'sencilla', name: 'Tortilla Sencilla', shortLabel: 'sencillo', price: 0, art: INGREDIENT_ART.tortilla_sencilla },
    { id: 'doble',    name: 'Tortilla Doble',    shortLabel: 'doble',    price: 0, art: INGREDIENT_ART.tortilla_doble },
  ],
  protein: [
    { id: 'bistec',    name: 'Bistec',    shortLabel: 'bistec',    price: 0, art: INGREDIENT_ART.bistec },
    { id: 'longaniza', name: 'Longaniza', shortLabel: 'longaniza', price: 0, art: INGREDIENT_ART.longaniza },
  ],
  toppings: [
    { id: 'cilantro',   name: 'Cilantro',   shortLabel: 'cilantro',   price: 0, art: INGREDIENT_ART.cilantro },
    { id: 'cebolla',    name: 'Cebolla',    shortLabel: 'cebolla',    price: 0, art: INGREDIENT_ART.cebolla },
    { id: 'salsa_roja', name: 'Salsa Roja', shortLabel: 'salsa roja', price: 0, art: INGREDIENT_ART.salsa_roja },
  ],
};

const HOTDOG_CONFIG = {
  basePrice: HOTDOG_FIXED_PRICE,
  toppings: [
    { id: 'ketchup',  name: 'Ketchup',        shortLabel: 'ketchup',        price: 0, art: INGREDIENT_ART.ketchup },
    { id: 'mayonesa', name: 'Mayonesa',       shortLabel: 'mayonesa',       price: 0, art: INGREDIENT_ART.mayonesa },
    { id: 'mostaza',  name: 'Mostaza',        shortLabel: 'mostaza',        price: 0, art: INGREDIENT_ART.mostaza },
    { id: 'chiles',   name: 'Chiles curados', shortLabel: 'chiles curados', price: 0, art: INGREDIENT_ART.chiles },
    { id: 'tomate',   name: 'Tomate',         shortLabel: 'tomate',         price: 0, art: INGREDIENT_ART.tomate },
    { id: 'cebolla',  name: 'Cebolla',        shortLabel: 'cebolla',        price: 0, art: INGREDIENT_ART.cebolla },
  ],
};

const DRINKS_CONFIG = [
  { id: 'drink_jamaica',  name: 'Agua de Jamaica (500ml)',      price: 25, emoji: '🌺' },
  { id: 'drink_horchata', name: 'Agua de Horchata (500ml)',     price: 25, emoji: '🥛' },
  { id: 'drink_coca',     name: 'Coca-Cola (Retornable 500ml)', price: 30, emoji: '🥤' },
];

// ══════════════════════════════════════════════
//  ESTADO DE LA APLICACIÓN
// ══════════════════════════════════════════════
let currentView    = 'landing'; // 'landing' | 'client' | 'kitchen'
let clientMode     = 'menu';    // 'menu' | 'tracker'
let currentStation = null;      // 'taco' | 'hotdog'
let presetTableFromURL = '';

let tacoDraft = {
  tortilla: 'sencilla',
  protein: null,
  toppings: [],
};

let hotdogDraft = {
  toppings: [],
};

let cartItems            = []; // [{ key, name, emoji, price, qty, station }]
let orders               = []; // Comandas activas sincronizadas
let completedOrders      = []; // Pedidos marcados como "Listo" y entregados en el turno actual
let soldOutItems         = []; // Claves de ingredientes/bebidas agotados (Modo 86)
let serviceCalls         = []; // Solicitudes activas de mesa (Llamar mesero / Pedir cuenta)
let myOrderIds           = []; // IDs de órdenes creadas por este cliente
let activeTrackedOrderId = null;
let cartOpen             = false;
let kdsFilter            = 'all';
let kdsSubView           = 'comandas'; // 'comandas' | 'sales' | 'stock' | 'qrs'
let orderCounter         = 0;
let kdsUnlocked          = false;
let upsellOfferedForCart = false;
let pendingServiceType   = null; // 'waiter' | 'bill_individual' | 'bill_table'
let currentGuestName     = '';   // Nombre del comensal en este dispositivo (ej: 'Ana')
let trackerSplitMode     = 'mine'; // 'mine' (Mi Cuenta) | 'table' (Toda la Mesa)

const DEVICE_ID = 'dev_' + Math.random().toString(36).slice(2, 10);

// ══════════════════════════════════════════════
//  SISTEMA DE AUDIO WEB (CAMPANILLA SOLO EN "LISTO")
// ══════════════════════════════════════════════
let sharedAudioCtx = null;

function unlockAudioContext() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }
  } catch (e) {}
}

// Sonido corto y agradable ("ding" armónico) ÚNICAMENTE cuando el pedido pasa a "Listo"
function playClientReadyDing() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
    if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();

    const now = sharedAudioCtx.currentTime;

    // Primer tono suave (Do6 - 1046.5 Hz)
    const osc1  = sharedAudioCtx.createOscillator();
    const gain1 = sharedAudioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.22, now + 0.015);
    gain1.gain.exponentialRampToValueAtTime(0.0008, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(sharedAudioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.46);

    // Segundo tono brillante tipo campanilla (Mi6 - 1318.5 Hz)
    const osc2  = sharedAudioCtx.createOscillator();
    const gain2 = sharedAudioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.5, now + 0.11);
    gain2.gain.setValueAtTime(0.001, now + 0.11);
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.13);
    gain2.gain.exponentialRampToValueAtTime(0.0008, now + 0.72);
    osc2.connect(gain2);
    gain2.connect(sharedAudioCtx.destination);
    osc2.start(now + 0.11);
    osc2.stop(now + 0.75);
  } catch (e) {}
}

// Aviso discreto para el cocinero en KDS cuando entra una comanda nueva
function playKitchenBell() {
  if (currentView !== 'kitchen' || !kdsUnlocked) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
    if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();

    const now = sharedAudioCtx.currentTime;
    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(sharedAudioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
  } catch (e) {}
}

// Timbre triple más llamativo cuando una mesa llama al mesero o pide la cuenta
function playKitchenServiceAlertSound() {
  if (currentView !== 'kitchen' || !kdsUnlocked) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
    if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();

    const now = sharedAudioCtx.currentTime;
    [987.77, 1318.51, 987.77].forEach((freq, idx) => {
      const start = now + idx * 0.14;
      const osc  = sharedAudioCtx.createOscillator();
      const gain = sharedAudioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.26, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);
      osc.connect(gain);
      gain.connect(sharedAudioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.135);
    });
  } catch (e) {}
}

// Desbloquear audio en el primer toque del usuario en móvil
document.addEventListener('touchstart', unlockAudioContext, { once: true, passive: true });
document.addEventListener('click', unlockAudioContext, { once: true });

// ══════════════════════════════════════════════
//  4. ALERTAS VISUALES EN TIEMPO REAL (PUSH IN-APP)
// ══════════════════════════════════════════════
let pushHideTimer = null;
const notifiedServiceCallIds = new Set();

function showCustomPushBanner({ ledClass = 'led-preparing', kicker = 'AVISO EN VIVO', message = '' }) {
  const bannerEl = document.getElementById('status-push-banner');
  const dotEl    = document.getElementById('push-led-dot');
  const kickerEl = document.getElementById('push-kicker');
  const msgEl    = document.getElementById('push-message');

  if (bannerEl && dotEl && kickerEl && msgEl) {
    dotEl.className = `led-dot ${ledClass}`;
    kickerEl.textContent = kicker;
    msgEl.textContent = message;

    bannerEl.classList.add('show');
    if (pushHideTimer) clearTimeout(pushHideTimer);
    pushHideTimer = setTimeout(() => {
      bannerEl.classList.remove('show');
    }, 5000);
  }
}

function checkAndNotifyNewServiceCalls() {
  if (!Array.isArray(serviceCalls) || serviceCalls.length === 0) return;
  let newestUnseen = null;
  serviceCalls.forEach(c => {
    if (c && c.id && !notifiedServiceCallIds.has(c.id)) {
      if (currentView === 'kitchen' && kdsUnlocked) {
        notifiedServiceCallIds.add(c.id);
        newestUnseen = c;
      }
    }
  });

  if (newestUnseen && currentView === 'kitchen' && kdsUnlocked) {
    const isBill = newestUnseen.type === 'bill';
    showCustomPushBanner({
      ledClass: isBill ? 'led-received' : 'led-preparing',
      kicker: isBill ? '🧾 SOLICITUD DE CUENTA EN MESA' : '🔔 LLAMADA DE MESERO EN MESA',
      message: isBill
        ? `${newestUnseen.table} pide la cuenta${newestUnseen.total ? ` ($${newestUnseen.total})` : ''}`
        : `${newestUnseen.table} solicita al mesero en su mesa`,
    });
    playKitchenServiceAlertSound();
  }
}

function showStatusPushNotification(newStatus, orderNum) {
  const meta = STATUS_META[newStatus];
  if (!meta) return;

  showCustomPushBanner({
    ledClass: meta.ledClass,
    kicker: `ORDEN #${String(orderNum).padStart(3, '0')} · ${meta.pushTitle}`,
    message: meta.pushMsg,
  });

  // Sonido corto y agradable ÚNICAMENTE cuando alcanza "Listo"
  if (newStatus === 'ready') {
    playClientReadyDing();
  }

  // Notificación nativa del navegador si el cliente dio permiso
  if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
    try {
      new Notification(`Escandon · Orden #${String(orderNum).padStart(3, '0')}`, {
        body: meta.pushMsg,
      });
    } catch (e) {}
  }
}

function notifyClientIfMyOrderChanged(orderId, prevStatus, newStatus, orderNum) {
  if (!prevStatus || prevStatus === newStatus) return;
  const isMine = myOrderIds.includes(orderId) || activeTrackedOrderId === orderId;
  if (!isMine) return;

  // Mostrar alerta en el celular del cliente (si no está operando él mismo la pantalla de cocina)
  if (currentView !== 'kitchen') {
    showStatusPushNotification(newStatus, orderNum);
  }
  renderClientTracker();
  updateHeaderTrackerPill();
}

// ══════════════════════════════════════════════
//  MOTOR MULTI-RESTAURANTE (MULTI-TENANT) + SINCRONIZACIÓN
// ══════════════════════════════════════════════
const urlParams = new URLSearchParams(window.location.search);

function resolveTenantId() {
  // 1. Parámetro explícito en URL (?restaurante=tacos-rey, ?r=tacos-rey, ?sucursal=tacos-rey)
  const fromParam = (
    urlParams.get('restaurante') ||
    urlParams.get('r') ||
    urlParams.get('tenant') ||
    urlParams.get('sucursal') ||
    ''
  ).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

  if (fromParam) {
    return fromParam === 'escandon-main' ? 'escandon' : fromParam;
  }

  // 2. Subdominio dinámico (ej: tacosrey.restaurantos.com → 'tacosrey')
  const host = (window.location.hostname || '').toLowerCase();
  if (
    host &&
    host !== 'localhost' &&
    host !== '127.0.0.1' &&
    !host.endsWith('.github.io')
  ) {
    const parts = host.split('.');
    if (parts.length >= 3 && parts[0] !== 'www') {
      const sub = parts[0].replace(/[^a-z0-9_-]/g, '');
      if (sub) return sub;
    }
  }

  return 'escandon';
}

function formatSlugAsTitle(slug) {
  return String(slug || 'Escandon')
    .split(/[-_]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const tenantId  = resolveTenantId();
const branchKey = tenantId; // Identificador aislado para toda la base de datos de este restaurante

function getActiveTenantProfile() {
  if (TENANT_PROFILES[tenantId]) return TENANT_PROFILES[tenantId];
  return {
    id: tenantId,
    name: formatSlugAsTitle(tenantId),
    accent: '#ff6b1a',
    accentSoft: 'rgba(255, 107, 26, 0.12)',
    pin: KDS_REQUIRED_PIN,
    stripeAccountId: `acct_1Q_${tenantId}`,
    deliveryFee: 25,
  };
}

function applyTenantBranding() {
  const profile = getActiveTenantProfile();
  if (typeof document === 'undefined') return;
  document.title = `${profile.name} — Pedidos en Tiempo Real`;
  if (document.documentElement && document.documentElement.style) {
    document.documentElement.style.setProperty('--brand-orange', profile.accent);
    document.documentElement.style.setProperty('--brand-orange-soft', profile.accentSoft);
  }
  document.querySelectorAll('.brand-escandon').forEach(el => {
    el.textContent = profile.name;
  });
  const acctEl = document.getElementById('pay-connect-acct-id');
  if (acctEl) acctEl.textContent = profile.stripeAccountId || `acct_${profile.id}`;
  document.querySelectorAll('#landing-tenant-pills .tenant-pill').forEach(btn => {
    const slug = btn.dataset ? btn.dataset.tenant : '';
    btn.classList.toggle('active', slug === tenantId);
  });
}

function switchActiveTenantDemo(targetSlug) {
  const clean = String(targetSlug || 'escandon').trim().toLowerCase();
  const url = new URL(window.location.href);
  if (clean === 'escandon') {
    url.searchParams.delete('r');
    url.searchParams.delete('restaurante');
  } else {
    url.searchParams.set('r', clean);
  }
  window.location.href = url.toString();
}

function storageKey(name) {
  return `kds-${tenantId}-${name}`;
}

function getTenantQueryParam() {
  const explicitParam = urlParams.get('restaurante') || urlParams.get('r') || urlParams.get('sucursal');
  if (explicitParam || tenantId !== 'escandon') {
    return `&r=${encodeURIComponent(tenantId)}`;
  }
  return '';
}

const localChannel = new BroadcastChannel(`restaurant-kds-${tenantId}`);
let mqttClient       = null;
let cloudConnected   = false;
let currentBrokerIdx = 0;

const TOPIC_STATE  = `${CLOUD_CONFIG.channelNamespace}/${tenantId}/state`;
const TOPIC_EVENTS = `${CLOUD_CONFIG.channelNamespace}/${tenantId}/events`;

function updateCloudStatusUI(isOnline) {
  cloudConnected = isOnline;
  const landingDot  = document.getElementById('landing-cloud-dot');
  const landingText = document.getElementById('landing-cloud-text');
  const clientDot   = document.getElementById('client-cloud-dot');
  const kdsStatus   = document.getElementById('kds-status');

  if (landingDot) landingDot.classList.toggle('online', isOnline);
  if (clientDot)  clientDot.classList.toggle('online', isOnline);
  if (landingText) {
    landingText.textContent = isOnline
      ? 'Sincronización en tiempo real activa'
      : 'Modo local activo';
  }
  if (kdsStatus) {
    kdsStatus.textContent = isOnline ? '● EN VIVO' : '● LOCAL';
  }
}

function handleIncomingEvent(type, payload, fromRemote = false) {
  if (type === 'NEW_ORDER') {
    if (!orders.some(x => x.id === payload.id)) {
      orders.push(payload);
      if (payload.num && payload.num > orderCounter) {
        orderCounter = payload.num;
      }
      orders.sort((a, b) => a.createdAt - b.createdAt);
      persistOrders();
      renderKDS();
      renderDailySales();
      renderClientTracker();
      if (fromRemote) playKitchenBell();
    }
  } else if (type === 'ORDER_STATUS') {
    const o = orders.find(x => x.id === payload.id);
    if (o && o.status !== payload.status) {
      const prevStatus = o.status;
      o.status = payload.status;
      if (payload.readyAt) o.readyAt = payload.readyAt;
      persistOrders();
      renderKDS();
      renderDailySales();
      notifyClientIfMyOrderChanged(o.id, prevStatus, o.status, o.num);

      // Historial mensual: registrar al pasar a "Listo" / retirar si regresó
      if (o.status === 'ready') {
        recordSalesForOrders([o], { cloud: false });
      } else if (prevStatus === 'ready') {
        removeSaleForOrder(o.id, { cloud: false });
      }
    }
  } else if (type === 'ORDER_DELIVER') {
    const existingActive = orders.find(x => x.id === payload.id);
    const toArchive = payload.order || existingActive;
    if (toArchive && !completedOrders.some(c => c.id === toArchive.id)) {
      completedOrders.push({ ...toArchive, status: 'ready', deliveredAt: Date.now() });
    }
    if (toArchive) recordSalesForOrders([toArchive], { cloud: false });
    orders = orders.filter(x => x.id !== payload.id);
    persistOrders();
    renderKDS();
    renderDailySales();
    renderClientTracker();
    updateHeaderTrackerPill();
  } else if (type === 'ORDER_DELETE') {
    const before = orders.length;
    orders = orders.filter(x => x.id !== payload.id);
    if (orders.length !== before) {
      persistOrders();
      renderKDS();
      renderDailySales();
      renderClientTracker();
      updateHeaderTrackerPill();
    }
  } else if (type === 'SHIFT_RESET') {
    orders = [];
    completedOrders = [];
    serviceCalls = [];
    orderCounter = 0;
    activeTrackedOrderId = null;
    persistOrders();
    renderKDS();
    renderKDSServiceAlerts();
    renderDailySales();
    renderClientTracker();
    updateHeaderTrackerPill();
  } else if (type === 'STOCK_UPDATE') {
    if (Array.isArray(payload.soldOutItems)) {
      soldOutItems = payload.soldOutItems;
      persistOrders();
      sanitizeDraftAgainstStock();
      if (currentView === 'client') {
        renderDrinksSection();
        if (currentStation) renderBuilderWorkspace();
      }
      renderKDSStockPanel();
    }
  } else if (type === 'SERVICE_CALL') {
    if (payload && payload.id) {
      if (!serviceCalls.some(c => c.id === payload.id)) {
        // Reemplazar llamada previa del mismo tipo y misma mesa para no duplicar
        serviceCalls = serviceCalls.filter(c => !(c.table === payload.table && c.type === payload.type));
        serviceCalls.push(payload);
        persistOrders();
      }
      renderKDSServiceAlerts();
      checkAndNotifyNewServiceCalls();
    }
  } else if (type === 'SERVICE_RESOLVE') {
    if (payload && payload.id) {
      serviceCalls = serviceCalls.filter(c => c.id !== payload.id);
      persistOrders();
      renderKDSServiceAlerts();
    }
  } else if (type === 'ORDER_PAYMENT') {
    if (payload && Array.isArray(payload.orderIds)) {
      let updatedAny = false;
      orders.forEach(o => {
        if (payload.orderIds.includes(o.id)) {
          o.paid = true;
          o.paymentMethod = payload.paymentMethod || 'apple_pay';
          o.paymentLabel  = payload.paymentLabel || 'Apple Pay';
          o.paidAt        = payload.paidAt || Date.now();
          o.tipAmount     = payload.tipAmount || 0;
          o.paidTotal     = payload.amountPaid || o.total;
          updatedAny = true;
        }
      });
      if (updatedAny) {
        persistOrders();
        renderKDS();
        renderDailySales();
        renderClientTracker();
        if (fromRemote && currentView === 'kitchen' && kdsUnlocked) {
          showCustomPushBanner({
            ledClass: 'led-ready',
            kicker: `💳 PAGO DIGITAL RECIBIDO · ${(payload.paymentLabel || 'APPLE PAY').toUpperCase()}`,
            message: `${payload.table || 'Mesa'}${payload.guestName ? ` (${payload.guestName})` : ''} liquidó $${payload.amountPaid || 0}`,
          });
          playClientReadyDing();
        }
      }
    }
  }
}

let lastStateUpdatedAt = 0;

function mergeRemoteStateSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.orders)) return;
  if (snapshot.updatedAt && snapshot.updatedAt < lastStateUpdatedAt) return;
  if (snapshot.updatedAt) lastStateUpdatedAt = snapshot.updatedAt;

  // Detectar si alguna orden de este cliente cambió de estado en el snapshot
  const prevStatusMap = new Map(orders.map(o => [o.id, o.status]));

  const hasCallsInSnap = Array.isArray(snapshot.serviceCalls) && snapshot.serviceCalls.length > 0;
  const isShiftReset =
    snapshot.orders.length === 0 &&
    Array.isArray(snapshot.completedOrders) &&
    snapshot.completedOrders.length === 0 &&
    snapshot.orderCounter === 0 &&
    !hasCallsInSnap;

  if (isShiftReset) {
    orderCounter = 0;
    completedOrders = [];
    orders = [];
    serviceCalls = [];
  } else {
    if (typeof snapshot.orderCounter === 'number' && snapshot.orderCounter > orderCounter) {
      orderCounter = snapshot.orderCounter;
    }
    orders = snapshot.orders;
    if (Array.isArray(snapshot.completedOrders)) {
      completedOrders = snapshot.completedOrders;
    }
  }

  if (Array.isArray(snapshot.soldOutItems)) {
    soldOutItems = snapshot.soldOutItems;
    sanitizeDraftAgainstStock();
  }
  if (Array.isArray(snapshot.serviceCalls)) {
    serviceCalls = snapshot.serviceCalls;
  }

  persistOrders();
  renderKDS();
  renderKDSServiceAlerts();
  checkAndNotifyNewServiceCalls();
  renderDailySales();
  if (currentView === 'client') {
    renderDrinksSection();
    if (currentStation) renderBuilderWorkspace();
  }
  renderKDSStockPanel();

  orders.forEach(o => {
    const prev = prevStatusMap.get(o.id);
    if (prev && prev !== o.status) {
      notifyClientIfMyOrderChanged(o.id, prev, o.status, o.num);
      if (prev === 'ready' && o.status !== 'ready') {
        removeSaleForOrder(o.id, { cloud: false });
      }
    }
  });

  // Historial mensual: asegurar que todo pedido "Listo" quede registrado
  if (!isShiftReset) {
    recordSalesForOrders(
      orders.filter(o => o.status === 'ready').concat(completedOrders),
      { cloud: false }
    );
  }

  renderClientTracker();
  updateHeaderTrackerPill();
}

function initCloudWebSockets() {
  if (typeof window.mqtt === 'undefined') {
    updateCloudStatusUI(false);
    return;
  }

  const brokerUrl = CLOUD_CONFIG.mqttBrokers[currentBrokerIdx % CLOUD_CONFIG.mqttBrokers.length];

  try {
    mqttClient = window.mqtt.connect(brokerUrl, {
      clientId: 'escandon_' + DEVICE_ID,
      clean: true,
      connectTimeout: 5000,
      reconnectPeriod: 3000,
    });

    mqttClient.on('connect', () => {
      updateCloudStatusUI(true);
      mqttClient.subscribe([TOPIC_STATE, TOPIC_EVENTS], { qos: 1 });
    });

    mqttClient.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        if (topic === TOPIC_STATE && data.sender !== DEVICE_ID) {
          mergeRemoteStateSnapshot(data);
        } else if (topic === TOPIC_EVENTS && data.sender !== DEVICE_ID) {
          handleIncomingEvent(data.type, data.payload, true);
        }
      } catch (err) {}
    });

    mqttClient.on('error', () => {
      currentBrokerIdx++;
    });

    mqttClient.on('offline', () => {
      updateCloudStatusUI(false);
    });
  } catch (err) {
    updateCloudStatusUI(false);
  }
}

function normalizeFirebaseKdsSnapshot(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (
    !('updatedAt' in raw) &&
    !('orders' in raw) &&
    !('orderCounter' in raw) &&
    !('soldOutItems' in raw) &&
    !('serviceCalls' in raw)
  ) return null;
  const toArr = (v) => Array.isArray(v)
    ? v.filter(Boolean)
    : (v && typeof v === 'object' ? Object.values(v).filter(Boolean) : []);
  return {
    orders: toArr(raw.orders),
    completedOrders: toArr(raw.completedOrders),
    soldOutItems: toArr(raw.soldOutItems),
    serviceCalls: toArr(raw.serviceCalls),
    orderCounter: typeof raw.orderCounter === 'number' ? raw.orderCounter : 0,
    sender: raw.sender || '',
    updatedAt: raw.updatedAt || 0,
  };
}

let firebasePollTimer = null;

function firebaseKdsStateUrl() {
  const dbUrl = (CLOUD_CONFIG.firebaseDatabaseURL || '').trim().replace(/\/$/, '');
  if (!dbUrl) return '';
  return `${dbUrl}/restaurantes/${tenantId}/kds_state.json`;
}

function initFirebaseIfConfigured() {
  const stateUrl = firebaseKdsStateUrl();
  if (!stateUrl) return;

  const pullFirebaseState = () => {
    fetch(`${stateUrl}?t=${Date.now()}`, { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(raw => {
        const snap = normalizeFirebaseKdsSnapshot(raw);
        if (snap) {
          updateCloudStatusUI(true);
          if (snap.sender !== DEVICE_ID || snap.updatedAt > lastStateUpdatedAt) {
            mergeRemoteStateSnapshot(snap);
          }
        }
      })
      .catch(() => {});
  };

  // 1. Carga inicial + sondeo continuo cada 2 segundos (garantiza entrega en cualquier red móvil)
  pullFirebaseState();
  if (firebasePollTimer) clearInterval(firebasePollTimer);
  firebasePollTimer = setInterval(pullFirebaseState, 2000);

  // 2. Suscripción en tiempo real (Server-Sent Events de Firebase)
  try {
    const evtSource = new EventSource(stateUrl);
    evtSource.addEventListener('put', (e) => {
      try {
        const packet = JSON.parse(e.data);
        if (packet && packet.path === '/' && packet.data) {
          const snap = normalizeFirebaseKdsSnapshot(packet.data);
          if (snap && snap.sender !== DEVICE_ID) {
            mergeRemoteStateSnapshot(snap);
            updateCloudStatusUI(true);
          }
        }
      } catch (err) {}
    });
  } catch (e) {}
}

function publishCloudSync(type, payload) {
  const nowTs = Date.now();
  lastStateUpdatedAt = nowTs;

  localChannel.postMessage({ type, payload, sender: DEVICE_ID });

  if (mqttClient && cloudConnected) {
    const eventPacket = JSON.stringify({
      type,
      payload,
      sender: DEVICE_ID,
      ts: nowTs,
    });
    const statePacket = JSON.stringify({
      tenantId,
      orders,
      completedOrders,
      soldOutItems,
      serviceCalls,
      orderCounter,
      sender: DEVICE_ID,
      updatedAt: nowTs,
    });

    mqttClient.publish(TOPIC_EVENTS, eventPacket, { qos: 1 });
    mqttClient.publish(TOPIC_STATE, statePacket, { qos: 1, retain: true });
  }

  const stateUrl = firebaseKdsStateUrl();
  if (stateUrl) {
    fetch(stateUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        orders,
        completedOrders,
        soldOutItems,
        serviceCalls,
        orderCounter,
        sender: DEVICE_ID,
        updatedAt: nowTs,
      }),
    }).catch(() => {});
  }
}

localChannel.onmessage = (e) => {
  const { type, payload } = e.data;
  handleIncomingEvent(type, payload, true);
};

window.addEventListener('storage', (e) => {
  if (
    e.key === storageKey('orders') ||
    e.key === storageKey('completed-orders') ||
    e.key === storageKey('sold-out') ||
    e.key === storageKey('service-calls')
  ) {
    const prevMap = new Map(orders.map(o => [o.id, o.status]));
    loadPersistedOrders();
    sanitizeDraftAgainstStock();
    orders.forEach(o => {
      const prev = prevMap.get(o.id);
      if (prev && prev !== o.status) {
        notifyClientIfMyOrderChanged(o.id, prev, o.status, o.num);
      }
    });
    renderKDS();
    renderKDSServiceAlerts();
    checkAndNotifyNewServiceCalls();
    renderDailySales();
    if (currentView === 'client') {
      renderDrinksSection();
      if (currentStation) renderBuilderWorkspace();
    }
    renderKDSStockPanel();
    renderClientTracker();
    updateHeaderTrackerPill();
  }
});

function persistOrders() {
  localStorage.setItem(storageKey('orders'), JSON.stringify(orders));
  localStorage.setItem(storageKey('completed-orders'), JSON.stringify(completedOrders));
  localStorage.setItem(storageKey('sold-out'), JSON.stringify(soldOutItems));
  localStorage.setItem(storageKey('service-calls'), JSON.stringify(serviceCalls));
  localStorage.setItem(storageKey('counter'), String(orderCounter));
  localStorage.setItem(storageKey('my-orders'), JSON.stringify(myOrderIds));
  if (currentGuestName) {
    localStorage.setItem(storageKey('guest-name'), currentGuestName);
  }
  if (activeTrackedOrderId) {
    localStorage.setItem(storageKey('tracked-id'), String(activeTrackedOrderId));
  } else {
    localStorage.removeItem(storageKey('tracked-id'));
  }
}

function readTenantStorage(keyName) {
  const val = localStorage.getItem(storageKey(keyName));
  if (val !== null) return val;
  if (tenantId === 'escandon') {
    return localStorage.getItem(`kds-${keyName}`);
  }
  return null;
}

function loadPersistedOrders() {
  try {
    const saved          = readTenantStorage('orders');
    const savedCompleted = readTenantStorage('completed-orders');
    const savedSoldOut   = readTenantStorage('sold-out');
    const savedCalls     = readTenantStorage('service-calls');
    const cnt            = readTenantStorage('counter');
    const mine           = readTenantStorage('my-orders');
    const tracked        = readTenantStorage('tracked-id');
    const savedGuest     = readTenantStorage('guest-name');

    orders               = saved ? JSON.parse(saved) : [];
    completedOrders      = savedCompleted ? JSON.parse(savedCompleted) : [];
    soldOutItems         = savedSoldOut ? JSON.parse(savedSoldOut) : [];
    serviceCalls         = savedCalls ? JSON.parse(savedCalls) : [];
    orderCounter         = cnt ? (parseInt(cnt, 10) || 0) : 0;
    myOrderIds           = mine ? JSON.parse(mine) : [];
    activeTrackedOrderId = tracked ? (parseInt(tracked, 10) || null) : null;
    if (savedGuest) currentGuestName = savedGuest;
  } catch (e) {
    orders = [];
    completedOrders = [];
    soldOutItems = [];
    serviceCalls = [];
    orderCounter = 0;
    myOrderIds = [];
    activeTrackedOrderId = null;
  }
}

// ══════════════════════════════════════════════
//  NAVEGACIÓN DE VISTAS Y SEGURIDAD PIN KDS (12345)
// ══════════════════════════════════════════════
function showView(view) {
  currentView = view;
  document.getElementById('app-landing').classList.add('hidden');
  document.getElementById('view-client').classList.add('hidden');
  document.getElementById('view-kitchen').classList.add('hidden');

  if (view === 'landing') {
    document.getElementById('app-landing').classList.remove('hidden');
  } else if (view === 'client') {
    document.getElementById('view-client').classList.remove('hidden');
    initClientView();
  } else if (view === 'kitchen') {
    document.getElementById('view-kitchen').classList.remove('hidden');
    initKitchenView();
  }
}

function handleClientBack() {
  if (clientMode === 'tracker') {
    startNewOrderFromTracker();
    return;
  }
  if (currentStation) {
    showStationSelector();
    return;
  }
  showView('landing');
}

function verifyKDSPin() {
  const inputEl = document.getElementById('kds-pin-input');
  const errEl   = document.getElementById('kds-pin-error');
  if (!inputEl) return;

  const expectedPin = getActiveTenantProfile().pin || KDS_REQUIRED_PIN;
  if (inputEl.value.trim() === expectedPin) {
    kdsUnlocked = true;
    sessionStorage.setItem(storageKey('unlocked'), '1');
    localStorage.setItem(KITCHEN_DEVICE_FLAG, '1'); // Este dispositivo guarda el historial de ventas
    inputEl.value = '';
    if (errEl) errEl.classList.add('hidden');
    unlockAudioContext();
    renderKitchenLockState();
    setKDSSubView('comandas');
    renderKDS();
    renderKDSServiceAlerts();
    renderKDSStockPanel();
    initQRGeneratorView();
    checkAndNotifyNewServiceCalls();
    renderDailySales();
    startClock();
    startTimers();
    retryUnsyncedCloud();
  } else {
    if (errEl) errEl.classList.remove('hidden');
    inputEl.value = '';
    inputEl.focus();
  }
}

function lockKDSAndExit() {
  closeCloseShiftModal();
  kdsUnlocked = false;
  kdsSubView = 'comandas';
  sessionStorage.removeItem(storageKey('unlocked'));
  renderKitchenLockState();
  showView('landing');
}

function renderKitchenLockState() {
  const lockScreen = document.getElementById('kds-lock-screen');
  const unlockedEl = document.getElementById('kds-unlocked-content');
  if (!lockScreen || !unlockedEl) return;

  if (kdsUnlocked) {
    lockScreen.classList.add('hidden');
    unlockedEl.classList.remove('hidden');
  } else {
    lockScreen.classList.remove('hidden');
    unlockedEl.classList.add('hidden');
    setTimeout(() => {
      const pinInput = document.getElementById('kds-pin-input');
      if (pinInput) pinInput.focus();
    }, 60);
  }
}

function copyCustomerLink() {
  const baseUrl = window.location.origin + window.location.pathname;
  const tenantParam = getTenantQueryParam();
  const customerUrl = `${baseUrl}?vista=cliente${tenantParam}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(customerUrl).then(() => {
      alert(`Link para clientes copiado:\n\n${customerUrl}`);
    }).catch(() => {
      prompt('Copia este link para tus clientes:', customerUrl);
    });
  } else {
    prompt('Copia este link para tus clientes:', customerUrl);
  }
}

// ══════════════════════════════════════════════
//  2. VISTA CLIENTE · SELECCIÓN DIRECTA POR TOQUES (TAP-TO-SELECT)
// ══════════════════════════════════════════════
function initClientView() {
  renderStationHeroIllustrations();
  renderDrinksSection();
  updateClientContextBar();

  // Si el cliente tiene una orden activa en seguimiento, restaurar el modo correspondiente
  const trackedOrder = activeTrackedOrderId ? orders.find(o => o.id === activeTrackedOrderId) : null;
  if (trackedOrder && clientMode === 'tracker') {
    setClientSubMode('tracker');
  } else {
    setClientSubMode('menu');
    if (!currentStation) {
      showStationSelector();
    } else {
      selectStation(currentStation);
    }
  }

  updateHeaderTrackerPill();
  renderCart();
}

function setClientSubMode(mode) {
  clientMode = mode;
  const menuFlowEl    = document.getElementById('client-menu-flow');
  const trackerViewEl = document.getElementById('client-tracker-view');
  const mainBarEl     = document.getElementById('mobile-bottom-bar');
  const builderBarEl  = document.getElementById('dock-builder-bar');
  const trackerBarEl  = document.getElementById('dock-tracker-bar');
  const backBtnEl     = document.getElementById('btn-client-back');

  if (mode === 'tracker') {
    menuFlowEl.classList.add('hidden');
    trackerViewEl.classList.remove('hidden');
    mainBarEl.classList.add('hidden');
    builderBarEl.classList.add('hidden');
    trackerBarEl.classList.remove('hidden');
    if (backBtnEl) backBtnEl.textContent = '← Menú';
    renderClientTracker();
  } else {
    menuFlowEl.classList.remove('hidden');
    trackerViewEl.classList.add('hidden');
    mainBarEl.classList.remove('hidden');
    trackerBarEl.classList.add('hidden');
    builderBarEl.classList.toggle('hidden', !currentStation);
    if (backBtnEl) backBtnEl.textContent = currentStation ? '← Bases' : '← Inicio';
  }

  updateHeaderTrackerPill();
}

function updateHeaderTrackerPill() {
  const pillBtn = document.getElementById('btn-return-tracker');
  const miniLed = document.getElementById('mini-tracker-led');
  if (!pillBtn || !miniLed) return;

  const trackedOrder = activeTrackedOrderId ? orders.find(o => o.id === activeTrackedOrderId) : null;
  if (trackedOrder && clientMode === 'menu') {
    const meta = STATUS_META[trackedOrder.status] || STATUS_META.pending;
    miniLed.className = `led-dot ${meta.ledClass}`;
    pillBtn.classList.remove('hidden');
  } else {
    pillBtn.classList.add('hidden');
  }
}

function openActiveTracker() {
  if (!activeTrackedOrderId) return;
  setClientSubMode('tracker');
  const scrollEl = document.getElementById('client-scroll-container');
  if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
}

function startNewOrderFromTracker() {
  currentStation = null;
  setClientSubMode('menu');
  showStationSelector();
  const scrollEl = document.getElementById('client-scroll-container');
  if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderStationHeroIllustrations() {
  const tacoEl = document.getElementById('StationSvgTaco');
  const dogEl  = document.getElementById('StationSvgHotdog');
  if (tacoEl && !tacoEl.innerHTML) {
    tacoEl.innerHTML = buildTacoPlateSVG({
      tortilla: 'doble',
      protein: 'bistec',
      toppings: ['cilantro', 'cebolla', 'salsa_roja'],
    });
  }
  if (dogEl && !dogEl.innerHTML) {
    dogEl.innerHTML = buildHotdogPlateSVG({
      toppings: ['ketchup', 'mostaza', 'mayonesa', 'chiles', 'tomate', 'cebolla'],
    });
  }
}

function showStationSelector() {
  currentStation = null;
  document.getElementById('station-selector').classList.remove('hidden');
  document.getElementById('builder-workspace').classList.add('hidden');
  document.getElementById('dock-builder-bar').classList.add('hidden');
  const backBtnEl = document.getElementById('btn-client-back');
  if (backBtnEl) backBtnEl.textContent = '← Inicio';
  renderCart();
}

// ─── Control de Stock / Ingredientes Agotados (Modo 86) ──
function getStockKey(station, category, itemId) {
  if (category === 'drink')   return `drink:${itemId}`;
  if (category === 'station') return `station:${itemId}`;
  if (station === 'taco') {
    if (category === 'base')    return `base:${itemId}`;
    if (category === 'protein') return `protein:${itemId}`;
    if (category === 'topping') return `taco_top:${itemId}`;
  }
  if (station === 'hotdog') {
    if (category === 'topping') return `dog_top:${itemId}`;
  }
  return `${category}:${itemId}`;
}

function isStockSoldOut(stockKey) {
  return soldOutItems.includes(stockKey);
}

function sanitizeDraftAgainstStock() {
  // Asegurar que la tortilla seleccionada no esté agotada
  if (tacoDraft.tortilla && isStockSoldOut(getStockKey('taco', 'base', tacoDraft.tortilla))) {
    const availBase = TACO_CONFIG.base.find(b => !isStockSoldOut(getStockKey('taco', 'base', b.id)));
    tacoDraft.tortilla = availBase ? availBase.id : null;
  }
  // Asegurar que la proteína seleccionada no esté agotada
  if (tacoDraft.protein && isStockSoldOut(getStockKey('taco', 'protein', tacoDraft.protein))) {
    tacoDraft.protein = null;
  }
  // Filtrar complementos agotados
  tacoDraft.toppings = tacoDraft.toppings.filter(id => !isStockSoldOut(getStockKey('taco', 'topping', id)));
  hotdogDraft.toppings = hotdogDraft.toppings.filter(id => !isStockSoldOut(getStockKey('hotdog', 'topping', id)));
}

function selectStation(station) {
  if (station === 'hotdog' && isStockSoldOut('station:hotdog')) {
    showToast('Hot Dogs agotados por hoy');
    return;
  }
  currentStation = station;
  sanitizeDraftAgainstStock();
  document.getElementById('station-selector').classList.add('hidden');
  document.getElementById('builder-workspace').classList.remove('hidden');
  document.getElementById('dock-builder-bar').classList.remove('hidden');

  document.getElementById('tab-taco').classList.toggle('active', station === 'taco');
  document.getElementById('tab-hotdog').classList.toggle('active', station === 'hotdog');

  const backBtnEl = document.getElementById('btn-client-back');
  if (backBtnEl) backBtnEl.textContent = '← Bases';

  if (station === 'taco' && !tacoDraft.tortilla) {
    const availBase = TACO_CONFIG.base.find(b => !isStockSoldOut(getStockKey('taco', 'base', b.id)));
    tacoDraft.tortilla = availBase ? availBase.id : null;
  }

  builderDraftQty = 1;
  renderBuilderWorkspace();
}

let builderDraftQty = 1;

function changeBuilderDraftQty(delta) {
  builderDraftQty = Math.max(1, Math.min(30, (builderDraftQty || 1) + delta));
  hapticTap(6);
  renderBuilderWorkspace();
}

function resetCurrentBuilder() {
  builderDraftQty = 1;
  if (currentStation === 'taco') {
    const availBase = TACO_CONFIG.base.find(b => !isStockSoldOut(getStockKey('taco', 'base', b.id)));
    tacoDraft = { tortilla: availBase ? availBase.id : null, protein: null, toppings: [] };
  } else if (currentStation === 'hotdog') {
    hotdogDraft = { toppings: [] };
  }
  renderBuilderWorkspace();
}

// Selección directa por toque (Tap-to-Select)
let lastTappedKey = null;

function hapticTap(ms = 8) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
  } catch (e) {}
}

function tapSelectIngredient(category, itemId) {
  const stockKey = getStockKey(currentStation, category, itemId);
  if (isStockSoldOut(stockKey)) {
    showToast('Ingrediente agotado por hoy');
    return;
  }
  hapticTap();
  lastTappedKey = `${category}:${itemId}`;

  if (currentStation === 'taco') {
    if (category === 'base') {
      tacoDraft.tortilla = itemId;
    } else if (category === 'protein') {
      if (!tacoDraft.tortilla) {
        const availBase = TACO_CONFIG.base.find(b => !isStockSoldOut(getStockKey('taco', 'base', b.id)));
        tacoDraft.tortilla = availBase ? availBase.id : null;
      }
      tacoDraft.protein = (tacoDraft.protein === itemId) ? null : itemId;
    } else if (category === 'topping') {
      const idx = tacoDraft.toppings.indexOf(itemId);
      if (idx === -1) {
        tacoDraft.toppings.push(itemId);
      } else {
        tacoDraft.toppings.splice(idx, 1);
      }
    }
  } else if (currentStation === 'hotdog') {
    if (category === 'topping') {
      const idx = hotdogDraft.toppings.indexOf(itemId);
      if (idx === -1) {
        hotdogDraft.toppings.push(itemId);
      } else {
        hotdogDraft.toppings.splice(idx, 1);
      }
    }
  }

  renderBuilderWorkspace();
}

// ══════════════════════════════════════════════
//  RESUMEN DE PERSONALIZACIÓN Y PRECIOS FIJOS ($28 / $35)
// ══════════════════════════════════════════════
function joinNaturalSpanish(list) {
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} y ${list[1]}`;
  return `${list.slice(0, -1).join(', ')} y ${list[list.length - 1]}`;
}

function getCurrentDraftSummary() {
  if (currentStation === 'taco') {
    const baseObj = TACO_CONFIG.base.find(b => b.id === tacoDraft.tortilla);
    const protObj = TACO_CONFIG.protein.find(p => p.id === tacoDraft.protein);
    const topObjs = tacoDraft.toppings
      .map(id => TACO_CONFIG.toppings.find(t => t.id === id))
      .filter(Boolean);

    if (!protObj) {
      const baseText = baseObj ? `Tortilla ${baseObj.id}` : 'Elige tortilla';
      return {
        ready: false,
        name: `${baseText} · Toca Bistec o Longaniza`,
        price: TACO_FIXED_PRICE,
        emoji: '🌮',
        addLabel: 'Elige la proteína para agregar',
        key: '',
      };
    }

    const tortillaLabel = baseObj ? baseObj.shortLabel : 'sencillo';
    const toppingsPart  = topObjs.length > 0
      ? ` con ${joinNaturalSpanish(topObjs.map(t => t.shortLabel))}`
      : '';

    const fullTitle = `Taco ${tortillaLabel} de ${protObj.shortLabel}${toppingsPart}`;

    return {
      ready: true,
      name: fullTitle,
      price: TACO_FIXED_PRICE,
      emoji: '🌮',
      addLabel: '+ Agregar Taco al pedido',
      key: `taco:${tacoDraft.tortilla}:${tacoDraft.protein}:${[...tacoDraft.toppings].sort().join(',')}`,
    };
  }

  if (currentStation === 'hotdog') {
    const topObjs = hotdogDraft.toppings
      .map(id => HOTDOG_CONFIG.toppings.find(t => t.id === id))
      .filter(Boolean);

    const toppingsPart = topObjs.length > 0
      ? ` con ${joinNaturalSpanish(topObjs.map(t => t.shortLabel))}`
      : ' sencillo';

    return {
      ready: true,
      name: `Hot Dog${toppingsPart}`,
      price: HOTDOG_FIXED_PRICE,
      emoji: '🌭',
      addLabel: '+ Agregar Hot Dog al pedido',
      key: `hotdog:${[...hotdogDraft.toppings].sort().join(',')}`,
    };
  }

  return { ready: false, name: '', price: 0, emoji: '🍽️', addLabel: '+ Agregar', key: '' };
}

function renderBuilderWorkspace() {
  const trayEl   = document.getElementById('ingredients-tray');
  const canvasEl = document.getElementById('plate-canvas');

  if (!trayEl || !canvasEl) return;

  if (currentStation === 'taco') {
    trayEl.innerHTML = `
      <div class="tap-group">
        <div class="minimal-group-title">
          <span>1. TORTILLA</span>
          <span>INCLUIDO</span>
        </div>
        <div class="tap-grid">
          ${TACO_CONFIG.base.map(item => renderTapCard('base', item, tacoDraft.tortilla === item.id)).join('')}
        </div>
      </div>

      <div class="tap-group">
        <div class="minimal-group-title">
          <span>2. PROTEÍNA</span>
          <span>INCLUIDO</span>
        </div>
        <div class="tap-grid">
          ${TACO_CONFIG.protein.map(item => renderTapCard('protein', item, tacoDraft.protein === item.id)).join('')}
        </div>
      </div>

      <div class="tap-group">
        <div class="minimal-group-title">
          <span>3. COMPLEMENTOS (TOCA PARA AGREGAR)</span>
          <span>INCLUIDO</span>
        </div>
        <div class="tap-grid cols-3">
          ${TACO_CONFIG.toppings.map(item => renderTapCard('topping', item, tacoDraft.toppings.includes(item.id))).join('')}
        </div>
      </div>
    `;

    canvasEl.innerHTML = buildTacoPlateSVG(tacoDraft);
  } else if (currentStation === 'hotdog') {
    trayEl.innerHTML = `
      <div class="tap-group">
        <div class="minimal-group-title">
          <span>ADEREZOS Y EXTRAS (TOCA PARA AGREGAR)</span>
          <span>INCLUIDO</span>
        </div>
        <div class="tap-grid cols-3">
          ${HOTDOG_CONFIG.toppings.map(item => renderTapCard('topping', item, hotdogDraft.toppings.includes(item.id))).join('')}
        </div>
      </div>
    `;

    canvasEl.innerHTML = buildHotdogPlateSVG(hotdogDraft);
  }

  const summary    = getCurrentDraftSummary();
  const descEl     = document.getElementById('live-item-description');
  const priceEl    = document.getElementById('live-item-price');
  const addBtn     = document.getElementById('btn-add-built');
  const addLabelEl = document.getElementById('btn-add-built-label');
  const qtyValEl   = document.getElementById('builder-qty-val');
  const qtyMinusEl = document.getElementById('builder-qty-minus');
  const qtyPlusEl  = document.getElementById('builder-qty-plus');

  const draftQty = Math.max(1, builderDraftQty || 1);
  if (qtyValEl)   qtyValEl.textContent = String(draftQty);
  if (qtyMinusEl) qtyMinusEl.disabled = !summary.ready || draftQty <= 1;
  if (qtyPlusEl)  qtyPlusEl.disabled  = !summary.ready;

  let dynamicAddLabel = summary.addLabel;
  if (summary.ready) {
    if (currentStation === 'hotdog') {
      dynamicAddLabel = draftQty > 1
        ? `+ Agregar ${draftQty} Hot Dogs al pedido`
        : '+ Agregar Hot Dog al pedido';
    } else if (currentStation === 'taco') {
      dynamicAddLabel = draftQty > 1
        ? `+ Agregar ${draftQty} Tacos al pedido`
        : '+ Agregar Taco al pedido';
    }
  }

  if (descEl)     descEl.textContent = summary.name;
  if (priceEl)    priceEl.textContent = '$' + (summary.price * draftQty);
  if (addLabelEl) addLabelEl.textContent = dynamicAddLabel;
  if (addBtn)     addBtn.disabled = !summary.ready;

  lastTappedKey = null;
  renderCart();
}

function renderTapCard(category, item, isSelected) {
  const stockKey = getStockKey(currentStation, category, item.id);
  const isOut    = isStockSoldOut(stockKey);
  const justTapped = lastTappedKey === `${category}:${item.id}`;
  return `
    <button type="button"
            class="tap-card${isSelected && !isOut ? ' selected' : ''}${isOut ? ' sold-out' : ''}${justTapped ? ' just-tapped' : ''}"
            ${isOut ? 'disabled' : ''}
            onclick="tapSelectIngredient('${category}', '${item.id}')">
      <span class="tap-check">✓</span>
      <div class="tap-art">${item.art}</div>
      <div class="tap-texts">
        <div class="tap-name">${item.name}</div>
        <div class="tap-included">${isOut ? 'Agotado' : 'Incluido'}</div>
      </div>
    </button>
  `;
}

function renderDrinksSection() {
  const html = DRINKS_CONFIG.map(drink => {
    const isOut = isStockSoldOut(getStockKey(null, 'drink', drink.id));
    const inCart = cartItems.find(it => it.key === drink.id);
    return `
      <div class="drink-row${isOut ? ' sold-out' : ''}${inCart ? ' in-cart' : ''}" onclick="addDrinkToCart('${drink.id}')">
        <div class="drink-left">
          <span class="drink-emoji">${drink.emoji}</span>
          <div class="drink-info">
            <span class="drink-name">${drink.name}</span>
            <span class="drink-price">${isOut ? 'Agotado por hoy' : '$' + drink.price}</span>
          </div>
        </div>
        <button type="button" class="btn-tap-drink" ${isOut ? 'disabled' : ''} onclick="event.stopPropagation(); addDrinkToCart('${drink.id}')">
          ${isOut ? 'Agotado' : (inCart ? `${inCart.qty} · +` : '+')}
        </button>
      </div>
    `;
  }).join('');

  const listBuilder = document.getElementById('drinks-list');
  const listHome    = document.getElementById('drinks-list-home');
  if (listBuilder) listBuilder.innerHTML = html;
  if (listHome)    listHome.innerHTML = html;
}

function addDrinkToCart(drinkId) {
  const drink = DRINKS_CONFIG.find(d => d.id === drinkId);
  if (!drink) return;
  if (isStockSoldOut(getStockKey(null, 'drink', drink.id))) {
    showToast(`${drink.name} está agotada`);
    return;
  }

  const existing = cartItems.find(it => it.key === drink.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cartItems.push({
      key: drink.id,
      name: drink.name,
      emoji: drink.emoji,
      price: drink.price,
      qty: 1,
      station: 'drink',
    });
  }

  renderCart();
  hapticTap(10);
  showToast(`${drink.emoji} ${drink.name} agregada`);
}

// ══════════════════════════════════════════════
//  COMPOSITOR VISUAL DEL PLATO (SIN BORDES NI RUIDO)
// ══════════════════════════════════════════════
function buildTacoPlateSVG(state) {
  const hasTortilla = Boolean(state.tortilla);
  const isDoble     = state.tortilla === 'doble';
  const hasBistec   = state.protein === 'bistec';
  const hasLonga    = state.protein === 'longaniza';
  const hasCilantro = state.toppings.includes('cilantro');
  const hasCebolla  = state.toppings.includes('cebolla');
  const hasSalsa    = state.toppings.includes('salsa_roja');

  return `
    <svg viewBox="0 0 380 220" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="cornTortilla" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stop-color="#f5da96"/>
          <stop offset="70%" stop-color="#e2b963"/>
          <stop offset="100%" stop-color="#c39237"/>
        </radialGradient>
        <radialGradient id="cornTortillaBack" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stop-color="#e3bc6b"/>
          <stop offset="100%" stop-color="#b58327"/>
        </radialGradient>
      </defs>

      <ellipse cx="190" cy="116" rx="142" ry="78" fill="#141414" stroke="#242424" stroke-width="2"/>

      ${isDoble ? `
        <g>
          <ellipse cx="174" cy="118" rx="98" ry="60" fill="url(#cornTortillaBack)" stroke="#9e7019" stroke-width="2"/>
          <circle cx="118" cy="104" r="4" fill="#9c6c19" opacity="0.5"/>
          <circle cx="232" cy="132" r="4.5" fill="#9c6c19" opacity="0.45"/>
        </g>
      ` : ''}

      ${hasTortilla ? `
        <g>
          <ellipse cx="196" cy="112" rx="98" ry="60" fill="url(#cornTortilla)" stroke="#b38328" stroke-width="2"/>
          <ellipse cx="144" cy="92" rx="6" ry="3" fill="#ad7b22" opacity="0.45"/>
          <circle cx="242" cy="98" r="4" fill="#ad7b22" opacity="0.4"/>
          <circle cx="166" cy="140" r="4.5" fill="#ad7b22" opacity="0.45"/>
          <ellipse cx="226" cy="135" rx="5" ry="2.8" fill="#ad7b22" opacity="0.45"/>
        </g>
      ` : ''}

      ${hasBistec ? `
        <g fill="#6b3820" stroke="#421f0f" stroke-width="1.5">
          <rect x="132" y="90" width="34" height="22" rx="7" transform="rotate(-10 149 101)"/>
          <rect x="162" y="82" width="38" height="24" rx="7" transform="rotate(6 181 94)"/>
          <rect x="196" y="88" width="36" height="22" rx="7" transform="rotate(-7 214 99)"/>
          <rect x="220" y="102" width="32" height="21" rx="7" transform="rotate(12 236 112)"/>
          <rect x="144" y="108" width="38" height="23" rx="7" transform="rotate(5 163 119)"/>
          <rect x="178" y="106" width="40" height="24" rx="8" transform="rotate(-4 198 118)"/>
          <rect x="206" y="114" width="34" height="21" rx="7" transform="rotate(8 223 124)"/>
          <path d="M142 98 l14 0 M172 92 l16 2 M188 116 l18 -1" stroke="#9e5c3c" stroke-width="2" stroke-linecap="round"/>
        </g>
      ` : ''}

      ${hasLonga ? `
        <g fill="#a62c19" stroke="#661509" stroke-width="1.5">
          <circle cx="146" cy="102" r="14"/>
          <circle cx="170" cy="93" r="15"/>
          <circle cx="196" cy="92" r="14"/>
          <circle cx="220" cy="98" r="15"/>
          <circle cx="238" cy="110" r="13"/>
          <circle cx="158" cy="119" r="15"/>
          <circle cx="184" cy="114" r="16"/>
          <circle cx="210" cy="118" r="15"/>
          <circle cx="174" cy="128" r="13"/>
          <circle cx="198" cy="129" r="13"/>
        </g>
      ` : ''}

      ${hasCebolla ? `
        <g fill="#f6f4fc" stroke="#b5a6cc" stroke-width="1.3">
          <rect x="146" y="96" width="13" height="11" rx="2.5" transform="rotate(-15 152 101)"/>
          <rect x="174" y="88" width="14" height="12" rx="2.5" transform="rotate(12 181 94)"/>
          <rect x="206" y="92" width="13" height="11" rx="2.5" transform="rotate(-8 212 97)"/>
          <rect x="160" y="114" width="14" height="11" rx="2.5" transform="rotate(9 167 119)"/>
          <rect x="190" y="108" width="14" height="12" rx="2.5" transform="rotate(-11 197 114)"/>
          <rect x="214" y="120" width="13" height="11" rx="2.5" transform="rotate(7 220 125)"/>
        </g>
      ` : ''}

      ${hasCilantro ? `
        <g fill="#3da856" stroke="#1b612c" stroke-width="1.2">
          <path d="M150 108 C142 98, 150 88, 158 95 C164 88, 172 98, 163 107 Z"/>
          <path d="M184 100 C176 90, 184 80, 192 87 C198 80, 206 90, 197 99 Z"/>
          <path d="M216 108 C208 98, 216 88, 224 95 C230 88, 238 98, 229 107 Z"/>
          <path d="M166 126 C158 116, 166 106, 174 113 C180 106, 188 116, 179 125 Z"/>
          <path d="M198 124 C190 114, 198 104, 206 111 C212 104, 220 114, 211 123 Z"/>
        </g>
      ` : ''}

      ${hasSalsa ? `
        <g>
          <path d="M140 108 Q167 89, 194 109 T244 110" fill="none" stroke="#cf2919" stroke-width="9" stroke-linecap="round" opacity="0.9"/>
          <path d="M156 122 Q184 108, 220 124" fill="none" stroke="#e63b29" stroke-width="6.5" stroke-linecap="round" opacity="0.9"/>
          <circle cx="168" cy="102" r="2.2" fill="#f7c873"/>
          <circle cx="197" cy="110" r="2" fill="#f7c873"/>
          <circle cx="214" cy="120" r="2" fill="#f7c873"/>
        </g>
      ` : ''}
    </svg>
  `;
}

function buildHotdogPlateSVG(state) {
  const hasKetchup = state.toppings.includes('ketchup');
  const hasMayo    = state.toppings.includes('mayonesa');
  const hasMostaza = state.toppings.includes('mostaza');
  const hasChiles  = state.toppings.includes('chiles');
  const hasTomate  = state.toppings.includes('tomate');
  const hasCebolla = state.toppings.includes('cebolla');

  return `
    <svg viewBox="0 0 380 220" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bunTopGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f2be72"/>
          <stop offset="60%" stop-color="#df9e48"/>
          <stop offset="100%" stop-color="#bd7a27"/>
        </linearGradient>
        <linearGradient id="bunBottomGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f5d598"/>
          <stop offset="45%" stop-color="#dfa24e"/>
          <stop offset="100%" stop-color="#b87420"/>
        </linearGradient>
        <linearGradient id="sausageGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#d4563b"/>
          <stop offset="45%" stop-color="#b33920"/>
          <stop offset="100%" stop-color="#7d200d"/>
        </linearGradient>
      </defs>

      <ellipse cx="190" cy="116" rx="154" ry="76" fill="#141414" stroke="#242424" stroke-width="2"/>

      <rect x="58" y="60" width="264" height="56" rx="28" fill="url(#bunTopGrad)" stroke="#965c14" stroke-width="2"/>
      <rect x="66" y="88" width="248" height="34" rx="17" fill="#f7e4b9"/>
      <rect x="44" y="88" width="292" height="42" rx="21" fill="url(#sausageGrad)" stroke="#691908" stroke-width="2"/>

      <g stroke="#521104" stroke-width="3" stroke-linecap="round" opacity="0.5">
        <line x1="95" y1="92" x2="83" y2="118"/>
        <line x1="145" y1="92" x2="133" y2="118"/>
        <line x1="195" y1="92" x2="183" y2="118"/>
        <line x1="245" y1="92" x2="233" y2="118"/>
        <line x1="295" y1="92" x2="283" y2="118"/>
      </g>

      ${hasTomate ? `
        <g fill="#e33927" stroke="#91190c" stroke-width="1.2">
          <rect x="82" y="94" width="15" height="13" rx="3" transform="rotate(-8 89 100)"/>
          <rect x="128" y="97" width="16" height="13" rx="3" transform="rotate(10 136 103)"/>
          <rect x="174" y="93" width="15" height="13" rx="3" transform="rotate(-6 181 99)"/>
          <rect x="220" y="98" width="16" height="13" rx="3" transform="rotate(8 228 104)"/>
          <rect x="268" y="94" width="15" height="13" rx="3" transform="rotate(-11 275 100)"/>
        </g>
      ` : ''}

      ${hasCebolla ? `
        <g fill="#f5f2fc" stroke="#b3a3cc" stroke-width="1.2">
          <rect x="102" y="100" width="13" height="11" rx="2.5" transform="rotate(14 108 105)"/>
          <rect x="150" y="94" width="13" height="11" rx="2.5" transform="rotate(-12 156 99)"/>
          <rect x="196" y="101" width="14" height="11" rx="2.5" transform="rotate(9 203 106)"/>
          <rect x="244" y="95" width="13" height="11" rx="2.5" transform="rotate(-8 250 100)"/>
        </g>
      ` : ''}

      ${hasChiles ? `
        <g stroke="#295416" stroke-width="1.4">
          <circle cx="114" cy="107" r="10.5" fill="#639e3d"/>
          <circle cx="114" cy="107" r="5.5" fill="#9bc96d"/>
          <circle cx="166" cy="106" r="10.5" fill="#579133"/>
          <circle cx="166" cy="106" r="5.5" fill="#9bc96d"/>
          <circle cx="218" cy="107" r="10.5" fill="#639e3d"/>
          <circle cx="218" cy="107" r="5.5" fill="#9bc96d"/>
          <circle cx="268" cy="106" r="10.5" fill="#579133"/>
          <circle cx="268" cy="106" r="5.5" fill="#9bc96d"/>
        </g>
      ` : ''}

      ${hasKetchup ? `
        <path d="M68 110 Q84 88, 100 110 T132 110 T164 110 T196 110 T228 110 T260 110 T292 110 T314 106"
              fill="none" stroke="#e02819" stroke-width="6" stroke-linecap="round"/>
      ` : ''}

      ${hasMostaza ? `
        <path d="M72 106 Q88 126, 104 106 T136 106 T168 106 T200 106 T232 106 T264 106 T296 106 T312 112"
              fill="none" stroke="#f5c522" stroke-width="5.5" stroke-linecap="round"/>
      ` : ''}

      ${hasMayo ? `
        <path d="M76 108 Q92 92, 108 112 T140 108 T172 108 T204 108 T236 108 T268 108 T300 108"
              fill="none" stroke="#fcf7e8" stroke-width="5" stroke-linecap="round"/>
      ` : ''}

      <rect x="58" y="116" width="264" height="48" rx="24" fill="url(#bunBottomGrad)" stroke="#965c14" stroke-width="2"/>
    </svg>
  `;
}

// ══════════════════════════════════════════════
//  CARRITO Y ZONA INFERIOR DEL PULGAR
// ══════════════════════════════════════════════
function addBuiltItemToCart() {
  const summary = getCurrentDraftSummary();
  if (!summary.ready) return;

  const qtyToAdd = Math.max(1, builderDraftQty || 1);
  const existing = cartItems.find(it => it.key === summary.key);
  if (existing) {
    existing.qty += qtyToAdd;
  } else {
    cartItems.push({
      key: summary.key,
      name: summary.name,
      emoji: summary.emoji,
      price: summary.price,
      qty: qtyToAdd,
      station: currentStation,
    });
  }

  // Conservamos la selección en el resumen visual (solo se limpia si el usuario toca "Limpiar")
  builderDraftQty = 1;

  renderBuilderWorkspace();
  hapticTap(12);
  showToast(`${summary.emoji} ${qtyToAdd > 1 ? qtyToAdd + '× ' : ''}Agregado a tu pedido`);
}

function changeCartItemQty(index, delta) {
  const item = cartItems[index];
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cartItems.splice(index, 1);
  }
  renderCart();
}

function getCartTotal() {
  return cartItems.reduce((sum, it) => sum + it.price * it.qty, 0);
}

function renderCart() {
  const container   = document.getElementById('cart-items');
  const totalEl     = document.getElementById('cart-total');
  const pedirSheet  = document.getElementById('btn-pedir-sheet');
  const pedirBar    = document.getElementById('btn-pedir-bar');
  const bbCountEl   = document.getElementById('bb-count');
  const bbStatusTxt = document.getElementById('bb-status-text');
  const bbTotalEl   = document.getElementById('bb-total-price');

  if (!container) return;

  const summary = getCurrentDraftSummary();

  if (cartItems.length === 0) {
    container.innerHTML = '<p class="cart-empty">Selecciona tus tacos, hot dogs o bebidas</p>';
  } else {
    container.innerHTML = cartItems.map((item, idx) => {
      const lineTotal = item.price * item.qty;
      return `
        <div class="cart-item">
          <span class="cart-item-emoji">${item.emoji}</span>
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price">$${lineTotal} ($${item.price} c/u)</div>
          </div>
          <div class="cart-item-controls">
            <button class="qty-btn" onclick="changeCartItemQty(${idx}, -1)">−</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" onclick="changeCartItemQty(${idx}, 1)">+</button>
          </div>
        </div>
      `;
    }).join('');
  }

  const totalQty       = cartItems.reduce((sum, it) => sum + it.qty, 0);
  const confirmedTotal = getCartTotal();
  const baseFoodTotal  = confirmedTotal > 0 ? confirmedTotal : (summary.ready ? summary.price : 0);
  const isDelivery     = currentFulfillmentMode === 'delivery';
  const isPickup       = currentFulfillmentMode === 'pickup';
  const deliveryFee    = (isDelivery && baseFoodTotal > 0) ? (getActiveTenantProfile().deliveryFee || 25) : 0;
  const effectiveTotal = baseFoodTotal + deliveryFee;
  const canOrder       = (cartItems.length > 0 || summary.ready);

  if (bbCountEl)  bbCountEl.textContent  = totalQty;
  if (totalEl)    totalEl.textContent    = '$' + effectiveTotal;
  if (bbTotalEl)  bbTotalEl.textContent  = '$' + effectiveTotal;

  const ctaLabel = isDelivery ? '🔒 Pagar Envío →' : (isPickup ? '🔒 Pagar Pickup →' : 'Pedir →');
  if (pedirBar)   pedirBar.textContent   = ctaLabel;
  if (pedirSheet) pedirSheet.textContent = ctaLabel;

  if (bbStatusTxt) {
    if (cartItems.length > 0) {
      const last = cartItems[cartItems.length - 1];
      bbStatusTxt.textContent = `${last.qty > 1 ? last.qty + '× ' : ''}${last.emoji} ${last.name}`;
    } else if (summary.ready) {
      bbStatusTxt.textContent = `${summary.emoji} ${summary.name}`;
    } else {
      bbStatusTxt.textContent = 'Tu pedido';
    }
  }

  if (pedirSheet) pedirSheet.disabled = !canOrder;
  if (pedirBar)   pedirBar.disabled   = !canOrder;

  // Micro-animación del contador cuando cambia la cantidad
  if (bbCountEl && totalQty !== lastDockQty) {
    bbCountEl.classList.remove('bump');
    void bbCountEl.offsetWidth;
    bbCountEl.classList.add('bump');
    setTimeout(() => bbCountEl.classList.remove('bump'), 320);
  }
  lastDockQty = totalQty;

  // Línea secundaria del dock: contexto de mesa, pickup o domicilio
  const tableLineEl = document.getElementById('bb-table-line');
  if (tableLineEl) {
    if (isDelivery) {
      const addr = readTenantStorage('delivery-address') || '';
      tableLineEl.textContent = addr ? `🛵 Domicilio (+$25) · ${addr}` : '🛵 Envío a domicilio (+$25 MXN) · Pago anticipado';
    } else if (isPickup) {
      const pTime = readTenantStorage('pickup-time') || 'Lo antes posible';
      tableLineEl.textContent = `🛍️ Pickup en sucursal · ${pTime} · Pago anticipado`;
    } else {
      const savedTable = presetTableFromURL || readTenantStorage('last-table') || '';
      if (savedTable) {
        const g = getTableGroupSummary(savedTable);
        const others = g.diners.filter(d => !d.isMe).length;
        tableLineEl.textContent = others > 0
          ? `📍 ${savedTable} · ${g.diners.length} personas · Mesa $${g.tableTotal}`
          : `📍 ${savedTable} · Cuenta individual`;
      } else {
        tableLineEl.textContent = totalQty > 0 ? `${totalQty} ${totalQty === 1 ? 'artículo' : 'artículos'} · Toca para revisar` : 'Toca para ver tu pedido';
      }
    }
  }

  const drinksInCart = cartItems.filter(it => it.station === 'drink').map(it => `${it.key}:${it.qty}`).join('|');
  if (drinksInCart !== lastDrinksSignature) {
    lastDrinksSignature = drinksInCart;
    renderDrinksSection();
  }
}

let lastDockQty = 0;
let lastDrinksSignature = '';

function toggleCart(forceState) {
  cartOpen = typeof forceState === 'boolean' ? forceState : !cartOpen;
  const panel   = document.getElementById('cart-panel');
  const overlay = document.getElementById('cart-overlay');
  if (panel)   panel.classList.toggle('open', cartOpen);
  if (overlay) overlay.classList.toggle('open', cartOpen);
}

// ══════════════════════════════════════════════
//  3. UPSELLING AUTOMÁTICO, ENVÍO DE ORDEN Y RASTREADOR
// ══════════════════════════════════════════════
function getAvailableDrinksForUpsell() {
  return DRINKS_CONFIG.filter(d => !isStockSoldOut(getStockKey(null, 'drink', d.id)));
}

function shouldOfferDrinkUpsell() {
  if (upsellOfferedForCart) return false;
  const hasFood  = cartItems.some(it => it.station !== 'drink');
  const hasDrink = cartItems.some(it => it.station === 'drink');
  const availDrinks = getAvailableDrinksForUpsell();
  return hasFood && !hasDrink && availDrinks.length > 0;
}

function openOrderModal() {
  unlockAudioContext();

  const summary = getCurrentDraftSummary();
  if (cartItems.length === 0 && summary.ready) {
    addBuiltItemToCart();
  }
  if (cartItems.length === 0) return;

  if (cartOpen) toggleCart(false);

  // Si lleva comida pero ninguna bebida, mostrar sugerencia de Venta Cruzada (Upselling)
  if (shouldOfferDrinkUpsell()) {
    upsellOfferedForCart = true;
    openUpsellModal();
    return;
  }

  openOrderModalDirect();
}

function openUpsellModal() {
  const listEl = document.getElementById('upsell-drinks-list');
  const avail  = getAvailableDrinksForUpsell();
  if (!listEl || avail.length === 0) {
    openOrderModalDirect();
    return;
  }

  listEl.innerHTML = avail.map(drink => `
    <button type="button" class="upsell-drink-btn" onclick="acceptUpsellDrink('${drink.id}')">
      <div class="upsell-drink-left">
        <span class="upsell-drink-emoji">${drink.emoji}</span>
        <span class="upsell-drink-name">${drink.name}</span>
      </div>
      <span class="upsell-drink-cta">+ $${drink.price} · Agregar</span>
    </button>
  `).join('');

  document.getElementById('upsell-overlay').classList.add('open');
  document.getElementById('upsell-modal').classList.add('open');
}

function closeUpsellModal() {
  const ov = document.getElementById('upsell-overlay');
  const md = document.getElementById('upsell-modal');
  if (ov) ov.classList.remove('open');
  if (md) md.classList.remove('open');
}

function acceptUpsellDrink(drinkId) {
  addDrinkToCart(drinkId);
  closeUpsellModal();
  openOrderModalDirect();
}

function skipUpsellAndContinue() {
  closeUpsellModal();
  openOrderModalDirect();
}

function selectQuickTableChip(tableName) {
  const inputEl = document.getElementById('table-input');
  if (inputEl) {
    inputEl.value = tableName;
  }
  syncQuickTableChipSelection();
  const guestEl = document.getElementById('guest-name-input');
  if (guestEl && !guestEl.value.trim()) {
    guestEl.focus();
  }
}

function syncQuickTableChipSelection() {
  const inputEl = document.getElementById('table-input');
  const currentVal = (inputEl ? inputEl.value.trim() : '').toLowerCase();
  document.querySelectorAll('#quick-table-chips .table-chip').forEach(btn => {
    const chipTxt = (btn.textContent || '').trim().toLowerCase();
    btn.classList.toggle('selected', Boolean(currentVal && chipTxt === currentVal));
  });
}

let identityPreselectOnly = false;

// ─── Avatares de comensales (presencia en la mesa) ──
const DINER_STATUS_LABEL = {
  pending: 'Pidió hace un momento',
  received: 'Recibido en cocina',
  preparing: 'Cocinando',
  ready: 'Listo',
};

function dinerInitials(name) {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function dinerHue(name) {
  let h = 0;
  const s = String(name || '').toLowerCase();
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

function escapeHTML(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderDinerAvatar(name, { isMe = false, size = 'md', status = '' } = {}) {
  const hue = dinerHue(name);
  return `<span class="diner-avatar size-${size}${isMe ? ' is-me' : ''}${status ? ' st-' + status : ''}"
    style="--av-h:${hue}" title="${escapeHTML(name)}">${escapeHTML(dinerInitials(name))}</span>`;
}

// ══════════════════════════════════════════════
//  MODALIDADES: EN MESA (DINE-IN) · PICKUP · A DOMICILIO + PAGO ANTICIPADO
// ══════════════════════════════════════════════
let currentFulfillmentMode = 'dine_in'; // 'dine_in' | 'pickup' | 'delivery'
let activePaymentSession   = null;      // { mode: 'prepay_order'|'pay_mine'|'pay_table', subtotal, deliveryFee, tipPct, tipAmount, grandTotal, draftOrder, orderIds, table, guestName }
let selectedTipPercent     = 10;

function openClientWithMode(mode) {
  const valid = ['dine_in', 'pickup', 'delivery'].includes(mode) ? mode : 'dine_in';
  currentFulfillmentMode = valid;
  localStorage.setItem(storageKey('fulfillment-mode'), valid);
  showView('client');
  setFulfillmentMode(valid);
}

function setFulfillmentMode(mode) {
  const valid = ['dine_in', 'pickup', 'delivery'].includes(mode) ? mode : 'dine_in';
  currentFulfillmentMode = valid;
  localStorage.setItem(storageKey('fulfillment-mode'), valid);

  // 1. Actualizar tabs superiores en el menú del cliente
  ['dine_in', 'pickup', 'delivery'].forEach(m => {
    const tabEl = document.getElementById(`fmode-${m}`);
    if (tabEl) tabEl.classList.toggle('active', m === valid);
  });

  // 2. Actualizar tabs dentro del modal de confirmación
  document.querySelectorAll('#modal-fmode-tabs .mfmode-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.fmode === valid);
  });

  // 3. Mostrar/ocultar banner de Pago Anticipado y tarjeta de asistencia en mesa
  const prepayBanner   = document.getElementById('prepay-mode-banner');
  const prepayBadge    = document.getElementById('prepay-banner-badge');
  const prepayDesc     = document.getElementById('prepay-banner-desc');
  const menuAssistCard = document.getElementById('menu-table-assistance-card');

  if (prepayBanner) {
    if (valid === 'pickup') {
      prepayBanner.classList.remove('hidden');
      if (prepayBadge) prepayBadge.textContent = '🛍️ PICKUP EN SUCURSAL · PAGO ANTICIPADO';
      if (prepayDesc)  prepayDesc.textContent  = 'Paga por adelantado con Apple Pay o Tarjeta para que cocina prepare tu orden al instante y recógela sin hacer fila.';
    } else if (valid === 'delivery') {
      prepayBanner.classList.remove('hidden');
      if (prepayBadge) prepayBadge.textContent = '🛵 ENVÍO A DOMICILIO (+$25) · PAGO ANTICIPADO';
      if (prepayDesc)  prepayDesc.textContent  = 'Ingresa tu dirección y realiza el pago anticipado seguro con Apple Pay o Stripe para procesar y enviar tu pedido.';
    } else {
      prepayBanner.classList.add('hidden');
    }
  }

  if (menuAssistCard) {
    menuAssistCard.classList.toggle('hidden', valid !== 'dine_in');
  }

  // 4. Sincronizar campos dinámicos dentro de #order-modal
  syncOrderModalFieldsForMode();
  updateClientContextBar();
  renderCart();
}

function selectPickupTimeChip(timeLabel) {
  const inputEl = document.getElementById('pickup-time-input');
  if (inputEl) inputEl.value = timeLabel;
  document.querySelectorAll('#pickup-time-chips .table-chip').forEach(btn => {
    btn.classList.toggle('selected', (btn.textContent || '').includes(timeLabel.slice(0, 8)));
  });
}

function syncOrderModalFieldsForMode() {
  const valid       = currentFulfillmentMode;
  const kickerEl    = document.getElementById('order-modal-kicker');
  const titleEl     = document.getElementById('order-modal-title');
  const subEl       = document.getElementById('order-modal-sub');
  const blockTable  = document.getElementById('modal-block-table');
  const blockPhone  = document.getElementById('modal-block-phone');
  const blockPickup = document.getElementById('modal-block-pickup');
  const blockDeliv  = document.getElementById('modal-block-delivery');
  const prepayNote  = document.getElementById('modal-prepay-note');
  const guestLabel  = document.getElementById('guest-name-label');
  const submitBtn   = document.getElementById('btn-submit-order');

  if (blockTable)  blockTable.classList.toggle('hidden', valid !== 'dine_in');
  if (blockPhone)  blockPhone.classList.toggle('hidden', valid === 'dine_in');
  if (blockPickup) blockPickup.classList.toggle('hidden', valid !== 'pickup');
  if (blockDeliv)  blockDeliv.classList.toggle('hidden', valid !== 'delivery');
  if (prepayNote)  prepayNote.classList.toggle('hidden', valid === 'dine_in' || identityPreselectOnly);

  if (valid === 'pickup') {
    if (kickerEl)   kickerEl.textContent   = 'ORDEN PARA RECOGER (PICKUP) · PAGO ANTICIPADO';
    if (titleEl)    titleEl.textContent    = 'Datos para entregar tu Pickup';
    if (subEl)      subEl.textContent      = 'Te avisaremos en cuanto tu orden esté lista para recoger en mostrador.';
    if (guestLabel) guestLabel.textContent = '1. TU NOMBRE (QUIEN RECOGE)';
  } else if (valid === 'delivery') {
    if (kickerEl)   kickerEl.textContent   = 'ENVÍO A DOMICILIO · PAGO ANTICIPADO';
    if (titleEl)    titleEl.textContent    = '¿A dónde enviamos tu pedido?';
    if (subEl)      subEl.textContent      = 'Requerimos pago anticipado para procesar y despachar tu orden a domicilio.';
    if (guestLabel) guestLabel.textContent = '1. TU NOMBRE';
  } else {
    if (kickerEl)   kickerEl.textContent   = 'CUENTAS SEPARADAS POR MESA';
    if (titleEl)    titleEl.textContent    = '¿Tu mesa y tu nombre?';
    if (subEl)      subEl.textContent      = 'Si están en grupo en la misma mesa, cada quien tendrá su propia cuenta individual.';
    if (guestLabel) guestLabel.textContent = '2. TU NOMBRE (COMENSAL)';
  }

  if (submitBtn) {
    if (identityPreselectOnly) {
      submitBtn.textContent = 'Guardar Datos';
    } else if (valid === 'pickup' || valid === 'delivery') {
      submitBtn.textContent = '🔒 Ir al Pago Anticipado →';
    } else {
      submitBtn.textContent = 'Confirmar y Pedir';
    }
  }
}

function updateClientContextBar() {
  const tablePill = document.getElementById('ctx-table-pill');
  const guestPill = document.getElementById('ctx-guest-pill');
  const groupPill = document.getElementById('ctx-group-pill');
  if (!tablePill || !guestPill || !groupPill) return;

  const savedTable = presetTableFromURL || readTenantStorage('last-table') || '';
  const savedGuest = currentGuestName || readTenantStorage('guest-name') || '';
  const savedAddr  = readTenantStorage('delivery-address') || '';
  const savedPTime = readTenantStorage('pickup-time') || '15-20 min';

  if (currentFulfillmentMode === 'pickup') {
    tablePill.textContent = `🛍️ Pickup (${savedPTime})`;
    guestPill.textContent = savedGuest ? `👤 ${savedGuest}` : '👤 Tu nombre';
    groupPill.textContent = '🔒 Pago Anticipado ✎';
  } else if (currentFulfillmentMode === 'delivery') {
    tablePill.textContent = savedAddr ? `🛵 ${savedAddr.slice(0, 22)}${savedAddr.length > 22 ? '…' : ''}` : '🛵 Ingresar dirección';
    guestPill.textContent = savedGuest ? `👤 ${savedGuest}` : '👤 Tu nombre';
    groupPill.textContent = '+$25 envío · Pagar ✎';
  } else {
    tablePill.textContent = savedTable ? `📍 ${savedTable}` : '📍 Elegir Mesa';
    guestPill.textContent = savedGuest ? `👤 ${savedGuest}` : '👤 Tu nombre';
  }

  // Saludo personalizado
  const heroTitle  = document.getElementById('menu-hero-title');
  const heroKicker = document.getElementById('menu-hero-kicker');
  if (heroTitle)  heroTitle.textContent = savedGuest ? `Hola ${savedGuest}, ¿qué se te antoja?` : '¿Qué se te antoja hoy?';
  if (heroKicker) {
    if (currentFulfillmentMode === 'pickup') {
      heroKicker.textContent = 'MODO PICKUP · PAGO ANTICIPADO CON APPLE PAY / STRIPE';
    } else if (currentFulfillmentMode === 'delivery') {
      heroKicker.textContent = 'ENVÍO A DOMICILIO · PAGO ANTICIPADO CON APPLE PAY / STRIPE';
    } else {
      heroKicker.textContent = savedTable ? `${savedTable.toUpperCase()} · TOCA PARA ARMAR` : 'MENÚ · TOCA PARA ARMAR';
    }
  }

  // Presencia: quién más está pidiendo en la misma mesa (solo aplica en modo En Mesa)
  const stripEl   = document.getElementById('table-presence-strip');
  const avatarsEl = document.getElementById('presence-avatars');
  const textEl    = document.getElementById('presence-text');
  let groupInfo = null;

  if (currentFulfillmentMode === 'dine_in' && savedTable) {
    groupInfo = getTableGroupSummary(savedTable);
  }
  const diners = groupInfo ? groupInfo.diners : [];
  const others = diners.filter(d => !d.isMe);

  if (stripEl && avatarsEl && textEl) {
    if (currentFulfillmentMode === 'dine_in' && savedTable && others.length > 0) {
      stripEl.classList.remove('hidden');
      avatarsEl.innerHTML = diners.slice(0, 5).map(d =>
        renderDinerAvatar(d.guestName, { isMe: d.isMe, size: 'sm', status: d.latestStatus })
      ).join('') + (diners.length > 5 ? `<span class="diner-avatar size-sm more">+${diners.length - 5}</span>` : '');
      const names = others.slice(0, 2).map(d => d.guestName);
      const extra = others.length > 2 ? ` y ${others.length - 2} más` : '';
      textEl.textContent = `${names.join(', ')}${extra} ${others.length === 1 ? 'también pide' : 'también piden'} en ${savedTable}`;
    } else {
      stripEl.classList.add('hidden');
    }
  }

  if (currentFulfillmentMode === 'dine_in') {
    if (savedTable && diners.length > 1) {
      groupPill.textContent = `👥 ${diners.length} · $${groupInfo.tableTotal}`;
      return;
    }
    groupPill.textContent = (savedTable && savedGuest) ? 'Cuenta individual ✎' : 'Cuentas separadas ✎';
  }
}

function openIdentityPreselectModal() {
  unlockAudioContext();
  identityPreselectOnly = true;
  openOrderModalDirect();
}

function openOrderModalDirect() {
  const inputEl   = document.getElementById('table-input');
  const guestEl   = document.getElementById('guest-name-input');
  const phoneEl   = document.getElementById('customer-phone-input');
  const pTimeEl   = document.getElementById('pickup-time-input');
  const addrEl    = document.getElementById('delivery-address-input');
  const notesEl   = document.getElementById('delivery-notes-input');

  const savedTable = readTenantStorage('last-table') || '';
  const savedGuest = currentGuestName || readTenantStorage('guest-name') || '';
  const savedPhone = readTenantStorage('customer-phone') || '';
  const savedPTime = readTenantStorage('pickup-time') || 'Lo antes posible (15-20 min)';
  const savedAddr  = readTenantStorage('delivery-address') || '';
  const savedNotes = readTenantStorage('delivery-notes') || '';

  if (inputEl && !inputEl.value)   inputEl.value = presetTableFromURL || savedTable;
  if (guestEl && !guestEl.value && savedGuest) guestEl.value = savedGuest;
  if (phoneEl && !phoneEl.value && savedPhone) phoneEl.value = savedPhone;
  if (pTimeEl && !pTimeEl.value)   pTimeEl.value = savedPTime;
  if (addrEl  && !addrEl.value  && savedAddr)  addrEl.value  = savedAddr;
  if (notesEl && !notesEl.value && savedNotes) notesEl.value = savedNotes;

  syncOrderModalFieldsForMode();
  syncQuickTableChipSelection();

  if ('Notification' in window && Notification.permission === 'default') {
    try { Notification.requestPermission(); } catch (e) {}
  }

  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('order-modal').classList.add('open');
  setTimeout(() => {
    if (currentFulfillmentMode === 'dine_in' && inputEl && !inputEl.value.trim()) {
      inputEl.focus();
    } else if (guestEl && !guestEl.value.trim()) {
      guestEl.focus();
    } else if (currentFulfillmentMode === 'delivery' && addrEl && !addrEl.value.trim()) {
      addrEl.focus();
    }
  }, 50);
}

function closeOrderModal() {
  identityPreselectOnly = false;
  syncOrderModalFieldsForMode();
  document.getElementById('modal-overlay').classList.remove('open');
  document.getElementById('order-modal').classList.remove('open');
}

function normalizeTableName(rawTable) {
  return String(rawTable || 'Mostrador').trim().replace(/\s+/g, ' ');
}

function parseTableAndGuest(rawTableInput, rawGuestInput) {
  let tableStr = String(rawTableInput || '').trim();
  let guestStr = String(rawGuestInput || '').trim();

  if (!guestStr && /[·\-]/.test(tableStr)) {
    const parts = tableStr.split(/[·\-]/).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      tableStr = parts[0];
      guestStr = parts.slice(1).join(' ');
    }
  }

  const finalTable = normalizeTableName(tableStr || presetTableFromURL || 'Mostrador');
  const finalGuest = guestStr || currentGuestName || 'Comensal 1';
  return { table: finalTable, guestName: finalGuest };
}

function submitOrder() {
  unlockAudioContext();

  const tableInputEl = document.getElementById('table-input');
  const guestInputEl = document.getElementById('guest-name-input');
  const phoneInputEl = document.getElementById('customer-phone-input');
  const pTimeInputEl = document.getElementById('pickup-time-input');
  const addrInputEl  = document.getElementById('delivery-address-input');
  const notesInputEl = document.getElementById('delivery-notes-input');

  const rawTable = tableInputEl ? tableInputEl.value : '';
  const rawGuest = guestInputEl ? guestInputEl.value : '';
  const phoneVal = (phoneInputEl ? phoneInputEl.value.trim() : '') || '';
  const pTimeVal = (pTimeInputEl ? pTimeInputEl.value.trim() : '') || 'Lo antes posible (15-20 min)';
  const addrVal  = (addrInputEl  ? addrInputEl.value.trim()  : '') || '';
  const notesVal = (notesInputEl ? notesInputEl.value.trim() : '') || '';

  const parsed = parseTableAndGuest(rawTable, rawGuest);
  const guestVal = parsed.guestName;
  let tableVal = parsed.table;

  if (currentFulfillmentMode === 'pickup') {
    tableVal = 'Pickup';
  } else if (currentFulfillmentMode === 'delivery') {
    tableVal = 'A Domicilio';
  }

  currentGuestName = guestVal;

  if (currentFulfillmentMode === 'dine_in') {
    localStorage.setItem(storageKey('last-table'), tableVal);
  }
  localStorage.setItem(storageKey('guest-name'), guestVal);
  if (phoneVal) localStorage.setItem(storageKey('customer-phone'), phoneVal);
  if (pTimeVal) localStorage.setItem(storageKey('pickup-time'), pTimeVal);
  if (addrVal)  localStorage.setItem(storageKey('delivery-address'), addrVal);
  if (notesVal) localStorage.setItem(storageKey('delivery-notes'), notesVal);

  updateClientContextBar();
  renderCart();

  if (identityPreselectOnly) {
    closeOrderModal();
    const label = currentFulfillmentMode === 'delivery'
      ? `🛵 Domicilio · ${guestVal}`
      : (currentFulfillmentMode === 'pickup' ? `🛍️ Pickup · ${guestVal}` : `${tableVal} · 👤 ${guestVal}`);
    showToast(`✓ ${label} guardado`);
    return;
  }

  if (cartItems.length === 0) return;

  // En modo A Domicilio, verificar que haya puesto dirección antes de pasar al pago
  if (currentFulfillmentMode === 'delivery' && !addrVal) {
    if (addrInputEl) addrInputEl.focus();
    showToast('📍 Ingresa tu dirección de entrega para continuar');
    return;
  }

  const foodSubtotal = getCartTotal();
  const deliveryFee  = currentFulfillmentMode === 'delivery' ? (getActiveTenantProfile().deliveryFee || 25) : 0;

  const draftOrder = {
    tenantId,
    fulfillmentMode: currentFulfillmentMode,
    table: tableVal,
    guestName: guestVal,
    customerPhone: phoneVal,
    pickupTime: currentFulfillmentMode === 'pickup' ? pTimeVal : '',
    deliveryAddress: currentFulfillmentMode === 'delivery' ? addrVal : '',
    deliveryNotes: currentFulfillmentMode === 'delivery' ? notesVal : '',
    deviceId: DEVICE_ID,
    foodSubtotal,
    deliveryFee,
    total: foodSubtotal + deliveryFee,
    items: cartItems.map((it, idx) => ({
      id: idx + 1,
      key: it.key || '',
      station: it.station || '',
      name: it.name,
      emoji: it.emoji,
      price: it.price,
      qty: it.qty,
      guestName: guestVal,
    })),
  };

  closeOrderModal();
  if (tableInputEl && currentFulfillmentMode === 'dine_in') tableInputEl.value = tableVal;

  // Si es Pickup o A Domicilio, el pago anticipado es OBLIGATORIO antes de enviar a cocina
  if (currentFulfillmentMode === 'pickup' || currentFulfillmentMode === 'delivery') {
    openPaymentCheckoutModal({
      mode: 'prepay_order',
      draftOrder,
      subtotal: foodSubtotal,
      deliveryFee,
      table: tableVal,
      guestName: guestVal,
    });
    return;
  }

  // Modo En Mesa: enviar comanda a cocina de inmediato (puede pagar su cuenta separada desde el Tracker)
  dispatchConfirmedOrderToKitchen({
    ...draftOrder,
    paid: false,
    paymentMethod: null,
    paymentLabel: '',
    tipAmount: 0,
  });
}

function dispatchConfirmedOrderToKitchen(orderData) {
  orderCounter++;
  const order = {
    ...orderData,
    id: Date.now() + Math.floor(Math.random() * 1000),
    num: orderCounter,
    status: 'pending',
    createdAt: Date.now(),
  };

  orders.push(order);
  myOrderIds.push(order.id);
  activeTrackedOrderId = order.id;
  persistOrders();

  publishCloudSync('NEW_ORDER', order);

  // Limpiar carrito y abrir Rastreador en Tiempo Real
  cartItems = [];
  upsellOfferedForCart = false;
  const availBase = TACO_CONFIG.base.find(b => !isStockSoldOut(getStockKey('taco', 'base', b.id)));
  tacoDraft = { tortilla: availBase ? availBase.id : null, protein: null, toppings: [] };
  hotdogDraft = { toppings: [] };
  renderCart();

  setClientSubMode('tracker');
  const scrollEl = document.getElementById('client-scroll-container');
  if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'instant' });
}

// ══════════════════════════════════════════════
//  MOTOR DE PAGOS: STRIPE CONNECT + APPLE PAY / WALLET
// ══════════════════════════════════════════════
function openPaymentCheckoutModal({ mode, draftOrder = null, subtotal = 0, deliveryFee = 0, orderIds = [], table = '', guestName = '' }) {
  const profile = getActiveTenantProfile();
  selectedTipPercent = 10;

  activePaymentSession = {
    mode, // 'prepay_order' | 'pay_mine' | 'pay_table'
    draftOrder,
    orderIds,
    table,
    guestName,
    subtotal: Number(subtotal) || 0,
    deliveryFee: Number(deliveryFee) || 0,
    tipPct: selectedTipPercent,
    tipAmount: 0,
    grandTotal: 0,
  };

  const acctEl  = document.getElementById('pay-connect-acct-id');
  const titleEl = document.getElementById('pay-modal-title');
  const subEl   = document.getElementById('pay-modal-subtitle');
  const bioBox  = document.getElementById('apple-pay-biometric-box');
  const errEl   = document.getElementById('stripe-error-msg');

  if (acctEl) acctEl.textContent = profile.stripeAccountId || `acct_${profile.id}`;
  if (bioBox) bioBox.classList.add('hidden');
  if (errEl)  errEl.classList.add('hidden');

  if (mode === 'prepay_order' && draftOrder) {
    const isDeliv = draftOrder.fulfillmentMode === 'delivery';
    if (titleEl) {
      titleEl.textContent = isDeliv
        ? 'Pago Anticipado · Envío a Domicilio'
        : 'Pago Anticipado · Pickup Para Llevar';
    }
    if (subEl) {
      subEl.textContent = isDeliv
        ? `Tu pedido se enviará a ${draftOrder.deliveryAddress} al confirmar tu pago`
        : `Tu orden pasará directo a cocina de ${profile.name} al confirmar tu pago`;
    }
  } else if (mode === 'pay_table') {
    if (titleEl) titleEl.textContent = `Pagar Toda la Mesa (${table})`;
    if (subEl)   subEl.textContent   = `Liquida el total grupal de ${table} en ${profile.name}`;
  } else {
    if (titleEl) titleEl.textContent = `Pagar Mi Cuenta (${guestName || table})`;
    if (subEl)   subEl.textContent   = `Cuenta individual en ${table} · ${profile.name}`;
  }

  selectPaymentTipPct(10);

  const ov = document.getElementById('payment-modal-overlay');
  const md = document.getElementById('payment-modal');
  if (ov) ov.classList.add('open');
  if (md) md.classList.add('open');
}

function closePaymentModal() {
  const ov = document.getElementById('payment-modal-overlay');
  const md = document.getElementById('payment-modal');
  const bioBox = document.getElementById('apple-pay-biometric-box');
  if (ov) ov.classList.remove('open');
  if (md) md.classList.remove('open');
  if (bioBox) bioBox.classList.add('hidden');
}

function selectPaymentTipPct(pct) {
  selectedTipPercent = Number(pct) || 0;
  document.querySelectorAll('#pay-tip-pills .tip-pill').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.tip) === selectedTipPercent);
  });

  if (!activePaymentSession) return;
  const sub   = activePaymentSession.subtotal;
  const deliv = activePaymentSession.deliveryFee;
  const tip   = Math.round((sub * selectedTipPercent) / 100);
  const grand = sub + deliv + tip;

  activePaymentSession.tipPct     = selectedTipPercent;
  activePaymentSession.tipAmount  = tip;
  activePaymentSession.grandTotal = grand;

  const subEl      = document.getElementById('pay-sum-subtotal');
  const delivRow   = document.getElementById('pay-sum-delivery-row');
  const delivEl    = document.getElementById('pay-sum-delivery');
  const tipLblEl   = document.getElementById('pay-sum-tip-label');
  const tipEl      = document.getElementById('pay-sum-tip');
  const grandEl    = document.getElementById('pay-sum-grand-total');
  const apSubEl    = document.getElementById('btn-apple-pay-amount-label');
  const stripeBtn  = document.getElementById('btn-stripe-submit');

  if (subEl)    subEl.textContent   = `$${sub.toFixed(2)}`;
  if (delivRow) delivRow.classList.toggle('hidden', deliv <= 0);
  if (delivEl)  delivEl.textContent = `$${deliv.toFixed(2)}`;
  if (tipLblEl) tipLblEl.textContent = `Propina (${selectedTipPercent}%)`;
  if (tipEl)    tipEl.textContent   = `$${tip.toFixed(2)}`;
  if (grandEl)  grandEl.textContent = `$${grand.toFixed(2)} MXN`;
  if (apSubEl)  apSubEl.textContent = `Pagar $${grand.toFixed(2)} MXN`;
  if (stripeBtn) stripeBtn.textContent = `🔒 Pagar $${grand.toFixed(2)} con Tarjeta`;
}

function openTrackerPaymentModal(scope) {
  unlockAudioContext();
  const order = activeTrackedOrderId ? orders.find(o => o.id === activeTrackedOrderId) : null;
  if (!order) return;

  const groupInfo = getTableGroupSummary(order.table, order);
  const isTable   = scope === 'table';
  const normTable = normalizeTableName(order.table).toLowerCase();
  const tableOrders = orders.filter(o => o && normalizeTableName(o.table).toLowerCase() === normTable);

  const targetOrders = isTable
    ? tableOrders
    : tableOrders.filter(o => myOrderIds.includes(o.id) || o.deviceId === DEVICE_ID || (o.guestName || '').toLowerCase() === (groupInfo.myDiner.guestName || '').toLowerCase());

  const subtotal = isTable ? groupInfo.tableTotal : groupInfo.myTotal;

  openPaymentCheckoutModal({
    mode: isTable ? 'pay_table' : 'pay_mine',
    subtotal,
    deliveryFee: 0,
    orderIds: targetOrders.length > 0 ? targetOrders.map(o => o.id) : [order.id],
    table: order.table,
    guestName: isTable ? `Toda la Mesa (${groupInfo.diners.length})` : groupInfo.myDiner.guestName,
  });
}

function payWithApplePayWallet() {
  if (!activePaymentSession) return;
  unlockAudioContext();
  hapticTap(14);

  const bioBox   = document.getElementById('apple-pay-biometric-box');
  const ringEl   = document.getElementById('ap-faceid-ring');
  const statusEl = document.getElementById('ap-faceid-status');

  if (bioBox) bioBox.classList.remove('hidden');
  if (ringEl) ringEl.textContent = '☺';
  if (statusEl) statusEl.textContent = 'Verificando Face ID con Apple Wallet...';

  setTimeout(() => {
    if (ringEl) ringEl.textContent = '✓';
    if (statusEl) statusEl.textContent = '¡Pago Autorizado con Apple Pay!';
    playClientReadyDing();
    setTimeout(() => {
      completeDigitalPayment({
        paymentMethod: 'apple_pay',
        paymentLabel: 'Apple Pay',
        paymentRef: 'ap_' + Date.now().toString(36),
      });
    }, 520);
  }, 650);
}

function fillStripeDemoCard() {
  const numEl = document.getElementById('stripe-card-num');
  const expEl = document.getElementById('stripe-card-exp');
  const cvcEl = document.getElementById('stripe-card-cvc');
  const errEl = document.getElementById('stripe-error-msg');
  if (numEl) numEl.value = '4242 4242 4242 4242';
  if (expEl) expEl.value = '12/29';
  if (cvcEl) cvcEl.value = '888';
  if (errEl) errEl.classList.add('hidden');
  hapticTap(8);
}

function formatStripeCardInput(input) {
  const digits = String(input.value || '').replace(/\D/g, '').slice(0, 16);
  input.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatStripeExpInput(input) {
  const digits = String(input.value || '').replace(/\D/g, '').slice(0, 4);
  input.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function payWithStripeCard() {
  if (!activePaymentSession) return;
  unlockAudioContext();

  const numEl = document.getElementById('stripe-card-num');
  const expEl = document.getElementById('stripe-card-exp');
  const cvcEl = document.getElementById('stripe-card-cvc');
  const errEl = document.getElementById('stripe-error-msg');
  const btnEl = document.getElementById('btn-stripe-submit');

  const rawNum = (numEl ? numEl.value : '').replace(/\D/g, '');
  const rawExp = (expEl ? expEl.value : '').trim();
  const rawCvc = (cvcEl ? cvcEl.value : '').replace(/\D/g, '');

  if (rawNum.length < 12 || rawExp.length < 4 || rawCvc.length < 3) {
    if (errEl) {
      errEl.textContent = 'Completa tu tarjeta o toca "⚡ Autocompletar Demo (4242)" arriba';
      errEl.classList.remove('hidden');
    }
    return;
  }

  if (errEl) errEl.classList.add('hidden');
  const last4 = rawNum.slice(-4);
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = '🔒 Procesando con Stripe...';
  }

  setTimeout(() => {
    if (btnEl) btnEl.disabled = false;
    playClientReadyDing();
    completeDigitalPayment({
      paymentMethod: 'stripe_card',
      paymentLabel: `Stripe (•••• ${last4})`,
      paymentRef: 'pi_' + Date.now().toString(36),
    });
  }, 550);
}

function completeDigitalPayment({ paymentMethod, paymentLabel, paymentRef }) {
  if (!activePaymentSession) return;
  const session = activePaymentSession;
  activePaymentSession = null;
  closePaymentModal();

  // Caso 1: Pago Anticipado de una orden de Pickup o A Domicilio
  if (session.mode === 'prepay_order' && session.draftOrder) {
    const paidOrderData = {
      ...session.draftOrder,
      paid: true,
      paidAt: Date.now(),
      paymentMethod,
      paymentLabel,
      paymentRef,
      tipAmount: session.tipAmount,
      paidTotal: session.grandTotal,
      total: session.grandTotal,
    };
    dispatchConfirmedOrderToKitchen(paidOrderData);
    showCustomPushBanner({
      ledClass: 'led-ready',
      kicker: `✓ PAGO ANTICIPADO CONFIRMADO · ${paymentLabel.toUpperCase()}`,
      message: `Tu orden (${paidOrderData.table} · $${session.grandTotal}) fue enviada directo a cocina`,
    });
    return;
  }

  // Caso 2: Pago en Mesa desde el Rastreador (Mi Cuenta Individual o Toda la Mesa)
  const targetIds = Array.isArray(session.orderIds) ? session.orderIds : [];
  orders.forEach(o => {
    if (targetIds.includes(o.id)) {
      o.paid = true;
      o.paidAt = Date.now();
      o.paymentMethod = paymentMethod;
      o.paymentLabel = paymentLabel;
      o.paymentRef = paymentRef;
      o.tipAmount = session.tipAmount;
      o.paidTotal = session.grandTotal;
    }
  });

  persistOrders();
  publishCloudSync('ORDER_PAYMENT', {
    orderIds: targetIds,
    paymentMethod,
    paymentLabel,
    paymentRef,
    paidAt: Date.now(),
    tipAmount: session.tipAmount,
    amountPaid: session.grandTotal,
    table: session.table,
    guestName: session.guestName,
    scope: session.mode,
  });

  renderClientTracker();
  renderKDS();
  renderDailySales();

  showCustomPushBanner({
    ledClass: 'led-ready',
    kicker: `✓ CUENTA PAGADA CON ${paymentLabel.toUpperCase()}`,
    message: `Pago de $${session.grandTotal} MXN confirmado para ${session.table} (${session.guestName})`,
  });
  showToast(`✓ Pagado con ${paymentLabel} ($${session.grandTotal})`);
}

// ─── Sistema de Grupos por Mesa y Cuentas Separadas (Split Bill) ──
function getTableGroupSummary(tableName, referenceOrder = null) {
  const normTable = normalizeTableName(tableName).toLowerCase();
  const tableOrders = orders.filter(
    o => o && normalizeTableName(o.table).toLowerCase() === normTable
  );

  // Determinar el nombre del comensal actual
  const refGuest = (referenceOrder && referenceOrder.guestName)
    ? referenceOrder.guestName
    : (currentGuestName || readTenantStorage('guest-name') || 'Comensal 1');
  const normRefGuest = refGuest.trim().toLowerCase();

  const dinersMap = new Map();
  let tableTotal = 0;

  tableOrders.forEach(o => {
    const gName = (o.guestName || 'Comensal 1').trim();
    const gKey  = gName.toLowerCase();
    const isMe  = myOrderIds.includes(o.id) || o.deviceId === DEVICE_ID || gKey === normRefGuest;

    if (!dinersMap.has(gKey)) {
      dinersMap.set(gKey, {
        key: gKey,
        guestName: gName,
        isMe: false,
        total: 0,
        ordersCount: 0,
        orderNums: [],
        latestStatus: o.status || 'pending',
        items: [],
      });
    }

    const bucket = dinersMap.get(gKey);
    if (isMe) bucket.isMe = true;
    bucket.ordersCount += 1;
    bucket.orderNums.push(o.num);
    bucket.latestStatus = o.status || bucket.latestStatus;

    const orderAmt = Number(o.total) || 0;
    bucket.total += orderAmt;
    tableTotal   += orderAmt;

    (o.items || []).forEach(it => {
      bucket.items.push({
        ...it,
        orderNum: o.num,
        orderStatus: o.status,
      });
    });
  });

  // Si aún no había órdenes en la lista para este comensal pero sí referenceOrder
  const diners = Array.from(dinersMap.values()).sort((a, b) => (a.isMe === b.isMe ? 0 : a.isMe ? -1 : 1));
  const myDiner = diners.find(d => d.isMe) || (referenceOrder ? {
    key: normRefGuest,
    guestName: refGuest,
    isMe: true,
    total: Number(referenceOrder.total) || 0,
    ordersCount: 1,
    orderNums: [referenceOrder.num],
    latestStatus: referenceOrder.status || 'pending',
    items: referenceOrder.items || [],
  } : {
    key: normRefGuest,
    guestName: refGuest,
    isMe: true,
    total: getCartTotal(),
    ordersCount: 0,
    orderNums: [],
    latestStatus: 'pending',
    items: [],
  });

  return {
    table: normalizeTableName(tableName),
    tableOrdersCount: tableOrders.length,
    diners,
    myDiner,
    myTotal: myDiner.total,
    tableTotal: tableTotal || myDiner.total,
  };
}

function setTrackerSplitView(mode) {
  trackerSplitMode = mode === 'table' ? 'table' : 'mine';
  renderClientTracker();
}

// ─── Llamar al Mesero / Pedir la Cuenta (Individual o Grupal) ──
function getConfirmedSessionTable() {
  if (presetTableFromURL) return presetTableFromURL;
  const activeOrder = activeTrackedOrderId ? orders.find(o => o.id === activeTrackedOrderId) : null;
  if (clientMode === 'tracker' && activeOrder && activeOrder.table) return activeOrder.table;
  return '';
}

function requestTableService(type) {
  unlockAudioContext();
  const confirmedTable = getConfirmedSessionTable();
  if (!confirmedTable) {
    pendingServiceType = type;
    const titleEl = document.getElementById('service-modal-title');
    if (titleEl) {
      titleEl.textContent = type.startsWith('bill')
        ? '¿De qué mesa pides la cuenta?'
        : '¿En qué mesa necesitas al mesero?';
    }
    const inputEl = document.getElementById('service-table-input');
    const savedTable = readTenantStorage('last-table') || '';
    if (inputEl && !inputEl.value) {
      inputEl.value = savedTable;
    }
    const ov = document.getElementById('service-modal-overlay');
    const md = document.getElementById('service-table-modal');
    if (ov) ov.classList.add('open');
    if (md) md.classList.add('open');
    setTimeout(() => { if (inputEl) { inputEl.focus(); inputEl.select(); } }, 50);
    return;
  }
  dispatchServiceCall(type, confirmedTable);
}

function closeServiceTableModal() {
  pendingServiceType = null;
  const ov = document.getElementById('service-modal-overlay');
  const md = document.getElementById('service-table-modal');
  if (ov) ov.classList.remove('open');
  if (md) md.classList.remove('open');
}

function confirmServiceTableModal() {
  const inputEl = document.getElementById('service-table-input');
  const tableVal = (inputEl ? inputEl.value.trim() : '') || 'Mostrador';
  const type = pendingServiceType || 'waiter';
  localStorage.setItem(storageKey('last-table'), tableVal);
  closeServiceTableModal();
  dispatchServiceCall(type, tableVal);
}

function dispatchServiceCall(type, table) {
  const activeOrder = activeTrackedOrderId ? orders.find(o => o.id === activeTrackedOrderId) : null;
  const groupInfo   = getTableGroupSummary(table, activeOrder);
  const isBill      = type === 'bill' || type === 'bill_individual' || type === 'bill_table';
  const billScope   = type === 'bill_table' ? 'table' : 'individual';
  const guestName   = groupInfo.myDiner.guestName || currentGuestName || '';

  const callTotal = billScope === 'table'
    ? groupInfo.tableTotal
    : (groupInfo.myTotal || (activeOrder ? activeOrder.total : getCartTotal()));

  const breakdownText = groupInfo.diners.length > 1
    ? groupInfo.diners.map(d => `${d.guestName}: $${d.total}`).join(' · ')
    : '';

  const callKey = isBill ? `${table}::bill::${billScope}::${guestName}` : `${table}::waiter`;

  const callObj = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    callKey,
    type: isBill ? 'bill' : 'waiter',
    billScope: isBill ? billScope : null,
    table,
    guestName: isBill && billScope === 'individual' ? guestName : '',
    dinersCount: groupInfo.diners.length || 1,
    breakdownText,
    orderNum: activeOrder ? activeOrder.num : null,
    total: callTotal,
    createdAt: Date.now(),
  };

  serviceCalls = serviceCalls.filter(c => (c.callKey || `${c.table}::${c.type}`) !== callKey);
  serviceCalls.push(callObj);
  persistOrders();
  publishCloudSync('SERVICE_CALL', callObj);
  renderKDSServiceAlerts();

  const statusText = isBill
    ? (billScope === 'table'
        ? `✓ Cuenta grupal pedida ($${callTotal})`
        : `✓ Tu cuenta pedida ($${callTotal})`)
    : `✓ Mesero avisado (${table})`;

  const trackerFeedback = document.getElementById('tracker-service-feedback');
  const menuFeedback    = document.getElementById('menu-service-feedback');
  if (trackerFeedback) trackerFeedback.textContent = statusText;
  if (menuFeedback)    menuFeedback.textContent    = statusText;

  showCustomPushBanner({
    ledClass: isBill ? 'led-received' : 'led-ready',
    kicker: isBill
      ? (billScope === 'table' ? '👥 CUENTA GRUPAL SOLICITADA' : '👤 TU CUENTA INDIVIDUAL SOLICITADA')
      : '🔔 MESERO NOTIFICADO EN COCINA',
    message: isBill
      ? (billScope === 'table'
          ? `Llevarán la cuenta completa de ${table} ($${callTotal})`
          : `Llevarán tu cuenta individual (${guestName || table} · $${callTotal})`)
      : `El personal ya recibió tu aviso para ${table}`,
  });
  playClientReadyDing();

  showToast(isBill
    ? `🧾 Cuenta solicitada (${billScope === 'table' ? 'Mesa completa' : guestName || table}: $${callTotal})`
    : `🔔 Mesero notificado para ${table}`);
}

function renderClientTracker() {
  updateClientContextBar();
  if (clientMode !== 'tracker') return;

  const order = activeTrackedOrderId ? orders.find(o => o.id === activeTrackedOrderId) : null;
  const heroEl    = document.getElementById('tracker-hero-card');
  const numEl     = document.getElementById('tracker-order-num');
  const tableEl   = document.getElementById('tracker-table-name');
  const mainLedEl = document.getElementById('tracker-main-led');
  const titleEl   = document.getElementById('tracker-status-title');
  const descEl    = document.getElementById('tracker-status-desc');
  const totalEl   = document.getElementById('tracker-order-total');
  const itemsEl   = document.getElementById('tracker-items-list');
  const headingEl = document.getElementById('tracker-summary-heading');
  const progressEl = document.getElementById('tracker-progress-fill');
  const receiptMetaEl = document.getElementById('receipt-meta');

  if (!order) {
    // Si la orden ya fue entregada/cerrada en cocina, mostrar confirmación final limpia
    if (heroEl)     heroEl.dataset.status = 'ready';
    if (mainLedEl)  mainLedEl.className = 'led-dot led-ready';
    if (titleEl)    titleEl.textContent = 'Entregado';
    if (descEl)     descEl.textContent  = 'Tu pedido fue entregado. ¡Buen provecho!';
    if (progressEl) progressEl.style.width = '100%';
    document.querySelectorAll('#tracker-steps .tracker-step').forEach(stepEl => {
      stepEl.classList.add('done');
      stepEl.classList.remove('current');
    });
    return;
  }

  const meta      = STATUS_META[order.status] || STATUS_META.pending;
  const fMode     = order.fulfillmentMode || 'dine_in';
  const isRemote  = fMode === 'pickup' || fMode === 'delivery';
  const groupInfo = getTableGroupSummary(order.table, order);
  const myDiner   = groupInfo.myDiner;
  const hasGroup  = !isRemote && groupInfo.diners.length > 1;

  if (heroEl)    heroEl.dataset.status = order.status;
  if (numEl)     numEl.textContent   = `ORDEN #${String(order.num).padStart(3, '0')}`;
  if (tableEl) {
    if (fMode === 'pickup') {
      tableEl.textContent = `🛍️ Pickup · ${order.guestName || 'Cliente'}`;
    } else if (fMode === 'delivery') {
      tableEl.textContent = `🛵 A Domicilio · ${order.guestName || 'Cliente'}`;
    } else {
      tableEl.textContent = myDiner.guestName ? `${order.table} · ${myDiner.guestName}` : order.table;
    }
  }
  if (mainLedEl) mainLedEl.className = `led-dot ${meta.ledClass}`;
  if (titleEl)   titleEl.textContent = meta.label;
  if (descEl)    descEl.textContent  = meta.desc;
  if (progressEl) {
    const pct = [12, 40, 70, 100][meta.stepIndex] || 12;
    progressEl.style.width = `${pct}%`;
  }
  if (receiptMetaEl) {
    receiptMetaEl.textContent = `#${String(order.num).padStart(3, '0')} · ${localTimeLabel(order.createdAt || Date.now())}`;
  }

  // Personalizar el nodo 4 ("Listo") según modalidad
  const readyStepTitle = document.getElementById('tracker-step-ready-title');
  const readyStepSub   = document.getElementById('tracker-step-ready-sub');
  if (readyStepTitle && readyStepSub) {
    if (fMode === 'delivery') {
      readyStepTitle.textContent = 'En camino';
      readyStepSub.textContent   = 'A tu puerta';
    } else if (fMode === 'pickup') {
      readyStepTitle.textContent = 'Listo';
      readyStepSub.textContent   = 'Para recoger';
    } else {
      readyStepTitle.textContent = 'Listo';
      readyStepSub.textContent   = '¡Buen provecho!';
    }
  }

  // Detalles de Pickup / A Domicilio
  const fulfillBox = document.getElementById('tracker-fulfillment-box');
  if (fulfillBox) {
    if (fMode === 'pickup') {
      fulfillBox.classList.remove('hidden');
      fulfillBox.innerHTML = `
        <div class="tf-row"><span class="tf-label">Modalidad</span><span class="tf-val">🛍️ Pickup (Para Llevar)</span></div>
        <div class="tf-row"><span class="tf-label">Recolección</span><span class="tf-val">${escapeHTML(order.pickupTime || 'Lo antes posible')}</span></div>
        ${order.customerPhone ? `<div class="tf-row"><span class="tf-label">WhatsApp / Tel</span><span class="tf-val">${escapeHTML(order.customerPhone)}</span></div>` : ''}
      `;
    } else if (fMode === 'delivery') {
      fulfillBox.classList.remove('hidden');
      fulfillBox.innerHTML = `
        <div class="tf-row"><span class="tf-label">Modalidad</span><span class="tf-val">🛵 Envío a Domicilio (+$${order.deliveryFee || 25})</span></div>
        <div class="tf-row"><span class="tf-label">Dirección</span><span class="tf-val">${escapeHTML(order.deliveryAddress || '—')}</span></div>
        ${order.deliveryNotes ? `<div class="tf-row"><span class="tf-label">Referencias</span><span class="tf-val">${escapeHTML(order.deliveryNotes)}</span></div>` : ''}
        ${order.customerPhone ? `<div class="tf-row"><span class="tf-label">WhatsApp / Tel</span><span class="tf-val">${escapeHTML(order.customerPhone)}</span></div>` : ''}
      `;
    } else {
      fulfillBox.classList.add('hidden');
    }
  }

  // Actualizar los 4 nodos del rastreador
  document.querySelectorAll('#tracker-steps .tracker-step').forEach(stepEl => {
    const stepKey = stepEl.dataset.step;
    const idx = ORDER_PHASES.indexOf(stepKey);
    stepEl.classList.toggle('done', idx < meta.stepIndex);
    stepEl.classList.toggle('current', idx === meta.stepIndex);
  });

  // Presencia en la mesa (avatares + estado de cada comensal)
  const presenceCard  = document.getElementById('tracker-presence-card');
  const presenceList  = document.getElementById('tracker-presence-list');
  const presenceTitle = document.getElementById('tracker-presence-title');
  const presenceCount = document.getElementById('tracker-presence-count');
  if (presenceCard && presenceList) {
    if (hasGroup) {
      presenceCard.classList.remove('hidden');
      if (presenceTitle) presenceTitle.textContent = `EN ${order.table.toUpperCase()}`;
      if (presenceCount) presenceCount.textContent = `${groupInfo.diners.length} personas`;
      presenceList.innerHTML = groupInfo.diners.map(d => `
        <div class="presence-row${d.isMe ? ' is-me' : ''}">
          ${renderDinerAvatar(d.guestName, { isMe: d.isMe, size: 'md', status: d.latestStatus })}
          <div class="presence-info">
            <span class="presence-name">${escapeHTML(d.guestName)}${d.isMe ? ' <em>(tú)</em>' : ''}</span>
            <span class="presence-status st-${d.latestStatus}">${DINER_STATUS_LABEL[d.latestStatus] || 'Pidiendo'}</span>
          </div>
          <span class="presence-amount">$${d.total}</span>
        </div>
      `).join('');
    } else {
      presenceCard.classList.add('hidden');
    }
  }

  // Pestañas de Cuentas Separadas ("Mi Cuenta" vs "Toda la Mesa")
  const tabsWrap      = document.getElementById('tracker-split-tabs');
  const tabMineBtn    = document.getElementById('tab-split-mine');
  const tabTableBtn   = document.getElementById('tab-split-table');
  const tabMineLabel  = document.getElementById('tab-split-mine-label');
  const tabMineTotal  = document.getElementById('tab-split-mine-total');
  const tabTableLabel = document.getElementById('tab-split-table-label');
  const tabTableTotal = document.getElementById('tab-split-table-total');

  if (tabsWrap) {
    tabsWrap.dataset.active = trackerSplitMode;
    tabsWrap.classList.toggle('hidden', isRemote);
  }
  if (tabMineBtn)    tabMineBtn.classList.toggle('active', trackerSplitMode === 'mine');
  if (tabTableBtn)   tabTableBtn.classList.toggle('active', trackerSplitMode === 'table');
  if (tabMineLabel)  tabMineLabel.textContent  = 'Mi cuenta';
  if (tabMineTotal)  tabMineTotal.textContent  = `$${groupInfo.myTotal}`;
  if (tabTableLabel) tabTableLabel.textContent = hasGroup ? `Toda la mesa · ${groupInfo.diners.length}` : 'Toda la mesa';
  if (tabTableTotal) tabTableTotal.textContent = `$${groupInfo.tableTotal}`;

  // Estado de Pago Digital (Apple Pay / Stripe Connect)
  const paidStatusPill = document.getElementById('tracker-paid-status-pill');
  const payCard        = document.getElementById('tracker-digital-pay-card');
  const paidBanner     = document.getElementById('tracker-paid-confirmation-banner');
  const paidConfTitle  = document.getElementById('paid-conf-title');
  const paidConfSub    = document.getElementById('paid-conf-sub');
  const payMyBtnText   = document.getElementById('btn-pay-my-share-text');
  const payMyBtnAmt    = document.getElementById('btn-pay-my-share-amt');
  const payFullBtn     = document.getElementById('btn-pay-full-table');
  const payFullBtnText = document.getElementById('btn-pay-full-table-text');
  const payFullBtnAmt  = document.getElementById('btn-pay-full-table-amt');
  const assistCard     = document.getElementById('tracker-table-assistance-card');

  const isPaid = Boolean(order.paid);
  const payMethodLabel = order.paymentLabel || (order.paymentMethod === 'apple_pay' ? 'Apple Pay' : 'Stripe');

  if (paidStatusPill) {
    paidStatusPill.textContent = isPaid ? `✓ PAGADO · ${payMethodLabel.toUpperCase()}` : 'POR PAGAR';
    paidStatusPill.classList.toggle('is-paid', isPaid);
  }

  if (payCard)    payCard.classList.toggle('hidden', isPaid);
  if (paidBanner) paidBanner.classList.toggle('hidden', !isPaid);
  if (assistCard) assistCard.classList.toggle('hidden', isRemote);

  if (isPaid && paidConfTitle && paidConfSub) {
    paidConfTitle.textContent = `✓ Pagado con ${payMethodLabel} ($${order.paidTotal || order.total} MXN)`;
    paidConfSub.textContent   = order.tipAmount
      ? `Incluye $${order.tipAmount} de propina · Folio Stripe ${order.paymentRef || 'verificado'}`
      : `Transacción verificada · Folio ${order.paymentRef || 'activo'}`;
  }

  if (payMyBtnText) payMyBtnText.textContent = hasGroup ? `Pagar Mi Cuenta (${myDiner.guestName})` : 'Pagar Mi Cuenta';
  if (payMyBtnAmt)  payMyBtnAmt.textContent  = `$${groupInfo.myTotal}`;
  if (payFullBtn)   payFullBtn.classList.toggle('hidden', !hasGroup);
  if (payFullBtnText && hasGroup) payFullBtnText.textContent = `Pagar Toda la Mesa (${groupInfo.diners.length} personas)`;
  if (payFullBtnAmt  && hasGroup) payFullBtnAmt.textContent  = `$${groupInfo.tableTotal}`;

  // Botones de "Pedir Mi Cuenta" y "Pedir Cuenta de Toda la Mesa" al mesero
  const myBillBtnLabel   = document.getElementById('btn-bill-my-share-label');
  const fullBillBtn      = document.getElementById('btn-bill-full-table');
  const fullBillBtnLabel = document.getElementById('btn-bill-full-table-label');

  if (myBillBtnLabel) {
    myBillBtnLabel.textContent = hasGroup
      ? `Cuenta física · $${groupInfo.myTotal}`
      : `Pedir cuenta · $${groupInfo.myTotal}`;
  }
  if (fullBillBtn) fullBillBtn.classList.toggle('hidden', !hasGroup);
  if (fullBillBtnLabel && hasGroup) {
    fullBillBtnLabel.textContent = `Cuenta física de toda la mesa · $${groupInfo.tableTotal}`;
  }

  const itemRow = (it) => `
    <div class="tracker-item-row">
      <span class="ti-left"><span class="tracker-item-qty">${it.qty}×</span><span class="ti-name">${it.emoji || ''} ${escapeHTML(it.name)}</span></span>
      <span class="ti-amount">$${it.price * it.qty}</span>
    </div>
  `;

  // Desglose según la pestaña activa ('mine' vs 'table')
  if (trackerSplitMode === 'table') {
    if (headingEl) headingEl.textContent = `CUENTAS SEPARADAS · ${order.table.toUpperCase()}`;
    if (totalEl)   totalEl.textContent   = `$${groupInfo.tableTotal}`;

    if (itemsEl) {
      itemsEl.innerHTML = groupInfo.diners.map(d => `
        <div class="group-diner-card ${d.isMe ? 'is-me' : ''}">
          <div class="group-diner-header">
            <div class="group-diner-left">
              ${renderDinerAvatar(d.guestName, { isMe: d.isMe, size: 'sm', status: d.latestStatus })}
              <span class="group-diner-name">${escapeHTML(d.guestName)}</span>
              ${d.isMe ? '<span class="group-diner-tag">TÚ</span>' : ''}
            </div>
            <span class="group-diner-total">$${d.total}</span>
          </div>
          <div class="group-diner-items">
            ${d.items.map(itemRow).join('')}
          </div>
        </div>
      `).join('');
    }
  } else {
    if (headingEl) headingEl.textContent = `CUENTA DE ${String(myDiner.guestName || 'TI').toUpperCase()}`;
    if (totalEl)   totalEl.textContent   = `$${groupInfo.myTotal}`;

    const myItems = myDiner.items && myDiner.items.length > 0 ? myDiner.items : order.items;
    if (itemsEl) itemsEl.innerHTML = myItems.map(itemRow).join('');
  }
}


function showToast(msg) {
  const toast = document.getElementById('order-toast');
  const msgEl = document.getElementById('toast-msg');
  if (!toast) return;
  if (msgEl) msgEl.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// ══════════════════════════════════════════════
//  VISTA COCINA KDS (CON 4 ESTADOS + BLOQUEO PIN)
// ══════════════════════════════════════════════
let clockInterval = null;
let timerInterval = null;

function initKitchenView() {
  loadPersistedOrders();
  kdsUnlocked =
    sessionStorage.getItem(storageKey('unlocked')) === '1' ||
    (tenantId === 'escandon' && sessionStorage.getItem('escandon-kds-unlocked') === '1');
  renderKitchenLockState();
  renderKDSStockPanel();
  initQRGeneratorView();

  if (kdsUnlocked) {
    setKDSSubView(kdsSubView);
    renderKDS();
    renderKDSServiceAlerts();
    checkAndNotifyNewServiceCalls();
    renderDailySales();
    startClock();
    startTimers();
    retryUnsyncedCloud();
  }
}

function toggleKDSSalesView() {
  setKDSSubView(kdsSubView === 'sales' ? 'comandas' : 'sales');
}

function toggleKDSStockView() {
  setKDSSubView(kdsSubView === 'stock' ? 'comandas' : 'stock');
}

function toggleKDSQRsView() {
  setKDSSubView(kdsSubView === 'qrs' ? 'comandas' : 'qrs');
}

function setKDSSubView(subView) {
  const valid = ['comandas', 'sales', 'stock', 'qrs'];
  kdsSubView = valid.includes(subView) ? subView : 'comandas';

  const comandasEl = document.getElementById('kds-comandas-section');
  const salesEl    = document.getElementById('kds-sales-section');
  const stockEl    = document.getElementById('kds-stock-section');
  const qrsEl      = document.getElementById('kds-qrs-section');

  const salesBtn = document.getElementById('btn-kds-sales');
  const stockBtn = document.getElementById('btn-kds-stock');
  const qrsBtn   = document.getElementById('btn-kds-qrs');

  if (comandasEl) comandasEl.classList.toggle('hidden', kdsSubView !== 'comandas');
  if (salesEl)    salesEl.classList.toggle('hidden', kdsSubView !== 'sales');
  if (stockEl)    stockEl.classList.toggle('hidden', kdsSubView !== 'stock');
  if (qrsEl)      qrsEl.classList.toggle('hidden', kdsSubView !== 'qrs');

  if (salesBtn) salesBtn.classList.toggle('active', kdsSubView === 'sales');
  if (stockBtn) stockBtn.classList.toggle('active', kdsSubView === 'stock');
  if (qrsBtn)   qrsBtn.classList.toggle('active', kdsSubView === 'qrs');

  renderKDSServiceAlerts();

  if (kdsSubView === 'sales') {
    renderDailySales();
    renderMonthlyHistory();
    ensureXLSX(); // Precarga la librería de Excel para descargas inmediatas
    const autoChk = document.getElementById('auto-export-shift');
    if (autoChk) autoChk.checked = getAutoExportPreference();
  } else if (kdsSubView === 'stock') {
    renderKDSStockPanel();
  } else if (kdsSubView === 'qrs') {
    initQRGeneratorView();
  } else {
    renderKDS();
  }
}

// ─── Alertas en Vivo de Mesa (Llamar Mesero / Pedir Cuenta Individual o Grupal) en KDS ──
function renderKDSServiceAlerts() {
  const container = document.getElementById('kds-service-alerts');
  if (!container) return;

  if (!Array.isArray(serviceCalls) || serviceCalls.length === 0) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  container.classList.remove('hidden');
  container.innerHTML = serviceCalls.map(call => {
    const isBill = call.type === 'bill';
    let title = `🔔 ${call.table} · LLAMA AL MESERO`;
    if (isBill) {
      if (call.billScope === 'table') {
        title = `👥 ${call.table} · PIDE CUENTA DE TODA LA MESA`;
      } else if (call.guestName) {
        title = `👤 ${call.table} (${call.guestName}) · PIDE SU CUENTA INDIVIDUAL`;
      } else {
        title = `🧾 ${call.table} · PIDE LA CUENTA`;
      }
    }

    const subParts = [];
    if (isBill && call.total) {
      subParts.push(call.billScope === 'table'
        ? `Total Mesa: $${call.total}`
        : `Cobrar a ${call.guestName || call.table}: $${call.total}`);
    }
    if (isBill && call.billScope === 'table' && call.breakdownText) {
      subParts.push(`(${call.breakdownText})`);
    } else if (call.orderNum) {
      subParts.push(`Orden #${String(call.orderNum).padStart(3, '0')}`);
    }
    subParts.push(localTimeLabel(call.createdAt || Date.now()));

    return `
      <div class="service-alert-pill ${isBill ? 'type-bill' : 'type-waiter'}">
        <div class="service-alert-info">
          <span class="service-alert-title">${title}</span>
          <span class="service-alert-sub">${subParts.join(' · ')}</span>
        </div>
        <button type="button" class="btn-resolve-alert" onclick="resolveServiceCall(${call.id})">
          ✓ Atendido
        </button>
      </div>
    `;
  }).join('');
}

function resolveServiceCall(callId) {
  serviceCalls = serviceCalls.filter(c => c.id !== callId);
  persistOrders();
  publishCloudSync('SERVICE_RESOLVE', { id: callId });
  renderKDSServiceAlerts();
}

// ─── Panel de Stock / Agotar Producto con 1 Clic (Modo 86) ──
function getKDSStockGroups() {
  return [
    {
      title: 'TORTILLAS (TACOS)',
      items: TACO_CONFIG.base.map(it => ({
        key: getStockKey('taco', 'base', it.id),
        name: it.name,
      })),
    },
    {
      title: 'PROTEÍNAS (TACOS)',
      items: TACO_CONFIG.protein.map(it => ({
        key: getStockKey('taco', 'protein', it.id),
        name: it.name,
      })),
    },
    {
      title: 'COMPLEMENTOS (TACOS)',
      items: TACO_CONFIG.toppings.map(it => ({
        key: getStockKey('taco', 'topping', it.id),
        name: `${it.name} (Taco)`,
      })),
    },
    {
      title: 'HOT DOGS Y ADEREZOS',
      items: [
        { key: 'station:hotdog', name: '🌭 Hot Dog Base (Pan y Salchicha)' },
        ...HOTDOG_CONFIG.toppings.map(it => ({
          key: getStockKey('hotdog', 'topping', it.id),
          name: `${it.name} (Hot Dog)`,
        })),
      ],
    },
    {
      title: 'BEBIDAS (500 ML)',
      items: DRINKS_CONFIG.map(d => ({
        key: getStockKey(null, 'drink', d.id),
        name: `${d.emoji} ${d.name}`,
      })),
    },
  ];
}

function renderKDSStockPanel() {
  const listEl = document.getElementById('kds-stock-list');
  if (!listEl) return;

  const groups = getKDSStockGroups();
  listEl.innerHTML = groups.map(group => `
    <div class="stock-group-card">
      <div class="minimal-group-title">
        <span>${group.title}</span>
      </div>
      <div class="stock-items-grid">
        ${group.items.map(it => {
          const isOut = isStockSoldOut(it.key);
          return `
            <div class="stock-item-row ${isOut ? 'is-sold-out' : ''}" onclick="toggleStockItem('${it.key}')">
              <span class="stock-item-name">${it.name}</span>
              <button type="button" class="stock-status-pill ${isOut ? 'exhausted' : 'available'}" onclick="event.stopPropagation(); toggleStockItem('${it.key}')">
                ${isOut ? '✕ AGOTADO' : '● DISPONIBLE'}
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');
}

function toggleStockItem(stockKey) {
  const idx = soldOutItems.indexOf(stockKey);
  if (idx === -1) {
    soldOutItems.push(stockKey);
  } else {
    soldOutItems.splice(idx, 1);
  }
  persistOrders();
  publishCloudSync('STOCK_UPDATE', { soldOutItems });
  sanitizeDraftAgainstStock();
  renderKDSStockPanel();
  showKDSToast(idx === -1 ? 'Marcado como Agotado' : 'Marcado como Disponible');
}

function restoreAllStockItems() {
  if (soldOutItems.length === 0) {
    showKDSToast('Todo el menú ya está disponible');
    return;
  }
  soldOutItems = [];
  persistOrders();
  publishCloudSync('STOCK_UPDATE', { soldOutItems });
  sanitizeDraftAgainstStock();
  renderKDSStockPanel();
  showKDSToast('Todo el menú está disponible');
}

// ─── Generador de Códigos QR Imprimibles por Mesa ──
const QR_LIB_CDN = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';
let qrLibPromise = null;

function ensureQRLib() {
  if (typeof window.qrcode === 'function') return Promise.resolve(window.qrcode);
  if (qrLibPromise) return qrLibPromise;
  qrLibPromise = new Promise(resolve => {
    const s = document.createElement('script');
    s.src = QR_LIB_CDN;
    s.async = true;
    s.onload = () => resolve(typeof window.qrcode === 'function' ? window.qrcode : null);
    s.onerror = () => { qrLibPromise = null; resolve(null); };
    document.head.appendChild(s);
  });
  return qrLibPromise;
}

function getDefaultCustomerBaseUrl() {
  return window.location.origin + window.location.pathname;
}

function initQRGeneratorView() {
  const urlInput = document.getElementById('qr-base-url');
  if (urlInput && !urlInput.value.trim()) {
    urlInput.value = getDefaultCustomerBaseUrl();
  }
  renderTableQRCards();
}

function buildQRGraphicHTML(targetUrl) {
  if (typeof window.qrcode === 'function') {
    try {
      const qr = window.qrcode(0, 'M');
      qr.addData(targetUrl);
      qr.make();
      return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    } catch (e) {}
  }
  const encoded = encodeURIComponent(targetUrl);
  return `<img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=6&data=${encoded}" alt="QR" loading="lazy" />`;
}

function renderTableQRCardsSync() {
  const gridEl      = document.getElementById('qr-cards-grid');
  const countInput  = document.getElementById('qr-table-count');
  const urlInput    = document.getElementById('qr-base-url');
  const barraChk    = document.getElementById('qr-include-barra');
  if (!gridEl) return;

  const profile     = getActiveTenantProfile();
  const count       = Math.max(1, Math.min(50, parseInt(countInput ? countInput.value : '8', 10) || 8));
  const baseUrl     = (urlInput && urlInput.value.trim()) ? urlInput.value.trim() : getDefaultCustomerBaseUrl();
  const tenantParam = getTenantQueryParam();

  const tables = [];
  for (let i = 1; i <= count; i++) {
    tables.push({ label: `Mesa ${i}`, param: `Mesa ${i}` });
  }
  if (!barraChk || barraChk.checked) {
    tables.push({ label: 'Mostrador / Para llevar', param: 'Mostrador' });
  }

  gridEl.innerHTML = tables.map(t => {
    const fullUrl = `${baseUrl}?vista=cliente&mesa=${encodeURIComponent(t.param)}${tenantParam}`;
    return `
      <div class="qr-print-card">
        <div class="qr-card-brand" style="color:${profile.accent}">◈ ${profile.name}</div>
        <div class="qr-card-table">${t.label}</div>
        <div class="qr-card-box">${buildQRGraphicHTML(fullUrl)}</div>
        <div class="qr-card-cta">Escanea para ordenar y separar tu cuenta</div>
        <div class="qr-card-url">${fullUrl}</div>
      </div>
    `;
  }).join('');
}

function renderTableQRCards() {
  renderTableQRCardsSync();
  if (typeof window.qrcode !== 'function') {
    ensureQRLib().then(lib => {
      if (lib) renderTableQRCardsSync();
    });
  }
  return Promise.resolve();
}

function printTableQRCards() {
  renderTableQRCardsSync();
  setTimeout(() => window.print(), 120);
}

function startClock() {
  if (clockInterval) clearInterval(clockInterval);
  const el = document.getElementById('kds-clock');
  const tick = () => {
    if (!el) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    el.textContent = `${hh}:${mm}:${ss}`;
  };
  tick();
  clockInterval = setInterval(tick, 1000);
}

function startTimers() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => updateTimers(), 10000);
}

function updateTimers() {
  const now = Date.now();
  document.querySelectorAll('.order-timer').forEach(el => {
    const orderId = parseInt(el.dataset.orderId, 10);
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const elapsed = Math.floor((now - order.createdAt) / 60000);
    el.textContent = elapsed < 1 ? '< 1 min' : `${elapsed} min`;
    el.className = 'order-timer' + (elapsed >= 20 ? ' alert' : elapsed >= 10 ? ' warn' : '');
  });
}

function setKDSFilter(filter, btn) {
  kdsFilter = filter;
  document.querySelectorAll('.kds-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderKDS();
}

function renderKDS() {
  if (!kdsUnlocked) return;
  const board = document.getElementById('kds-board');
  if (!board) return;

  const filtered = kdsFilter === 'all'
    ? orders
    : orders.filter(o => o.status === kdsFilter);

  if (filtered.length === 0) {
    board.innerHTML = `
      <div class="kds-empty" id="kds-empty">
        <p>Sin comandas activas</p>
        <p class="kds-empty-sub">Los pedidos entrantes aparecerán al instante</p>
      </div>`;
    return;
  }

  board.innerHTML = filtered.map(order => {
    const meta = STATUS_META[order.status] || STATUS_META.pending;
    const elapsed = Math.floor((Date.now() - order.createdAt) / 60000);
    const timerClass = elapsed >= 20 ? 'alert' : elapsed >= 10 ? 'warn' : '';
    const timerTxt = elapsed < 1 ? '< 1 min' : `${elapsed} min`;
    const fMode = order.fulfillmentMode || 'dine_in';
    const isRemote = fMode === 'pickup' || fMode === 'delivery';
    const tableGroup = getTableGroupSummary(order.table, order);
    const hasTableGroup = !isRemote && (tableGroup.diners.length > 1 || tableGroup.tableOrdersCount > 1);
    const payBadgeHtml = order.paid
      ? `<span class="kds-pay-badge">✓ PAGADO · ${(order.paymentLabel || 'APPLE PAY').toUpperCase()}</span>`
      : '';

    let fulfillmentBannerHtml = '';
    if (fMode === 'pickup') {
      fulfillmentBannerHtml = `
        <div class="kds-fulfillment-banner mode-pickup">
          <span>🛍️ PICKUP (PARA LLEVAR) · 🕒 ${escapeHTML(order.pickupTime || 'Lo antes posible')}</span>
          ${order.customerPhone ? `<span class="kds-fulfillment-sub">📞 Tel: ${escapeHTML(order.customerPhone)}</span>` : ''}
        </div>
      `;
    } else if (fMode === 'delivery') {
      fulfillmentBannerHtml = `
        <div class="kds-fulfillment-banner mode-delivery">
          <span>🛵 ENVÍO A DOMICILIO (+$${order.deliveryFee || 25})</span>
          <span class="kds-fulfillment-sub">📍 ${escapeHTML(order.deliveryAddress || 'Sin dirección')}${order.deliveryNotes ? ` · (${escapeHTML(order.deliveryNotes)})` : ''}</span>
          ${order.customerPhone ? `<span class="kds-fulfillment-sub">📞 Tel: ${escapeHTML(order.customerPhone)}</span>` : ''}
        </div>
      `;
    }

    const actionsBtns = (() => {
      if (order.status === 'pending') return `
        <button class="order-btn btn-primary-step" onclick="changeOrderStatus(${order.id}, 'received')">✓ Recibir</button>
        <button class="order-btn btn-delete" onclick="deleteOrder(${order.id})">✕ Cancelar</button>
      `;
      if (order.status === 'received') return `
        <button class="order-btn btn-primary-step" onclick="changeOrderStatus(${order.id}, 'preparing')">▶ Preparar</button>
        <button class="order-btn" onclick="changeOrderStatus(${order.id}, 'pending')">↩ Atrás</button>
      `;
      if (order.status === 'preparing') return `
        <button class="order-btn btn-ready" onclick="changeOrderStatus(${order.id}, 'ready')">✓ Listo</button>
        <button class="order-btn" onclick="changeOrderStatus(${order.id}, 'received')">↩ Atrás</button>
      `;
      return `
        <button class="order-btn btn-ready" onclick="deliverOrder(${order.id})">✓ Entregar</button>
        <button class="order-btn" onclick="changeOrderStatus(${order.id}, 'preparing')">↩ Atrás</button>
      `;
    })();

    return `
      <div class="order-card status-${order.status}" id="order-${order.id}">
        <div class="order-card-header">
          <div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span class="order-num">#${String(order.num).padStart(3, '0')}</span>
              <span class="order-timer ${timerClass}" data-order-id="${order.id}">${timerTxt}</span>
              ${payBadgeHtml}
            </div>
            <div class="order-table-row">
              <span class="order-table">${escapeHTML(order.table)}</span>
              ${order.guestName ? `<span class="kds-diner-badge">👤 ${escapeHTML(order.guestName)}</span>` : ''}
            </div>
          </div>
          <span class="status-badge">
            <span class="led-dot ${meta.ledClass}"></span>
            <span>${meta.label}</span>
          </span>
        </div>
        ${fulfillmentBannerHtml}
        ${hasTableGroup ? `
          <div class="kds-table-group-pill">
            👥 Grupo ${escapeHTML(order.table)} (${tableGroup.diners.length} ${tableGroup.diners.length === 1 ? 'comensal' : 'comensales'}) · Total mesa: $${tableGroup.tableTotal}
          </div>
        ` : ''}
        <div class="order-items-list">
          ${order.items.map(it => `
            <div class="order-item-row">
              <span class="order-item-qty">${it.qty}x</span>
              <span class="order-item-name">${it.emoji} ${it.name}</span>
            </div>`).join('')}
        </div>
        <div class="order-total">Total individual${order.guestName ? ` (${order.guestName})` : ''}: $${order.total}</div>
        <div class="order-actions">${actionsBtns}</div>
      </div>`;
  }).join('');
}

function changeOrderStatus(orderId, newStatus) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  const prevStatus = order.status;
  order.status = newStatus;
  if (newStatus === 'ready') order.readyAt = Date.now();
  persistOrders();
  publishCloudSync('ORDER_STATUS', { id: orderId, status: newStatus, readyAt: order.readyAt || null });
  renderKDS();
  renderDailySales();
  notifyClientIfMyOrderChanged(order.id, prevStatus, newStatus, order.num);

  // Historial mensual (base de datos): guardar venta al marcar "Listo"
  if (newStatus === 'ready') {
    recordSalesForOrders([order], { cloud: true });
  } else if (prevStatus === 'ready') {
    removeSaleForOrder(order.id, { cloud: true });
  }
}

// Archiva un pedido "Listo" como entregado para limpiar el tablero KDS sin perder su venta en el Corte del Día
function deliverOrder(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (order && order.status === 'ready') {
    if (!completedOrders.some(c => c.id === order.id)) {
      completedOrders.push({ ...order, status: 'ready', deliveredAt: Date.now() });
    }
    recordSalesForOrders([order], { cloud: true });
  }
  orders = orders.filter(o => o.id !== orderId);
  persistOrders();
  publishCloudSync('ORDER_DELIVER', { id: orderId, order });
  renderKDS();
  renderDailySales();
  renderClientTracker();
  updateHeaderTrackerPill();
}

function deleteOrder(orderId) {
  orders = orders.filter(o => o.id !== orderId);
  persistOrders();
  publishCloudSync('ORDER_DELETE', { id: orderId });
  renderKDS();
  renderDailySales();
  renderClientTracker();
  updateHeaderTrackerPill();
}

// ══════════════════════════════════════════════
//  CORTE DEL DÍA ("VENTAS DEL DÍA" — PEDIDOS LISTOS)
// ══════════════════════════════════════════════
function formatMoney(amount) {
  return '$' + Number(amount || 0).toLocaleString('es-MX');
}

function calculateDailySales() {
  // Suma todos los pedidos marcados como "Listos" (tanto visibles en tablero como ya entregados en el turno)
  const readyMap = new Map();

  completedOrders.forEach(o => {
    if (o && o.id) readyMap.set(o.id, o);
  });

  orders.forEach(o => {
    if (o && o.id && o.status === 'ready') {
      readyMap.set(o.id, o);
    }
  });

  const readyList = Array.from(readyMap.values());

  let totalRevenue = 0;
  let totalUnits   = 0;

  const breakdown = {
    tacos:   { qty: 0, amount: 0 },
    hotdogs: { qty: 0, amount: 0 },
    aguas:   { qty: 0, amount: 0, jamaica: 0, horchata: 0 },
    cocas:   { qty: 0, amount: 0 },
  };

  readyList.forEach(order => {
    const items = Array.isArray(order.items) ? order.items : [];
    let computedOrderTotal = 0;

    items.forEach(it => {
      const qty     = Number(it.qty) || 0;
      const price   = Number(it.price) || 0;
      const lineAmt = qty * price;
      const key     = String(it.key || '').toLowerCase();
      const station = String(it.station || '').toLowerCase();
      const name    = String(it.name || '').toLowerCase();

      computedOrderTotal += lineAmt;
      totalUnits += qty;

      if (station === 'taco' || key.startsWith('taco:') || name.startsWith('taco')) {
        breakdown.tacos.qty    += qty;
        breakdown.tacos.amount += lineAmt;
      } else if (station === 'hotdog' || key.startsWith('hotdog:') || name.startsWith('hot dog') || name.startsWith('hotdog')) {
        breakdown.hotdogs.qty    += qty;
        breakdown.hotdogs.amount += lineAmt;
      } else if (key === 'drink_jamaica' || name.includes('jamaica')) {
        breakdown.aguas.qty     += qty;
        breakdown.aguas.amount  += lineAmt;
        breakdown.aguas.jamaica += qty;
      } else if (key === 'drink_horchata' || name.includes('horchata')) {
        breakdown.aguas.qty      += qty;
        breakdown.aguas.amount   += lineAmt;
        breakdown.aguas.horchata += qty;
      } else if (name.includes('agua')) {
        breakdown.aguas.qty    += qty;
        breakdown.aguas.amount += lineAmt;
      } else if (key === 'drink_coca' || name.includes('coca')) {
        breakdown.cocas.qty    += qty;
        breakdown.cocas.amount += lineAmt;
      }
    });

    totalRevenue += (typeof order.total === 'number' ? order.total : computedOrderTotal);
  });

  return {
    ordersCount: readyList.length,
    totalRevenue,
    totalUnits,
    breakdown,
  };
}

function renderDailySales() {
  if (!kdsUnlocked) return;

  const stats = calculateDailySales();

  const totalMoneyEl  = document.getElementById('sales-total-money');
  const ordersCountEl = document.getElementById('sales-orders-count');
  const totalUnitsEl  = document.getElementById('sales-total-units');
  const avgTicketEl   = document.getElementById('sales-avg-ticket');
  const topProdEl     = document.getElementById('sales-top-product');

  const qtyTacosEl   = document.getElementById('sales-qty-tacos');
  const amtTacosEl   = document.getElementById('sales-amt-tacos');
  const barTacosEl   = document.getElementById('sales-bar-tacos');
  const qtyHotdogsEl = document.getElementById('sales-qty-hotdogs');
  const amtHotdogsEl = document.getElementById('sales-amt-hotdogs');
  const barHotdogsEl = document.getElementById('sales-bar-hotdogs');
  const qtyAguasEl   = document.getElementById('sales-qty-aguas');
  const amtAguasEl   = document.getElementById('sales-amt-aguas');
  const subAguasEl   = document.getElementById('sales-sub-aguas');
  const barAguasEl   = document.getElementById('sales-bar-aguas');
  const qtyCocasEl   = document.getElementById('sales-qty-cocas');
  const amtCocasEl   = document.getElementById('sales-amt-cocas');
  const barCocasEl   = document.getElementById('sales-bar-cocas');

  if (totalMoneyEl)  totalMoneyEl.textContent = formatMoney(stats.totalRevenue);
  if (ordersCountEl) {
    ordersCountEl.textContent = stats.ordersCount === 1
      ? '1 pedido marcado como Listo'
      : `${stats.ordersCount} pedidos marcados como Listos`;
  }
  if (totalUnitsEl) {
    totalUnitsEl.textContent = stats.totalUnits === 1
      ? '1 vendido'
      : `${stats.totalUnits} vendidos`;
  }

  const avgTicket = stats.ordersCount > 0 ? Math.round(stats.totalRevenue / stats.ordersCount) : 0;
  if (avgTicketEl) avgTicketEl.textContent = formatMoney(avgTicket);

  if (topProdEl) {
    const candidates = [
      { label: '🌮 Tacos', qty: stats.breakdown.tacos.qty },
      { label: '🌭 Hot Dogs', qty: stats.breakdown.hotdogs.qty },
      { label: '💧 Aguas', qty: stats.breakdown.aguas.qty },
      { label: '🥤 Coca-Cola', qty: stats.breakdown.cocas.qty },
    ].sort((a, b) => b.qty - a.qty);
    topProdEl.textContent = candidates[0].qty > 0 ? `${candidates[0].label} (${candidates[0].qty})` : '—';
  }

  const rev = Math.max(1, stats.totalRevenue);
  const pct = (amt) => stats.totalRevenue > 0 ? Math.min(100, Math.round((amt / rev) * 100)) : 0;

  if (qtyTacosEl)   qtyTacosEl.textContent   = stats.breakdown.tacos.qty;
  if (amtTacosEl)   amtTacosEl.textContent   = formatMoney(stats.breakdown.tacos.amount);
  if (barTacosEl)   barTacosEl.style.width   = `${pct(stats.breakdown.tacos.amount)}%`;

  if (qtyHotdogsEl) qtyHotdogsEl.textContent = stats.breakdown.hotdogs.qty;
  if (amtHotdogsEl) amtHotdogsEl.textContent = formatMoney(stats.breakdown.hotdogs.amount);
  if (barHotdogsEl) barHotdogsEl.style.width = `${pct(stats.breakdown.hotdogs.amount)}%`;

  if (qtyAguasEl)   qtyAguasEl.textContent   = stats.breakdown.aguas.qty;
  if (amtAguasEl)   amtAguasEl.textContent   = formatMoney(stats.breakdown.aguas.amount);
  if (barAguasEl)   barAguasEl.style.width   = `${pct(stats.breakdown.aguas.amount)}%`;
  if (subAguasEl) {
    subAguasEl.textContent = stats.breakdown.aguas.qty > 0
      ? `$25 c/u · Jamaica: ${stats.breakdown.aguas.jamaica} · Horchata: ${stats.breakdown.aguas.horchata}`
      : '$25 c/u · Jamaica y Horchata';
  }

  if (qtyCocasEl)   qtyCocasEl.textContent   = stats.breakdown.cocas.qty;
  if (amtCocasEl)   amtCocasEl.textContent   = formatMoney(stats.breakdown.cocas.amount);
  if (barCocasEl)   barCocasEl.style.width   = `${pct(stats.breakdown.cocas.amount)}%`;

  renderExecutiveExcelPreview();
}

function openCloseShiftModal() {
  const stats  = calculateDailySales();
  const descEl = document.getElementById('shift-modal-desc');
  if (descEl) {
    descEl.textContent = `Se limpiará el corte del turno actual (${formatMoney(stats.totalRevenue)} en ventas) y los contadores volverán a cero. Las ventas quedan guardadas en el historial mensual.`;
  }
  const overlayEl = document.getElementById('shift-modal-overlay');
  const modalEl   = document.getElementById('shift-reset-modal');
  if (overlayEl) overlayEl.classList.add('open');
  if (modalEl)   modalEl.classList.add('open');
}

function closeCloseShiftModal() {
  const overlayEl = document.getElementById('shift-modal-overlay');
  const modalEl   = document.getElementById('shift-reset-modal');
  if (overlayEl) overlayEl.classList.remove('open');
  if (modalEl)   modalEl.classList.remove('open');
}

function confirmCloseShift() {
  // 1. Guardar todas las ventas del turno en el historial mensual ANTES de limpiar
  const shiftMap = new Map();
  completedOrders.forEach(o => { if (o && o.id) shiftMap.set(o.id, o); });
  orders.forEach(o => { if (o && o.id && o.status === 'ready') shiftMap.set(o.id, o); });
  const shiftOrders = Array.from(shiftMap.values());

  recordSalesForOrders(shiftOrders, { cloud: true });

  // 2. Respaldo automático en Excel del corte (si está activado)
  if (getAutoExportPreference() && shiftOrders.length > 0) {
    const now = new Date();
    const stamp = `${localDayKey(now.getTime())}_${pad2(now.getHours())}${pad2(now.getMinutes())}`;
    exportSalesWorkbook({
      records: shiftOrders.map(buildSaleRecord).sort((a, b) => a.ts - b.ts),
      periodLabel: `Corte del ${formatDayLabel(localDayKey(now.getTime()))}`,
      filename: `Escandon_Corte_${stamp}`,
      includeMonthly: false,
    });
  }

  // 3. Limpiar el día y regresar contadores a cero
  orders = [];
  completedOrders = [];
  serviceCalls = [];
  orderCounter = 0;
  activeTrackedOrderId = null;

  persistOrders();
  publishCloudSync('SHIFT_RESET', { resetAt: Date.now() });

  closeCloseShiftModal();
  renderKDS();
  renderKDSServiceAlerts();
  renderDailySales();
  renderClientTracker();
  updateHeaderTrackerPill();
  showKDSToast('Turno cerrado · Contadores en cero');
}

function showKDSToast(msg) {
  const toast = document.getElementById('kds-toast');
  const msgEl = document.getElementById('kds-toast-msg');
  if (!toast) return;
  if (msgEl) msgEl.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
}

// ══════════════════════════════════════════════
//  HISTORIAL MENSUAL · BASE DE DATOS DE VENTAS
//  - IndexedDB en el dispositivo de cocina (siempre activo)
//  - Copia opcional en la nube: Firebase Realtime Database
//    (se activa al llenar CLOUD_CONFIG.firebaseDatabaseURL)
// ══════════════════════════════════════════════
const KITCHEN_DEVICE_FLAG   = 'escandon-kds-device';
const AUTO_EXPORT_PREF_KEY  = 'escandon-auto-export';
const LEDGER_DB_NAME        = 'escandon-ledger';
const LEDGER_STORE          = 'sales';
const LEDGER_FALLBACK_KEY   = 'escandon-ledger-fallback';
const XLSX_CDN_URL          = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
const XLSX_FALLBACK_CDN_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
const MONTH_KEY_RE          = /^\d{4}-\d{2}$/;
const DAY_KEY_RE            = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_NAMES_ES        = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

let ledgerDbPromise      = null;
let historySelectedMonth = null;
let historyRefreshTimer  = null;
let cloudMonthKeysCache  = null;
let cloudRetryInProgress = false;
const cloudMonthsSynced  = new Set();

function isKitchenDevice() {
  return kdsUnlocked || localStorage.getItem(KITCHEN_DEVICE_FLAG) === '1';
}

function getAutoExportPreference() {
  return localStorage.getItem(AUTO_EXPORT_PREF_KEY) !== '0'; // Activado por defecto
}

function setAutoExportPreference(enabled) {
  localStorage.setItem(AUTO_EXPORT_PREF_KEY, enabled ? '1' : '0');
}

// ─── Fechas (hora local del restaurante) ───────
function pad2(n) {
  return String(n).padStart(2, '0');
}

function localDayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function localMonthKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function localTimeLabel(ts) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function monthLabel(monthKey) {
  if (!MONTH_KEY_RE.test(monthKey)) return monthKey;
  const [y, m] = monthKey.split('-');
  return `${MONTH_NAMES_ES[parseInt(m, 10) - 1]} ${y}`;
}

function formatDayLabel(dayKey) {
  if (!DAY_KEY_RE.test(dayKey)) return dayKey;
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

// ─── Clasificación de productos vendidos ───────
function categorizeSaleItem(it) {
  const key     = String(it.key || '').toLowerCase();
  const station = String(it.station || '').toLowerCase();
  const name    = String(it.name || '').toLowerCase();

  if (station === 'taco' || key.startsWith('taco:') || name.startsWith('taco')) return 'taco';
  if (station === 'hotdog' || key.startsWith('hotdog:') || name.startsWith('hot dog') || name.startsWith('hotdog')) return 'hotdog';
  if (key === 'drink_jamaica' || name.includes('jamaica')) return 'jamaica';
  if (key === 'drink_horchata' || name.includes('horchata')) return 'horchata';
  if (name.includes('agua')) return 'agua';
  if (key === 'drink_coca' || name.includes('coca')) return 'coca';
  return 'otro';
}

// Convierte una comanda en un registro de venta compacto para la base de datos
function buildSaleRecord(order) {
  const ts = order.readyAt || order.deliveredAt || order.createdAt || Date.now();
  const items = (Array.isArray(order.items) ? order.items : []).map(it => ({
    name: String(it.name || ''),
    qty: Number(it.qty) || 0,
    price: Number(it.price) || 0,
    cat: it.cat || categorizeSaleItem(it),
  }));
  const computedTotal = items.reduce((s, it) => s + it.qty * it.price, 0);

  return {
    id: order.id,
    branch: branchKey,
    num: Number(order.num) || 0,
    table: String(order.table || ''),
    guestName: String(order.guestName || ''),
    ts,
    createdAt: order.createdAt || ts,
    month: localMonthKey(ts),
    day: localDayKey(ts),
    total: typeof order.total === 'number' ? order.total : computedTotal,
    items,
  };
}

function countRecordProducts(record) {
  const c = { tacos: 0, hotdogs: 0, aguas: 0, jamaica: 0, horchata: 0, cocas: 0 };
  (record.items || []).forEach(it => {
    const q = Number(it.qty) || 0;
    if (it.cat === 'taco') c.tacos += q;
    else if (it.cat === 'hotdog') c.hotdogs += q;
    else if (it.cat === 'jamaica') { c.aguas += q; c.jamaica += q; }
    else if (it.cat === 'horchata') { c.aguas += q; c.horchata += q; }
    else if (it.cat === 'agua') c.aguas += q;
    else if (it.cat === 'coca') c.cocas += q;
  });
  return c;
}

function aggregateSaleRecords(records) {
  const mk = () => ({ qty: 0, amount: 0 });
  const agg = {
    orders: 0,
    total: 0,
    taco: mk(), hotdog: mk(), jamaica: mk(), horchata: mk(), agua: mk(), coca: mk(), otro: mk(),
    days: new Map(),
    months: new Map(),
  };

  records.forEach(r => {
    const total = Number(r.total) || 0;
    const counts = countRecordProducts(r);
    agg.orders += 1;
    agg.total += total;

    (r.items || []).forEach(it => {
      const bucket = agg[it.cat] || agg.otro;
      bucket.qty += Number(it.qty) || 0;
      bucket.amount += (Number(it.qty) || 0) * (Number(it.price) || 0);
    });

    [[agg.days, r.day], [agg.months, r.month]].forEach(([map, k]) => {
      const row = map.get(k) || { key: k, orders: 0, total: 0, tacos: 0, hotdogs: 0, aguas: 0, cocas: 0 };
      row.orders += 1;
      row.total += total;
      row.tacos += counts.tacos;
      row.hotdogs += counts.hotdogs;
      row.aguas += counts.aguas;
      row.cocas += counts.cocas;
      map.set(k, row);
    });
  });

  return agg;
}

// ─── IndexedDB (con respaldo en localStorage) ──
function openLedgerDB() {
  if (ledgerDbPromise) return ledgerDbPromise;
  ledgerDbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB no disponible'));
      return;
    }
    const req = indexedDB.open(LEDGER_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LEDGER_STORE)) {
        const store = db.createObjectStore(LEDGER_STORE, { keyPath: 'id' });
        store.createIndex('month', 'month', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  ledgerDbPromise.catch(() => { ledgerDbPromise = null; });
  return ledgerDbPromise;
}

function fallbackReadAll() {
  try { return JSON.parse(localStorage.getItem(LEDGER_FALLBACK_KEY) || '{}'); } catch (e) { return {}; }
}

function fallbackWriteAll(map) {
  try { localStorage.setItem(LEDGER_FALLBACK_KEY, JSON.stringify(map)); } catch (e) {}
}

// overwrite=false → solo inserta si el registro no existe todavía
async function ledgerUpsert(records, { overwrite = true } = {}) {
  if (!records || records.length === 0) return;
  try {
    const db = await openLedgerDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(LEDGER_STORE, 'readwrite');
      const store = tx.objectStore(LEDGER_STORE);
      records.forEach(r => {
        if (overwrite) {
          store.put(r);
        } else {
          const getReq = store.get(r.id);
          getReq.onsuccess = () => { if (!getReq.result) store.put(r); };
        }
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (e) {
    const map = fallbackReadAll();
    records.forEach(r => { if (overwrite || !map[r.id]) map[r.id] = r; });
    fallbackWriteAll(map);
  }
}

async function ledgerGet(id) {
  try {
    const db = await openLedgerDB();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(LEDGER_STORE, 'readonly').objectStore(LEDGER_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return fallbackReadAll()[id] || null;
  }
}

async function ledgerDelete(id) {
  try {
    const db = await openLedgerDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(LEDGER_STORE, 'readwrite');
      tx.objectStore(LEDGER_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    const map = fallbackReadAll();
    delete map[id];
    fallbackWriteAll(map);
  }
}

async function ledgerGetAll() {
  let all = [];
  try {
    const db = await openLedgerDB();
    all = await new Promise((resolve, reject) => {
      const req = db.transaction(LEDGER_STORE, 'readonly').objectStore(LEDGER_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    all = Object.values(fallbackReadAll());
  }
  return all.filter(r => {
    if (!r || !MONTH_KEY_RE.test(r.month)) return false;
    const recordBranch = r.branch || 'escandon';
    if (tenantId === 'escandon') {
      return recordBranch === 'escandon' || recordBranch === 'escandon-main';
    }
    return recordBranch === tenantId;
  });
}

// ─── Nube opcional: Firebase Realtime Database (REST) ──
function firebaseBaseUrl() {
  return (CLOUD_CONFIG.firebaseDatabaseURL || '').trim().replace(/\/$/, '');
}

function cloudSalesUrl(suffix) {
  return `${firebaseBaseUrl()}/restaurantes/${tenantId}/ventas${suffix}.json`;
}

function stripLocalFields(record) {
  const { cloudSynced, ...rest } = record;
  return rest;
}

async function cloudPutSale(record) {
  if (!firebaseBaseUrl()) return false;
  try {
    const res = await fetch(cloudSalesUrl(`/${record.month}/${record.id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stripLocalFields(record)),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function cloudDeleteSale(record) {
  if (!firebaseBaseUrl() || !record) return;
  try {
    await fetch(cloudSalesUrl(`/${record.month}/${record.id}`), { method: 'DELETE' });
  } catch (e) {}
}

async function cloudFetchMonth(month) {
  if (!firebaseBaseUrl() || !MONTH_KEY_RE.test(month)) return null;
  try {
    const res = await fetch(cloudSalesUrl(`/${month}`));
    if (!res.ok) return null;
    const data = await res.json();
    return data ? Object.values(data).filter(r => r && r.id && MONTH_KEY_RE.test(r.month)) : [];
  } catch (e) {
    return null;
  }
}

async function cloudFetchMonthKeys() {
  if (!firebaseBaseUrl()) return null;
  try {
    const res = await fetch(`${cloudSalesUrl('')}?shallow=true`);
    if (!res.ok) return null;
    const data = await res.json();
    return data ? Object.keys(data).filter(k => MONTH_KEY_RE.test(k)) : [];
  } catch (e) {
    return null;
  }
}

// Reintenta subir a la nube las ventas guardadas sin conexión
async function retryUnsyncedCloud() {
  if (!firebaseBaseUrl() || !isKitchenDevice() || cloudRetryInProgress) return;
  cloudRetryInProgress = true;
  try {
    const pending = (await ledgerGetAll()).filter(r => !r.cloudSynced);
    const synced = [];
    for (const r of pending) {
      if (await cloudPutSale(r)) synced.push({ ...r, cloudSynced: true });
    }
    if (synced.length) await ledgerUpsert(synced, { overwrite: true });
  } finally {
    cloudRetryInProgress = false;
  }
}

// ─── Registrar / retirar ventas ────────────────
// cloud=true → acción hecha en ESTE dispositivo (también se sube a Firebase si está configurado)
function recordSalesForOrders(orderList, { cloud = false } = {}) {
  if (!isKitchenDevice()) return Promise.resolve([]);
  const list = (orderList || []).filter(o => o && o.id && Array.isArray(o.items));
  if (list.length === 0) return Promise.resolve([]);

  const records = list.map(o => ({ ...buildSaleRecord(o), cloudSynced: false }));

  return ledgerUpsert(records, { overwrite: cloud })
    .then(async () => {
      if (cloud && firebaseBaseUrl()) {
        const synced = [];
        for (const r of records) {
          if (await cloudPutSale(r)) synced.push({ ...r, cloudSynced: true });
        }
        if (synced.length) await ledgerUpsert(synced, { overwrite: true });
      }
      scheduleHistoryRefresh();
      return records;
    })
    .catch(() => []);
}

function removeSaleForOrder(orderId, { cloud = false } = {}) {
  if (!isKitchenDevice()) return Promise.resolve();
  return ledgerGet(orderId)
    .then(async record => {
      await ledgerDelete(orderId);
      if (cloud && record) await cloudDeleteSale(record);
      scheduleHistoryRefresh();
    })
    .catch(() => {});
}

// ─── Panel visual del historial mensual ────────
function scheduleHistoryRefresh() {
  if (historyRefreshTimer) clearTimeout(historyRefreshTimer);
  historyRefreshTimer = setTimeout(() => {
    if (kdsUnlocked && kdsSubView === 'sales') renderMonthlyHistory();
  }, 150);
}

function onHistoryMonthChange(value) {
  if (!MONTH_KEY_RE.test(value)) return;
  historySelectedMonth = value;
  renderMonthlyHistory();
}

async function renderMonthlyHistory() {
  if (!kdsUnlocked) return;
  if (!historySelectedMonth) historySelectedMonth = localMonthKey(Date.now());

  // 1. Pintar al instante con los datos guardados en el dispositivo
  await paintMonthlyHistory();

  // 2. Si hay nube configurada, traer siempre los datos más recientes del mes desde Firebase
  if (firebaseBaseUrl()) {
    let changed = false;
    const keys = await cloudFetchMonthKeys();
    if (keys) { cloudMonthKeysCache = keys; changed = true; }

    const month = historySelectedMonth;
    const remote = await cloudFetchMonth(month);
    if (remote) {
      cloudMonthsSynced.add(month);
      await ledgerUpsert(remote.map(r => ({ ...r, cloudSynced: true })), { overwrite: true });
      changed = true;
    }
    if (changed) await paintMonthlyHistory();
    retryUnsyncedCloud();
  }
}

async function paintMonthlyHistory() {
  const selectEl   = document.getElementById('history-month-select');
  const statusEl   = document.getElementById('history-db-status');
  const totalEl    = document.getElementById('hist-total');
  const ordersEl   = document.getElementById('hist-orders');
  const avgEl      = document.getElementById('hist-avg');
  const daysEl     = document.getElementById('hist-days');
  const productsEl = document.getElementById('hist-products');
  const listEl     = document.getElementById('hist-days-list');
  if (!selectEl || !listEl) return;

  const hasCloud = Boolean(firebaseBaseUrl());
  if (statusEl) {
    statusEl.textContent = hasCloud ? '☁ Nube + este dispositivo' : 'Guardado en este dispositivo';
    statusEl.classList.toggle('cloud', hasCloud);
  }

  const all = await ledgerGetAll();
  const currentMonth = localMonthKey(Date.now());

  const monthSet = new Set(all.map(r => r.month));
  monthSet.add(currentMonth);
  monthSet.add(historySelectedMonth);
  (cloudMonthKeysCache || []).forEach(m => monthSet.add(m));

  const months = Array.from(monthSet).filter(m => MONTH_KEY_RE.test(m)).sort().reverse();
  selectEl.innerHTML = months
    .map(m => `<option value="${m}"${m === historySelectedMonth ? ' selected' : ''}>${monthLabel(m)}</option>`)
    .join('');

  const monthRecords = all.filter(r => r.month === historySelectedMonth);
  const agg = aggregateSaleRecords(monthRecords);
  const daysWithSales = agg.days.size;
  const aguasQty = agg.jamaica.qty + agg.horchata.qty + agg.agua.qty;

  if (totalEl)    totalEl.textContent    = formatMoney(agg.total);
  if (ordersEl)   ordersEl.textContent   = agg.orders;
  if (avgEl)      avgEl.textContent      = formatMoney(daysWithSales ? Math.round(agg.total / daysWithSales) : 0);
  if (daysEl)     daysEl.textContent     = daysWithSales;
  if (productsEl) productsEl.textContent = `🌮 ${agg.taco.qty} · 🌭 ${agg.hotdog.qty} · 💧 ${aguasQty} · 🥤 ${agg.coca.qty}`;

  const dayRows = Array.from(agg.days.values())
    .filter(d => DAY_KEY_RE.test(d.key))
    .sort((a, b) => (a.key < b.key ? 1 : -1));

  listEl.innerHTML = dayRows.length === 0
    ? '<p class="history-empty">Sin ventas registradas este mes</p>'
    : dayRows.map(d => `
        <div class="history-day-row">
          <span class="history-day-date">${formatDayLabel(d.key)}</span>
          <span class="history-day-orders">${d.orders} ${d.orders === 1 ? 'pedido' : 'pedidos'}</span>
          <span class="history-day-total">${formatMoney(d.total)}</span>
        </div>`).join('');
}

// ─── Exportación a Excel Ejecutivo (.xlsx con estilos contables) ───
let xlsxLoadPromise = null;

function ensureXLSX() {
  if (window.XLSX && window.XLSX.utils) return Promise.resolve(window.XLSX);
  if (xlsxLoadPromise) return xlsxLoadPromise;
  xlsxLoadPromise = new Promise(resolve => {
    const s = document.createElement('script');
    s.src = XLSX_CDN_URL;
    s.async = true;
    s.onload = () => resolve(window.XLSX && window.XLSX.utils ? window.XLSX : null);
    s.onerror = () => {
      const fb = document.createElement('script');
      fb.src = XLSX_FALLBACK_CDN_URL;
      fb.async = true;
      fb.onload = () => resolve(window.XLSX && window.XLSX.utils ? window.XLSX : null);
      fb.onerror = () => { xlsxLoadPromise = null; resolve(null); };
      document.head.appendChild(fb);
    };
    document.head.appendChild(s);
  });
  return xlsxLoadPromise;
}

function buildSalesSheetsData(records, periodLabel, includeMonthly) {
  const agg = aggregateSaleRecords(records);
  const daysWithSales = agg.days.size;
  const aguasQty = agg.jamaica.qty + agg.horchata.qty + agg.agua.qty;
  const aguasAmt = agg.jamaica.amount + agg.horchata.amount + agg.agua.amount;
  const generated = new Date().toLocaleString('es-MX');
  const totalRev = agg.total || 0;
  const shareOf = (amt) => (totalRev > 0 ? Math.round((amt / totalRev) * 1000) / 1000 : 0);

  const profile = getActiveTenantProfile();
  const resumen = [
    [`${profile.name.toUpperCase()} — REPORTE EJECUTIVO DE VENTAS`, '', '', ''],
    ['Periodo', periodLabel, 'Sucursal ID', profile.id],
    ['Generado', generated, 'Moneda', 'MXN ($)'],
    [],
    ['Concepto / Producto', 'Unidades', 'Importe ($ MXN)', '% Participación'],
    ['Tacos ($28.00)', agg.taco.qty, agg.taco.amount, shareOf(agg.taco.amount)],
    ['Hot Dogs ($35.00)', agg.hotdog.qty, agg.hotdog.amount, shareOf(agg.hotdog.amount)],
    ['Agua de Jamaica ($25.00)', agg.jamaica.qty, agg.jamaica.amount, shareOf(agg.jamaica.amount)],
    ['Agua de Horchata ($25.00)', agg.horchata.qty, agg.horchata.amount, shareOf(agg.horchata.amount)],
  ];
  if (agg.agua.qty > 0) resumen.push(['Otras aguas', agg.agua.qty, agg.agua.amount, shareOf(agg.agua.amount)]);
  resumen.push(['Coca-Cola ($30.00)', agg.coca.qty, agg.coca.amount, shareOf(agg.coca.amount)]);
  if (agg.otro.qty > 0) resumen.push(['Otros productos', agg.otro.qty, agg.otro.amount, shareOf(agg.otro.amount)]);
  resumen.push(
    [],
    ['Subtotal Aguas Frescas', aguasQty, aguasAmt, shareOf(aguasAmt)],
    ['Total de Pedidos Completados', agg.orders, '', ''],
    ['Días Operativos con Venta', daysWithSales, '', ''],
    ['Ticket Promedio por Orden', '', agg.orders ? Math.round((agg.total / agg.orders) * 100) / 100 : 0, ''],
    ['Promedio de Venta Diaria', '', daysWithSales ? Math.round((agg.total / daysWithSales) * 100) / 100 : 0, ''],
    ['TOTAL DE GANANCIAS ($ MXN)', '', agg.total, 1],
  );

  const sheets = [{
    name: 'Resumen',
    sheetType: 'resumen',
    rows: resumen,
    cols: [30, 14, 18, 16],
    moneyCols: [2],
    pctCols: [3],
    headerRow: 4,
  }];

  if (includeMonthly) {
    const monthRows = Array.from(agg.months.values()).sort((a, b) => (a.key > b.key ? 1 : -1));
    sheets.push({
      name: 'Por Mes',
      sheetType: 'table',
      rows: [
        ['Mes', 'Pedidos', 'Tacos', 'Hot Dogs', 'Aguas', 'Coca-Colas', 'Total ($ MXN)'],
        ...monthRows.map(m => [monthLabel(m.key), m.orders, m.tacos, m.hotdogs, m.aguas, m.cocas, m.total]),
        ['TOTAL ACUMULADO', agg.orders, agg.taco.qty, agg.hotdog.qty, aguasQty, agg.coca.qty, agg.total],
      ],
      cols: [20, 12, 11, 12, 11, 13, 18],
      moneyCols: [6],
      headerRow: 0,
      hasTotalFooter: true,
    });
  }

  const dayRows = Array.from(agg.days.values()).sort((a, b) => (a.key > b.key ? 1 : -1));
  sheets.push({
    name: 'Por Día',
    sheetType: 'table',
    rows: [
      ['Fecha', 'Pedidos', 'Tacos', 'Hot Dogs', 'Aguas', 'Coca-Colas', 'Ticket Promedio', 'Total ($ MXN)'],
      ...dayRows.map(d => [
        d.key,
        d.orders,
        d.tacos,
        d.hotdogs,
        d.aguas,
        d.cocas,
        d.orders ? Math.round((d.total / d.orders) * 100) / 100 : 0,
        d.total,
      ]),
      [
        'TOTAL',
        agg.orders,
        agg.taco.qty,
        agg.hotdog.qty,
        aguasQty,
        agg.coca.qty,
        agg.orders ? Math.round((agg.total / agg.orders) * 100) / 100 : 0,
        agg.total,
      ],
    ],
    cols: [14, 11, 10, 11, 10, 12, 16, 18],
    moneyCols: [6, 7],
    headerRow: 0,
    hasTotalFooter: true,
  });

  const sortedRecords = records.slice().sort((a, b) => a.ts - b.ts);
  sheets.push({
    name: 'Detalle',
    sheetType: 'table',
    rows: [
      ['Fecha', 'Hora', 'Folio', 'Mesa / Comensal', 'Tacos', 'Hot Dogs', 'Aguas', 'Coca-Colas', 'Detalle de Productos', 'Total ($ MXN)'],
      ...sortedRecords.map(r => {
        const c = countRecordProducts(r);
        const productos = (r.items || []).map(it => `${it.qty}x ${it.name}`).join(' · ');
        const tableAndGuest = r.guestName ? `${r.table} (${r.guestName})` : r.table;
        return [r.day, localTimeLabel(r.ts), `#${String(r.num).padStart(3, '0')}`, tableAndGuest, c.tacos, c.hotdogs, c.aguas, c.cocas, productos, Number(r.total) || 0];
      }),
      ['TOTAL', '', `${sortedRecords.length} órdenes`, '', agg.taco.qty, agg.hotdog.qty, aguasQty, agg.coca.qty, 'SUMA CONTABLE VERIFICADA', agg.total],
    ],
    cols: [13, 9, 10, 24, 9, 11, 9, 12, 58, 16],
    moneyCols: [9],
    headerRow: 0,
    hasTotalFooter: true,
  });

  return sheets;
}

function applyExecutiveWorksheetStyles(ws, sheet, XLSXlib) {
  ws['!cols'] = sheet.cols.map(wch => ({ wch }));
  const totalRows = sheet.rows.length;
  const totalCols = sheet.cols.length;

  const thinBorder = {
    top:    { style: 'thin', color: { rgb: 'E2E8F0' } },
    bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
    left:   { style: 'thin', color: { rgb: 'E2E8F0' } },
    right:  { style: 'thin', color: { rgb: 'E2E8F0' } },
  };

  const headerStyle = {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '1E293B' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top:    { style: 'medium', color: { rgb: '0F172A' } },
      bottom: { style: 'medium', color: { rgb: '0F172A' } },
      left:   { style: 'thin',   color: { rgb: '334155' } },
      right:  { style: 'thin',   color: { rgb: '334155' } },
    },
  };

  const totalRowStyle = {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '065F46' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'ECFDF5' } },
    alignment: { vertical: 'center' },
    border: {
      top:    { style: 'medium', color: { rgb: '059669' } },
      bottom: { style: 'double', color: { rgb: '059669' } },
      left:   { style: 'thin',   color: { rgb: 'A7F3D0' } },
      right:  { style: 'thin',   color: { rgb: 'A7F3D0' } },
    },
  };

  // Alturas de fila ejecutivas para lectura limpia
  const rowHeights = [];
  for (let r = 0; r < totalRows; r++) {
    if (sheet.sheetType === 'resumen' && r === 0) rowHeights.push({ hpt: 32 });
    else if (r === sheet.headerRow) rowHeights.push({ hpt: 25 });
    else if (r === totalRows - 1) rowHeights.push({ hpt: 24 });
    else rowHeights.push({ hpt: 20 });
  }
  ws['!rows'] = rowHeights;

  if (sheet.sheetType === 'resumen') {
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
  }

  for (let r = 0; r < totalRows; r++) {
    const isHeader = r === sheet.headerRow;
    const isLastTotal = (sheet.hasTotalFooter && r === totalRows - 1) || (sheet.sheetType === 'resumen' && r === totalRows - 1);
    const isZebra = r > sheet.headerRow && !isLastTotal && ((r - sheet.headerRow) % 2 === 0);

    for (let c = 0; c < totalCols; c++) {
      const addr = XLSXlib.utils.encode_cell({ r, c });
      let cell = ws[addr];
      if (!cell) {
        cell = { t: 's', v: '' };
        ws[addr] = cell;
      }

      const isMoney = (sheet.moneyCols || []).includes(c) && cell.t === 'n';
      const isPct   = (sheet.pctCols || []).includes(c) && cell.t === 'n';
      const numFmt  = isMoney ? '"$"#,##0.00' : (isPct ? '0.0%' : undefined);
      if (numFmt) cell.z = numFmt;

      if (sheet.sheetType === 'resumen' && r === 0) {
        cell.s = {
          font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
          fill: { patternType: 'solid', fgColor: { rgb: '0F172A' } },
          alignment: { vertical: 'center', horizontal: 'left' },
          border: {
            bottom: { style: 'medium', color: { rgb: 'FF6B1A' } },
          },
        };
      } else if (sheet.sheetType === 'resumen' && (r === 1 || r === 2)) {
        const isLabel = c === 0 || c === 2;
        cell.s = {
          font: { name: 'Calibri', sz: 10.5, bold: isLabel, color: { rgb: isLabel ? '475569' : '0F172A' } },
          fill: { patternType: 'solid', fgColor: { rgb: 'F1F5F9' } },
          alignment: { vertical: 'center', horizontal: 'left' },
          border: thinBorder,
        };
      } else if (isHeader) {
        cell.s = {
          ...headerStyle,
          alignment: { vertical: 'center', horizontal: c === 0 ? 'left' : 'center' },
        };
      } else if (isLastTotal) {
        cell.s = {
          ...totalRowStyle,
          alignment: { vertical: 'center', horizontal: (isMoney || isPct || cell.t === 'n') ? 'right' : 'left' },
          ...(numFmt ? { numFmt } : {}),
        };
      } else if (r > sheet.headerRow) {
        const rowArr = sheet.rows[r] || [];
        const isEmptySep = rowArr.length === 0 || rowArr.every(v => v === '' || v === null || v === undefined);
        if (isEmptySep) continue;

        cell.s = {
          font: {
            name: 'Calibri',
            sz: 10.5,
            bold: c === 0 && sheet.sheetType === 'resumen' && r > 10,
            color: { rgb: '1E293B' },
          },
          fill: { patternType: 'solid', fgColor: { rgb: isZebra ? 'F8FAFC' : 'FFFFFF' } },
          alignment: {
            vertical: 'center',
            horizontal: (isMoney || isPct) ? 'right' : (cell.t === 'n' ? 'center' : 'left'),
          },
          border: thinBorder,
          ...(numFmt ? { numFmt } : {}),
        };
      }
    }
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
}

function csvCell(value) {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // Evita fórmulas inyectadas
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function exportSalesWorkbook({ records, periodLabel, filename, includeMonthly }) {
  if (!records || records.length === 0) {
    showKDSToast('No hay ventas para exportar');
    return;
  }

  const sheets = buildSalesSheetsData(records, periodLabel, includeMonthly);
  const XLSXlib = await ensureXLSX();

  if (XLSXlib) {
    const wb = XLSXlib.utils.book_new();
    sheets.forEach(sheet => {
      const ws = XLSXlib.utils.aoa_to_sheet(sheet.rows);
      applyExecutiveWorksheetStyles(ws, sheet, XLSXlib);
      XLSXlib.utils.book_append_sheet(wb, ws, sheet.name);
    });
    XLSXlib.writeFile(wb, `${filename}.xlsx`);
    showKDSToast('📥 Excel Ejecutivo (.xlsx) descargado');
  } else {
    // Sin internet para cargar la librería: exportar CSV compatible con Excel
    const detalle = sheets.find(s => s.name === 'Detalle');
    const csv = '\ufeff' + detalle.rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`);
    showKDSToast('Reporte descargado en CSV (abre en Excel)');
  }
}

// Obtiene los registros activos del turno o del mes para la vista previa de Excel y exportación rápida
function getActivePreviewSaleRecords() {
  const readyMap = new Map();
  completedOrders.forEach(o => { if (o && o.id) readyMap.set(o.id, o); });
  orders.forEach(o => { if (o && o.id && o.status === 'ready') readyMap.set(o.id, o); });
  let list = Array.from(readyMap.values());
  if (list.length === 0 && orders.length > 0) {
    list = orders.slice();
  }
  return list.map(buildSaleRecord).sort((a, b) => a.ts - b.ts);
}

function renderExecutiveExcelPreview() {
  const wrapEl = document.getElementById('excel-sheet-preview-wrap');
  if (!wrapEl) return;

  const profile = getActiveTenantProfile();
  const records = getActivePreviewSaleRecords();
  const agg     = aggregateSaleRecords(records);
  const avgTicket = agg.orders > 0 ? Math.round(agg.total / agg.orders) : 0;
  const aguasQty  = agg.jamaica.qty + agg.horchata.qty + agg.agua.qty;
  const aguasAmt  = agg.jamaica.amount + agg.horchata.amount + agg.agua.amount;
  const pct = (amt) => (agg.total > 0 ? ((amt / agg.total) * 100).toFixed(1) + '%' : '0.0%');

  const sampleRowsHtml = records.length > 0
    ? records.slice(-5).map(r => {
        const tableGuest = r.guestName ? `${r.table} · 👤 ${r.guestName}` : r.table;
        const prods = (r.items || []).map(it => `${it.qty}x ${it.name}`).join(', ');
        return `
          <tr>
            <td><strong>#${String(r.num).padStart(3, '0')}</strong></td>
            <td>${localTimeLabel(r.ts)}</td>
            <td><span class="xl-badge">${tableGuest}</span></td>
            <td>${prods}</td>
            <td class="xl-num">$${Number(r.total || 0).toFixed(2)}</td>
          </tr>
        `;
      }).join('')
    : `
      <tr>
        <td colspan="5" style="text-align:center;color:#64748b;padding:12px;">
          Sin órdenes listas en este turno · Presiona <strong>"✨ Cargar Datos Demo"</strong> arriba para previsualizar y descargar un Excel completo con cuentas separadas.
        </td>
      </tr>
    `;

  wrapEl.innerHTML = `
    <div class="xl-banner" style="border-bottom-color:${profile.accent}">
      <div>
        <div class="xl-banner-title">◈ ${profile.name.toUpperCase()} — REPORTE EJECUTIVO DE VENTAS (.XLSX)</div>
        <div class="xl-banner-sub">Sucursal: ${profile.id} · Moneda: MXN ($) · Hojas: Resumen, Por Día, Detalle de Comandas</div>
      </div>
      <span class="xl-badge">EXCEL CONTABLE</span>
    </div>
    <div class="xl-kpi-strip">
      <div class="xl-kpi-cell">
        <span class="xl-kpi-k">Ventas Totales</span>
        <span class="xl-kpi-v green">$${Number(agg.total || 0).toFixed(2)}</span>
      </div>
      <div class="xl-kpi-cell">
        <span class="xl-kpi-k">Ticket Promedio</span>
        <span class="xl-kpi-v">$${Number(avgTicket).toFixed(2)}</span>
      </div>
      <div class="xl-kpi-cell">
        <span class="xl-kpi-k">Órdenes</span>
        <span class="xl-kpi-v">${agg.orders}</span>
      </div>
      <div class="xl-kpi-cell">
        <span class="xl-kpi-k">Tacos / Dogs / Beb.</span>
        <span class="xl-kpi-v">${agg.taco.qty} / ${agg.hotdog.qty} / ${aguasQty + agg.coca.qty}</span>
      </div>
    </div>
    <div class="xl-table-scroll">
      <table class="xl-table">
        <thead>
          <tr>
            <th>Concepto / Categoría</th>
            <th style="text-align:center">Unidades</th>
            <th style="text-align:right">Importe ($ MXN)</th>
            <th style="text-align:right">% Venta</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>🌮 Tacos ($28.00)</td>
            <td style="text-align:center">${agg.taco.qty}</td>
            <td class="xl-num">$${agg.taco.amount.toFixed(2)}</td>
            <td class="xl-num">${pct(agg.taco.amount)}</td>
          </tr>
          <tr>
            <td>🌭 Hot Dogs ($35.00)</td>
            <td style="text-align:center">${agg.hotdog.qty}</td>
            <td class="xl-num">$${agg.hotdog.amount.toFixed(2)}</td>
            <td class="xl-num">${pct(agg.hotdog.amount)}</td>
          </tr>
          <tr>
            <td>💧 Aguas Frescas ($25.00)</td>
            <td style="text-align:center">${aguasQty}</td>
            <td class="xl-num">$${aguasAmt.toFixed(2)}</td>
            <td class="xl-num">${pct(aguasAmt)}</td>
          </tr>
          <tr>
            <td>🥤 Coca-Cola ($30.00)</td>
            <td style="text-align:center">${agg.coca.qty}</td>
            <td class="xl-num">$${agg.coca.amount.toFixed(2)}</td>
            <td class="xl-num">${pct(agg.coca.amount)}</td>
          </tr>
          <tr class="xl-total-row">
            <td>TOTAL DE GANANCIAS</td>
            <td style="text-align:center">${agg.taco.qty + agg.hotdog.qty + aguasQty + agg.coca.qty} uds</td>
            <td class="xl-num">$${Number(agg.total || 0).toFixed(2)}</td>
            <td class="xl-num">100.0%</td>
          </tr>
        </tbody>
      </table>
      <table class="xl-table" style="border-top:2px solid #0f172a">
        <thead>
          <tr>
            <th>Folio</th>
            <th>Hora</th>
            <th>Mesa / Comensal</th>
            <th>Detalle de Productos</th>
            <th style="text-align:right">Total ($)</th>
          </tr>
        </thead>
        <tbody>
          ${sampleRowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

async function seedDemoSalesForExcel() {
  const now = Date.now();
  const demoOrders = [
    {
      id: now - 3600000,
      tenantId,
      num: ++orderCounter,
      table: 'Mesa 4',
      guestName: 'Ana',
      status: 'ready',
      createdAt: now - 3600000,
      readyAt: now - 3400000,
      deliveredAt: now - 3300000,
      total: 81,
      items: [
        { key: 'taco:doble:bistec:cilantro,cebolla', station: 'taco', name: 'Taco doble de bistec con cilantro, cebolla', emoji: '🌮', price: 28, qty: 2 },
        { key: 'drink_jamaica', station: 'drink', name: 'Agua de Jamaica (500ml)', emoji: '🌺', price: 25, qty: 1 },
      ],
    },
    {
      id: now - 3500000,
      tenantId,
      num: ++orderCounter,
      table: 'Mesa 4',
      guestName: 'Carlos',
      status: 'ready',
      createdAt: now - 3500000,
      readyAt: now - 3250000,
      deliveredAt: now - 3200000,
      total: 100,
      items: [
        { key: 'hotdog:ketchup,mostaza,chiles', station: 'hotdog', name: 'Hot Dog con ketchup, mostaza, chiles', emoji: '🌭', price: 35, qty: 2 },
        { key: 'drink_coca', station: 'drink', name: 'Coca-Cola (Retornable 500ml)', emoji: '🥤', price: 30, qty: 1 },
      ],
    },
    {
      id: now - 2800000,
      tenantId,
      num: ++orderCounter,
      table: 'Mesa 4',
      guestName: 'Sofía',
      status: 'ready',
      createdAt: now - 2800000,
      readyAt: now - 2600000,
      deliveredAt: now - 2500000,
      total: 109,
      items: [
        { key: 'taco:sencilla:longaniza:cilantro,salsa_roja', station: 'taco', name: 'Taco sencillo de longaniza con cilantro, salsa roja', emoji: '🌮', price: 28, qty: 3 },
        { key: 'drink_horchata', station: 'drink', name: 'Agua de Horchata (500ml)', emoji: '🥛', price: 25, qty: 1 },
      ],
    },
    {
      id: now - 1900000,
      tenantId,
      num: ++orderCounter,
      table: 'Mesa 1',
      guestName: 'Diego',
      status: 'ready',
      createdAt: now - 1900000,
      readyAt: now - 1700000,
      deliveredAt: now - 1600000,
      total: 142,
      items: [
        { key: 'taco:doble:bistec:cilantro,cebolla,salsa_roja', station: 'taco', name: 'Taco doble de bistec con todo', emoji: '🌮', price: 28, qty: 4 },
        { key: 'drink_coca', station: 'drink', name: 'Coca-Cola (Retornable 500ml)', emoji: '🥤', price: 30, qty: 1 },
      ],
    },
    {
      id: now - 900000,
      tenantId,
      num: ++orderCounter,
      table: 'Mesa 2',
      guestName: 'Valeria',
      status: 'ready',
      createdAt: now - 900000,
      readyAt: now - 700000,
      deliveredAt: now - 600000,
      total: 88,
      items: [
        { key: 'hotdog:mayonesa,tomate,cebolla', station: 'hotdog', name: 'Hot Dog con mayonesa, tomate, cebolla', emoji: '🌭', price: 35, qty: 1 },
        { key: 'taco:sencilla:bistec:cilantro', station: 'taco', name: 'Taco sencillo de bistec', emoji: '🌮', price: 28, qty: 1 },
        { key: 'drink_jamaica', station: 'drink', name: 'Agua de Jamaica (500ml)', emoji: '🌺', price: 25, qty: 1 },
      ],
    },
  ];

  demoOrders.forEach(o => {
    completedOrders.push(o);
  });
  persistOrders();
  await recordSalesForOrders(demoOrders, { cloud: true });
  renderDailySales();
  await renderMonthlyHistory();
  showKDSToast('✨ 5 órdenes demo cargadas · Descarga tu Excel Ejecutivo');
}

async function exportCurrentShiftOrMonthExcel() {
  if (!kdsUnlocked) return;
  let records = getActivePreviewSaleRecords();
  if (records.length === 0) {
    const month = historySelectedMonth || localMonthKey(Date.now());
    records = (await ledgerGetAll()).filter(r => r.month === month);
  }
  if (records.length === 0) {
    await seedDemoSalesForExcel();
    records = getActivePreviewSaleRecords();
  }
  const profile = getActiveTenantProfile();
  const stamp = localDayKey(Date.now());
  await exportSalesWorkbook({
    records,
    periodLabel: `Corte Ejecutivo · ${formatDayLabel(stamp)}`,
    filename: `${profile.name.replace(/\s+/g, '_')}_Reporte_Ejecutivo_${stamp}`,
    includeMonthly: false,
  });
}

async function exportSelectedMonthExcel() {
  if (!kdsUnlocked) return;
  const month = historySelectedMonth || localMonthKey(Date.now());
  if (firebaseBaseUrl()) {
    const remote = await cloudFetchMonth(month);
    if (remote) {
      await ledgerUpsert(remote.map(r => ({ ...r, cloudSynced: true })), { overwrite: true });
    }
  }
  let records = (await ledgerGetAll()).filter(r => r.month === month);
  if (records.length === 0) {
    records = getActivePreviewSaleRecords();
  }
  if (records.length === 0) {
    showKDSToast(`Sin ventas registradas en ${monthLabel(month)}`);
    return;
  }
  const profile = getActiveTenantProfile();
  await exportSalesWorkbook({
    records,
    periodLabel: monthLabel(month),
    filename: `${profile.name.replace(/\s+/g, '_')}_Ventas_${month}`,
    includeMonthly: false,
  });
}

async function exportAllHistoryExcel() {
  if (!kdsUnlocked) return;

  // Con nube configurada: traer todos los meses antes de exportar
  if (firebaseBaseUrl()) {
    const keys = (await cloudFetchMonthKeys()) || [];
    for (const m of keys) {
      const remote = await cloudFetchMonth(m);
      if (remote) {
        cloudMonthsSynced.add(m);
        await ledgerUpsert(remote.map(r => ({ ...r, cloudSynced: true })), { overwrite: true });
      }
    }
  }

  let records = await ledgerGetAll();
  if (records.length === 0) {
    records = getActivePreviewSaleRecords();
  }
  if (records.length === 0) {
    showKDSToast('Aún no hay ventas en el historial');
    return;
  }
  const profile = getActiveTenantProfile();
  await exportSalesWorkbook({
    records,
    periodLabel: 'Historial completo',
    filename: `${profile.name.replace(/\s+/g, '_')}_Historial_${localDayKey(Date.now())}`,
    includeMonthly: true,
  });
}

// ══════════════════════════════════════════════
//  ATAJOS DE TECLADO E INICIALIZACIÓN
// ══════════════════════════════════════════════
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeOrderModal();
    closePaymentModal();
    closeUpsellModal();
    closeServiceTableModal();
    closeCloseShiftModal();
    if (cartOpen) toggleCart(false);
  }
  if (e.key === 'Enter' && document.getElementById('order-modal').classList.contains('open')) {
    submitOrder();
  }
  if (e.key === 'Enter' && document.getElementById('service-table-modal').classList.contains('open')) {
    confirmServiceTableModal();
  }
});

(function init() {
  applyTenantBranding();
  loadPersistedOrders();
  initCloudWebSockets();
  initFirebaseIfConfigured();

  const vistaParam = (urlParams.get('vista') || urlParams.get('view') || window.location.hash.replace('#', '')).toLowerCase();
  const mesaParam  = urlParams.get('mesa') || '';
  const modoParam  = (urlParams.get('modo') || urlParams.get('mode') || '').toLowerCase();
  if (mesaParam) presetTableFromURL = mesaParam;

  if (modoParam === 'pickup' || modoParam === 'llevar') {
    setFulfillmentMode('pickup');
  } else if (modoParam === 'domicilio' || modoParam === 'delivery' || modoParam === 'envio') {
    setFulfillmentMode('delivery');
  } else {
    const savedMode = readTenantStorage('fulfillment-mode');
    if (savedMode && !mesaParam) {
      setFulfillmentMode(savedMode);
    } else {
      setFulfillmentMode('dine_in');
    }
  }

  // Si el cliente recarga la página mientras espera su pedido activo y no pidió modo específico nuevo, mostrar el rastreador directo
  const activeOrder = activeTrackedOrderId ? orders.find(o => o.id === activeTrackedOrderId) : null;
  if (activeOrder && !modoParam && vistaParam !== 'cocina' && vistaParam !== 'kitchen' && vistaParam !== 'kds') {
    clientMode = 'tracker';
    showView('client');
    return;
  }

  if (vistaParam === 'cliente' || vistaParam === 'client' || modoParam) {
    showView('client');
  } else if (vistaParam === 'cocina' || vistaParam === 'kitchen' || vistaParam === 'kds') {
    showView('kitchen');
  } else {
    showView('landing');
  }
})();
