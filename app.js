/* ==========================================================
   Escandon — app.js
   100% Mobile-First · Tap-to-Select · KDS PIN Lock (12345)
   + 4-State Real-Time Client Tracker with LED Indicator
   + Live In-App Push Alerts & "Listo" Chime Sound
   ========================================================== */

'use strict';

// ══════════════════════════════════════════════
//  CONFIGURACIÓN DE NUBE Y SEGURIDAD KDS
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
let myOrderIds           = []; // IDs de órdenes creadas por este cliente
let activeTrackedOrderId = null;
let cartOpen             = false;
let kdsFilter            = 'all';
let kdsSubView           = 'comandas'; // 'comandas' | 'sales'
let orderCounter         = 0;
let kdsUnlocked          = false;

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
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(sharedAudioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
  } catch (e) {}
}

// Desbloquear audio en el primer toque del usuario en móvil
document.addEventListener('touchstart', unlockAudioContext, { once: true, passive: true });
document.addEventListener('click', unlockAudioContext, { once: true });

// ══════════════════════════════════════════════
//  4. ALERTAS VISUALES EN TIEMPO REAL (PUSH IN-APP)
// ══════════════════════════════════════════════
let pushHideTimer = null;

function showStatusPushNotification(newStatus, orderNum) {
  const meta = STATUS_META[newStatus];
  if (!meta) return;

  const bannerEl = document.getElementById('status-push-banner');
  const dotEl    = document.getElementById('push-led-dot');
  const kickerEl = document.getElementById('push-kicker');
  const msgEl    = document.getElementById('push-message');

  if (bannerEl && dotEl && kickerEl && msgEl) {
    dotEl.className = `led-dot ${meta.ledClass}`;
    kickerEl.textContent = `ORDEN #${String(orderNum).padStart(3, '0')} · ${meta.pushTitle}`;
    msgEl.textContent = meta.pushMsg;

    bannerEl.classList.add('show');
    if (pushHideTimer) clearTimeout(pushHideTimer);
    pushHideTimer = setTimeout(() => {
      bannerEl.classList.remove('show');
    }, 4500);
  }

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
//  MOTOR DE SINCRONIZACIÓN EN TIEMPO REAL (INTACTO)
// ══════════════════════════════════════════════
const localChannel = new BroadcastChannel('restaurant-kds');
let mqttClient       = null;
let cloudConnected   = false;
let currentBrokerIdx = 0;

const urlParams    = new URLSearchParams(window.location.search);
const branchKey    = (urlParams.get('sucursal') || 'escandon-main').replace(/[^a-zA-Z0-9_-]/g, '');
const TOPIC_STATE  = `${CLOUD_CONFIG.channelNamespace}/${branchKey}/state`;
const TOPIC_EVENTS = `${CLOUD_CONFIG.channelNamespace}/${branchKey}/events`;

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
    orderCounter = 0;
    activeTrackedOrderId = null;
    persistOrders();
    renderKDS();
    renderDailySales();
    renderClientTracker();
    updateHeaderTrackerPill();
  }
}

function mergeRemoteStateSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.orders)) return;

  // Detectar si alguna orden de este cliente cambió de estado en el snapshot
  const prevStatusMap = new Map(orders.map(o => [o.id, o.status]));

  const isShiftReset =
    snapshot.orders.length === 0 &&
    Array.isArray(snapshot.completedOrders) &&
    snapshot.completedOrders.length === 0 &&
    snapshot.orderCounter === 0;

  if (isShiftReset) {
    orderCounter = 0;
    completedOrders = [];
    orders = [];
  } else {
    if (typeof snapshot.orderCounter === 'number' && snapshot.orderCounter > orderCounter) {
      orderCounter = snapshot.orderCounter;
    }
    orders = snapshot.orders;
    if (Array.isArray(snapshot.completedOrders)) {
      completedOrders = snapshot.completedOrders;
    }
  }

  persistOrders();
  renderKDS();
  renderDailySales();

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
  if (!('updatedAt' in raw) && !('orders' in raw) && !('orderCounter' in raw)) return null;
  const toArr = (v) => Array.isArray(v)
    ? v.filter(Boolean)
    : (v && typeof v === 'object' ? Object.values(v).filter(Boolean) : []);
  return {
    orders: toArr(raw.orders),
    completedOrders: toArr(raw.completedOrders),
    orderCounter: typeof raw.orderCounter === 'number' ? raw.orderCounter : 0,
    sender: raw.sender || '',
    updatedAt: raw.updatedAt || 0,
  };
}

function initFirebaseIfConfigured() {
  const dbUrl = (CLOUD_CONFIG.firebaseDatabaseURL || '').trim().replace(/\/$/, '');
  if (!dbUrl) return;

  // 1. Carga inicial del estado activo desde Firebase
  fetch(`${dbUrl}/escandon_kds.json`)
    .then(res => (res.ok ? res.json() : null))
    .then(raw => {
      const snap = normalizeFirebaseKdsSnapshot(raw);
      if (snap && snap.sender !== DEVICE_ID) {
        mergeRemoteStateSnapshot(snap);
        updateCloudStatusUI(true);
      }
    })
    .catch(() => {});

  // 2. Suscripción en tiempo real (Server-Sent Events de Firebase)
  try {
    const evtSource = new EventSource(`${dbUrl}/escandon_kds.json`);
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
  localChannel.postMessage({ type, payload, sender: DEVICE_ID });

  if (mqttClient && cloudConnected) {
    const eventPacket = JSON.stringify({
      type,
      payload,
      sender: DEVICE_ID,
      ts: Date.now(),
    });
    const statePacket = JSON.stringify({
      orders,
      completedOrders,
      orderCounter,
      sender: DEVICE_ID,
      updatedAt: Date.now(),
    });

    mqttClient.publish(TOPIC_EVENTS, eventPacket, { qos: 1 });
    mqttClient.publish(TOPIC_STATE, statePacket, { qos: 1, retain: true });
  }

  const dbUrl = (CLOUD_CONFIG.firebaseDatabaseURL || '').trim().replace(/\/$/, '');
  if (dbUrl) {
    fetch(`${dbUrl}/escandon_kds.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orders,
        completedOrders,
        orderCounter,
        sender: DEVICE_ID,
        updatedAt: Date.now(),
      }),
    }).catch(() => {});
  }
}

localChannel.onmessage = (e) => {
  const { type, payload } = e.data;
  handleIncomingEvent(type, payload, true);
};

window.addEventListener('storage', (e) => {
  if (e.key === 'kds-orders' || e.key === 'kds-completed-orders') {
    const prevMap = new Map(orders.map(o => [o.id, o.status]));
    loadPersistedOrders();
    orders.forEach(o => {
      const prev = prevMap.get(o.id);
      if (prev && prev !== o.status) {
        notifyClientIfMyOrderChanged(o.id, prev, o.status, o.num);
      }
    });
    renderKDS();
    renderDailySales();
    renderClientTracker();
    updateHeaderTrackerPill();
  }
});

function persistOrders() {
  localStorage.setItem('kds-orders', JSON.stringify(orders));
  localStorage.setItem('kds-completed-orders', JSON.stringify(completedOrders));
  localStorage.setItem('kds-counter', String(orderCounter));
  localStorage.setItem('kds-my-orders', JSON.stringify(myOrderIds));
  if (activeTrackedOrderId) {
    localStorage.setItem('kds-tracked-id', String(activeTrackedOrderId));
  } else {
    localStorage.removeItem('kds-tracked-id');
  }
}

function loadPersistedOrders() {
  try {
    const saved          = localStorage.getItem('kds-orders');
    const savedCompleted = localStorage.getItem('kds-completed-orders');
    const cnt            = localStorage.getItem('kds-counter');
    const mine           = localStorage.getItem('kds-my-orders');
    const tracked        = localStorage.getItem('kds-tracked-id');

    orders               = saved ? JSON.parse(saved) : [];
    completedOrders      = savedCompleted ? JSON.parse(savedCompleted) : [];
    orderCounter         = cnt ? (parseInt(cnt, 10) || 0) : 0;
    myOrderIds           = mine ? JSON.parse(mine) : [];
    activeTrackedOrderId = tracked ? (parseInt(tracked, 10) || null) : null;
  } catch (e) {
    orders = [];
    completedOrders = [];
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

  if (inputEl.value.trim() === KDS_REQUIRED_PIN) {
    kdsUnlocked = true;
    sessionStorage.setItem('escandon-kds-unlocked', '1');
    localStorage.setItem(KITCHEN_DEVICE_FLAG, '1'); // Este dispositivo guarda el historial de ventas
    inputEl.value = '';
    if (errEl) errEl.classList.add('hidden');
    unlockAudioContext();
    renderKitchenLockState();
    setKDSSubView('comandas');
    renderKDS();
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
  sessionStorage.removeItem('escandon-kds-unlocked');
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
  const branchParam = urlParams.get('sucursal') ? `&sucursal=${encodeURIComponent(urlParams.get('sucursal'))}` : '';
  const customerUrl = `${baseUrl}?vista=cliente${branchParam}`;

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

function selectStation(station) {
  currentStation = station;
  document.getElementById('station-selector').classList.add('hidden');
  document.getElementById('builder-workspace').classList.remove('hidden');
  document.getElementById('dock-builder-bar').classList.remove('hidden');

  document.getElementById('tab-taco').classList.toggle('active', station === 'taco');
  document.getElementById('tab-hotdog').classList.toggle('active', station === 'hotdog');

  const backBtnEl = document.getElementById('btn-client-back');
  if (backBtnEl) backBtnEl.textContent = '← Bases';

  if (station === 'taco' && !tacoDraft.tortilla) {
    tacoDraft.tortilla = 'sencilla';
  }

  renderBuilderWorkspace();
}

function resetCurrentBuilder() {
  if (currentStation === 'taco') {
    tacoDraft = { tortilla: 'sencilla', protein: null, toppings: [] };
  } else if (currentStation === 'hotdog') {
    hotdogDraft = { toppings: [] };
  }
  renderBuilderWorkspace();
}

// Selección directa por toque (Tap-to-Select)
function tapSelectIngredient(category, itemId) {
  if (currentStation === 'taco') {
    if (category === 'base') {
      tacoDraft.tortilla = itemId;
    } else if (category === 'protein') {
      if (!tacoDraft.tortilla) tacoDraft.tortilla = 'sencilla';
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

  if (descEl)     descEl.textContent = summary.name;
  if (priceEl)    priceEl.textContent = '$' + summary.price;
  if (addLabelEl) addLabelEl.textContent = summary.addLabel;
  if (addBtn)     addBtn.disabled = !summary.ready;

  renderCart();
}

function renderTapCard(category, item, isSelected) {
  return `
    <button type="button"
            class="tap-card${isSelected ? ' selected' : ''}"
            onclick="tapSelectIngredient('${category}', '${item.id}')">
      <span class="tap-check">✓</span>
      <div class="tap-art">${item.art}</div>
      <div class="tap-name">${item.name}</div>
      <div class="tap-included">Incluido</div>
    </button>
  `;
}

function renderDrinksSection() {
  const html = DRINKS_CONFIG.map(drink => `
    <div class="drink-row" onclick="addDrinkToCart('${drink.id}')">
      <div class="drink-left">
        <span class="drink-emoji">${drink.emoji}</span>
        <div class="drink-info">
          <span class="drink-name">${drink.name}</span>
          <span class="drink-price">$${drink.price}</span>
        </div>
      </div>
      <button type="button" class="btn-tap-drink" onclick="event.stopPropagation(); addDrinkToCart('${drink.id}')">
        + Agregar
      </button>
    </div>
  `).join('');

  const listBuilder = document.getElementById('drinks-list');
  const listHome    = document.getElementById('drinks-list-home');
  if (listBuilder) listBuilder.innerHTML = html;
  if (listHome)    listHome.innerHTML = html;
}

function addDrinkToCart(drinkId) {
  const drink = DRINKS_CONFIG.find(d => d.id === drinkId);
  if (!drink) return;

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
  showToast(`${drink.name} agregada`);
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

  const existing = cartItems.find(it => it.key === summary.key);
  if (existing) {
    existing.qty += 1;
  } else {
    cartItems.push({
      key: summary.key,
      name: summary.name,
      emoji: summary.emoji,
      price: summary.price,
      qty: 1,
      station: currentStation,
    });
  }

  if (currentStation === 'taco') {
    tacoDraft = { tortilla: 'sencilla', protein: null, toppings: [] };
  } else if (currentStation === 'hotdog') {
    hotdogDraft = { toppings: [] };
  }

  renderBuilderWorkspace();
  showToast(`Agregado: ${summary.name}`);
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
  const effectiveTotal = confirmedTotal > 0 ? confirmedTotal : (summary.ready ? summary.price : 0);
  const canOrder       = (cartItems.length > 0 || summary.ready);

  if (bbCountEl)  bbCountEl.textContent  = totalQty;
  if (totalEl)    totalEl.textContent    = '$' + effectiveTotal;
  if (bbTotalEl)  bbTotalEl.textContent  = '$' + effectiveTotal;

  if (bbStatusTxt) {
    if (cartItems.length > 0) {
      const last = cartItems[cartItems.length - 1];
      bbStatusTxt.textContent = `${last.emoji} ${last.name}`;
    } else if (summary.ready) {
      bbStatusTxt.textContent = `${summary.emoji} ${summary.name}`;
    } else {
      bbStatusTxt.textContent = 'Tu pedido';
    }
  }

  if (pedirSheet) pedirSheet.disabled = !canOrder;
  if (pedirBar)   pedirBar.disabled   = !canOrder;
}

function toggleCart(forceState) {
  cartOpen = typeof forceState === 'boolean' ? forceState : !cartOpen;
  const panel   = document.getElementById('cart-panel');
  const overlay = document.getElementById('cart-overlay');
  if (panel)   panel.classList.toggle('open', cartOpen);
  if (overlay) overlay.classList.toggle('open', cartOpen);
}

// ══════════════════════════════════════════════
//  3. ENVÍO DE ORDEN Y CONVERSIÓN EN RASTREADOR (4 ESTADOS + LED)
// ══════════════════════════════════════════════
function openOrderModal() {
  unlockAudioContext();

  const summary = getCurrentDraftSummary();
  if (cartItems.length === 0 && summary.ready) {
    addBuiltItemToCart();
  }
  if (cartItems.length === 0) return;

  if (cartOpen) toggleCart(false);
  const inputEl = document.getElementById('table-input');
  if (inputEl && presetTableFromURL && !inputEl.value) {
    inputEl.value = presetTableFromURL;
  }

  // Solicitar permiso opcional de notificaciones web sin bloquear el flujo
  if ('Notification' in window && Notification.permission === 'default') {
    try { Notification.requestPermission(); } catch (e) {}
  }

  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('order-modal').classList.add('open');
  setTimeout(() => { if (inputEl) inputEl.focus(); }, 50);
}

function closeOrderModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.getElementById('order-modal').classList.remove('open');
}

function submitOrder() {
  unlockAudioContext();
  const tableVal = document.getElementById('table-input').value.trim() || presetTableFromURL || 'Mostrador';
  if (cartItems.length === 0) return;

  orderCounter++;
  const order = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    num: orderCounter,
    table: tableVal,
    items: cartItems.map((it, idx) => ({
      id: idx + 1,
      key: it.key || '',
      station: it.station || '',
      name: it.name,
      emoji: it.emoji,
      price: it.price,
      qty: it.qty,
    })),
    total: getCartTotal(),
    status: 'pending', // Estado inicial: Pendiente (LED Gris)
    createdAt: Date.now(),
  };

  orders.push(order);
  myOrderIds.push(order.id);
  activeTrackedOrderId = order.id;
  persistOrders();

  publishCloudSync('NEW_ORDER', order);

  closeOrderModal();
  document.getElementById('table-input').value = '';

  // Limpiar carrito y convertir pantalla del cliente en el Rastreador en Tiempo Real
  cartItems = [];
  tacoDraft = { tortilla: 'sencilla', protein: null, toppings: [] };
  hotdogDraft = { toppings: [] };
  renderCart();

  setClientSubMode('tracker');
  const scrollEl = document.getElementById('client-scroll-container');
  if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'instant' });
}

function renderClientTracker() {
  if (clientMode !== 'tracker') return;

  const order = activeTrackedOrderId ? orders.find(o => o.id === activeTrackedOrderId) : null;
  const numEl     = document.getElementById('tracker-order-num');
  const tableEl   = document.getElementById('tracker-table-name');
  const mainLedEl = document.getElementById('tracker-main-led');
  const titleEl   = document.getElementById('tracker-status-title');
  const descEl    = document.getElementById('tracker-status-desc');
  const totalEl   = document.getElementById('tracker-order-total');
  const itemsEl   = document.getElementById('tracker-items-list');

  if (!order) {
    // Si la orden ya fue entregada/cerrada en cocina, mostrar confirmación final limpia
    if (mainLedEl) mainLedEl.className = 'led-dot led-ready';
    if (titleEl)   titleEl.textContent = 'Entregado';
    if (descEl)    descEl.textContent  = 'Tu pedido fue entregado. ¡Buen provecho!';
    return;
  }

  const meta = STATUS_META[order.status] || STATUS_META.pending;

  if (numEl)     numEl.textContent   = `ORDEN #${String(order.num).padStart(3, '0')}`;
  if (tableEl)   tableEl.textContent = order.table;
  if (mainLedEl) mainLedEl.className = `led-dot ${meta.ledClass}`;
  if (titleEl)   titleEl.textContent = meta.label;
  if (descEl)    descEl.textContent  = meta.desc;
  if (totalEl)   totalEl.textContent = `$${order.total}`;

  // Actualizar los 4 nodos del rastreador
  document.querySelectorAll('#tracker-steps .tracker-step').forEach(stepEl => {
    const stepKey = stepEl.dataset.step;
    const idx = ORDER_PHASES.indexOf(stepKey);
    stepEl.classList.toggle('done', idx < meta.stepIndex);
    stepEl.classList.toggle('current', idx === meta.stepIndex);
  });

  if (itemsEl) {
    itemsEl.innerHTML = order.items.map(it => `
      <div class="tracker-item-row">
        <span><span class="tracker-item-qty">${it.qty}x</span>${it.emoji} ${it.name}</span>
        <span>$${it.price * it.qty}</span>
      </div>
    `).join('');
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
  kdsUnlocked = sessionStorage.getItem('escandon-kds-unlocked') === '1';
  renderKitchenLockState();

  if (kdsUnlocked) {
    setKDSSubView(kdsSubView);
    renderKDS();
    renderDailySales();
    startClock();
    startTimers();
    retryUnsyncedCloud();
  }
}

function toggleKDSSalesView() {
  setKDSSubView(kdsSubView === 'sales' ? 'comandas' : 'sales');
}

function setKDSSubView(subView) {
  kdsSubView = subView === 'sales' ? 'sales' : 'comandas';
  const comandasEl = document.getElementById('kds-comandas-section');
  const salesEl    = document.getElementById('kds-sales-section');
  const salesBtn   = document.getElementById('btn-kds-sales');

  if (comandasEl) comandasEl.classList.toggle('hidden', kdsSubView === 'sales');
  if (salesEl)    salesEl.classList.toggle('hidden', kdsSubView !== 'sales');
  if (salesBtn)   salesBtn.classList.toggle('active', kdsSubView === 'sales');

  if (kdsSubView === 'sales') {
    renderDailySales();
    renderMonthlyHistory();
    ensureXLSX(); // Precarga la librería de Excel para descargas inmediatas
    const autoChk = document.getElementById('auto-export-shift');
    if (autoChk) autoChk.checked = getAutoExportPreference();
  } else {
    renderKDS();
  }
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
            <div style="display:flex;align-items:center;gap:6px">
              <span class="order-num">#${String(order.num).padStart(3, '0')}</span>
              <span class="order-timer ${timerClass}" data-order-id="${order.id}">${timerTxt}</span>
            </div>
            <div class="order-table">${order.table}</div>
          </div>
          <span class="status-badge">
            <span class="led-dot ${meta.ledClass}"></span>
            <span>${meta.label}</span>
          </span>
        </div>
        <div class="order-items-list">
          ${order.items.map(it => `
            <div class="order-item-row">
              <span class="order-item-qty">${it.qty}x</span>
              <span class="order-item-name">${it.emoji} ${it.name}</span>
            </div>`).join('')}
        </div>
        <div class="order-total">Total: $${order.total}</div>
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

  const qtyTacosEl   = document.getElementById('sales-qty-tacos');
  const amtTacosEl   = document.getElementById('sales-amt-tacos');
  const qtyHotdogsEl = document.getElementById('sales-qty-hotdogs');
  const amtHotdogsEl = document.getElementById('sales-amt-hotdogs');
  const qtyAguasEl   = document.getElementById('sales-qty-aguas');
  const amtAguasEl   = document.getElementById('sales-amt-aguas');
  const subAguasEl   = document.getElementById('sales-sub-aguas');
  const qtyCocasEl   = document.getElementById('sales-qty-cocas');
  const amtCocasEl   = document.getElementById('sales-amt-cocas');

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

  if (qtyTacosEl)   qtyTacosEl.textContent   = stats.breakdown.tacos.qty;
  if (amtTacosEl)   amtTacosEl.textContent   = formatMoney(stats.breakdown.tacos.amount);

  if (qtyHotdogsEl) qtyHotdogsEl.textContent = stats.breakdown.hotdogs.qty;
  if (amtHotdogsEl) amtHotdogsEl.textContent = formatMoney(stats.breakdown.hotdogs.amount);

  if (qtyAguasEl)   qtyAguasEl.textContent   = stats.breakdown.aguas.qty;
  if (amtAguasEl)   amtAguasEl.textContent   = formatMoney(stats.breakdown.aguas.amount);
  if (subAguasEl) {
    subAguasEl.textContent = stats.breakdown.aguas.qty > 0
      ? `$25 c/u · Jamaica: ${stats.breakdown.aguas.jamaica} · Horchata: ${stats.breakdown.aguas.horchata}`
      : '$25 c/u · Jamaica y Horchata';
  }

  if (qtyCocasEl)   qtyCocasEl.textContent   = stats.breakdown.cocas.qty;
  if (amtCocasEl)   amtCocasEl.textContent   = formatMoney(stats.breakdown.cocas.amount);
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
  orderCounter = 0;
  activeTrackedOrderId = null;

  persistOrders();
  publishCloudSync('SHIFT_RESET', { resetAt: Date.now() });

  closeCloseShiftModal();
  renderKDS();
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
const XLSX_CDN_URL          = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
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
  return all.filter(r => r && (r.branch || 'escandon-main') === branchKey && MONTH_KEY_RE.test(r.month));
}

// ─── Nube opcional: Firebase Realtime Database (REST) ──
function firebaseBaseUrl() {
  return (CLOUD_CONFIG.firebaseDatabaseURL || '').trim().replace(/\/$/, '');
}

function cloudSalesUrl(suffix) {
  return `${firebaseBaseUrl()}/escandon_ventas/${branchKey}${suffix}.json`;
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

// ─── Exportación a Excel (.xlsx) ───────────────
let xlsxLoadPromise = null;

function ensureXLSX() {
  if (window.XLSX && window.XLSX.utils) return Promise.resolve(window.XLSX);
  if (xlsxLoadPromise) return xlsxLoadPromise;
  xlsxLoadPromise = new Promise(resolve => {
    const s = document.createElement('script');
    s.src = XLSX_CDN_URL;
    s.async = true;
    s.onload = () => resolve(window.XLSX && window.XLSX.utils ? window.XLSX : null);
    s.onerror = () => { xlsxLoadPromise = null; resolve(null); };
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

  const resumen = [
    ['Escandon — Reporte de Ventas'],
    ['Periodo', periodLabel],
    ['Generado', generated],
    [],
    ['Concepto', 'Cantidad', 'Importe'],
    ['Tacos ($28)', agg.taco.qty, agg.taco.amount],
    ['Hot Dogs ($35)', agg.hotdog.qty, agg.hotdog.amount],
    ['Agua de Jamaica ($25)', agg.jamaica.qty, agg.jamaica.amount],
    ['Agua de Horchata ($25)', agg.horchata.qty, agg.horchata.amount],
  ];
  if (agg.agua.qty > 0) resumen.push(['Otras aguas', agg.agua.qty, agg.agua.amount]);
  resumen.push(['Coca-Cola ($30)', agg.coca.qty, agg.coca.amount]);
  if (agg.otro.qty > 0) resumen.push(['Otros', agg.otro.qty, agg.otro.amount]);
  resumen.push(
    [],
    ['Total Aguas', aguasQty, aguasAmt],
    ['Pedidos', agg.orders, ''],
    ['Días con venta', daysWithSales, ''],
    ['Ticket promedio', '', agg.orders ? Math.round((agg.total / agg.orders) * 100) / 100 : 0],
    ['Promedio por día', '', daysWithSales ? Math.round((agg.total / daysWithSales) * 100) / 100 : 0],
    ['TOTAL DE GANANCIAS', '', agg.total],
  );

  const sheets = [{ name: 'Resumen', rows: resumen, cols: [26, 12, 14], moneyCols: [2], headerRow: 4 }];

  if (includeMonthly) {
    const monthRows = Array.from(agg.months.values()).sort((a, b) => (a.key > b.key ? 1 : -1));
    sheets.push({
      name: 'Por Mes',
      rows: [
        ['Mes', 'Pedidos', 'Tacos', 'Hot Dogs', 'Aguas', 'Coca-Colas', 'Total ($)'],
        ...monthRows.map(m => [monthLabel(m.key), m.orders, m.tacos, m.hotdogs, m.aguas, m.cocas, m.total]),
        ['TOTAL', agg.orders, agg.taco.qty, agg.hotdog.qty, aguasQty, agg.coca.qty, agg.total],
      ],
      cols: [18, 10, 10, 10, 10, 12, 14],
      moneyCols: [6],
      headerRow: 0,
    });
  }

  const dayRows = Array.from(agg.days.values()).sort((a, b) => (a.key > b.key ? 1 : -1));
  sheets.push({
    name: 'Por Día',
    rows: [
      ['Fecha', 'Pedidos', 'Tacos', 'Hot Dogs', 'Aguas', 'Coca-Colas', 'Total ($)'],
      ...dayRows.map(d => [d.key, d.orders, d.tacos, d.hotdogs, d.aguas, d.cocas, d.total]),
      ['TOTAL', agg.orders, agg.taco.qty, agg.hotdog.qty, aguasQty, agg.coca.qty, agg.total],
    ],
    cols: [12, 10, 10, 10, 10, 12, 14],
    moneyCols: [6],
    headerRow: 0,
  });

  sheets.push({
    name: 'Detalle',
    rows: [
      ['Fecha', 'Hora', 'Folio', 'Mesa / Cliente', 'Tacos', 'Hot Dogs', 'Aguas', 'Coca-Colas', 'Productos', 'Total ($)'],
      ...records.slice().sort((a, b) => a.ts - b.ts).map(r => {
        const c = countRecordProducts(r);
        const productos = (r.items || []).map(it => `${it.qty}x ${it.name}`).join(' · ');
        return [r.day, localTimeLabel(r.ts), `#${String(r.num).padStart(3, '0')}`, r.table, c.tacos, c.hotdogs, c.aguas, c.cocas, productos, Number(r.total) || 0];
      }),
    ],
    cols: [12, 8, 8, 20, 8, 10, 8, 11, 60, 12],
    moneyCols: [9],
    headerRow: 0,
  });

  return sheets;
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
      ws['!cols'] = sheet.cols.map(wch => ({ wch }));
      // Formato de moneda en las columnas de dinero
      for (let r = sheet.headerRow + 1; r < sheet.rows.length; r++) {
        sheet.moneyCols.forEach(c => {
          const cell = ws[XLSXlib.utils.encode_cell({ r, c })];
          if (cell && cell.t === 'n') cell.z = '"$"#,##0.00';
        });
      }
      XLSXlib.utils.book_append_sheet(wb, ws, sheet.name);
    });
    XLSXlib.writeFile(wb, `${filename}.xlsx`);
    showKDSToast('Reporte de Excel descargado');
  } else {
    // Sin internet para cargar la librería: exportar CSV compatible con Excel
    const detalle = sheets.find(s => s.name === 'Detalle');
    const csv = '\ufeff' + detalle.rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`);
    showKDSToast('Reporte descargado en CSV (abre en Excel)');
  }
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
  const records = (await ledgerGetAll()).filter(r => r.month === month);
  if (records.length === 0) {
    showKDSToast(`Sin ventas registradas en ${monthLabel(month)}`);
    return;
  }
  await exportSalesWorkbook({
    records,
    periodLabel: monthLabel(month),
    filename: `Escandon_Ventas_${month}`,
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

  const records = await ledgerGetAll();
  if (records.length === 0) {
    showKDSToast('Aún no hay ventas en el historial');
    return;
  }
  await exportSalesWorkbook({
    records,
    periodLabel: 'Historial completo',
    filename: `Escandon_Historial_${localDayKey(Date.now())}`,
    includeMonthly: true,
  });
}

// ══════════════════════════════════════════════
//  ATAJOS DE TECLADO E INICIALIZACIÓN
// ══════════════════════════════════════════════
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeOrderModal();
    closeCloseShiftModal();
    if (cartOpen) toggleCart(false);
  }
  if (e.key === 'Enter' && document.getElementById('order-modal').classList.contains('open')) {
    submitOrder();
  }
});

(function init() {
  loadPersistedOrders();
  initCloudWebSockets();
  initFirebaseIfConfigured();

  const vistaParam = (urlParams.get('vista') || urlParams.get('view') || window.location.hash.replace('#', '')).toLowerCase();
  const mesaParam  = urlParams.get('mesa') || '';
  if (mesaParam) presetTableFromURL = mesaParam;

  // Si el cliente recarga la página mientras espera su pedido activo, mostrar el rastreador directo
  const activeOrder = activeTrackedOrderId ? orders.find(o => o.id === activeTrackedOrderId) : null;
  if (activeOrder && vistaParam !== 'cocina' && vistaParam !== 'kitchen' && vistaParam !== 'kds') {
    clientMode = 'tracker';
    showView('client');
    return;
  }

  if (vistaParam === 'cliente' || vistaParam === 'client') {
    showView('client');
  } else if (vistaParam === 'cocina' || vistaParam === 'kitchen' || vistaParam === 'kds') {
    showView('kitchen');
  } else {
    showView('landing');
  }
})();
