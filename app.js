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
  // Opcional: URL de Firebase Realtime Database
  firebaseDatabaseURL: '',
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
let orders               = []; // Comandas sincronizadas
let myOrderIds           = []; // IDs de órdenes creadas por este cliente
let activeTrackedOrderId = null;
let cartOpen             = false;
let kdsFilter            = 'all';
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
      renderClientTracker();
      if (fromRemote) playKitchenBell();
    }
  } else if (type === 'ORDER_STATUS') {
    const o = orders.find(x => x.id === payload.id);
    if (o && o.status !== payload.status) {
      const prevStatus = o.status;
      o.status = payload.status;
      persistOrders();
      renderKDS();
      notifyClientIfMyOrderChanged(o.id, prevStatus, o.status, o.num);
    }
  } else if (type === 'ORDER_DELETE') {
    const before = orders.length;
    orders = orders.filter(x => x.id !== payload.id);
    if (orders.length !== before) {
      persistOrders();
      renderKDS();
      renderClientTracker();
      updateHeaderTrackerPill();
    }
  }
}

function mergeRemoteStateSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.orders)) return;

  // Detectar si alguna orden de este cliente cambió de estado en el snapshot
  const prevStatusMap = new Map(orders.map(o => [o.id, o.status]));

  if (typeof snapshot.orderCounter === 'number' && snapshot.orderCounter > orderCounter) {
    orderCounter = snapshot.orderCounter;
  }

  orders = snapshot.orders;
  persistOrders();
  renderKDS();

  orders.forEach(o => {
    const prev = prevStatusMap.get(o.id);
    if (prev && prev !== o.status) {
      notifyClientIfMyOrderChanged(o.id, prev, o.status, o.num);
    }
  });

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

function initFirebaseIfConfigured() {
  const dbUrl = (CLOUD_CONFIG.firebaseDatabaseURL || '').trim().replace(/\/$/, '');
  if (!dbUrl) return;
  try {
    const evtSource = new EventSource(`${dbUrl}/escandon_kds.json`);
    evtSource.addEventListener('put', (e) => {
      try {
        const packet = JSON.parse(e.data);
        if (packet && packet.data && packet.data.orders) {
          mergeRemoteStateSnapshot(packet.data);
          updateCloudStatusUI(true);
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
      body: JSON.stringify({ orders, orderCounter, updatedAt: Date.now() }),
    }).catch(() => {});
  }
}

localChannel.onmessage = (e) => {
  const { type, payload } = e.data;
  handleIncomingEvent(type, payload, true);
};

window.addEventListener('storage', (e) => {
  if (e.key === 'kds-orders') {
    const prevMap = new Map(orders.map(o => [o.id, o.status]));
    loadPersistedOrders();
    orders.forEach(o => {
      const prev = prevMap.get(o.id);
      if (prev && prev !== o.status) {
        notifyClientIfMyOrderChanged(o.id, prev, o.status, o.num);
      }
    });
    renderKDS();
    renderClientTracker();
    updateHeaderTrackerPill();
  }
});

function persistOrders() {
  localStorage.setItem('kds-orders', JSON.stringify(orders));
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
    const saved   = localStorage.getItem('kds-orders');
    const cnt     = localStorage.getItem('kds-counter');
    const mine    = localStorage.getItem('kds-my-orders');
    const tracked = localStorage.getItem('kds-tracked-id');

    if (saved)   orders = JSON.parse(saved);
    if (cnt)     orderCounter = parseInt(cnt, 10) || 0;
    if (mine)    myOrderIds = JSON.parse(mine);
    if (tracked) activeTrackedOrderId = parseInt(tracked, 10) || null;
  } catch (e) {
    orders = [];
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
    inputEl.value = '';
    if (errEl) errEl.classList.add('hidden');
    unlockAudioContext();
    renderKitchenLockState();
    renderKDS();
    startClock();
    startTimers();
  } else {
    if (errEl) errEl.classList.remove('hidden');
    inputEl.value = '';
    inputEl.focus();
  }
}

function lockKDSAndExit() {
  kdsUnlocked = false;
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
    renderKDS();
    startClock();
    startTimers();
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
        <button class="order-btn btn-delete" onclick="deleteOrder(${order.id})">✕ Entregar</button>
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
  persistOrders();
  publishCloudSync('ORDER_STATUS', { id: orderId, status: newStatus });
  renderKDS();
  notifyClientIfMyOrderChanged(order.id, prevStatus, newStatus, order.num);
}

function deleteOrder(orderId) {
  orders = orders.filter(o => o.id !== orderId);
  persistOrders();
  publishCloudSync('ORDER_DELETE', { id: orderId });
  renderKDS();
  renderClientTracker();
  updateHeaderTrackerPill();
}

// ══════════════════════════════════════════════
//  ATAJOS DE TECLADO E INICIALIZACIÓN
// ══════════════════════════════════════════════
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeOrderModal();
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
