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

// Sistema unificado de íconos SVG monoline DineOS (cero emojis genéricos de UI)
const DINEOS_UI_ICONS = {
  user:     '<circle cx="12" cy="8" r="4"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  users:    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  star:     '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  spark:    '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/>',
  utensils: '<path d="M3 13h18"/><path d="M5 13a7 7 0 0 1 14 0"/><path d="M12 6V4"/><path d="M4 17h16"/>',
  bag:      '<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  truck:    '<rect x="2" y="7" width="12" height="9" rx="1.5"/><path d="M14 10h4l3 3v3h-7v-6Z"/><circle cx="6.5" cy="17.5" r="1.5"/><circle cx="17.5" cy="17.5" r="1.5"/>',
  bell:     '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  receipt:  '<path d="M4 3h16v18l-3-2-2.5 2-2.5-2-2.5 2L7 19l-3 2V3Z"/><path d="M8 8h8"/><path d="M8 12h6"/>',
  clock:    '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
  flame:    '<path d="M12 3c2 3 5 5.2 5 9a5 5 0 1 1-10 0c0-2.1 1-4 2.5-5.5 0 2 1 3 2.5 3.5-1-2.3-1-4.5 0-7Z"/>',
  camera:   '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  video:    '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  search:   '<circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.2" y2="16.2"/>',
  box:      '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  check:    '<polyline points="20 6 9 17 4 12"/>',
  alert:    '<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
};

function uiIcon(name, cls = '') {
  const paths = DINEOS_UI_ICONS[name] || DINEOS_UI_ICONS.spark;
  const classAttr = cls ? `ui-ico ${cls}` : 'ui-ico';
  return `<svg class="${classAttr}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function getDishMonogram(item) {
  if (!item) return 'PK';
  if (item.monogram) return String(item.monogram).toUpperCase().slice(0, 2);
  const dishId = item.dishId || (String(item.key || '').startsWith('dish:') ? String(item.key).slice(5).split('|')[0] : '');
  if (dishId && typeof PINCH_MENU_ITEMS !== 'undefined') {
    const found = PINCH_MENU_ITEMS.find(d => d.id === dishId);
    if (found && found.monogram) return found.monogram;
  }
  const clean = String(item.name || 'PK').replace(/[^A-Za-zÀ-ÿ0-9 ]/g, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase() || 'PK';
}

// ══════════════════════════════════════════════
//  ILUSTRACIONES VECTORIALES ARTESANALES DETALLADAS (100% SVG INTEGRADO)
//  - Cero imágenes externas rotas: nítido en cualquier pantalla y conexión
//  - Cada ingrediente es inconfundible al instante
// ══════════════════════════════════════════════
function preloadFoodPhotoAssets() {
  // Ilustraciones vectoriales integradas: carga instantánea sin archivos externos
}

const INGREDIENT_ART = {
  tortilla_sencilla: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <defs>
        <radialGradient id="ia_tort1" cx="42%" cy="36%" r="62%">
          <stop offset="0%" stop-color="#fff1c2"/>
          <stop offset="68%" stop-color="#f2cd78"/>
          <stop offset="100%" stop-color="#d9a548"/>
        </radialGradient>
      </defs>
      <ellipse cx="28" cy="31" rx="20" ry="18.5" fill="#7a4c14" opacity="0.16"/>
      <circle cx="28" cy="27.5" r="19.5" fill="url(#ia_tort1)" stroke="#ba822e" stroke-width="1.5"/>
      <circle cx="28" cy="27.5" r="16.5" fill="none" stroke="#fff7dc" stroke-width="1" opacity="0.6"/>
      <ellipse cx="21" cy="21" rx="3.4" ry="2.1" transform="rotate(-18 21 21)" fill="#b06f22" opacity="0.46"/>
      <ellipse cx="35.5" cy="23.5" rx="2.8" ry="1.8" transform="rotate(22 35.5 23.5)" fill="#9c5c17" opacity="0.42"/>
      <ellipse cx="29" cy="34.5" rx="3.8" ry="2.2" transform="rotate(-8 29 34.5)" fill="#a6641b" opacity="0.44"/>
      <circle cx="19" cy="31.5" r="1.5" fill="#9c5c17" opacity="0.38"/>
      <circle cx="36" cy="32.5" r="1.4" fill="#b06f22" opacity="0.36"/>
      <circle cx="28.5" cy="18" r="1.2" fill="#9c5c17" opacity="0.34"/>
    </svg>`,

  tortilla_doble: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <defs>
        <radialGradient id="ia_tort2b" cx="42%" cy="38%" r="64%">
          <stop offset="0%" stop-color="#f6df9e"/>
          <stop offset="72%" stop-color="#e3b659"/>
          <stop offset="100%" stop-color="#c48d33"/>
        </radialGradient>
        <radialGradient id="ia_tort2f" cx="40%" cy="34%" r="62%">
          <stop offset="0%" stop-color="#fff4ca"/>
          <stop offset="68%" stop-color="#f4d17f"/>
          <stop offset="100%" stop-color="#dba74b"/>
        </radialGradient>
      </defs>
      <ellipse cx="24" cy="35" rx="16.5" ry="14.5" fill="#7a4c14" opacity="0.16"/>
      <circle cx="23.5" cy="32" r="16" fill="url(#ia_tort2b)" stroke="#a87223" stroke-width="1.45"/>
      <ellipse cx="16.5" cy="34" rx="2.6" ry="1.6" fill="#965715" opacity="0.42"/>
      <circle cx="21" cy="41.5" r="1.4" fill="#965715" opacity="0.38"/>
      <ellipse cx="33.5" cy="26.5" rx="16.2" ry="15.2" fill="#5e3609" opacity="0.22"/>
      <circle cx="33" cy="24" r="16" fill="url(#ia_tort2f)" stroke="#ba822e" stroke-width="1.45"/>
      <circle cx="33" cy="24" r="13.4" fill="none" stroke="#fff9e3" stroke-width="0.95" opacity="0.62"/>
      <ellipse cx="27.5" cy="19.5" rx="2.8" ry="1.7" transform="rotate(-18 27.5 19.5)" fill="#a8671c" opacity="0.45"/>
      <ellipse cx="39" cy="23" rx="2.4" ry="1.5" transform="rotate(20 39 23)" fill="#965715" opacity="0.42"/>
      <ellipse cx="33" cy="30.5" rx="3.1" ry="1.8" fill="#a8671c" opacity="0.44"/>
    </svg>`,

  bistec: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <ellipse cx="28" cy="37" rx="19" ry="8" fill="#4a1e0a" opacity="0.16"/>
      <!-- Cubos y tiras de bistec asado a la plancha -->
      <path d="M11 32 Q12 24 20 24 L25 26 Q27 32 22 36 L14 36 Z" fill="#6b3015" stroke="#421a09" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M29 24 Q37 22 44 27 Q46 33 41 37 L31 36 Z" fill="#7a3818" stroke="#421a09" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M17 22 Q23 15 32 17 Q37 20 35 27 L22 28 Z" fill="#8c431f" stroke="#471d0a" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M20 30 Q28 26 35 30 Q37 36 31 39 L21 38 Z" fill="#823c1b" stroke="#421a09" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M25 21 Q30 19 36 22 Q37 27 32 29 L24 27 Z" fill="#9c4f27" stroke="#4d200b" stroke-width="1.2" stroke-linejoin="round"/>
      <!-- Marcas de sellado a la plancha -->
      <path d="M20 20 L25 25 M26 18 L31 23 M33 27 L39 33 M23 32 L28 37 M14 28 L19 33" stroke="#361306" stroke-width="1.8" stroke-linecap="round" opacity="0.72"/>
      <!-- Brillos jugosos -->
      <path d="M21 19 Q25 18 29 19.5" stroke="#d99462" stroke-width="1.6" stroke-linecap="round" opacity="0.78"/>
      <path d="M25 30.5 Q29 29.5 32.5 31" stroke="#d99462" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>
      <path d="M35 26 Q39 26 41.5 28" stroke="#d99462" stroke-width="1.4" stroke-linecap="round" opacity="0.65"/>
    </svg>`,

  longaniza: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <ellipse cx="28" cy="38" rx="19" ry="7.5" fill="#5e1406" opacity="0.16"/>
      <!-- Trozos y rodajas adobadas de longaniza roja -->
      <ellipse cx="18" cy="31" rx="8.5" ry="6.2" transform="rotate(-18 18 31)" fill="#b82b12" stroke="#6e1507" stroke-width="1.35"/>
      <ellipse cx="37.5" cy="32" rx="8.5" ry="6.2" transform="rotate(16 37.5 32)" fill="#c93516" stroke="#6e1507" stroke-width="1.35"/>
      <ellipse cx="28" cy="23.5" rx="9" ry="6.5" transform="rotate(-6 28 23.5)" fill="#df4820" stroke="#751808" stroke-width="1.35"/>
      <ellipse cx="28" cy="34.5" rx="8.2" ry="5.6" transform="rotate(8 28 34.5)" fill="#d63c18" stroke="#6e1507" stroke-width="1.3"/>
      <!-- Granitos de adobo y brillo naranja paprika -->
      <circle cx="25" cy="22" r="1.4" fill="#ff9e4a" opacity="0.88"/>
      <circle cx="31.5" cy="24.5" r="1.2" fill="#ffd28a" opacity="0.82"/>
      <circle cx="17" cy="29.5" r="1.3" fill="#ff9e4a" opacity="0.8"/>
      <circle cx="38" cy="30.5" r="1.3" fill="#ffad5c" opacity="0.82"/>
      <circle cx="27.5" cy="33.5" r="1.2" fill="#ffd28a" opacity="0.8"/>
      <circle cx="29" cy="21" r="1" fill="#591105" opacity="0.75"/>
      <circle cx="20.5" cy="33" r="1" fill="#591105" opacity="0.75"/>
      <circle cx="34.5" cy="34" r="1" fill="#591105" opacity="0.75"/>
      <path d="M23 19.5 Q28 18 33 20" fill="none" stroke="#ffbd73" stroke-width="1.4" stroke-linecap="round" opacity="0.75"/>
    </svg>`,

  cilantro: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <!-- Tallitos tiernos -->
      <path d="M27 44 Q28 34 25 25 M29 44 Q32 34 36 27 M26 42 Q20 35 16 29" fill="none" stroke="#2c8c3c" stroke-width="2" stroke-linecap="round"/>
      <!-- Hojas festoneadas de cilantro fresco -->
      <path d="M25 26 C18 22 17 13 24 12 C27 9 32 10 33 14 C38 15 37 23 30 25 Z" fill="#35a648" stroke="#1d662a" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M19 32 C11 31 9 23 14 19 C17 16 22 18 23 22 C26 26 23 31 19 32 Z" fill="#46bd58" stroke="#1e6b2c" stroke-width="1.25" stroke-linejoin="round"/>
      <path d="M34 32 C32 25 36 18 42 19 C47 21 47 28 42 32 C39 34 35 34 34 32 Z" fill="#2c8f3d" stroke="#1a5e26" stroke-width="1.25" stroke-linejoin="round"/>
      <path d="M24 37 C19 36 19 29 25 28 C29 26 34 29 33 34 C32 38 27 39 24 37 Z" fill="#4dc760" stroke="#1f702d" stroke-width="1.2" stroke-linejoin="round"/>
      <!-- Nervaduras brillantes -->
      <path d="M27 24 L27.5 14 M19 29 L15 22 M36 29 L41 23" stroke="#a6f2ae" stroke-width="1.2" stroke-linecap="round" opacity="0.85"/>
    </svg>`,

  cebolla: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <ellipse cx="28" cy="39" rx="18" ry="6.5" fill="#5c5373" opacity="0.14"/>
      <!-- Cubos perlados y aros de cebolla blanca picada -->
      <path d="M12 29 L22 25 L26 33 L16 37 Z" fill="#ffffff" stroke="#8d82a6" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M16 37 L26 33 L26 37 L16 40 Z" fill="#e6e1f0" stroke="#8d82a6" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M28 28 L39 24 L43 32 L32 36 Z" fill="#ffffff" stroke="#8d82a6" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M32 36 L43 32 L43 36 L32 39 Z" fill="#e2dce8" stroke="#8d82a6" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M20 18 L31 15 L35 23 L24 26 Z" fill="#ffffff" stroke="#857a9e" stroke-width="1.45" stroke-linejoin="round"/>
      <path d="M24 26 L35 23 L35 27 L24 30 Z" fill="#eae5f5" stroke="#857a9e" stroke-width="1.2" stroke-linejoin="round"/>
      <!-- Líneas sutiles de capas de cebolla -->
      <path d="M23 19 Q27.5 18 31.5 21" fill="none" stroke="#c3bad6" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M15 30 Q19 29 22 32" fill="none" stroke="#c3bad6" stroke-width="1.15" stroke-linecap="round"/>
      <path d="M31 29 Q35.5 28 39 30.5" fill="none" stroke="#c3bad6" stroke-width="1.15" stroke-linecap="round"/>
    </svg>`,

  salsa_roja: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <defs>
        <radialGradient id="ia_salsa" cx="42%" cy="38%" r="60%">
          <stop offset="0%" stop-color="#f54b33"/>
          <stop offset="65%" stop-color="#cc1e0e"/>
          <stop offset="100%" stop-color="#8c1005"/>
        </radialGradient>
      </defs>
      <!-- Cazuelita / mancha brillante de salsa de molcajete -->
      <path d="M10 31 C10 22 19 18 28 18 C37 18 46 22 46 31 C46 39 37 42 28 42 C19 42 10 39 10 31 Z" fill="#4a4440" stroke="#2b2725" stroke-width="1.5"/>
      <ellipse cx="28" cy="28" rx="15.5" ry="9.5" fill="url(#ia_salsa)" stroke="#780d04" stroke-width="1.2"/>
      <!-- Semillitas y trocitos asados de molcajete -->
      <circle cx="22" cy="27" r="1.2" fill="#fad26b"/>
      <circle cx="33" cy="29.5" r="1.15" fill="#fad26b"/>
      <circle cx="28" cy="24.5" r="1.1" fill="#fad26b"/>
      <circle cx="25" cy="31" r="1.2" fill="#4f0a03"/>
      <circle cx="35.5" cy="26" r="1.1" fill="#4f0a03"/>
      <circle cx="19.5" cy="30" r="1" fill="#4f0a03"/>
      <!-- Brillo especular -->
      <path d="M18 24.5 Q24 21 31 22" fill="none" stroke="#ffada1" stroke-width="2" stroke-linecap="round" opacity="0.72"/>
    </svg>`,

  ketchup: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <!-- Bote squeeze de Ketchup + chorro zigzag rojo -->
      <g transform="translate(22 25) rotate(-24)">
        <path d="M-3 -17 L0 -23 L3 -17 Z" fill="#e02516" stroke="#851107" stroke-width="1.1"/>
        <rect x="-6.5" y="-17" width="13" height="5" rx="2" fill="#f7f4ec" stroke="#b5aa98" stroke-width="1.1"/>
        <rect x="-8.5" y="-12" width="17" height="26" rx="5.5" fill="#e02516" stroke="#851107" stroke-width="1.35"/>
        <rect x="-7.2" y="-3" width="14.4" height="9" rx="1.5" fill="#ffffff" opacity="0.94"/>
        <line x1="-4" y1="1.5" x2="4" y2="1.5" stroke="#e02516" stroke-width="2" stroke-linecap="round"/>
        <path d="M-4.8 -9 L-4.8 10" stroke="#ff9c94" stroke-width="1.8" stroke-linecap="round" opacity="0.6"/>
      </g>
      <path d="M25 43 Q30 37 35 43 T46 41" fill="none" stroke="#851107" stroke-width="5.2" stroke-linecap="round" opacity="0.25"/>
      <path d="M25 42 Q30 36 35 42 T46 40" fill="none" stroke="#df2314" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M26 41 Q30 36.8 34.5 41" fill="none" stroke="#ff9e96" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>
    </svg>`,

  mayonesa: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <!-- Bote squeeze de Mayonesa + chorro cremoso marfil -->
      <g transform="translate(22 25) rotate(-24)">
        <path d="M-3 -17 L0 -23 L3 -17 Z" fill="#f7f2e4" stroke="#aba089" stroke-width="1.1"/>
        <rect x="-6.5" y="-17" width="13" height="5" rx="2" fill="#ede4d1" stroke="#aba089" stroke-width="1.1"/>
        <rect x="-8.5" y="-12" width="17" height="26" rx="5.5" fill="#fffdf7" stroke="#aba089" stroke-width="1.4"/>
        <rect x="-7.2" y="-3" width="14.4" height="9" rx="1.5" fill="#f0b643" opacity="0.92"/>
        <line x1="-4" y1="1.5" x2="4" y2="1.5" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
      </g>
      <path d="M25 42 Q30 36 35 42 T46 40" fill="none" stroke="#b3a68c" stroke-width="5.6" stroke-linecap="round"/>
      <path d="M25 42 Q30 36 35 42 T46 40" fill="none" stroke="#fffef9" stroke-width="3.6" stroke-linecap="round"/>
    </svg>`,

  mostaza: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <!-- Bote squeeze de Mostaza + chorro dorado -->
      <g transform="translate(22 25) rotate(-24)">
        <path d="M-3 -17 L0 -23 L3 -17 Z" fill="#e8b30e" stroke="#916803" stroke-width="1.1"/>
        <rect x="-6.5" y="-17" width="13" height="5" rx="2" fill="#f7c928" stroke="#916803" stroke-width="1.1"/>
        <rect x="-8.5" y="-12" width="17" height="26" rx="5.5" fill="#f5c21b" stroke="#916803" stroke-width="1.35"/>
        <rect x="-7.2" y="-3" width="14.4" height="9" rx="1.5" fill="#fffbe6" opacity="0.95"/>
        <line x1="-4" y1="1.5" x2="4" y2="1.5" stroke="#a67704" stroke-width="2" stroke-linecap="round"/>
        <path d="M-4.8 -9 L-4.8 10" stroke="#fff6b8" stroke-width="1.8" stroke-linecap="round" opacity="0.72"/>
      </g>
      <path d="M25 43 Q30 37 35 43 T46 41" fill="none" stroke="#916803" stroke-width="5.2" stroke-linecap="round" opacity="0.25"/>
      <path d="M25 42 Q30 36 35 42 T46 40" fill="none" stroke="#f2bd16" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M26 41 Q30 36.8 34.5 41" fill="none" stroke="#fff7bf" stroke-width="1.2" stroke-linecap="round" opacity="0.85"/>
    </svg>`,

  chiles: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <!-- 3 rodajas de chile jalapeño curado con semillas -->
      <g transform="translate(20 33)">
        <ellipse rx="10.5" ry="8.5" fill="#468027" stroke="#294f15" stroke-width="1.3"/>
        <ellipse rx="7.6" ry="5.9" fill="#7ec744"/>
        <ellipse rx="4.2" ry="3.2" fill="#e5f2b3"/>
        <circle cx="-1.8" cy="-0.8" r="1" fill="#e0b84c"/>
        <circle cx="1.8" cy="0.8" r="1" fill="#e0b84c"/>
      </g>
      <g transform="translate(36 33)">
        <ellipse rx="10" ry="8" fill="#4d8a2b" stroke="#294f15" stroke-width="1.3"/>
        <ellipse rx="7.2" ry="5.5" fill="#84cc49"/>
        <ellipse rx="4" ry="3" fill="#e5f2b3"/>
        <circle cx="-1.5" cy="0.8" r="0.95" fill="#e0b84c"/>
        <circle cx="1.8" cy="-0.9" r="0.95" fill="#e0b84c"/>
      </g>
      <g transform="translate(28 21.5)">
        <ellipse rx="11" ry="8.8" fill="#53942f" stroke="#294f15" stroke-width="1.35"/>
        <ellipse rx="8.1" ry="6.2" fill="#8cd651"/>
        <ellipse rx="4.5" ry="3.4" fill="#edf7c1"/>
        <circle cx="-2" cy="-0.6" r="1.05" fill="#e0b84c"/>
        <circle cx="2" cy="-0.5" r="1.05" fill="#e0b84c"/>
        <circle cx="0" cy="1.6" r="1" fill="#e0b84c"/>
      </g>
    </svg>`,

  tomate: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <ellipse cx="28" cy="39" rx="18" ry="6.5" fill="#6b1108" opacity="0.14"/>
      <!-- Cubos brillantes de tomate rojo picado -->
      <path d="M11 29 L21 25 L25 33 L15 37 Z" fill="#e63522" stroke="#8f180c" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M15 37 L25 33 L25 38 L15 41 Z" fill="#bf2111" stroke="#8f180c" stroke-width="1.15" stroke-linejoin="round"/>
      <path d="M29 27 L40 24 L44 32 L33 36 Z" fill="#ed3f2b" stroke="#8f180c" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M33 36 L44 32 L44 37 L33 40 Z" fill="#c42414" stroke="#8f180c" stroke-width="1.15" stroke-linejoin="round"/>
      <path d="M19 18 L31 15 L35 23 L23 26 Z" fill="#f24733" stroke="#8f180c" stroke-width="1.35" stroke-linejoin="round"/>
      <path d="M23 26 L35 23 L35 27.5 L23 30 Z" fill="#cc2616" stroke="#8f180c" stroke-width="1.15" stroke-linejoin="round"/>
      <!-- Semillitas amarillas y brillo fresco -->
      <circle cx="25.5" cy="20" r="1" fill="#ffe078"/>
      <circle cx="29.5" cy="21" r="0.95" fill="#ffe078"/>
      <circle cx="17.5" cy="31" r="0.95" fill="#ffe078"/>
      <circle cx="36" cy="29.5" r="1" fill="#ffe078"/>
      <path d="M22 18.5 L29 16.8" stroke="#ffb3a8" stroke-width="1.3" stroke-linecap="round" opacity="0.8"/>
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
//  CATÁLOGO COMPLETO PINCH KITCHEN+BAR (40 PLATILLOS · 6 CATEGORÍAS)
// ══════════════════════════════════════════════
function formatMenuPrice(amount) {
  return '$' + Number(amount || 0).toFixed(2);
}

const PINCH_MENU_CATEGORIES = [
  { id: 'pinch_bites',        title: 'Pinch Bites',         subtitle: 'Entradas y Bocados',       emoji: '🫒', priceRange: '$12–$21', palette: ['#faf6f0', '#f1e7d8', '#8a5a2b'] },
  { id: 'burgers_sandwiches', title: 'Burgers & Sandwiches', subtitle: 'Hamburguesas y Sándwiches', emoji: '🍔', priceRange: '$17–$23', palette: ['#f9f4ee', '#efe2d2', '#9a4a1e'] },
  { id: 'entrees',            title: 'Entrees',             subtitle: 'Platos Fuertes',            emoji: '🥩', priceRange: '$14–$39', palette: ['#f6f4f1', '#e8e2da', '#4a3a2f'] },
  { id: 'sides',              title: 'Sides',               subtitle: 'Guarniciones',              emoji: '🍟', priceRange: '$5–$12',  palette: ['#f3f7f2', '#e2ede0', '#386641'] },
  { id: 'desserts',           title: 'Desserts',            subtitle: 'Postres Artesanales',       emoji: '🥧', priceRange: '$5–$16',  palette: ['#fbf4f6', '#f2e1e6', '#8d3b53'] },
  { id: 'drinks',             title: 'Drinks / Beverages',  subtitle: 'Bebidas Frías y Aguas Frescas', emoji: '🥤', priceRange: '$4–$6',   palette: ['#f2f6fa', '#e0eaf3', '#275987'] },
];

const PINCH_MENU_ITEMS = [
  // 1. Pinch Bites (10 productos)
  {
    id: 'olives',
    category: 'pinch_bites',
    name: 'Olives',
    price: 12.00,
    emoji: '🫒',
    monogram: 'OL',
    badges: ['V', 'GF', 'Hecho en Casa'],
    shortDesc: 'Aceitunas marinadas en casa con cítricos y hierbas.',
    fullDesc: 'Aceitunas marinadas directamente en la cocina de la casa con una infusión aromática de cítricos y hierbas frescas. Ofrecen un perfil brillante, ligeramente salino y herbal que funciona como aperitivo ligero para abrir el apetito o acompañar bebidas antes de los platos principales.',
    ingredients: ['Aceitunas marinadas', 'Infusión de cítricos', 'Hierbas frescas'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'ktown_guac',
    category: 'pinch_bites',
    name: 'K-town Guac',
    price: 18.00,
    emoji: '🥑',
    monogram: 'KG',
    badges: ['Picante', 'Hecho en Casa'],
    shortDesc: 'Kimchi hecho en casa, tortilla crujiente y especias coreanas.',
    fullDesc: 'Reinterpretación de guacamole con inspiración coreana que integra kimchi fermentado hecho en casa y una mezcla de especias coreanas para aportar profundidad umami, acidez viva y un toque picante. Se sirve acompañado de tortilla crujiente para contrastar la cremosidad de la mezcla.',
    ingredients: ['Guacamole', 'Kimchi hecho en casa', 'Especias coreanas', 'Tortilla crujiente'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'seasonal_soup',
    category: 'pinch_bites',
    name: 'Seasonal Soup',
    price: 13.00,
    emoji: '🥣',
    monogram: 'SS',
    badges: ['V', 'GF'],
    shortDesc: 'Sopa 100% de vegetales, opción vegana.',
    fullDesc: 'Sopa de temporada elaborada al 100% con vegetales seleccionados y completamente vegana, libre de ingredientes de origen animal. Pensada como una entrada reconfortante, ligera y limpia que resalta el sabor natural de los ingredientes de estación.',
    ingredients: ['Vegetales de temporada', 'Caldo 100% vegetal', 'Opción vegana'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'pinch_croquetas',
    category: 'pinch_bites',
    name: 'Pinch Croquetas',
    price: 13.00,
    emoji: '🥟',
    monogram: 'PC',
    badges: ['Signature', 'Hecho en Casa'],
    shortDesc: 'Croquetas de jamón servidas con alioli.',
    fullDesc: 'Clásicas croquetas de jamón estilo Miami con exterior dorado y crujiente e interior suave y sabroso. Se presentan con alioli cremoso de la casa que redondea el perfil salado del jamón y añade una nota suave de ajo.',
    ingredients: ['Croquetas de jamón estilo Miami', 'Alioli cremoso de la casa'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'pinch_salad',
    category: 'pinch_bites',
    name: 'Pinch Salad',
    price: 17.00,
    emoji: '🥗',
    monogram: 'PS',
    badges: ['GF', 'Vegetariano'],
    shortDesc: 'Arúgula, vegetales laminados, Parmigiano Reggiano y vinagreta de pepino.',
    fullDesc: 'Ensalada fresca en porción completa elaborada sobre una base de arúgula ligeramente picante, acompañada de vegetales finamente laminados y láminas de queso Parmigiano Reggiano curado. Se adereza con una vinagreta de pepino que aporta frescura y ligereza al conjunto.',
    ingredients: ['Arúgula fresca', 'Vegetales laminados', 'Parmigiano Reggiano', 'Vinagreta de pepino'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'bbq_porkbelly',
    category: 'pinch_bites',
    name: 'BBQ Porkbelly',
    price: 15.00,
    emoji: '🥓',
    monogram: 'PB',
    badges: ['Signature', 'Hecho en Casa'],
    shortDesc: 'Salsa BBQ de guayaba, chicharrón de cerdo, cebollas al mojo y cilantro.',
    fullDesc: "Panceta de cerdo glaseada con salsa BBQ de guayaba que equilibra notas dulces, frutales y ahumadas. Se termina con chicharrón crujiente (pork cracklin'), cebollas al mojo de perfil cítrico y cilantro fresco para aportar textura crocante y frescura herbal.",
    ingredients: ['Panceta de cerdo', 'Salsa BBQ de guayaba', 'Chicharrón crujiente', 'Cebollas al mojo', 'Cilantro fresco'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'gambas_al_ajillo',
    category: 'pinch_bites',
    name: 'Gambas al ajillo',
    price: 17.00,
    emoji: '🍤',
    monogram: 'GA',
    badges: ['Mariscos'],
    shortDesc: 'Camarón rojo salvaje de la Patagonia, ajo, azafrán y pan cubano.',
    fullDesc: 'Camarones rojos salvajes de la Patagonia salteados al estilo tradicional con abundante ajo y un toque aromático de azafrán que realza su dulzor marino natural. Se acompañan con pan cubano ideal para absorber el aceite infusionado y los jugos de la cocción.',
    ingredients: ['Camarón rojo salvaje de la Patagonia', 'Ajo salteado', 'Azafrán', 'Pan cubano hecho en casa'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'croquetas_de_bacalao',
    category: 'pinch_bites',
    name: 'Croquetas de Bacalao',
    price: 16.00,
    emoji: '🐟',
    monogram: 'CB',
    badges: ['Mariscos', 'Hecho en Casa'],
    shortDesc: 'Seis croquetas de bacalao con alioli de pimienta y limón.',
    fullDesc: 'Orden de seis croquetas artesanales de bacalao, doradas por fuera y tiernas por dentro, con un sabor marino delicado. Se sirven con alioli de pimienta y limón (lemon pepper aioli) que aporta acidez cítrica y un remate especiado.',
    ingredients: ['6 croquetas artesanales de bacalao', 'Alioli de pimienta y limón'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'fried_shrimp',
    category: 'pinch_bites',
    name: 'Fried Shrimp',
    price: 21.00,
    emoji: '🦐',
    monogram: 'FS',
    badges: ['Mariscos'],
    shortDesc: 'Ocho camarones salvajes de la Patagonia empanizados y fritos, con alioli de pimienta y limón.',
    fullDesc: 'Porción generosa de ocho camarones rojos salvajes de la Patagonia, empanizados y fritos hasta lograr una cobertura crujiente y dorada manteniendo el interior jugoso. Acompañados de alioli de pimienta y limón para equilibrar la fritura con notas frescas.',
    ingredients: ['8 camarones salvajes de la Patagonia', 'Empanizado crujiente', 'Alioli de pimienta y limón'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'pinch_nachos',
    category: 'pinch_bites',
    name: 'Pinch Nachos',
    price: 17.00,
    emoji: '🧀',
    monogram: 'PN',
    badges: ['Para Compartir', 'Picante'],
    shortDesc: 'Totopos de maíz azul, frijoles refritos, cebolla morada, jalapeño, tomate, cilantro, salsa de queso al chipotle y cebollas encurtidas.',
    fullDesc: 'Totopos crujientes de maíz azul cubiertos con frijoles refritos, salsa cremosa de queso al chipotle, cebolla morada, jalapeño, tomate fresco y cilantro, rematados con cebollas encurtidas que aportan acidez para contrastar la riqueza del queso y el toque ahumado del chipotle.',
    ingredients: ['Totopos de maíz azul', 'Frijoles refritos', 'Salsa de queso al chipotle', 'Jalapeño', 'Cebolla morada y encurtidas', 'Tomate y cilantro'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },

  // 2. Burgers & Sandwiches (6 productos)
  {
    id: 'turkey_blt',
    category: 'burgers_sandwiches',
    name: 'Turkey BLT',
    price: 17.00,
    emoji: '🥪',
    monogram: 'TB',
    badges: ['Hecho en Casa'],
    shortDesc: 'Pavo curado en casa, alioli, tocino ahumado en madera de manzano, lechuga y tomate en pan cubano hecho en casa.',
    fullDesc: 'Sándwich de pavo curado en casa que combina la suavidad de la carne con tocino ahumado en madera de manzano, lechuga crujiente, tomate fresco y alioli cremoso. Todo se ensambla en pan cubano elaborado en casa, de corteza ligera y miga suave.',
    ingredients: ['Pavo curado en casa', 'Tocino ahumado en madera de manzano', 'Alioli', 'Lechuga y tomate', 'Pan cubano hecho en casa'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'pinch_cuban_sandwich',
    category: 'burgers_sandwiches',
    name: 'Pinch Cuban Sandwich',
    price: 18.00,
    emoji: '🥖',
    monogram: 'CU',
    badges: ['Signature', 'Hecho en Casa'],
    shortDesc: 'Jamón curado en casa, queso suizo, lechuga, alioli, mostaza, pepinillos, papitas hilo y pan cubano hecho en casa.',
    fullDesc: 'Versión de la casa del emblemático sándwich cubano, preparado con jamón curado en casa, queso suizo fundido, pepinillos encurtidos, mostaza, alioli y lechuga fresca, enriquecido con papitas hilo (potato sticks) que añaden un contraste crujiente dentro de su pan cubano artesanal.',
    ingredients: ['Jamón curado en casa', 'Queso suizo', 'Pepinillos', 'Mostaza y alioli', 'Papitas hilo', 'Lechuga', 'Pan cubano hecho en casa'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'pinch_burger',
    category: 'burgers_sandwiches',
    name: 'Pinch Burger',
    price: 20.00,
    emoji: '🍔',
    monogram: 'BG',
    badges: ['Signature', 'Hecho en Casa'],
    shortDesc: 'Mezcla de carne de 8 oz, queso suizo, cebollas caramelizadas, lechuga, tomate, alioli, pan brioche y papas fritas cortadas en casa.',
    fullDesc: 'La hamburguesa insignia del restaurante: carne de 8 oz preparada con una mezcla personalizada de la casa, coronada con queso suizo, cebollas caramelizadas dulces, lechuga, tomate y alioli sobre un pan brioche mantequilloso. Incluye guarnición de papas fritas cortadas a mano en casa.',
    ingredients: ['Carne mezcla de la casa 8 oz', 'Queso suizo', 'Cebollas caramelizadas', 'Lechuga y tomate', 'Alioli', 'Pan brioche', 'Papas cortadas en casa'],
    optionGroup: { label: 'Término de la carne', choices: ['Término Medio', '3/4', 'Bien Cocido', 'Rojo / Azul'] },
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'impossible_vegan_burger',
    category: 'burgers_sandwiches',
    name: 'Impossible Vegan Burger',
    price: 19.00,
    emoji: '🌱',
    monogram: 'IV',
    badges: ['V'],
    shortDesc: 'Guacamole, lechuga, tomate, papitas hilo, kétchup, pan pretzel y papas fritas cortadas en casa.',
    fullDesc: 'Alternativa 100% basada en plantas con proteína vegetal Impossible, complementada con guacamole cremoso, lechuga, tomate, kétchup y papitas hilo crujientes dentro de un pan pretzel de sabor ligeramente tostado. Se sirve acompañada de papas fritas cortadas en casa.',
    ingredients: ['Proteína Impossible 100% vegetal', 'Guacamole', 'Papitas hilo', 'Lechuga y tomate', 'Kétchup', 'Pan pretzel', 'Papas cortadas en casa'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'mahi_mahi_sandwich',
    category: 'burgers_sandwiches',
    name: 'Mahi Mahi Sandwich',
    price: 23.00,
    emoji: '🐠',
    monogram: 'MM',
    badges: ['Mariscos', 'Picante'],
    shortDesc: 'Filete local de mahi mahi de 6 oz estilo blackened, pan brioche hecho en casa, pikliz, lechuga, tomate, ranch de aguacate y papas cortadas en casa.',
    fullDesc: 'Filete fresco local de dorado (mahi mahi) de 6 oz sellado con especias estilo blackened (costra tostada y aromática), servido en pan brioche hecho en casa. Se acompaña de pikliz (encurtido picante de inspiración haitiana), lechuga, tomate, aderezo ranch de aguacate y papas fritas cortadas en casa.',
    ingredients: ['Filete local de mahi mahi 6 oz blackened', 'Pikliz haitiano', 'Ranch de aguacate', 'Lechuga y tomate', 'Pan brioche hecho en casa', 'Papas cortadas en casa'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'fried_chicken_sandwich',
    category: 'burgers_sandwiches',
    name: 'Fried Chicken Sandwich',
    price: 21.00,
    emoji: '🍗',
    monogram: 'FC',
    badges: ['Picante', 'Hecho en Casa'],
    shortDesc: 'Muslo de pollo, alioli picante, lechuga, zanahoria, cebollas encurtidas al mojo, pan brioche y papas fritas cortadas en casa.',
    fullDesc: 'Muslo de pollo frito, elegido por su mayor jugosidad y sabor frente a la pechuga, bañado con alioli picante y acompañado de lechuga, zanahoria y cebollas encurtidas al mojo para un balance entre crocancia, picor y acidez. Servido en pan brioche con papas fritas cortadas en casa.',
    ingredients: ['Muslo de pollo frito', 'Alioli picante', 'Cebollas encurtidas al mojo', 'Zanahoria y lechuga', 'Pan brioche', 'Papas cortadas en casa'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },

  // 3. Entrees (8 productos)
  {
    id: 'eggs_any_style',
    category: 'entrees',
    name: 'Eggs any style',
    price: 14.00,
    emoji: '🍳',
    monogram: 'EA',
    badges: ['Brunch', 'GF'],
    shortDesc: 'Dos huevos orgánicos servidos con papas de la casa.',
    fullDesc: 'Preparación clásica de desayuno o brunch compuesta por dos huevos orgánicos cocinados exactamente al gusto del comensal, servidos junto con las papas de la casa recién cortadas y sazonadas.',
    ingredients: ['2 huevos orgánicos', 'Papas de la casa recién cortadas'],
    optionGroup: { label: 'Estilo de huevos', choices: ['Estrellados', 'Revueltos', 'Pochados', 'Omelette'] },
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'black_angus_skirt_steak',
    category: 'entrees',
    name: 'Black Angus Skirt Steak',
    price: 37.00,
    emoji: '🥩',
    monogram: 'AS',
    badges: ['Angus Beef', 'GF', 'Signature'],
    shortDesc: 'Certified Angus Beef, entraña de 8 oz, coles de Bruselas picantes y salsa de vinagreta brasileña para carne.',
    fullDesc: 'Corte de entraña (skirt steak) de 8 oz con certificación Certified Angus Beef, reconocido por su jugosidad y sabor intenso. Se acompaña de coles de Bruselas picantes y una salsa de vinagreta brasileña para carne que aporta acidez y frescura frente al perfil cárnico.',
    ingredients: ['Entraña Certified Angus Beef 8 oz', 'Coles de Bruselas picantes', 'Vinagreta brasileña para carne'],
    optionGroup: { label: 'Término del corte', choices: ['Término Medio', '3/4', 'Bien Cocido', 'Rojo / Azul'] },
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'stuffed_french_toast',
    category: 'entrees',
    name: 'Stuffed French Toast',
    price: 20.00,
    emoji: '🍞',
    monogram: 'FT',
    badges: ['Brunch', 'Hecho en Casa'],
    shortDesc: 'Pan brioche hecho en casa relleno de guayaba y queso crema batido, servido con jarabe de guayaba y maple.',
    fullDesc: 'Pan francés indulgente elaborado con pan brioche hecho en casa, relleno de guayaba y queso crema batido para combinar dulzor tropical con textura aterciopelada. Se baña con jarabe de maple y guayaba que acentúa su carácter aromático.',
    ingredients: ['Pan brioche hecho en casa', 'Guayaba', 'Queso crema batido', 'Jarabe de guayaba y maple'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'tagliatelle_alla_bolognese',
    category: 'entrees',
    name: 'Tagliatelle alla Bolognese',
    price: 26.00,
    emoji: '🍝',
    monogram: 'TB',
    badges: ['Pasta'],
    shortDesc: 'Ragú de tres carnes (res, cerdo y ternera) y Parmigiano Reggiano.',
    fullDesc: 'Pasta italiana plana tipo tagliatelle, ideal para retener salsas densas, servida con un ragú tradicional de tres carnes —res, cerdo y ternera— cocido para concentrar sabores profundos, y terminado con queso Parmigiano Reggiano rallado.',
    ingredients: ['Pasta tagliatelle', 'Ragú de 3 carnes (res, cerdo y ternera)', 'Parmigiano Reggiano'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'bucatini_al_pomodoro',
    category: 'entrees',
    name: 'Bucatini al pomodoro',
    price: 24.00,
    emoji: '🍅',
    monogram: 'BP',
    badges: ['Vegetariano', 'Pasta'],
    shortDesc: 'Salsa de tomate, Parmigiano Reggiano y albahaca.',
    fullDesc: 'Pasta larga y hueca tipo bucatini que permite que la salsa penetre tanto por fuera como por dentro, cubierta con salsa de tomate clásica, queso Parmigiano Reggiano y hojas frescas de albahaca para un perfil mediterráneo limpio y aromático.',
    ingredients: ['Pasta bucatini', 'Salsa de tomate clásica', 'Parmigiano Reggiano', 'Albahaca fresca'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'bbq_baby_back_ribs_half',
    category: 'entrees',
    name: 'BBQ Baby Back Ribs (Half Rack)',
    price: 25.00,
    emoji: '🍖',
    monogram: 'HR',
    badges: ['Signature', 'Hecho en Casa'],
    shortDesc: 'Medio costillar de cerdo cocido a fuego lento con salsa BBQ de guayaba hecha en casa, papas cortadas a mano y kétchup.',
    fullDesc: 'Medio costillar de cerdo tipo baby back sometido a cocción lenta para lograr carne tierna, jugosa y de notas ahumadas, glaseado con la salsa BBQ de guayaba hecha en casa. Se sirve con papas fritas cortadas a mano y kétchup.',
    ingredients: ['Medio costillar baby back a fuego lento', 'Salsa BBQ de guayaba hecha en casa', 'Papas cortadas a mano', 'Kétchup'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'bbq_baby_back_ribs_full',
    category: 'entrees',
    name: 'BBQ Baby Back Ribs (Full Rack)',
    price: 31.00,
    emoji: '🔥',
    monogram: 'FR',
    badges: ['Para Compartir', 'Hecho en Casa'],
    shortDesc: 'Costillar completo de cerdo cocido a fuego lento con salsa BBQ de guayaba hecha en casa, papas cortadas a mano y kétchup.',
    fullDesc: 'Costillar completo de cerdo tipo baby back cocido lentamente hasta alcanzar una textura jugosa y ahumada, bañado en la salsa BBQ de guayaba de la casa. Porción amplia pensada para apetito grande o para compartir, acompañada de papas fritas cortadas a mano y kétchup.',
    ingredients: ['Costillar completo baby back a fuego lento', 'Salsa BBQ de guayaba hecha en casa', 'Papas cortadas a mano', 'Kétchup'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'steak_n_eggs',
    category: 'entrees',
    name: "Steak n' Eggs",
    price: 39.00,
    emoji: '🥩',
    monogram: 'SE',
    badges: ['Angus Beef', 'Brunch', 'GF'],
    shortDesc: 'Certified Angus Beef, entraña de 8 oz, dos huevos estrellados, papas de la casa y salsa de vinagreta brasileña para carne.',
    fullDesc: 'El platillo más completo y de mayor valor del menú: entraña Certified Angus Beef de 8 oz acompañada de dos huevos estrellados (sunny side up), papas de la casa recién cortadas y salsa de vinagreta brasileña para carne. Combina proteína robusta con el formato clásico de brunch.',
    ingredients: ['Entraña Certified Angus Beef 8 oz', '2 huevos estrellados', 'Papas de la casa recién cortadas', 'Vinagreta brasileña'],
    optionGroup: { label: 'Término del corte', choices: ['Término Medio', '3/4', 'Bien Cocido', 'Rojo / Azul'] },
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },

  // 4. Sides (7 productos)
  {
    id: 'spicy_brussel_sprouts',
    category: 'sides',
    name: 'Spicy Brussel Sprouts',
    price: 10.00,
    emoji: '🥬',
    monogram: 'SB',
    badges: ['V', 'GF', 'Picante'],
    shortDesc: 'Coles de Bruselas con hojuelas de chile.',
    fullDesc: 'Coles de Bruselas preparadas con hojuelas de chile (chili flakes) que realzan su sabor tostado natural con un nivel de picor directo y vibrante. Funcionan como acompañamiento vegetal ideal para cortes de res o carnes a la parrilla.',
    ingredients: ['Coles de Bruselas tostadas', 'Hojuelas de chile (chili flakes)'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'petit_salad',
    category: 'sides',
    name: 'Petit Salad',
    price: 10.00,
    emoji: '🥬',
    monogram: 'PS',
    badges: ['V', 'GF'],
    shortDesc: 'Arúgula, vegetales laminados y vinagreta de pepino.',
    fullDesc: 'Versión en porción individual de guarnición de la ensalada de la casa, compuesta por arúgula fresca, vegetales finamente laminados y vinagreta de pepino. Aporta un contrapunto ligero y refrescante a hamburguesas, pastas o carnes.',
    ingredients: ['Arúgula fresca', 'Vegetales laminados', 'Vinagreta de pepino'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'house_cut_french_fries',
    category: 'sides',
    name: 'House Cut French Fries',
    price: 10.00,
    emoji: '🍟',
    monogram: 'FF',
    badges: ['V', 'Hecho en Casa'],
    shortDesc: 'Papas fritas cortadas a mano hechas en casa, servidas con kétchup.',
    fullDesc: 'Papas fritas elaboradas y cortadas a mano en la cocina del restaurante, cocinadas hasta alcanzar un tono dorado parejo con exterior crujiente e interior caliente y suave. Se sirven acompañadas de kétchup.',
    ingredients: ['Papas cortadas a mano en casa', 'Kétchup'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'pinch_focaccia',
    category: 'sides',
    name: 'Pinch Focaccia',
    price: 5.00,
    emoji: '🍞',
    monogram: 'PF',
    badges: ['Vegetariano', 'Hecho en Casa'],
    shortDesc: 'Focaccia hecha en casa.',
    fullDesc: 'Pan italiano tipo focaccia horneado directamente en casa, de miga esponjosa y corteza dorada. Es la guarnición más accesible del menú y resulta ideal para acompañar sopas, ensaladas, pastas o entradas con salsa.',
    ingredients: ['Focaccia artesanal horneada en casa'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'house_potatoes',
    category: 'sides',
    name: 'House Potatoes',
    price: 12.00,
    emoji: '🥔',
    monogram: 'HP',
    badges: ['V', 'GF', 'Hecho en Casa'],
    shortDesc: "Papas recién cortadas en casa con za'atar.",
    fullDesc: "Papas recién cortadas en casa y sazonadas con za'atar, una mezcla tradicional de especias de Medio Oriente que aporta notas herbales, cítricas y aromáticas, elevando un acompañamiento clásico con un perfil distintivo.",
    ingredients: ['Papas recién cortadas en casa', "Especias za'atar de Medio Oriente"],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'pommes_puree',
    category: 'sides',
    name: 'Pommes Purée',
    price: 12.00,
    emoji: '🥣',
    monogram: 'PP',
    badges: ['GF', 'Vegetariano', 'Hecho en Casa'],
    shortDesc: 'Puré hecho en casa con papas frescas.',
    fullDesc: 'Puré de papa al estilo francés preparado en casa con papas frescas para lograr una textura fina, tersa y reconfortante. Acompañamiento clásico pensado para complementar carnes o platos con salsa.',
    ingredients: ['Papas frescas', 'Preparación francesa artesanal'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'broccolini',
    category: 'sides',
    name: 'Broccolini',
    price: 12.00,
    emoji: '🥦',
    monogram: 'BR',
    badges: ['V', 'GF'],
    shortDesc: "Broccolini, za'atar y ajo.",
    fullDesc: "Tallos tiernos de broccolini sazonados con ajo y za'atar, combinando el carácter vegetal dulce del broccolini con el aroma intenso del ajo y el perfil herbal especiado de la mezcla de Medio Oriente.",
    ingredients: ['Tallos tiernos de broccolini', 'Ajo', "Mezcla za'atar"],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },

  // 5. Desserts (3 productos)
  {
    id: 'bread_pudding',
    category: 'desserts',
    name: 'Bread Pudding',
    price: 14.00,
    emoji: '🍮',
    monogram: 'BP',
    badges: ['Signature', 'Hecho en Casa'],
    shortDesc: 'Budín de pan con chispas de chocolate hecho en casa con dos bolas de helado de tomillo hecho en casa.',
    fullDesc: 'Budín de pan artesanal con chispas de chocolate elaborado en casa, servido con dos bolas de helado de tomillo también hecho en casa. El contraste entre la calidez chocolatosa del budín y el frescor herbal del helado lo convierte en el postre de firma más singular del menú.',
    ingredients: ['Budín de pan artesanal', 'Chispas de chocolate', '2 bolas de helado de tomillo hecho en casa'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'chocolate_chip_cookie',
    category: 'desserts',
    name: 'Chocolate Chip Cookie',
    price: 5.00,
    emoji: '🍪',
    monogram: 'CC',
    badges: ['Hecho en Casa'],
    shortDesc: 'Galleta hecha en casa, crujiente por fuera, suave por dentro y con abundantes chispas de chocolate.',
    fullDesc: 'Galleta americana clásica horneada en casa, formulada para lograr bordes crujientes, centro suave y chicloso, y abundante proporción de chispas de chocolate fundente. Una opción directa y accesible para cerrar la comida.',
    ingredients: ['Masa de galleta horneada en casa', 'Abundantes chispas de chocolate fundente'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'key_lime_pie',
    category: 'desserts',
    name: 'Key Lime Pie',
    price: 16.00,
    emoji: '🥧',
    monogram: 'KL',
    badges: ['Signature', 'Hecho en Casa'],
    shortDesc: 'Pay de limón hecho en casa con crema batida hecha en casa y compota de frutos rojos mixtos.',
    fullDesc: 'Clásico pay de limón verde de Florida preparado en casa, caracterizado por su balance cremoso entre acidez cítrica y dulzor. Se presenta con crema batida hecha en casa y compota de frutos rojos mixtos que agrega contraste frutal y frescura.',
    ingredients: ['Pay de limón verde de Florida', 'Crema batida hecha en casa', 'Compota de frutos rojos mixtos'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },

  // 6. Drinks / Beverages (6 productos)
  {
    id: 'mexican_coke',
    category: 'drinks',
    name: 'Mexican Coke',
    price: 6.00,
    emoji: '🥤',
    monogram: 'MC',
    badges: ['Vidrio 12 oz'],
    shortDesc: 'Mexican Coke, botella de vidrio de 12 oz.',
    fullDesc: 'Refresco Coca-Cola edición mexicana en botella de vidrio de 12 oz, valorado por su presentación clásica en cristal que conserva mejor la carbonatación y el sabor tradicional del refresco de cola.',
    ingredients: ['Coca-Cola edición mexicana', 'Botella de vidrio 12 oz'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'mexican_sprite',
    category: 'drinks',
    name: 'Mexican Sprite',
    price: 6.00,
    emoji: '🍋',
    monogram: 'MS',
    badges: ['Vidrio 12 oz'],
    shortDesc: 'Mexican Sprite, botella de vidrio de 12 oz.',
    fullDesc: 'Refresco Sprite edición mexicana en botella de vidrio de 12 oz, de perfil cítrico lima-limón nítido y refrescante, ideal para acompañar mariscos, entradas fritas o sándwiches especiados.',
    ingredients: ['Sprite edición mexicana', 'Botella de vidrio 12 oz'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'saratoga_sparkling_water',
    category: 'drinks',
    name: 'Saratoga Sparkling Water',
    price: 6.00,
    emoji: '🫧',
    monogram: 'SW',
    badges: ['Sin Azúcar', 'Vidrio 12 oz'],
    shortDesc: 'Agua con gas Saratoga, botella de vidrio de 12 oz.',
    fullDesc: 'Agua mineral con gas Saratoga en botella de vidrio de 12 oz, destacada por su sabor limpio y refrescante, carbonatación nítida y burbujas vivaces. Opción sin azúcar ideal para limpiar el paladar entre platillos.',
    ingredients: ['Agua mineral con gas Saratoga', 'Sin azúcar', 'Botella de vidrio 12 oz'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'coke_can_12oz',
    category: 'drinks',
    name: 'Coke Can 12oz',
    price: 4.00,
    emoji: '🥫',
    monogram: 'CK',
    badges: ['Lata 12 oz'],
    shortDesc: 'Lata de Coca-Cola de 12 oz.',
    fullDesc: 'Refresco Coca-Cola clásico en presentación individual de lata de 12 oz, práctico y frío para pedidos para llevar o entrega a domicilio.',
    ingredients: ['Coca-Cola clásico', 'Lata 12 oz'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'diet_coke_can_12oz',
    category: 'drinks',
    name: 'Diet Coke Can 12oz',
    price: 4.00,
    emoji: '🥤',
    monogram: 'DC',
    badges: ['Sin Azúcar', 'Lata 12 oz'],
    shortDesc: 'Lata de Diet Coke de 12 oz.',
    fullDesc: 'Refresco Diet Coke sin calorías en lata individual de 12 oz, alternativa ligera con sabor clásico de cola para acompañar cualquier platillo del menú.',
    ingredients: ['Diet Coke sin calorías', 'Lata 12 oz'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'sprite_can_12oz',
    category: 'drinks',
    name: 'Sprite Can 12oz',
    price: 4.00,
    emoji: '🧊',
    monogram: 'SP',
    badges: ['Sin Cafeína', 'Lata 12 oz'],
    shortDesc: 'Lata de Sprite de 12 oz.',
    fullDesc: 'Refresco Sprite sabor lima-limón en lata individual de 12 oz, opción refrescante y sin cafeína en formato práctico de consumo individual.',
    ingredients: ['Sprite lima-limón sin cafeína', 'Lata 12 oz'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'agua_jamaica',
    category: 'drinks',
    name: 'Agua de Jamaica (500 ml)',
    price: 5.00,
    emoji: '🌺',
    monogram: 'AJ',
    badges: ['Hecho en Casa', 'V', 'GF'],
    shortDesc: 'Agua fresca artesanal de flor de jamaica natural (500 ml).',
    fullDesc: 'Infusión fría preparada diariamente en casa con flor de jamaica natural y un toque balanceado de azúcar de caña. Refrescante, floral y perfecta para equilibrar hamburguesas, cortes y platillos picantes.',
    ingredients: ['Infusión natural de flor de jamaica', 'Servida fría 500 ml'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
  {
    id: 'agua_horchata',
    category: 'drinks',
    name: 'Agua de Horchata (500 ml)',
    price: 5.00,
    emoji: '🥛',
    monogram: 'AH',
    badges: ['Hecho en Casa', 'GF'],
    shortDesc: 'Agua fresca artesanal de arroz, canela y vainilla (500 ml).',
    fullDesc: 'Horchata tradicional elaborada en casa con arroz remojado, canela en rama y un toque suave de vainilla natural. Cremosa, aromática y ligeramente dulce.',
    ingredients: ['Arroz artesanal y canela natural', 'Servida fría 500 ml'],
    optionGroup: null,
    imageUrl: null,
    photos: [],
    videoUrl: null,
  },
];

// ══════════════════════════════════════════════
//  ESTADO DE LA APLICACIÓN
// ══════════════════════════════════════════════
let currentView    = 'client'; // 'client' | 'kitchen'
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
const trackedOrdersCache = new Map();
let cartOpen             = false;
let kdsFilter            = 'all';
let kdsSubView           = 'comandas'; // 'comandas' | 'board' | 'sales' | 'stock' | 'qrs'
let lastMovedOrderMeta   = null; // { id, status, ts } para animación fluida entre columnas Kanban
const deliveringOrderIds = new Set();
let prevCartTotalQty     = 0;
let orderCounter         = 0;
let kdsUnlocked          = false;
let upsellOfferedForCart = false;
let pendingServiceType   = null; // 'waiter' | 'bill_individual' | 'bill_table'
let currentGuestName     = '';   // Nombre del comensal en este dispositivo (ej: 'Ana')
let trackerSplitMode     = 'mine'; // 'mine' (Mi Cuenta) | 'table' (Toda la Mesa)
let invitedByGuest       = '';   // Amigo que compartió el enlace directo a mesa (?invita=...)
let inviteWelcomeDismissed = false;
let splitCalcState       = { mode: 'mine', tipPct: 10, people: 2, userEditedPeople: false };

const CUSTOMER_PREFS_STORAGE_KEY = 'kds-global-customer-prefs-v1';
const CUSTOMER_AVOID_OPTIONS = [
  { id: 'sin_cebolla',   label: 'Sin cebolla' },
  { id: 'sin_cilantro',  label: 'Sin cilantro' },
  { id: 'sin_picante',   label: 'Sin picante' },
  { id: 'sin_lacteos',   label: 'Sin lácteos' },
  { id: 'sin_mariscos',  label: 'Sin mariscos' },
  { id: 'sin_gluten',    label: 'Sin gluten' },
  { id: 'sin_nueces',    label: 'Sin nueces / pistacho' },
  { id: 'vegetariano',   label: 'Solo Vegetariano' },
];
const CUSTOMER_DONENESS_OPTIONS = [
  { id: '',             label: 'Sin definir' },
  { id: 'Término Medio', label: 'Término Medio' },
  { id: '3/4',          label: '3/4' },
  { id: 'Bien Cocido',  label: 'Bien Cocido' },
  { id: 'Rojo / Azul',  label: 'Rojo / Azul' },
];
let customerPrefs = {
  name: '',
  avoid: [],
  preferredDoneness: '',
  autoNote: '',
};

// Estado del nuevo menú Pinch Kitchen+Bar y visor Full-Screen
let pinchActiveCategory       = 'pinch_bites';
let pinchSearchOpen           = false;
let pinchSearchQuery          = '';
let pinchDietFilter           = 'all';
let pinchDetailDishId         = null;
let pinchDetailQty            = 1;
let pinchDetailOption         = '';
let pinchDetailMediaTab       = 'photos'; // 'photos' | 'video'
let pinchSavedScrollTop       = 0;
let pinchScrollSpyLockedUntil = 0;
let pinchScrollSpyBound       = false;
let pinchDetailRemoved        = [];   // Ingredientes base quitados en la vista ampliada
let pinchDetailExtras         = [];   // Array de { id, name, price, artKey }
let dcOpen                    = false;
let dcDraftRemoved            = [];
let dcDraftExtras             = [];
let dcCurrentBaseItems        = [];   // Ingredientes base normalizados del platillo actual
let dcLastAction              = null; // { type, itemId, label, artKey, animKind, bottleKey, ts }
let dcLastTappedKey           = null;
let dcFloatTimer              = null;

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
      kicker: isBill ? 'SOLICITUD DE CUENTA EN MESA' : 'LLAMADA DE MESERO EN MESA',
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
    if (el.dataset && el.dataset.fixedBrand === '1') return;
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
      if (!payload.inventoryDeducted) {
        deductInventoryForOrder(payload, { silent: true });
      }
      persistOrders();
      renderKDS();
      renderDailySales();
      renderKDSStockPanel();
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
        renderPinchMenu();
        if (pinchDetailDishId && typeof refreshDishDetailStockState === 'function') {
          refreshDishDetailStockState();
        }
        renderDrinksSection();
        if (currentStation) renderBuilderWorkspace();
      }
      renderKDSStockPanel();
    }
  } else if (type === 'INVENTORY_UPDATE') {
    if (Array.isArray(payload.inventoryItems)) {
      inventoryItems = payload.inventoryItems;
    }
    if (Array.isArray(payload.inventoryMovements)) {
      inventoryMovements = payload.inventoryMovements;
    }
    if (typeof payload.autoMode86Enabled === 'boolean') {
      autoMode86Enabled = payload.autoMode86Enabled;
    }
    persistInventory();
    renderKDSStockPanel();
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
            kicker: `PAGO DIGITAL RECIBIDO · ${(payload.paymentLabel || 'APPLE PAY').toUpperCase()}`,
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
    const nowMs = Date.now();
    const recentLocalOrders = orders.filter(o =>
      o && (myOrderIds.includes(o.id) || o.deviceId === DEVICE_ID) && (nowMs - (Number(o.createdAt) || 0) < 15000)
    );
    orders = recentLocalOrders;
    serviceCalls = [];
  } else {
    if (typeof snapshot.orderCounter === 'number' && snapshot.orderCounter > orderCounter) {
      orderCounter = snapshot.orderCounter;
    }
    const snapIds = new Set(snapshot.orders.map(o => o && o.id).filter(Boolean));
    const snapCompletedIds = new Set(
      (Array.isArray(snapshot.completedOrders) ? snapshot.completedOrders : []).map(o => o && o.id).filter(Boolean)
    );
    const nowMs = Date.now();
    const recentLocalPending = orders.filter(o =>
      o &&
      !snapIds.has(o.id) &&
      !snapCompletedIds.has(o.id) &&
      (myOrderIds.includes(o.id) || o.deviceId === DEVICE_ID) &&
      (nowMs - (Number(o.createdAt) || 0) < 15000)
    );
    orders = snapshot.orders.concat(recentLocalPending);
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
    renderPinchMenu();
    if (pinchDetailDishId && typeof refreshDishDetailStockState === 'function') {
      refreshDishDetailStockState();
    }
    renderDrinksSection();
    if (currentStation) renderBuilderWorkspace();
    if (clientMode === 'tracker') renderClientTracker();
    updateHeaderTrackerPill();
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
      renderPinchMenu();
      if (pinchDetailDishId && typeof refreshDishDetailStockState === 'function') {
        refreshDishDetailStockState();
      }
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
    // Purga única de comandas/ventas demo de pruebas para iniciar en limpio (producción)
    if (!localStorage.getItem('kds-clean-prod-v13')) {
      localStorage.removeItem(storageKey('orders'));
      localStorage.removeItem('kds-orders');
      localStorage.removeItem(storageKey('completed-orders'));
      localStorage.removeItem('kds-completed-orders');
      localStorage.removeItem(storageKey('service-calls'));
      localStorage.removeItem('kds-service-calls');
      localStorage.removeItem(storageKey('sales-ledger'));
      localStorage.removeItem('escandon-sales-ledger');
      localStorage.setItem('kds-clean-prod-v13', '1');
    }

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
  loadPersistedInventory();
}

// ══════════════════════════════════════════════
//  NAVEGACIÓN DE VISTAS Y SEGURIDAD PIN KDS (12345)
// ══════════════════════════════════════════════
function showView(view) {
  const resolved = view === 'kitchen' ? 'kitchen' : 'client';
  currentView = resolved;
  const clientEl  = document.getElementById('view-client');
  const kitchenEl = document.getElementById('view-kitchen');
  if (clientEl)  clientEl.classList.add('hidden');
  if (kitchenEl) kitchenEl.classList.add('hidden');

  if (resolved === 'kitchen') {
    if (kitchenEl) kitchenEl.classList.remove('hidden');
    initKitchenView();
  } else {
    if (clientEl) clientEl.classList.remove('hidden');
    initClientView();
  }
}

function handleClientBack() {
  if (clientMode === 'tracker') {
    startNewOrderFromTracker();
    return;
  }
  if (currentStation) {
    showStationSelector();
  }
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
  closeInventoryModal();
  closeInventoryRestockModal();
  kdsUnlocked = false;
  kdsSubView = 'comandas';
  sessionStorage.removeItem(storageKey('unlocked'));
  renderKitchenLockState();
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
  const cleanQuery = tenantParam ? `?${tenantParam.replace(/^&/, '')}` : '';
  const customerUrl = `${baseUrl}${cleanQuery}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(customerUrl).then(() => {
      showKDSToast(`Link para clientes copiado`);
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
  if (typeof loadCustomerPrefs === 'function') loadCustomerPrefs();
  if (typeof loadLoyaltyProfile === 'function') loadLoyaltyProfile();
  renderPinchCategoryTabs();
  renderPinchMenu();
  initPinchScrollSpy();
  updateClientContextBar();
  if (typeof renderClientLoyaltyHeaderAndBanner === 'function') renderClientLoyaltyHeaderAndBanner();
  if (typeof updateHeaderPrefsIndicator === 'function') updateHeaderPrefsIndicator();

  // Si el cliente tiene una orden activa en seguimiento, restaurar el modo correspondiente
  const trackedOrder = activeTrackedOrderId ? orders.find(o => o.id === activeTrackedOrderId) : null;
  if (trackedOrder && clientMode === 'tracker') {
    setClientSubMode('tracker');
  } else {
    setClientSubMode('menu');
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
  const prefsBtnEl    = document.getElementById('btn-header-prefs');

  if (mode === 'tracker') {
    if (menuFlowEl)    menuFlowEl.classList.add('hidden');
    if (trackerViewEl) trackerViewEl.classList.remove('hidden');
    if (mainBarEl)     mainBarEl.classList.add('hidden');
    if (builderBarEl)  builderBarEl.classList.add('hidden');
    if (trackerBarEl)  trackerBarEl.classList.remove('hidden');
    if (backBtnEl) {
      backBtnEl.textContent = '← Menú';
      backBtnEl.classList.remove('hidden');
    }
    if (prefsBtnEl) prefsBtnEl.classList.add('hidden');
    renderClientTracker();
  } else {
    if (menuFlowEl)    menuFlowEl.classList.remove('hidden');
    if (trackerViewEl) trackerViewEl.classList.add('hidden');
    if (mainBarEl)     mainBarEl.classList.remove('hidden');
    if (trackerBarEl)  trackerBarEl.classList.add('hidden');
    if (builderBarEl)  builderBarEl.classList.add('hidden');
    if (backBtnEl) {
      backBtnEl.textContent = '← Menú';
      backBtnEl.classList.add('hidden');
    }
    if (prefsBtnEl) prefsBtnEl.classList.remove('hidden');
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
  renderPinchCategoryTabs();
  renderPinchMenu();
  renderCart();
  const scrollEl = document.getElementById('client-scroll-container');
  if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderStationHeroIllustrations() {
  preloadFoodPhotoAssets();
  const tacoEl = document.getElementById('StationSvgTaco');
  const dogEl  = document.getElementById('StationSvgHotdog');
  if (!tacoEl || !dogEl) return;
  if (!tacoEl.innerHTML) {
    tacoEl.innerHTML = buildTacoPlateSVG({
      tortilla: 'doble',
      protein: 'bistec',
      toppings: ['cilantro', 'cebolla', 'salsa_roja'],
    }, { uid: 'hero_taco', compact: true });
  }
  if (!dogEl.innerHTML) {
    dogEl.innerHTML = buildHotdogPlateSVG({
      toppings: ['ketchup', 'mostaza', 'mayonesa', 'chiles', 'tomate', 'cebolla'],
    }, { uid: 'hero_dog', compact: true });
  }
}

function showStationSelector() {
  currentStation = null;
  const selEl     = document.getElementById('station-selector');
  const wsEl      = document.getElementById('builder-workspace');
  const dockBarEl = document.getElementById('dock-builder-bar');
  if (selEl)     selEl.classList.remove('hidden');
  if (wsEl)      wsEl.classList.add('hidden');
  if (dockBarEl) dockBarEl.classList.add('hidden');
  const backBtnEl = document.getElementById('btn-client-back');
  if (backBtnEl) backBtnEl.classList.add('hidden');
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
  const selEl     = document.getElementById('station-selector');
  const wsEl      = document.getElementById('builder-workspace');
  const dockBarEl = document.getElementById('dock-builder-bar');
  if (!selEl || !wsEl) return;
  if (station === 'hotdog' && isStockSoldOut('station:hotdog')) {
    showToast('Hot Dogs agotados por hoy');
    return;
  }
  currentStation = station;
  sanitizeDraftAgainstStock();
  selEl.classList.add('hidden');
  wsEl.classList.remove('hidden');
  if (dockBarEl) dockBarEl.classList.remove('hidden');

  const tabTacoEl = document.getElementById('tab-taco');
  const tabDogEl  = document.getElementById('tab-hotdog');
  if (tabTacoEl) tabTacoEl.classList.toggle('active', station === 'taco');
  if (tabDogEl)  tabDogEl.classList.toggle('active', station === 'hotdog');

  const backBtnEl = document.getElementById('btn-client-back');
  if (backBtnEl) {
    backBtnEl.textContent = '← Menú';
    backBtnEl.classList.remove('hidden');
  }

  if (station === 'taco' && !tacoDraft.tortilla) {
    const availBase = TACO_CONFIG.base.find(b => !isStockSoldOut(getStockKey('taco', 'base', b.id)));
    tacoDraft.tortilla = availBase ? availBase.id : null;
  }

  builderDraftQty = 1;
  lastPlateAction = null;
  lastRenderedPlateSig = '';
  renderBuilderWorkspace();
}

let builderDraftQty      = 1;
let plateSvgUidCounter   = 0;
let lastPlateAction      = null; // { station, category, itemId, added, ts }
let lastRenderedPlateSig = '';

function changeBuilderDraftQty(delta) {
  builderDraftQty = Math.max(1, Math.min(30, (builderDraftQty || 1) + delta));
  hapticTap(6);
  renderBuilderWorkspace();
}

function resetCurrentBuilder() {
  builderDraftQty = 1;
  lastPlateAction = null;
  lastRenderedPlateSig = '';
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
  let wasAdded = false;

  if (currentStation === 'taco') {
    if (category === 'base') {
      wasAdded = tacoDraft.tortilla !== itemId;
      tacoDraft.tortilla = itemId;
    } else if (category === 'protein') {
      if (!tacoDraft.tortilla) {
        const availBase = TACO_CONFIG.base.find(b => !isStockSoldOut(getStockKey('taco', 'base', b.id)));
        tacoDraft.tortilla = availBase ? availBase.id : null;
      }
      if (tacoDraft.protein === itemId) {
        tacoDraft.protein = null;
        wasAdded = false;
      } else {
        tacoDraft.protein = itemId;
        wasAdded = true;
      }
    } else if (category === 'topping') {
      const idx = tacoDraft.toppings.indexOf(itemId);
      if (idx === -1) {
        tacoDraft.toppings.push(itemId);
        wasAdded = true;
      } else {
        tacoDraft.toppings.splice(idx, 1);
        wasAdded = false;
      }
    }
  } else if (currentStation === 'hotdog') {
    if (category === 'topping') {
      const idx = hotdogDraft.toppings.indexOf(itemId);
      if (idx === -1) {
        hotdogDraft.toppings.push(itemId);
        wasAdded = true;
      } else {
        hotdogDraft.toppings.splice(idx, 1);
        wasAdded = false;
      }
    }
  }

  lastPlateAction = wasAdded
    ? { station: currentStation, category, itemId, added: true, ts: Date.now() }
    : null;

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
  if (!document.getElementById('builder-workspace')) {
    return { ready: false, name: '', price: 0, emoji: '🍽️', addLabel: '+ Agregar', key: '' };
  }
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

    const plateSig = `taco|${tacoDraft.tortilla || ''}|${tacoDraft.protein || ''}|${[...tacoDraft.toppings].sort().join(',')}`;
    if (plateSig !== lastRenderedPlateSig || lastPlateAction !== null || !canvasEl.innerHTML) {
      lastRenderedPlateSig = plateSig;
      canvasEl.innerHTML = buildTacoPlateSVG(tacoDraft, {
        uid: `live_${++plateSvgUidCounter}`,
        animAction: lastPlateAction,
      });
    }
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

    const plateSig = `hotdog|${[...hotdogDraft.toppings].sort().join(',')}`;
    if (plateSig !== lastRenderedPlateSig || lastPlateAction !== null || !canvasEl.innerHTML) {
      lastRenderedPlateSig = plateSig;
      canvasEl.innerHTML = buildHotdogPlateSVG(hotdogDraft, {
        uid: `live_${++plateSvgUidCounter}`,
        animAction: lastPlateAction,
      });
    }
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
  lastPlateAction = null;
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

function getDrinkIconTone(drinkId) {
  if (drinkId === 'drink_jamaica') return 'tone-rose';
  if (drinkId === 'drink_horchata') return 'tone-sand';
  if (drinkId === 'drink_coca') return 'tone-coral';
  return 'tone-sky';
}

function adjustDrinkQty(drinkId, delta) {
  const idx = cartItems.findIndex(it => it.key === drinkId);
  if (idx === -1) {
    if (delta > 0) addDrinkToCart(drinkId);
    return;
  }
  cartItems[idx].qty += delta;
  if (cartItems[idx].qty <= 0) {
    cartItems.splice(idx, 1);
  }
  renderCart();
  hapticTap(8);
}

function buildDrinkIconSVG(drinkId) {
  if (drinkId === 'drink_jamaica') {
    return `
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <path d="M12 12 L15 36 Q15.5 39 18.5 39 L25.5 39 Q28.5 39 29 36 L32 12 Z"
              fill="#f8e6ea" stroke="#c995a0" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M13.3 17 L15.4 35.5 Q15.8 37.8 18.2 37.8 L25.8 37.8 Q28.2 37.8 28.6 35.5 L30.7 17 Z"
              fill="#a81332"/>
        <ellipse cx="22" cy="17" rx="8.7" ry="2.2" fill="#d12649"/>
        <rect x="16" y="19" width="5.5" height="5.5" rx="1.4" fill="#ffd9e2" fill-opacity="0.72" transform="rotate(-14 18.5 21.5)"/>
        <rect x="22.5" y="21" width="5.2" height="5.2" rx="1.4" fill="#ffd9e2" fill-opacity="0.62" transform="rotate(16 25 23.5)"/>
        <path d="M15.5 16 L17.2 35" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.45"/>
        <path d="M27 7 L23.5 17" stroke="#f05a78" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="33" cy="24" r="1.2" fill="#d67c8e" opacity="0.7"/>
        <circle cx="11" cy="28" r="1" fill="#d67c8e" opacity="0.65"/>
      </svg>`;
  }
  if (drinkId === 'drink_horchata') {
    return `
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <path d="M12 12 L15 36 Q15.5 39 18.5 39 L25.5 39 Q28.5 39 29 36 L32 12 Z"
              fill="#faf5ea" stroke="#cbbca2" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M13.3 17 L15.4 35.5 Q15.8 37.8 18.2 37.8 L25.8 37.8 Q28.2 37.8 28.6 35.5 L30.7 17 Z"
              fill="#f2e6cf"/>
        <ellipse cx="22" cy="17" rx="8.7" ry="2.2" fill="#fffaf0"/>
        <rect x="16.5" y="19.5" width="5.2" height="5.2" rx="1.3" fill="#ffffff" fill-opacity="0.88" stroke="#ded1b8" stroke-width="0.6" transform="rotate(-12 19 22)"/>
        <rect x="22.5" y="21.5" width="5" height="5" rx="1.3" fill="#ffffff" fill-opacity="0.8" stroke="#ded1b8" stroke-width="0.6" transform="rotate(14 25 24)"/>
        <path d="M27.5 8 L23 17.5" stroke="#9e5a2b" stroke-width="2.4" stroke-linecap="round"/>
        <circle cx="19.5" cy="17" r="0.85" fill="#9e5a2b"/>
        <circle cx="22.5" cy="17.6" r="0.8" fill="#9e5a2b"/>
        <circle cx="25" cy="16.7" r="0.75" fill="#9e5a2b"/>
        <path d="M15.5 16 L17.2 35" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>
      </svg>`;
  }
  if (drinkId === 'drink_coca') {
    return `
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <rect x="19.2" y="5.5" width="5.6" height="3" rx="1" fill="#d92116" stroke="#8a120a" stroke-width="0.9"/>
        <path d="M19.8 8.5 L19.8 13 C19.8 15.5 16 17.5 16 21.5 C16 24 17 25.5 17 28 C17 31 15.8 33 16.2 36.5 Q16.5 39 19 39 L25 39 Q27.5 39 27.8 36.5 C28.2 33 27 31 27 28 C27 25.5 28 24 28 21.5 C28 17.5 24.2 15.5 24.2 13 L24.2 8.5 Z"
              fill="#3d170c" stroke="#240c05" stroke-width="1.3" stroke-linejoin="round"/>
        <path d="M16.3 21.5 L27.7 21.5 L27.2 27.5 L16.8 27.5 Z" fill="#dc1f14"/>
        <path d="M18 24.8 Q22 22.8 26 24.8" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M19 14.5 C17.8 17.5 17.8 20.5 18 35" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity="0.4"/>
        <circle cx="23.5" cy="19.5" r="0.9" fill="#c98055" opacity="0.8"/>
        <circle cx="21" cy="31" r="1" fill="#c98055" opacity="0.65"/>
        <circle cx="24" cy="34" r="0.8" fill="#c98055" opacity="0.7"/>
        <circle cx="30" cy="20" r="1.1" fill="#9bc2d9" opacity="0.85"/>
        <circle cx="14" cy="30" r="1" fill="#9bc2d9" opacity="0.8"/>
      </svg>`;
  }
  return `
    <svg viewBox="0 0 44 44" aria-hidden="true">
      <path d="M13 12 L16 36 Q16.5 39 19.5 39 L24.5 39 Q27.5 39 28 36 L31 12 Z"
            fill="#e4f2fb" stroke="#7fb3d5" stroke-width="1.5"/>
      <path d="M14.5 18 L16.5 35.5 Q17 37.5 19.5 37.5 L24.5 37.5 Q27 37.5 27.5 35.5 L29.5 18 Z"
            fill="#8ecae6"/>
    </svg>`;
}

function renderDrinksSection() {
  const html = DRINKS_CONFIG.map(drink => {
    const isOut = isStockSoldOut(getStockKey(null, 'drink', drink.id));
    const inCart = cartItems.find(it => it.key === drink.id);
    const tone = getDrinkIconTone(drink.id);

    const actionHtml = isOut
      ? `<button type="button" class="btn-tap-drink" disabled>Agotado</button>`
      : (inCart
        ? `
          <div class="drink-qty-stepper" onclick="event.stopPropagation()">
            <button type="button" class="dq-btn" onclick="adjustDrinkQty('${drink.id}', -1)" aria-label="Quitar una bebida">−</button>
            <span class="dq-val">${inCart.qty}</span>
            <button type="button" class="dq-btn" onclick="adjustDrinkQty('${drink.id}', 1)" aria-label="Agregar una bebida">+</button>
          </div>
        `
        : `
          <button type="button" class="btn-tap-drink" onclick="event.stopPropagation(); addDrinkToCart('${drink.id}')" aria-label="Agregar ${drink.name}">
            +
          </button>
        `);

    return `
      <div class="drink-row${isOut ? ' sold-out' : ''}${inCart ? ' in-cart' : ''}" onclick="addDrinkToCart('${drink.id}')">
        <div class="drink-left">
          <span class="drink-emoji-badge drink-art-badge ${tone}">${buildDrinkIconSVG(drink.id)}</span>
          <div class="drink-info">
            <span class="drink-name">${drink.name}</span>
            <span class="drink-price">${isOut ? 'Agotado por hoy' : '$' + drink.price}</span>
          </div>
        </div>
        ${actionHtml}
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
//  COMPOSITOR VECTORIAL DETALLADO Y ANIMADO (100% SVG INTEGRADO)
//  - Tortilla 100% opaca con manchas de comal (sencilla y doble)
//  - Carne y verduras cayendo desde arriba en 3 oleadas ("mano de taquero")
//  - Botellas squeeze 3D animadas tirando el aderezo en zigzag en vivo
// ══════════════════════════════════════════════
function renderHandTossBurstSVG(cx, cy, color = '#d69e4e') {
  return `
    <g class="hand-toss-burst" transform="translate(${cx}, ${cy})" opacity="0">
      <path d="M-26 2 Q0 -12, 26 2" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="4 6"/>
      <line x1="-18" y1="6" x2="-22" y2="22" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      <line x1="0" y1="4" x2="0" y2="24" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      <line x1="18" y1="6" x2="22" y2="22" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
    </g>
  `;
}

function renderSteamWispsSVG(cx, cy, extraBurst = false) {
  return `
    <g class="food-steam-group${extraBurst ? ' steam-burst' : ''}" pointer-events="none">
      <path class="food-steam-wisp wisp-1" d="M${cx - 34} ${cy} Q${cx - 42} ${cy - 15}, ${cx - 33} ${cy - 29} T${cx - 36} ${cy - 52}"
            fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round"/>
      <path class="food-steam-wisp wisp-2" d="M${cx} ${cy - 4} Q${cx + 9} ${cy - 19}, ${cx - 1} ${cy - 34} T${cx + 4} ${cy - 58}"
            fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <path class="food-steam-wisp wisp-3" d="M${cx + 34} ${cy + 1} Q${cx + 26} ${cy - 14}, ${cx + 35} ${cy - 28} T${cx + 31} ${cy - 50}"
            fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
    </g>
  `;
}

function renderSqueezeBottleSVG(condimentId, station, uid) {
  const palettes = {
    salsa_roja: {
      bodyL: '#8a1207', bodyM: '#d92716', bodyR: '#ff6e59', bodyEdge: '#6e0d04',
      cap: '#242120', capStroke: '#121010', nozzle: '#cf2414',
      label: '#f7c852', labelAccent: '#7a1006', stream: '#d42415',
    },
    ketchup: {
      bodyL: '#99150b', bodyM: '#e3291b', bodyR: '#ff7a6e', bodyEdge: '#7d1008',
      cap: '#f7f4ec', capStroke: '#cbc3b4', nozzle: '#e02819',
      label: '#ffffff', labelAccent: '#e02819', stream: '#dc2214',
    },
    mostaza: {
      bodyL: '#b88205', bodyM: '#f5c21b', bodyR: '#fff1a6', bodyEdge: '#966903',
      cap: '#f5c21b', capStroke: '#a87a05', nozzle: '#e3ad09',
      label: '#fffbe6', labelAccent: '#a87804', stream: '#f2bc16',
    },
    mayonesa: {
      bodyL: '#d4cab3', bodyM: '#fffdf5', bodyR: '#ffffff', bodyEdge: '#bfb49b',
      cap: '#eae1cc', capStroke: '#bfb49b', nozzle: '#f5efe0',
      label: '#e3a642', labelAccent: '#ffffff', stream: '#fffdf5',
    },
  };
  const p = palettes[condimentId] || palettes.ketchup;
  const sweepClass = station === 'taco' ? 'sweep-taco' : 'sweep-hotdog';
  const gradId = `${uid}_btlGrad`;

  return `
    <defs>
      <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${p.bodyL}"/>
        <stop offset="28%" stop-color="${p.bodyR}"/>
        <stop offset="58%" stop-color="${p.bodyM}"/>
        <stop offset="100%" stop-color="${p.bodyL}"/>
      </linearGradient>
    </defs>
    <g class="squeeze-bottle-rig ${sweepClass}" pointer-events="none">
      <g class="squeeze-jet-group">
        <path class="squeeze-jet-line" d="M 0 1 Q 2 15, -1 30" fill="none" stroke="${p.bodyEdge}" stroke-width="5.6" stroke-linecap="round" opacity="0.35"/>
        <path class="squeeze-jet-line" d="M 0 1 Q 2 15, -1 30" fill="none" stroke="${p.stream}" stroke-width="3.8" stroke-linecap="round"/>
        <circle class="squeeze-drop d1" cx="-1" cy="19" r="2.3" fill="${p.stream}"/>
        <circle class="squeeze-drop d2" cx="2" cy="29" r="1.9" fill="${p.stream}"/>
      </g>

      <g class="squeeze-bottle-body">
        <path d="M -4.2 -11 L 0 0 L 4.2 -11 Z" fill="${p.nozzle}" stroke="${p.bodyEdge}" stroke-width="1.15" stroke-linejoin="round"/>
        <rect x="-10.5" y="-19.5" width="21" height="9" rx="3" fill="${p.cap}" stroke="${p.capStroke}" stroke-width="1.25"/>
        <line x1="-5.2" y1="-18.5" x2="-5.2" y2="-11.5" stroke="${p.capStroke}" stroke-width="1" opacity="0.55"/>
        <line x1="0"    y1="-18.5" x2="0"    y2="-11.5" stroke="${p.capStroke}" stroke-width="1" opacity="0.55"/>
        <line x1="5.2"  y1="-18.5" x2="5.2"  y2="-11.5" stroke="${p.capStroke}" stroke-width="1" opacity="0.55"/>
        <path d="M -10.5 -19.5 C -14.5 -21.5, -16.5 -27.5, -16.5 -37 L -16 -57 C -16 -64.5, -11 -68.5, 0 -68.5 C 11 -68.5, 16 -64.5, 16 -57 L 16.5 -37 C 16.5 -27.5, 14.5 -21.5, 10.5 -19.5 Z"
              fill="url(#${gradId})" stroke="${p.bodyEdge}" stroke-width="1.45" stroke-linejoin="round"/>
        <rect x="-15.5" y="-50" width="31" height="14.5" rx="2" fill="${p.label}" opacity="0.94"/>
        <line x1="-8" y1="-42.8" x2="8" y2="-42.8" stroke="${p.labelAccent}" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M -9.5 -59.5 C -10.8 -51, -10.8 -36, -8.8 -25" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" opacity="0.52"/>
      </g>
    </g>
  `;
}

function wrapVectorWaves(wavesHtml, animate, compact) {
  if (compact || !animate) {
    return `<g>${wavesHtml.join('')}</g>`;
  }
  const waveSpecs = [
    { dx: '-12px', dy: '-88px',  rot: '-14deg', delay: '0ms'   },
    { dx: '9px',   dy: '-104px', rot: '12deg',  delay: '80ms'  },
    { dx: '-4px',  dy: '-94px',  rot: '-8deg',  delay: '155ms' },
  ];
  return wavesHtml.map((chunk, idx) => {
    const sp = waveSpecs[idx % waveSpecs.length];
    return `<g class="svg-toss-wave" style="--drop-x:${sp.dx}; --drop-y:${sp.dy}; --drop-rot:${sp.rot}; --drop-delay:${sp.delay};">${chunk}</g>`;
  }).join('');
}

function renderArtisanalTortillaSVG(cx, cy, gradId, isBack = false) {
  const rx = 74;
  const ry = 55;
  return `
    <g transform="translate(${cx}, ${cy})">
      <ellipse cx="2" cy="7" rx="${rx}" ry="${ry}" fill="#5c360a" opacity="${isBack ? '0.18' : '0.24'}"/>
      <ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" fill="url(#${gradId})" stroke="${isBack ? '#b57d2b' : '#c78f36'}" stroke-width="2"/>
      <ellipse cx="0" cy="-1" rx="${rx - 6}" ry="${ry - 5}" fill="none" stroke="#fff8de" stroke-width="1.4" opacity="0.52"/>
      <!-- Manchitas auténticas del comal -->
      <ellipse cx="-38" cy="-18" rx="9" ry="5.5" transform="rotate(-16 -38 -18)" fill="#a8671d" opacity="0.34"/>
      <ellipse cx="34" cy="-22" rx="8" ry="4.8" transform="rotate(20 34 -22)" fill="#965615" opacity="0.32"/>
      <ellipse cx="-44" cy="14" rx="7.5" ry="4.2" transform="rotate(14 -44 14)" fill="#a8671d" opacity="0.3"/>
      <ellipse cx="42" cy="16" rx="8.5" ry="4.6" transform="rotate(-14 42 16)" fill="#965615" opacity="0.34"/>
      <ellipse cx="6" cy="34" rx="10" ry="5" transform="rotate(-4 6 34)" fill="#a8671d" opacity="0.32"/>
      <ellipse cx="-12" cy="-35" rx="7" ry="3.8" transform="rotate(8 -12 -35)" fill="#b06f22" opacity="0.3"/>
      <circle cx="24" cy="28" r="2.6" fill="#8f5112" opacity="0.3"/>
      <circle cx="-26" cy="27" r="2.2" fill="#8f5112" opacity="0.28"/>
      <circle cx="48" cy="-4" r="2.3" fill="#a8671d" opacity="0.28"/>
      <circle cx="-51" cy="-2" r="2.4" fill="#965615" opacity="0.28"/>
    </g>
  `;
}

function renderTacoBistecSVG(cx, cy, animate, compact) {
  const mkPiece = (x, y, w, h, rot, fill, hi) => `
    <g transform="translate(${cx + x}, ${cy + y}) rotate(${rot})">
      <rect x="${-w/2}" y="${-h/2 + 2.2}" width="${w}" height="${h}" rx="4.5" fill="#331205" opacity="0.34"/>
      <rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="4.5" fill="${fill}" stroke="#421908" stroke-width="1.35"/>
      <line x1="${-w/2 + 4}" y1="${-h/2 + 2.5}" x2="${w/2 - 5}" y2="${h/2 - 2.5}" stroke="#2e0f04" stroke-width="1.8" stroke-linecap="round" opacity="0.62"/>
      <path d="M${-w/2 + 3.5} ${-h/2 + 3.2} Q0 ${-h/2 + 1.5} ${w/2 - 4} ${-h/2 + 3.5}" fill="none" stroke="${hi}" stroke-width="1.5" stroke-linecap="round" opacity="0.72"/>
    </g>`;

  const wave1 = `
    <ellipse cx="${cx}" cy="${cy + 4}" rx="48" ry="31" fill="#471d0a" opacity="0.2"/>
    ${mkPiece(-32, 6,  20, 14, -18, '#6e3115', '#bf7241')}
    ${mkPiece(-14, 15, 22, 14, 10,  '#7a3819', '#c77a48')}
    ${mkPiece(12,  16, 21, 14, -12, '#692e14', '#b86c3d')}
    ${mkPiece(32,  7,  20, 14, 22,  '#783617', '#c77a48')}
    ${mkPiece(-28, -11, 20, 13, 14, '#7d3b1b', '#cc804e')}
    ${mkPiece(27,  -12, 20, 13, -20,'#6e3115', '#bf7241')}
  `;
  const wave2 = `
    ${mkPiece(-16, -2, 22, 15, -8,  '#853e1d', '#d48855')}
    ${mkPiece(4,   3,  23, 15, 12,  '#7c391a', '#cc804e')}
    ${mkPiece(20,  -4, 20, 14, -14, '#8a411f', '#d98f5b')}
    ${mkPiece(-4,  -16, 21, 13, 6,  '#753517', '#c77a48')}
    ${mkPiece(14,  -15, 19, 13, 18, '#873f1e', '#d48855')}
    ${mkPiece(-2,  18, 19, 13, -6,  '#703216', '#bf7241')}
  `;
  const wave3 = `
    ${mkPiece(-8,  -7, 20, 14, 15,  '#944823', '#e09a67')}
    ${mkPiece(10,  -7, 19, 13, -10, '#8f4421', '#db9460')}
    ${mkPiece(-20, 9,  17, 12, 24,  '#8c4220', '#d98f5b')}
    ${mkPiece(22,  10, 17, 12, -16, '#914622', '#de9664')}
    ${mkPiece(1,   7,  18, 12, 4,   '#994b25', '#e39e6b')}
  `;

  return wrapVectorWaves([wave1, wave2, wave3], animate, compact);
}

function renderTacoLonganizaSVG(cx, cy, animate, compact) {
  const mkSlice = (x, y, rx, ry, rot, fill) => `
    <g transform="translate(${cx + x}, ${cy + y}) rotate(${rot})">
      <ellipse cx="0" cy="2.2" rx="${rx}" ry="${ry}" fill="#4d0d04" opacity="0.34"/>
      <ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" fill="${fill}" stroke="#691406" stroke-width="1.35"/>
      <circle cx="${-rx*0.32}" cy="${-ry*0.18}" r="1.45" fill="#ffad5c" opacity="0.86"/>
      <circle cx="${rx*0.28}"  cy="${ry*0.22}"  r="1.25" fill="#ffd68f" opacity="0.82"/>
      <circle cx="${rx*0.15}"  cy="${-ry*0.32}" r="1.05" fill="#520f04" opacity="0.72"/>
      <path d="M${-rx*0.5} ${-ry*0.45} Q0 ${-ry*0.68} ${rx*0.48} ${-ry*0.4}" fill="none" stroke="#ffc178" stroke-width="1.3" stroke-linecap="round" opacity="0.7"/>
    </g>`;

  const wave1 = `
    <ellipse cx="${cx}" cy="${cy + 4}" rx="48" ry="31" fill="#6b1506" opacity="0.22"/>
    ${mkSlice(-30, 6,  11, 7.5, -18, '#b82a10')}
    ${mkSlice(-12, 16, 11.5, 7.5, 12, '#c93315')}
    ${mkSlice(13,  16, 11, 7.5, -10, '#bd2d12')}
    ${mkSlice(31,  6,  11, 7.2, 20,  '#c43013')}
    ${mkSlice(-27, -11, 10.5, 7, 15, '#cc3516')}
    ${mkSlice(27,  -12, 10.5, 7, -16,'#b5280f')}
  `;
  const wave2 = `
    ${mkSlice(-16, -2, 11.5, 7.8, -8, '#d93e1a')}
    ${mkSlice(5,   3,  12,   8,   10, '#cf3817')}
    ${mkSlice(21,  -4, 11,   7.5, -14,'#db421c')}
    ${mkSlice(-4,  -16, 11,  7.2, 8,  '#c93415')}
    ${mkSlice(14,  -15, 10.5, 7,  18, '#d63d19')}
    ${mkSlice(-2,  17, 10.5, 7,  -6,  '#c43114')}
  `;
  const wave3 = `
    ${mkSlice(-7,  -8, 10.5, 7.2, 14, '#e64c22')}
    ${mkSlice(10,  -7, 10,   7,  -12, '#de451e')}
    ${mkSlice(-19, 9,  9.5,  6.8, 22, '#db421c')}
    ${mkSlice(20,  9,  9.5,  6.8,-18, '#e34920')}
    ${mkSlice(1,   7,  10,   7,   4,  '#eb5126')}
  `;

  return wrapVectorWaves([wave1, wave2, wave3], animate, compact);
}

function renderOnionCubesSVG(coords, animate, compact) {
  const mkCube = ([x, y, s, rot]) => `
    <g transform="translate(${x}, ${y}) rotate(${rot})">
      <rect x="${-s/2}" y="${-s/2 + 1.3}" width="${s}" height="${s}" rx="1.6" fill="#4f4663" opacity="0.22"/>
      <rect x="${-s/2}" y="${-s/2}" width="${s}" height="${s}" rx="1.6" fill="#ffffff" stroke="#8e83a8" stroke-width="1"/>
      <line x1="${-s/2 + 1.5}" y1="${-s/2 + 2}" x2="${s/2 - 1.5}" y2="${-s/2 + 2}" stroke="#dcd6eb" stroke-width="1"/>
    </g>`;
  const g1 = coords.filter((_, i) => i % 3 === 0).map(mkCube).join('');
  const g2 = coords.filter((_, i) => i % 3 === 1).map(mkCube).join('');
  const g3 = coords.filter((_, i) => i % 3 === 2).map(mkCube).join('');
  return wrapVectorWaves([g1, g2, g3], animate, compact);
}

function renderCilantroLeavesSVG(coords, animate, compact) {
  const mkLeaf = ([x, y, sc, rot, shade]) => `
    <g transform="translate(${x}, ${y}) rotate(${rot}) scale(${sc})">
      <path d="M0 5 C-6 2 -7 -4 -2 -6 C0 -8 4 -7 5 -4 C9 -3 8 3 2 5 Z"
            fill="${shade ? '#34a847' : '#49c45b'}" stroke="#1b6327" stroke-width="1.15" stroke-linejoin="round"/>
      <path d="M0 4 L1 -4" stroke="#a6f5b0" stroke-width="1" stroke-linecap="round" opacity="0.8"/>
    </g>`;
  const g1 = coords.filter((_, i) => i % 3 === 0).map(mkLeaf).join('');
  const g2 = coords.filter((_, i) => i % 3 === 1).map(mkLeaf).join('');
  const g3 = coords.filter((_, i) => i % 3 === 2).map(mkLeaf).join('');
  return wrapVectorWaves([g1, g2, g3], animate, compact);
}

function renderTomatoCubesSVG(coords, animate, compact) {
  const mkTom = ([x, y, s, rot]) => `
    <g transform="translate(${x}, ${y}) rotate(${rot})">
      <rect x="${-s/2}" y="${-s/2 + 1.4}" width="${s}" height="${s}" rx="2" fill="#5e0d05" opacity="0.25"/>
      <rect x="${-s/2}" y="${-s/2}" width="${s}" height="${s}" rx="2" fill="#eb3824" stroke="#96180b" stroke-width="1.05"/>
      <circle cx="${-s*0.14}" cy="${s*0.05}" r="0.95" fill="#ffe17d"/>
      <line x1="${-s/2 + 1.8}" y1="${-s/2 + 1.8}" x2="${s/2 - 2}" y2="${-s/2 + 1.8}" stroke="#ffaba1" stroke-width="1.1" stroke-linecap="round" opacity="0.8"/>
    </g>`;
  const g1 = coords.filter((_, i) => i % 3 === 0).map(mkTom).join('');
  const g2 = coords.filter((_, i) => i % 3 === 1).map(mkTom).join('');
  const g3 = coords.filter((_, i) => i % 3 === 2).map(mkTom).join('');
  return wrapVectorWaves([g1, g2, g3], animate, compact);
}

function renderJalapenoRingsSVG(coords, animate, compact) {
  const mkRing = ([x, y, rx, ry, rot]) => `
    <g transform="translate(${x}, ${y}) rotate(${rot})">
      <ellipse cx="0" cy="1.8" rx="${rx}" ry="${ry}" fill="#1b360d" opacity="0.26"/>
      <ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" fill="#4d8c2b" stroke="#264a12" stroke-width="1.25"/>
      <ellipse cx="0" cy="0" rx="${rx * 0.72}" ry="${ry * 0.7}" fill="#84cf4a"/>
      <ellipse cx="0" cy="0" rx="${rx * 0.4}" ry="${ry * 0.38}" fill="#e9f5b8"/>
      <circle cx="${-rx*0.16}" cy="-0.4" r="0.95" fill="#deb445"/>
      <circle cx="${rx*0.16}"  cy="0.6"  r="0.95" fill="#deb445"/>
    </g>`;
  const g1 = coords.filter((_, i) => i % 3 === 0).map(mkRing).join('');
  const g2 = coords.filter((_, i) => i % 3 === 1).map(mkRing).join('');
  const g3 = coords.filter((_, i) => i % 3 === 2).map(mkRing).join('');
  return wrapVectorWaves([g1, g2, g3], animate, compact);
}

function renderCeramicPlateSVG(cx, cy, rx, ry, uid) {
  return `
    <g class="svg-plate-base">
      <ellipse cx="${cx}" cy="${cy + 10}" rx="${rx + 2}" ry="${ry + 2}" fill="#2b2016" opacity="0.11"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${uid}_plateGrad)" stroke="#d9cfc2" stroke-width="2"/>
      <ellipse cx="${cx}" cy="${cy + 1}" rx="${rx - 22}" ry="${ry - 14}" fill="url(#${uid}_plateWell)" stroke="#e6ddd1" stroke-width="1.4"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx - 4}" ry="${ry - 3}" fill="none" stroke="#ffffff" stroke-width="1.6" opacity="0.72"/>
    </g>
  `;
}

function buildTacoPlateSVG(state, opts = {}) {
  const uid        = opts.uid || `taco_${++plateSvgUidCounter}`;
  const compact    = Boolean(opts.compact);
  const anim       = opts.animAction && opts.animAction.station === 'taco' && opts.animAction.added
    ? opts.animAction
    : null;

  const hasTortilla = Boolean(state.tortilla);
  const isDoble     = state.tortilla === 'doble';
  const hasBistec   = state.protein === 'bistec';
  const hasLonga    = state.protein === 'longaniza';
  const hasCilantro = state.toppings.includes('cilantro');
  const hasCebolla  = state.toppings.includes('cebolla');
  const hasSalsa    = state.toppings.includes('salsa_roja');

  const animBase     = Boolean(anim && anim.category === 'base');
  const animBistec   = Boolean(anim && anim.category === 'protein' && anim.itemId === 'bistec');
  const animLonga    = Boolean(anim && anim.category === 'protein' && anim.itemId === 'longaniza');
  const animCebolla  = Boolean(anim && anim.category === 'topping' && anim.itemId === 'cebolla');
  const animCilantro = Boolean(anim && anim.category === 'topping' && anim.itemId === 'cilantro');
  const animSalsa    = Boolean(anim && anim.category === 'topping' && anim.itemId === 'salsa_roja');

  const showTossBurst = animBistec || animLonga || animCebolla || animCilantro;
  const tossColor = animCilantro ? '#39ad52' : animCebolla ? '#8e83a8' : animLonga ? '#c9381e' : '#8a4a2a';
  const bounceClass = (animBistec || animLonga) ? ' dish-impact-bounce' : '';

  const tx = isDoble ? 199 : 190;
  const ty = isDoble ? 154 : 158;

  const onionCoords = [
    [tx - 30, ty - 6, 7.2, -16], [tx - 18, ty + 12, 6.8, 18], [tx - 6, ty - 14, 7.5, 10],
    [tx + 8,  ty + 8, 7.0, -12], [tx + 22, ty - 10, 6.8, 22], [tx + 31, ty + 6, 7.2, -8],
    [tx - 22, ty - 18, 6.4, 28], [tx + 14, ty + 18, 6.6, -24], [tx - 10, ty + 2, 7.4, 14],
    [tx + 4,  ty - 3,  7.0, -20],[tx + 19, ty + 4,  6.5, 16], [tx - 26, ty + 10, 6.4, -10],
    [tx + 2,  ty + 18, 6.6, 8],  [tx + 13, ty - 18, 6.4, -14],[tx - 14, ty - 8, 6.6, 20],
  ];

  const cilantroCoords = [
    [tx - 26, ty + 1,  0.95, -22, 0], [tx - 12, ty - 12, 1.0,  18, 1], [tx + 6,  ty - 14, 0.9,  -12, 0],
    [tx + 24, ty - 4,  0.98, 26,  1], [tx + 16, ty + 12, 0.92, -16, 0], [tx - 6,  ty + 14, 0.96, 14,  1],
    [tx - 32, ty - 10, 0.85, 32,  1], [tx + 30, ty + 9,  0.88, -28, 0], [tx + 1,  ty + 1,  1.05, 8,   0],
    [tx - 16, ty + 8,  0.9,  -10, 1], [tx + 14, ty - 3,  0.92, 20,  1], [tx - 2,  ty - 4,  0.86, -24, 0],
    [tx - 20, ty - 16, 0.82, 12,  0], [tx + 22, ty - 15, 0.84, -18, 1],
  ];

  const salsaPath = `M ${tx - 46} ${ty + 4} Q ${tx - 30} ${ty - 16}, ${tx - 16} ${ty + 5} T ${tx + 16} ${ty - 3} T ${tx + 46} ${ty + 3}`;
  const viewBox = compact ? '28 74 324 162' : '0 0 380 245';

  return `
    <div class="vector-plate-stage stage-taco${compact ? ' is-compact' : ''}" data-uid="${uid}">
      <svg class="food-plate-svg" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="${uid}_plateGrad" cx="44%" cy="38%" r="64%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="70%" stop-color="#f7f1e8"/>
            <stop offset="100%" stop-color="#e5dbcd"/>
          </radialGradient>
          <radialGradient id="${uid}_plateWell" cx="50%" cy="46%" r="58%">
            <stop offset="0%" stop-color="#faf6f0"/>
            <stop offset="100%" stop-color="#efe6d9"/>
          </radialGradient>
          <radialGradient id="${uid}_tortBack" cx="42%" cy="36%" r="64%">
            <stop offset="0%" stop-color="#f7dfa0"/>
            <stop offset="68%" stop-color="#e3b85d"/>
            <stop offset="100%" stop-color="#c99338"/>
          </radialGradient>
          <radialGradient id="${uid}_tortFront" cx="40%" cy="34%" r="62%">
            <stop offset="0%" stop-color="#fff3c9"/>
            <stop offset="66%" stop-color="#f4d17d"/>
            <stop offset="100%" stop-color="#dba446"/>
          </radialGradient>
        </defs>

        <g class="svg-dish-stack${bounceClass}">
          ${renderCeramicPlateSVG(190, 162, 146, 70, uid)}

          ${isDoble ? `
            <g class="${animBase ? 'svg-tortilla-drop' : ''}">
              ${renderArtisanalTortillaSVG(175, 163, `${uid}_tortBack`, true)}
            </g>
          ` : ''}

          ${hasTortilla ? `
            <g class="${animBase ? 'svg-tortilla-drop' : ''}">
              ${renderArtisanalTortillaSVG(tx, ty, `${uid}_tortFront`, false)}
            </g>
          ` : ''}

          ${hasBistec ? renderTacoBistecSVG(tx, ty - 2, animBistec, compact) : ''}
          ${hasLonga  ? renderTacoLonganizaSVG(tx, ty - 2, animLonga, compact) : ''}

          ${hasCebolla  ? renderOnionCubesSVG(onionCoords, animCebolla, compact) : ''}
          ${hasCilantro ? renderCilantroLeavesSVG(cilantroCoords, animCilantro, compact) : ''}

          ${hasSalsa ? `
            <g class="svg-sauce-layer${animSalsa ? ' svg-sauce-anim sauce-taco' : ''}">
              <path class="svg-sauce-stroke" pathLength="100" d="${salsaPath}"
                    fill="none" stroke="#6b0b03" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" opacity="0.28"/>
              <path class="svg-sauce-stroke" pathLength="100" d="${salsaPath}"
                    fill="none" stroke="#d42213" stroke-width="8.4" stroke-linecap="round" stroke-linejoin="round"/>
              <path class="svg-sauce-stroke" pathLength="100" d="${salsaPath}"
                    fill="none" stroke="#ff8273" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" opacity="0.68"/>
              <g class="svg-sauce-specks">
                <circle cx="${tx - 32}" cy="${ty - 5}" r="1.3" fill="#fad26b"/>
                <circle cx="${tx - 8}"  cy="${ty + 3}" r="1.2" fill="#4f0a03"/>
                <circle cx="${tx + 12}" cy="${ty - 4}" r="1.3" fill="#fad26b"/>
                <circle cx="${tx + 32}" cy="${ty + 1}" r="1.2" fill="#4f0a03"/>
                <circle cx="${tx + 2}"  cy="${ty - 2}" r="1.1" fill="#fad26b"/>
              </g>
            </g>
          ` : ''}
        </g>

        ${!compact ? `
          ${(hasBistec || hasLonga) ? renderSteamWispsSVG(tx, 108, animBistec || animLonga) : ''}
          ${showTossBurst ? renderHandTossBurstSVG(tx, 42, tossColor) : ''}
          ${animSalsa ? renderSqueezeBottleSVG('salsa_roja', 'taco', uid) : ''}
        ` : ''}
      </svg>
    </div>
  `;
}

function buildHotdogPlateSVG(state, opts = {}) {
  const uid        = opts.uid || `dog_${++plateSvgUidCounter}`;
  const compact    = Boolean(opts.compact);
  const anim       = opts.animAction && opts.animAction.station === 'hotdog' && opts.animAction.added
    ? opts.animAction
    : null;

  const hasKetchup = state.toppings.includes('ketchup');
  const hasMayo    = state.toppings.includes('mayonesa');
  const hasMostaza = state.toppings.includes('mostaza');
  const hasChiles  = state.toppings.includes('chiles');
  const hasTomate  = state.toppings.includes('tomate');
  const hasCebolla = state.toppings.includes('cebolla');

  const animTomate  = Boolean(anim && anim.itemId === 'tomate');
  const animCebolla = Boolean(anim && anim.itemId === 'cebolla');
  const animChiles  = Boolean(anim && anim.itemId === 'chiles');
  const animKetchup = Boolean(anim && anim.itemId === 'ketchup');
  const animMostaza = Boolean(anim && anim.itemId === 'mostaza');
  const animMayo    = Boolean(anim && anim.itemId === 'mayonesa');

  const activeBottle = animKetchup ? 'ketchup'
    : animMostaza ? 'mostaza'
    : animMayo ? 'mayonesa'
    : null;

  const showTossBurst = animTomate || animCebolla || animChiles;
  const tossColor = animChiles ? '#528f32' : animTomate ? '#e33522' : '#8e83a8';

  const ketchupPath = 'M 86 154 Q 100 137, 114 156 T 142 155 T 170 155 T 198 155 T 226 155 T 254 155 T 294 153';
  const mostazaPath = 'M 92 158 Q 108 141, 122 160 T 150 159 T 178 159 T 206 159 T 234 159 T 262 159 T 290 157';
  const mayoPath    = 'M 98 151 Q 112 136, 126 152 T 154 151 T 182 151 T 210 151 T 238 151 T 266 151 T 288 150';

  const tomatoCoords = [
    [104, 146, 7.2, -14], [128, 162, 7.4, 16], [154, 145, 7.0, 12], [178, 161, 7.5, -18],
    [204, 146, 7.2, 10],  [230, 162, 7.0, -12],[254, 147, 7.2, 20], [276, 160, 6.8, -16],
    [140, 152, 6.6, -8],  [192, 151, 6.8, 14], [242, 152, 6.8, -10],[116, 157, 6.6, 22],
  ];
  const onionCoords = [
    [96,  156, 6.6, 14],  [118, 145, 6.8, -18],[144, 161, 6.8, 10], [166, 147, 7.0, -12],
    [190, 161, 6.8, 20],  [216, 146, 6.8, -14],[240, 161, 6.6, 12], [264, 146, 6.8, -20],
    [284, 155, 6.4, 16],  [132, 150, 6.4, -8], [202, 156, 6.5, 18], [252, 156, 6.5, -14],
  ];
  const chileCoords = [
    [110, 152, 9.5, 7.2, -16], [148, 155, 9.8, 7.4, 14], [186, 151, 10, 7.5, -8],
    [224, 156, 9.6, 7.2, 18],  [262, 152, 9.5, 7.2, -14], [282, 158, 8.6, 6.6, 12],
  ];

  const viewBox = compact ? '20 74 340 164' : '0 0 380 245';

  return `
    <div class="vector-plate-stage stage-hotdog${compact ? ' is-compact' : ''}" data-uid="${uid}">
      <svg class="food-plate-svg" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="${uid}_plateGrad" cx="44%" cy="38%" r="64%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="70%" stop-color="#f7f1e8"/>
            <stop offset="100%" stop-color="#e5dbcd"/>
          </radialGradient>
          <radialGradient id="${uid}_plateWell" cx="50%" cy="46%" r="58%">
            <stop offset="0%" stop-color="#faf6f0"/>
            <stop offset="100%" stop-color="#efe6d9"/>
          </radialGradient>
          <linearGradient id="${uid}_bunTop" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#f5c678"/>
            <stop offset="55%" stop-color="#e39c44"/>
            <stop offset="100%" stop-color="#be7324"/>
          </linearGradient>
          <linearGradient id="${uid}_bunFront" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#fae0a8"/>
            <stop offset="28%" stop-color="#f0b662"/>
            <stop offset="100%" stop-color="#cc7e29"/>
          </linearGradient>
          <linearGradient id="${uid}_sausageGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#e06743"/>
            <stop offset="32%" stop-color="#c44423"/>
            <stop offset="78%" stop-color="#9c2c12"/>
            <stop offset="100%" stop-color="#701c09"/>
          </linearGradient>
        </defs>

        <g class="svg-dish-stack">
          ${renderCeramicPlateSVG(190, 166, 154, 66, uid)}

          <!-- Sombra suave del Hot Dog sobre el plato -->
          <ellipse cx="190" cy="186" rx="126" ry="22" fill="#3b230b" opacity="0.22"/>

          <!-- Mitad superior/trasera del pan brioche dorado -->
          <rect x="68" y="118" width="244" height="44" rx="22" fill="url(#${uid}_bunTop)" stroke="#9e5d19" stroke-width="1.8"/>
          <path d="M 88 126 Q 190 119, 292 126" fill="none" stroke="#ffeac2" stroke-width="3.2" stroke-linecap="round" opacity="0.65"/>
          <!-- Miga suave interior -->
          <rect x="76" y="138" width="228" height="22" rx="11" fill="#faeccd"/>

          <!-- Salchicha asada a la parrilla -->
          <rect x="55" y="135" width="270" height="36" rx="18" fill="url(#${uid}_sausageGrad)" stroke="#631706" stroke-width="1.8"/>
          <!-- Marcas de parrilla -->
          <g stroke="#4a1004" stroke-width="2.6" stroke-linecap="round" opacity="0.58">
            <path d="M 84 140 Q 90 153, 86 165"/>
            <path d="M 118 139 Q 124 153, 120 166"/>
            <path d="M 152 139 Q 158 153, 154 166"/>
            <path d="M 186 139 Q 192 153, 188 166"/>
            <path d="M 220 139 Q 226 153, 222 166"/>
            <path d="M 254 139 Q 260 153, 256 166"/>
            <path d="M 288 140 Q 294 153, 290 165"/>
          </g>
          <!-- Brillo jugoso continuo de la salchicha -->
          <path d="M 70 144 Q 190 139, 310 144" fill="none" stroke="#ffaa8a" stroke-width="3" stroke-linecap="round" opacity="0.56"/>

          <!-- Labio frontal del pan brioche abrazando la salchicha -->
          <path d="M 68 160 Q 190 167, 312 160 L 312 172 C 312 186, 298 193, 282 193 L 98 193 C 82 193, 68 186, 68 172 Z"
                fill="url(#${uid}_bunFront)" stroke="#9e5d19" stroke-width="1.8" stroke-linejoin="round"/>
          <path d="M 78 164 Q 190 171, 302 164" fill="none" stroke="#fff3d6" stroke-width="2.2" stroke-linecap="round" opacity="0.72"/>

          <!-- Aderezos brillantes sincronizados con el bote squeeze -->
          ${hasKetchup ? `
            <g class="svg-sauce-layer${animKetchup ? ' svg-sauce-anim sauce-dog' : ''}">
              <path class="svg-sauce-stroke" pathLength="100" d="${ketchupPath}" fill="none" stroke="#750c04" stroke-width="8.5" stroke-linecap="round" opacity="0.28"/>
              <path class="svg-sauce-stroke" pathLength="100" d="${ketchupPath}" fill="none" stroke="#de2214" stroke-width="6.4" stroke-linecap="round"/>
              <path class="svg-sauce-stroke" pathLength="100" d="${ketchupPath}" fill="none" stroke="#ff968c" stroke-width="1.7" stroke-linecap="round" opacity="0.72"/>
            </g>
          ` : ''}

          ${hasMostaza ? `
            <g class="svg-sauce-layer${animMostaza ? ' svg-sauce-anim sauce-dog' : ''}">
              <path class="svg-sauce-stroke" pathLength="100" d="${mostazaPath}" fill="none" stroke="#8a5f02" stroke-width="8.2" stroke-linecap="round" opacity="0.26"/>
              <path class="svg-sauce-stroke" pathLength="100" d="${mostazaPath}" fill="none" stroke="#f5c016" stroke-width="6.0" stroke-linecap="round"/>
              <path class="svg-sauce-stroke" pathLength="100" d="${mostazaPath}" fill="none" stroke="#fff7b8" stroke-width="1.6" stroke-linecap="round" opacity="0.8"/>
            </g>
          ` : ''}

          ${hasMayo ? `
            <g class="svg-sauce-layer${animMayo ? ' svg-sauce-anim sauce-dog' : ''}">
              <path class="svg-sauce-stroke" pathLength="100" d="${mayoPath}" fill="none" stroke="#a6977d" stroke-width="7.8" stroke-linecap="round" opacity="0.52"/>
              <path class="svg-sauce-stroke" pathLength="100" d="${mayoPath}" fill="none" stroke="#fffdf7" stroke-width="5.2" stroke-linecap="round"/>
            </g>
          ` : ''}

          <!-- Vegetales y chiles cayendo desde arriba en 3 oleadas -->
          ${hasTomate  ? renderTomatoCubesSVG(tomatoCoords, animTomate, compact) : ''}
          ${hasCebolla ? renderOnionCubesSVG(onionCoords, animCebolla, compact) : ''}
          ${hasChiles  ? renderJalapenoRingsSVG(chileCoords, animChiles, compact) : ''}
        </g>

        ${!compact ? `
          ${renderSteamWispsSVG(190, 104, false)}
          ${showTossBurst ? renderHandTossBurstSVG(190, 42, tossColor) : ''}
          ${activeBottle ? renderSqueezeBottleSVG(activeBottle, 'hotdog', uid) : ''}
        ` : ''}
      </svg>
    </div>
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
  if (typeof renderPinchMenu === 'function') renderPinchMenu();
}

function getCartTotal() {
  return cartItems.reduce((sum, it) => sum + it.price * it.qty, 0);
}

function renderCart() {
  const container   = document.getElementById('cart-items');
  const totalEl     = document.getElementById('cart-total');
  const pedirSheet  = document.getElementById('btn-pedir-sheet');
  const pedirBar    = document.getElementById('btn-pedir-bar');
  const mainBarEl   = document.getElementById('mobile-bottom-bar');
  const bbCountEl   = document.getElementById('bb-count');
  const bbStatusTxt = document.getElementById('bb-status-text');
  const bbTotalEl   = document.getElementById('bb-total-price');

  if (!container) return;

  const summary = getCurrentDraftSummary();

  if (cartItems.length === 0) {
    container.innerHTML = '<p class="cart-empty">Explora el menú y toca + para agregar platillos</p>';
  } else {
    container.innerHTML = cartItems.map((item, idx) => {
      const lineTotal = item.price * item.qty;
      const extrasArr = Array.isArray(item.extras) ? item.extras : [];
      const removedArr = Array.isArray(item.removed) ? item.removed : [];
      const hasRichMods = item.option || extrasArr.length > 0 || removedArr.length > 0 || item.note;
      const richModsHtml = hasRichMods
        ? `<div class="cart-mod-row">
            ${item.option ? `<span class="cart-mod-pill is-opt">${escapeHTML(item.option)}</span>` : ''}
            ${extrasArr.map(e => `<span class="cart-mod-pill is-extra">+${escapeHTML(e.name)}</span>`).join('')}
            ${removedArr.map(r => `<span class="cart-mod-pill is-sin">Sin ${escapeHTML(r)}</span>`).join('')}
            ${item.note ? `<span class="cart-mod-pill is-note">Nota: ${escapeHTML(item.note)}</span>` : ''}
          </div>`
        : '';
      return `
        <div class="cart-item">
          <span class="cart-item-mono">${escapeHTML(getDishMonogram(item))}</span>
          <div class="cart-item-info">
            <div class="cart-item-name">${escapeHTML(item.name)}</div>
            ${richModsHtml}
            <div class="cart-item-price">${formatMenuPrice(lineTotal)} (${formatMenuPrice(item.price)} c/u)</div>
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
  const loyaltyDisc    = typeof getActiveCartLoyaltyDiscount === 'function' ? getActiveCartLoyaltyDiscount(baseFoodTotal) : 0;
  const effectiveTotal = Math.max(0, baseFoodTotal - loyaltyDisc) + deliveryFee;
  const canOrder       = (cartItems.length > 0 || summary.ready);

  if (typeof renderCartLoyaltyBox === 'function') {
    renderCartLoyaltyBox(baseFoodTotal, loyaltyDisc);
  }

  if (mainBarEl)  mainBarEl.classList.toggle('is-empty', cartItems.length === 0 && !summary.ready);
  if (bbCountEl) {
    bbCountEl.textContent = totalQty;
    if (totalQty > prevCartTotalQty && totalQty > 0) {
      bbCountEl.classList.remove('is-popping');
      void bbCountEl.offsetWidth;
      bbCountEl.classList.add('is-popping');
      if (mainBarEl) {
        mainBarEl.classList.remove('is-pulsing');
        void mainBarEl.offsetWidth;
        mainBarEl.classList.add('is-pulsing');
      }
    }
  }
  prevCartTotalQty = totalQty;
  if (totalEl)    totalEl.textContent    = formatMenuPrice(effectiveTotal);
  if (bbTotalEl)  bbTotalEl.textContent  = formatMenuPrice(effectiveTotal);

  const ctaLabel = isDelivery ? 'Pagar Envío →' : (isPickup ? 'Pagar Pickup →' : 'Pedir →');
  if (pedirBar)   pedirBar.textContent   = ctaLabel;
  if (pedirSheet) pedirSheet.textContent = ctaLabel;

  if (bbStatusTxt) {
    if (totalQty > 0) {
      bbStatusTxt.textContent = `Ver Pedido (${totalQty} ${totalQty === 1 ? 'item' : 'items'})`;
    } else if (summary.ready) {
      bbStatusTxt.textContent = summary.name;
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
      tableLineEl.textContent = addr ? `Domicilio (+$25) · ${addr}` : 'Envío a domicilio (+$25) · Pago anticipado';
    } else if (isPickup) {
      const pTime = readTenantStorage('pickup-time') || 'Lo antes posible';
      tableLineEl.textContent = `Pickup · ${pTime}`;
    } else {
      const savedTable = presetTableFromURL || readTenantStorage('last-table') || '';
      if (savedTable) {
        const g = getTableGroupSummary(savedTable);
        const others = g.diners.filter(d => !d.isMe).length;
        tableLineEl.textContent = others > 0
          ? `${savedTable} · ${g.diners.length} personas · Mesa ${formatMenuPrice(g.tableTotal)}`
          : `${savedTable} · Toca para revisar`;
      } else {
        tableLineEl.textContent = totalQty > 0 ? 'Toca para revisar o confirmar' : 'Toca para ver tu pedido';
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
  const priorityIds = ['agua_jamaica', 'agua_horchata', 'mexican_coke', 'saratoga_sparkling_water'];
  const allAvail = PINCH_MENU_ITEMS.filter(d => d.category === 'drinks' && !isPinchDishSoldOut(d.id));
  const prioritized = priorityIds
    .map(id => allAvail.find(d => d.id === id))
    .filter(Boolean);
  const rest = allAvail.filter(d => !priorityIds.includes(d.id));
  return [...prioritized, ...rest].slice(0, 4);
}

function shouldOfferDrinkUpsell() {
  if (upsellOfferedForCart) return false;
  const hasFood  = cartItems.some(it => it.station !== 'drink' && it.category !== 'drinks');
  const hasDrink = cartItems.some(it => it.station === 'drink' || it.category === 'drinks');
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
        <span class="cart-item-mono">${escapeHTML(getDishMonogram(drink))}</span>
        <span class="upsell-drink-name">${escapeHTML(drink.name)}</span>
      </div>
      <span class="upsell-drink-cta">+ ${formatMenuPrice(drink.price)} · Agregar</span>
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
  if (typeof quickAddPinchDish === 'function') {
    quickAddPinchDish(drinkId, { silentToast: true });
  } else {
    addDrinkToCart(drinkId);
  }
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
      if (prepayBadge) prepayBadge.textContent = 'PICKUP EN SUCURSAL · PAGO ANTICIPADO';
      if (prepayDesc)  prepayDesc.textContent  = 'Paga por adelantado con Apple Pay o Tarjeta para que cocina prepare tu orden al instante y recógela sin hacer fila.';
    } else if (valid === 'delivery') {
      prepayBanner.classList.remove('hidden');
      if (prepayBadge) prepayBadge.textContent = 'ENVÍO A DOMICILIO (+$25) · PAGO ANTICIPADO';
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
  const submitBtn       = document.getElementById('btn-submit-order');
  const slideWrap       = document.getElementById('order-slide-wrap');
  const identityActions = document.getElementById('order-identity-actions');

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

  if (slideWrap)       slideWrap.classList.toggle('hidden', Boolean(identityPreselectOnly));
  if (identityActions) identityActions.classList.toggle('hidden', !identityPreselectOnly);

  if (submitBtn) {
    submitBtn.textContent = 'Guardar Datos';
  }
  if (typeof updateOrderSliderLabel === 'function') {
    updateOrderSliderLabel();
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
    tablePill.textContent = `Pickup (${savedPTime})`;
    guestPill.textContent = savedGuest || 'Tu nombre';
    groupPill.textContent = 'Pago Anticipado';
  } else if (currentFulfillmentMode === 'delivery') {
    tablePill.textContent = savedAddr ? `${savedAddr.slice(0, 22)}${savedAddr.length > 22 ? '…' : ''}` : 'Ingresar dirección';
    guestPill.textContent = savedGuest || 'Tu nombre';
    groupPill.textContent = '+$25 envío · Pagar';
  } else {
    tablePill.textContent = savedTable || 'Elegir Mesa';
    guestPill.textContent = savedGuest || 'Tu nombre';
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

  // Barra de invitación a la mesa (WhatsApp / Link directo $0) + Bienvenida por invitación
  const inviteBarEl   = document.getElementById('table-invite-bar');
  const inviteTitleEl = document.getElementById('table-invite-title');
  const welcomeEl     = document.getElementById('invite-welcome-banner');
  const welcomeTitEl  = document.getElementById('invite-welcome-title');
  const welcomeSubEl  = document.getElementById('invite-welcome-sub');

  const isShareableTable = Boolean(
    currentFulfillmentMode === 'dine_in' &&
    savedTable &&
    savedTable.trim().toLowerCase() !== 'mostrador'
  );

  if (inviteBarEl) {
    inviteBarEl.classList.toggle('hidden', !isShareableTable);
    if (isShareableTable && inviteTitleEl) {
      inviteTitleEl.textContent = `Invita amigos a ${savedTable}`;
    }
  }

  if (welcomeEl) {
    const showWelcome = Boolean(isShareableTable && invitedByGuest && !inviteWelcomeDismissed);
    welcomeEl.classList.toggle('hidden', !showWelcome);
    if (showWelcome) {
      if (welcomeTitEl) welcomeTitEl.textContent = `${invitedByGuest} te invitó a ${savedTable}`;
      if (welcomeSubEl) welcomeSubEl.textContent = savedGuest
        ? `Pides como ${savedGuest} · Cada quien en su cuenta o dividen al final.`
        : 'Toca arriba en "Tu nombre" para identificarte y pedir juntos.';
    }
  }

  if (currentFulfillmentMode === 'dine_in') {
    if (savedTable && diners.length > 1) {
      groupPill.textContent = `${diners.length} personas · $${groupInfo.tableTotal}`;
      return;
    }
    groupPill.textContent = (savedTable && savedGuest) ? 'Cuenta individual' : 'Cuentas separadas';
  }
}

function normalizeMesaInputParam(raw) {
  const clean = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!clean) return '';
  if (/^\d+$/.test(clean)) return `Mesa ${clean}`;
  return clean;
}

function getActiveShareableTable() {
  const trackedOrder = activeTrackedOrderId ? orders.find(o => o.id === activeTrackedOrderId) : null;
  if (clientMode === 'tracker' && trackedOrder && trackedOrder.table && (trackedOrder.fulfillmentMode || 'dine_in') === 'dine_in') {
    return normalizeTableName(trackedOrder.table);
  }
  const raw = presetTableFromURL || readTenantStorage('last-table') || '';
  return raw ? normalizeTableName(raw) : '';
}

function buildTableInviteURL(tableName, hostName) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  if (tenantId && tenantId !== 'escandon') {
    url.searchParams.set('r', tenantId);
  }
  url.searchParams.set('mesa', tableName);
  url.searchParams.set('modo', 'mesa');
  if (hostName) {
    url.searchParams.set('invita', hostName);
  }
  return url.toString();
}

function copyTextWithFallback(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    return navigator.clipboard.writeText(text).catch(() => copyViaHiddenTextarea(text));
  }
  return Promise.resolve(copyViaHiddenTextarea(text));
}

function copyViaHiddenTextarea(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  document.body.removeChild(ta);
}

function copyTableInviteLink() {
  const tableName = getActiveShareableTable();
  if (!tableName || tableName.toLowerCase() === 'mostrador') {
    showToast('Elige primero tu mesa para compartir el enlace');
    openIdentityPreselectModal();
    return;
  }
  const hostName = (currentGuestName || customerPrefs.name || readTenantStorage('guest-name') || '').trim();
  const inviteUrl = buildTableInviteURL(tableName, hostName);
  copyTextWithFallback(inviteUrl).then(() => {
    hapticTap(10);
    showToast(`Link de ${tableName} copiado para compartir`);
  });
}

function shareTableInviteWhatsApp() {
  const tableName = getActiveShareableTable();
  if (!tableName || tableName.toLowerCase() === 'mostrador') {
    showToast('Elige primero tu mesa para invitar por WhatsApp');
    openIdentityPreselectModal();
    return;
  }
  const hostName = (currentGuestName || customerPrefs.name || readTenantStorage('guest-name') || '').trim();
  const inviteUrl = buildTableInviteURL(tableName, hostName);
  const restName = getActiveTenantProfile().displayName || 'Pinch Kitchen+Bar';
  const msg = `${hostName ? `${hostName} te invita a` : 'Únete a'} la ${tableName} en ${restName}.\nAbre este enlace para pedir en la misma mesa (cuentas separadas o divididas):\n${inviteUrl}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
  showToast(`Invitación lista para ${tableName}`);
}

function dismissInviteWelcome() {
  inviteWelcomeDismissed = true;
  const welcomeEl = document.getElementById('invite-welcome-banner');
  if (welcomeEl) welcomeEl.classList.add('hidden');
}

function openIdentityPreselectModal() {
  unlockAudioContext();
  identityPreselectOnly = true;
  openOrderModalDirect();
}

// ─── CONTROL TÁCTIL "DESLIZA PARA PEDIR" (DINEOS SLIDE-TO-ORDER) ────────
let orderSliderInitialized = false;
let orderSliderDragging    = false;
let orderSliderLocked      = false;
let orderSliderProgress    = 0;
let orderSliderStartX      = 0;
let orderSliderMaxTravel   = 220;
let orderSliderPointerId   = null;

function updateOrderSliderLabel() {
  const labelEl     = document.getElementById('order-slide-label');
  const confLabelEl = document.getElementById('order-slide-confirmed-label');
  if (!labelEl) return;

  const foodSubtotal = typeof getCartTotal === 'function' ? getCartTotal() : 0;
  const disc         = typeof getActiveCartLoyaltyDiscount === 'function' ? getActiveCartLoyaltyDiscount(foodSubtotal) : 0;
  const fee          = currentFulfillmentMode === 'delivery' ? (getActiveTenantProfile().deliveryFee || 25) : 0;
  const grand        = Math.max(0, foodSubtotal - disc) + fee;
  const priceSuffix  = grand > 0 ? ` · ${formatMenuPrice(grand)}` : '';

  if (currentFulfillmentMode === 'pickup' || currentFulfillmentMode === 'delivery') {
    labelEl.textContent = `Desliza para ir al pago${priceSuffix}`;
    if (confLabelEl) confLabelEl.textContent = '✓ Abriendo pago...';
  } else {
    labelEl.textContent = `Desliza para pedir${priceSuffix}`;
    if (confLabelEl) confLabelEl.textContent = '✓ Enviando a cocina...';
  }
}

function setOrderSliderPosition(px, animate = false) {
  const track = document.getElementById('order-slide-track');
  const knob  = document.getElementById('order-slide-knob');
  if (!track || !knob) return;

  const maxT     = Math.max(1, orderSliderMaxTravel || (track.clientWidth - knob.offsetWidth - 8));
  const clamped  = Math.max(0, Math.min(maxT, Number(px) || 0));
  const progress = clamped / maxT;

  orderSliderProgress = progress;
  track.classList.toggle('is-dragging', !animate);
  track.style.setProperty('--slide-x', `${clamped.toFixed(1)}px`);
  track.style.setProperty('--slide-progress', progress.toFixed(4));
  knob.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
}

function resetOrderSlider(withBounce = false) {
  const track = document.getElementById('order-slide-track');
  const knob  = document.getElementById('order-slide-knob');
  orderSliderDragging  = false;
  orderSliderLocked    = false;
  orderSliderProgress  = 0;
  orderSliderPointerId = null;

  if (track) {
    track.classList.remove('is-dragging', 'is-confirmed', 'is-error-bounce');
    track.style.setProperty('--slide-x', '0px');
    track.style.setProperty('--slide-progress', '0');
    if (withBounce) {
      hapticTap(20);
      void track.offsetWidth;
      track.classList.add('is-error-bounce');
      setTimeout(() => track.classList.remove('is-error-bounce'), 420);
    }
  }
  if (knob) {
    knob.setAttribute('aria-valuenow', '0');
  }
}

function completeOrderSlider() {
  if (orderSliderLocked) return;
  const track = document.getElementById('order-slide-track');
  const knob  = document.getElementById('order-slide-knob');
  if (track && knob) {
    orderSliderMaxTravel = Math.max(1, track.clientWidth - knob.offsetWidth - 8);
  }
  orderSliderLocked   = true;
  orderSliderDragging = false;
  setOrderSliderPosition(orderSliderMaxTravel, true);
  if (track) {
    track.classList.remove('is-dragging');
    track.classList.add('is-confirmed');
  }
  hapticTap(18);

  setTimeout(() => {
    const ok = submitOrder();
    if (ok === false) {
      resetOrderSlider(true);
    }
  }, 220);
}

function initOrderSlideControl() {
  if (orderSliderInitialized) return;
  const track = document.getElementById('order-slide-track');
  const knob  = document.getElementById('order-slide-knob');
  if (!track || !knob) return;
  orderSliderInitialized = true;

  knob.addEventListener('pointerdown', (e) => {
    if ((e.button && e.button !== 0) || orderSliderLocked || identityPreselectOnly) return;
    e.preventDefault();
    unlockAudioContext();
    orderSliderMaxTravel = Math.max(1, track.clientWidth - knob.offsetWidth - 8);
    orderSliderDragging  = true;
    orderSliderStartX    = e.clientX;
    orderSliderPointerId = e.pointerId;
    try { knob.setPointerCapture(e.pointerId); } catch (_) {}
    track.classList.add('is-dragging');
  });

  window.addEventListener('pointermove', (e) => {
    if (!orderSliderDragging || orderSliderLocked) return;
    const dx = e.clientX - orderSliderStartX;
    setOrderSliderPosition(dx, false);
    if (orderSliderProgress >= 0.86) {
      try {
        if (orderSliderPointerId !== null && knob.hasPointerCapture && knob.hasPointerCapture(orderSliderPointerId)) {
          knob.releasePointerCapture(orderSliderPointerId);
        }
      } catch (_) {}
      completeOrderSlider();
    }
  });

  const finishDrag = () => {
    if (!orderSliderDragging || orderSliderLocked) return;
    orderSliderDragging = false;
    try {
      if (orderSliderPointerId !== null && knob.hasPointerCapture && knob.hasPointerCapture(orderSliderPointerId)) {
        knob.releasePointerCapture(orderSliderPointerId);
      }
    } catch (_) {}
    orderSliderPointerId = null;

    if (orderSliderProgress >= 0.80) {
      completeOrderSlider();
    } else {
      setOrderSliderPosition(0, true);
    }
  };

  window.addEventListener('pointerup', finishDrag);
  window.addEventListener('pointercancel', finishDrag);

  knob.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      completeOrderSlider();
    }
  });
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
  initOrderSlideControl();
  resetOrderSlider(false);
  updateOrderSliderLabel();

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
  resetOrderSlider(false);
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
  if (typeof syncLoyaltyProfileIdentity === 'function') syncLoyaltyProfileIdentity(guestVal, phoneVal);
  if (typeof renderClientLoyaltyHeaderAndBanner === 'function') renderClientLoyaltyHeaderAndBanner();
  renderCart();

  if (identityPreselectOnly) {
    closeOrderModal();
    const label = currentFulfillmentMode === 'delivery'
      ? `Domicilio · ${guestVal}`
      : (currentFulfillmentMode === 'pickup' ? `Pickup · ${guestVal}` : `${tableVal} · ${guestVal}`);
    showToast(`${label} guardado`);
    return true;
  }

  if (cartItems.length === 0) return false;

  // En modo A Domicilio, verificar que haya puesto dirección antes de pasar al pago
  if (currentFulfillmentMode === 'delivery' && !addrVal) {
    if (addrInputEl) addrInputEl.focus();
    showToast('Ingresa tu dirección de entrega para continuar');
    return false;
  }

  const foodSubtotal  = getCartTotal();
  const deliveryFee   = currentFulfillmentMode === 'delivery' ? (getActiveTenantProfile().deliveryFee || 25) : 0;
  const activeReward  = typeof getActiveCartLoyaltyReward === 'function' ? getActiveCartLoyaltyReward(foodSubtotal) : null;
  const loyaltyDiscount = activeReward ? activeReward.discount : 0;
  const netFoodTotal  = Math.max(0, foodSubtotal - loyaltyDiscount);
  const pointsEarned  = Math.max(1, Math.round(netFoodTotal));

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
    loyaltyRewardId: activeReward ? activeReward.id : null,
    loyaltyRewardLabel: activeReward ? activeReward.title : '',
    loyaltyPointsUsed: activeReward ? activeReward.pointsCost : 0,
    loyaltyDiscount,
    loyaltyPointsEarned: pointsEarned,
    viaMeseroAI: Boolean(window._lastOrderViaMeseroAI),
    deliveryFee,
    total: netFoodTotal + deliveryFee,
    items: cartItems.map((it, idx) => ({
      id: idx + 1,
      key: it.key || '',
      dishId: it.dishId || '',
      category: it.category || it.station || '',
      station: it.station || '',
      name: it.name,
      emoji: it.emoji,
      price: it.price,
      qty: it.qty,
      option: it.option || '',
      note: it.note || '',
      extras: Array.isArray(it.extras) ? it.extras.map(e => ({ id: e.id, name: e.name, price: e.price })) : [],
      removed: Array.isArray(it.removed) ? [...it.removed] : [],
      guestName: guestVal,
    })),
  };
  window._lastOrderViaMeseroAI = false;

  closeOrderModal();
  if (tableInputEl && currentFulfillmentMode === 'dine_in') tableInputEl.value = tableVal;

  // Si es Pickup o A Domicilio, el pago anticipado es OBLIGATORIO antes de enviar a cocina
  if (currentFulfillmentMode === 'pickup' || currentFulfillmentMode === 'delivery') {
    openPaymentCheckoutModal({
      mode: 'prepay_order',
      draftOrder,
      subtotal: netFoodTotal,
      deliveryFee,
      table: tableVal,
      guestName: guestVal,
    });
    return true;
  }

  // Modo En Mesa: enviar comanda a cocina de inmediato (puede pagar su cuenta separada desde el Tracker)
  dispatchConfirmedOrderToKitchen({
    ...draftOrder,
    paid: false,
    paymentMethod: null,
    paymentLabel: '',
    tipAmount: 0,
  });
  return true;
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
  trackedOrdersCache.set(order.id, order);
  myOrderIds.push(order.id);
  activeTrackedOrderId = order.id;
  deductInventoryForOrder(order, { silent: true });
  if (typeof recordLoyaltyOrderSubmission === 'function') {
    recordLoyaltyOrderSubmission(order);
  }
  persistOrders();

  publishCloudSync('NEW_ORDER', order);

  // Limpiar carrito y abrir Rastreador en Tiempo Real
  cartItems = [];
  upsellOfferedForCart = false;
  const availBase = TACO_CONFIG.base.find(b => !isStockSoldOut(getStockKey('taco', 'base', b.id)));
  tacoDraft = { tortilla: availBase ? availBase.id : null, protein: null, toppings: [] };
  hotdogDraft = { toppings: [] };
  renderCart();
  if (typeof renderClientLoyaltyHeaderAndBanner === 'function') {
    renderClientLoyaltyHeaderAndBanner();
  }

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
  if (stripeBtn) stripeBtn.textContent = `Pagar $${grand.toFixed(2)} con Tarjeta`;
}

function openTrackerPaymentModal(scope) {
  unlockAudioContext();
  const rec = findTrackedOrderRecord(activeTrackedOrderId);
  const order = rec ? rec.order : null;
  if (!order) return;

  const groupInfo = getTableGroupSummary(order.table, order);
  const isTable   = scope === 'table';
  const normTable = normalizeTableName(order.table).toLowerCase();
  const tableOrders = orders.filter(o => o && normalizeTableName(o.table).toLowerCase() === normTable);
  if (!tableOrders.some(o => o.id === order.id)) tableOrders.push(order);

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
  if (ringEl) ringEl.innerHTML = uiIcon('clock', 'lg');
  if (statusEl) statusEl.textContent = 'Verificando Face ID con Apple Wallet...';

  setTimeout(() => {
    if (ringEl) ringEl.innerHTML = uiIcon('check', 'lg');
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
      errEl.textContent = 'Verifica los datos de tu tarjeta';
      errEl.classList.remove('hidden');
    }
    return;
  }

  if (errEl) errEl.classList.add('hidden');
  const last4 = rawNum.slice(-4);
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = 'Procesando con Stripe...';
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

function findTrackedOrderRecord(orderId) {
  if (!orderId) return null;
  const active = orders.find(o => o.id === orderId);
  if (active) {
    trackedOrdersCache.set(active.id, active);
    return { order: active, isDelivered: false };
  }
  const done = completedOrders.find(o => o.id === orderId);
  if (done) {
    trackedOrdersCache.set(done.id, done);
    return { order: done, isDelivered: true };
  }
  const cached = trackedOrdersCache.get(orderId);
  if (cached) {
    return { order: cached, isDelivered: true };
  }
  return null;
}

// ─── Sistema de Grupos por Mesa y Cuentas Separadas (Split Bill) ──
function getTableGroupSummary(tableName, referenceOrder = null) {
  const normTable = normalizeTableName(tableName).toLowerCase();
  const tableOrders = orders.filter(
    o => o && normalizeTableName(o.table).toLowerCase() === normTable
  );
  if (referenceOrder && !tableOrders.some(o => o.id === referenceOrder.id)) {
    tableOrders.push(referenceOrder);
  }

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
  const rec = findTrackedOrderRecord(activeTrackedOrderId);
  if (clientMode === 'tracker' && rec && rec.order && rec.order.table) return rec.order.table;
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
  const rec         = findTrackedOrderRecord(activeTrackedOrderId);
  const activeOrder = rec ? rec.order : null;
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
      ? (billScope === 'table' ? 'CUENTA GRUPAL SOLICITADA' : 'TU CUENTA INDIVIDUAL SOLICITADA')
      : 'MESERO NOTIFICADO EN COCINA',
    message: isBill
      ? (billScope === 'table'
          ? `Llevarán la cuenta completa de ${table} ($${callTotal})`
          : `Llevarán tu cuenta individual (${guestName || table} · $${callTotal})`)
      : `El personal ya recibió tu aviso para ${table}`,
  });
  playClientReadyDing();

  showToast(isBill
    ? `Cuenta solicitada (${billScope === 'table' ? 'Mesa completa' : guestName || table}: $${callTotal})`
    : `Mesero notificado para ${table}`);
}

function renderClientTracker() {
  updateClientContextBar();
  if (clientMode !== 'tracker') return;

  const rec       = findTrackedOrderRecord(activeTrackedOrderId);
  const order     = rec ? rec.order : null;
  const isDelivered = rec ? rec.isDelivered : true;
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
    // Si la orden aún no existe en memoria, mostrar confirmación limpia y actualizar calculadora
    if (heroEl)     heroEl.dataset.status = 'ready';
    if (mainLedEl)  mainLedEl.className = 'led-dot led-ready';
    if (titleEl)    titleEl.textContent = 'Entregado';
    if (descEl)     descEl.textContent  = 'Tu pedido fue entregado. ¡Buen provecho!';
    if (progressEl) progressEl.style.width = '100%';
    document.querySelectorAll('#tracker-steps .tracker-step').forEach(stepEl => {
      stepEl.classList.add('done');
      stepEl.classList.remove('current');
    });
    if (typeof renderTrackerSplitCalculator === 'function') {
      renderTrackerSplitCalculator();
    }
    return;
  }

  const meta      = isDelivered
    ? {
        stepIndex: 4,
        label: 'Entregado',
        ledClass: 'led-ready',
        desc: 'Tu pedido fue entregado. ¡Buen provecho!',
      }
    : (STATUS_META[order.status] || STATUS_META.pending);
  const fMode     = order.fulfillmentMode || 'dine_in';
  const isRemote  = fMode === 'pickup' || fMode === 'delivery';
  const groupInfo = getTableGroupSummary(order.table, order);
  const myDiner   = groupInfo.myDiner;
  const hasGroup  = !isRemote && groupInfo.diners.length > 1;

  if (heroEl)    heroEl.dataset.status = isDelivered ? 'ready' : order.status;
  if (numEl)     numEl.textContent   = `ORDEN #${String(order.num).padStart(3, '0')}`;
  if (tableEl) {
    if (fMode === 'pickup') {
      tableEl.textContent = `Pickup · ${order.guestName || 'Cliente'}`;
    } else if (fMode === 'delivery') {
      tableEl.textContent = `A Domicilio · ${order.guestName || 'Cliente'}`;
    } else {
      tableEl.textContent = myDiner.guestName ? `${order.table} · ${myDiner.guestName}` : order.table;
    }
  }
  if (mainLedEl) mainLedEl.className = `led-dot ${meta.ledClass}`;
  if (titleEl)   titleEl.textContent = meta.label;
  if (descEl)    descEl.textContent  = meta.desc;
  if (progressEl) {
    const pct = isDelivered ? 100 : ([12, 40, 70, 100][meta.stepIndex] || 12);
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
        <div class="tf-row"><span class="tf-label">Modalidad</span><span class="tf-val">Pickup (Para Llevar)</span></div>
        <div class="tf-row"><span class="tf-label">Recolección</span><span class="tf-val">${escapeHTML(order.pickupTime || 'Lo antes posible')}</span></div>
        ${order.customerPhone ? `<div class="tf-row"><span class="tf-label">WhatsApp / Tel</span><span class="tf-val">${escapeHTML(order.customerPhone)}</span></div>` : ''}
      `;
    } else if (fMode === 'delivery') {
      fulfillBox.classList.remove('hidden');
      fulfillBox.innerHTML = `
        <div class="tf-row"><span class="tf-label">Modalidad</span><span class="tf-val">Envío a Domicilio (+$${order.deliveryFee || 25})</span></div>
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

  // Presencia en la mesa (avatares + estado de cada comensal) + Botón Invitar
  const trackerInviteEl  = document.getElementById('tracker-invite-strip');
  const trackerInvLbl    = document.getElementById('tracker-invite-label');
  const canInviteTracker = Boolean(!isRemote && order.table && order.table.trim().toLowerCase() !== 'mostrador');
  if (trackerInviteEl) {
    trackerInviteEl.classList.toggle('hidden', !canInviteTracker);
    if (canInviteTracker && trackerInvLbl) {
      trackerInvLbl.textContent = `¿Vienen más amigos a ${order.table}?`;
    }
  }

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

  const itemRow = (it) => {
    const extList = Array.isArray(it.extras) && it.extras.length > 0 ? `+${it.extras.map(e => e.name).join(', +')}` : '';
    const sinList = Array.isArray(it.removed) && it.removed.length > 0 ? `Sin ${it.removed.join(', Sin ')}` : '';
    const customLine = [it.option, extList, sinList, it.note].filter(Boolean).join(' · ');
    return `
      <div class="tracker-item-row">
        <span class="ti-left">
          <span class="tracker-item-qty">${it.qty}×</span>
          <span class="ti-name">${escapeHTML(it.name)}${customLine ? `<small class="ti-custom-note">${escapeHTML(customLine)}</small>` : ''}</span>
        </span>
        <span class="ti-amount">${formatMenuPrice(it.price * it.qty)}</span>
      </div>
    `;
  };

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
    const loyaltyDiscRow = (Number(order.loyaltyDiscount) > 0)
      ? `<div class="tracker-item-row loyalty-discount-row">
           <span class="ti-left"><span class="tracker-item-qty">VIP</span><span class="ti-name">Canje: ${escapeHTML(order.loyaltyRewardLabel || 'Puntos Escandón')}</span></span>
           <span class="ti-amount">-$${order.loyaltyDiscount}</span>
         </div>`
      : '';
    if (itemsEl) itemsEl.innerHTML = myItems.map(itemRow).join('') + loyaltyDiscRow;
  }

  const receiptFootEl = document.getElementById('receipt-foot-text');
  if (receiptFootEl) {
    const ptsEarned = Number(order.loyaltyPointsEarned) || Math.max(1, Math.round(Number(order.total) || 0));
    receiptFootEl.innerHTML = `<strong>+${ptsEarned} Puntos Escandón</strong> acumulados · IVA incluido`;
  }

  if (typeof renderTrackerSplitCalculator === 'function') {
    renderTrackerSplitCalculator(order, groupInfo);
  }
}

// ─── Pieza 3: Calculadora Visual de Cuenta y Propina ($0 Comisiones) ────
function setSplitCalcMode(mode) {
  splitCalcState.mode = ['mine', 'equal', 'table'].includes(mode) ? mode : 'mine';
  if (splitCalcState.mode === 'equal' && !splitCalcState.userEditedPeople) {
    const rec = findTrackedOrderRecord(activeTrackedOrderId);
    const order = rec ? rec.order : null;
    if (order) {
      const g = getTableGroupSummary(order.table, order);
      splitCalcState.people = Math.max(2, g.diners.length || 2);
    }
  }
  renderTrackerSplitCalculator();
}

function adjustSplitCalcPeople(delta) {
  splitCalcState.userEditedPeople = true;
  splitCalcState.people = Math.max(2, Math.min(24, (Number(splitCalcState.people) || 2) + delta));
  renderTrackerSplitCalculator();
}

function setSplitCalcTip(pct) {
  splitCalcState.tipPct = Math.max(0, Math.min(30, Number(pct) || 0));
  renderTrackerSplitCalculator();
}

function computeTrackerSplitCalcData(orderArg = null, groupArg = null) {
  const rec = orderArg ? { order: orderArg } : findTrackedOrderRecord(activeTrackedOrderId);
  const order = rec ? rec.order : null;
  if (!order) return null;
  const fMode = order.fulfillmentMode || 'dine_in';
  const isRemote = fMode === 'pickup' || fMode === 'delivery';
  const groupInfo = groupArg || getTableGroupSummary(order.table, order);

  const myBase = Number(groupInfo.myTotal) || Number(order.total) || 0;
  const tableBase = Number(groupInfo.tableTotal) || myBase;
  const peopleCount = Math.max(2, Number(splitCalcState.people) || Math.max(2, groupInfo.diners.length || 2));

  let activeMode = isRemote ? 'mine' : splitCalcState.mode;
  let baseShown = myBase;
  if (activeMode === 'equal') {
    baseShown = tableBase / peopleCount;
  } else if (activeMode === 'table') {
    baseShown = tableBase;
  }

  const tipPct = Number(splitCalcState.tipPct) || 0;
  const tipAmount = Math.round(baseShown * (tipPct / 100) * 100) / 100;
  const grandAmount = Math.round((baseShown + tipAmount) * 100) / 100;

  return {
    order,
    isRemote,
    groupInfo,
    activeMode,
    peopleCount,
    myBase,
    tableBase,
    baseShown: Math.round(baseShown * 100) / 100,
    tipPct,
    tipAmount,
    grandAmount,
    tableTipTotal: Math.round(tableBase * (tipPct / 100) * 100) / 100,
    tableGrandTotal: Math.round((tableBase * (1 + tipPct / 100)) * 100) / 100,
  };
}

function renderTrackerSplitCalculator(orderArg = null, groupArg = null) {
  const cardEl = document.getElementById('tracker-split-calculator');
  if (!cardEl) return;

  const data = computeTrackerSplitCalcData(orderArg, groupArg);
  if (!data) {
    cardEl.classList.add('hidden');
    return;
  }
  cardEl.classList.remove('hidden');

  const btnMine  = document.getElementById('tsc-mode-mine');
  const btnEqual = document.getElementById('tsc-mode-equal');
  const btnTable = document.getElementById('tsc-mode-table');
  const peopleRow = document.getElementById('tsc-people-row');
  const peopleVal = document.getElementById('tsc-people-val');
  const baseEl   = document.getElementById('tsc-res-base');
  const tipLblEl = document.getElementById('tsc-res-tip-label');
  const tipEl    = document.getElementById('tsc-res-tip');
  const totTitEl = document.getElementById('tsc-res-total-title');
  const totSubEl = document.getElementById('tsc-res-total-sub');
  const grandEl  = document.getElementById('tsc-res-grand');

  if (btnMine)  btnMine.classList.toggle('active', data.activeMode === 'mine');
  if (btnEqual) {
    btnEqual.classList.toggle('hidden', data.isRemote);
    btnEqual.classList.toggle('active', data.activeMode === 'equal');
  }
  if (btnTable) {
    btnTable.classList.toggle('hidden', data.isRemote);
    btnTable.classList.toggle('active', data.activeMode === 'table');
  }
  if (peopleRow) peopleRow.classList.toggle('hidden', data.isRemote || data.activeMode !== 'equal');
  if (peopleVal) peopleVal.textContent = String(data.peopleCount);

  document.querySelectorAll('#tsc-tip-pills .tsc-tip-btn').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.tip) === data.tipPct);
  });

  if (baseEl) baseEl.textContent = formatMenuPrice(data.baseShown);
  if (tipLblEl) tipLblEl.textContent = `Propina (${data.tipPct}%)`;
  if (tipEl) tipEl.textContent = formatMenuPrice(data.tipAmount);
  if (grandEl) grandEl.textContent = formatMenuPrice(data.grandAmount);

  if (totTitEl && totSubEl) {
    if (data.activeMode === 'equal') {
      totTitEl.textContent = `Toca por persona (÷ ${data.peopleCount})`;
      totSubEl.textContent = `Total mesa con propina: ${formatMenuPrice(data.tableGrandTotal)} MXN`;
    } else if (data.activeMode === 'table') {
      totTitEl.textContent = `Total de ${data.order.table}`;
      totSubEl.textContent = 'Directo en efectivo, terminal o transferencia';
    } else {
      const meName = data.groupInfo.myDiner.guestName || 'tu parte';
      totTitEl.textContent = `Tu cuenta (${meName})`;
      totSubEl.textContent = 'Directo en efectivo, terminal o transferencia';
    }
  }
}

function buildSplitCalculatorShareText() {
  const data = computeTrackerSplitCalcData();
  if (!data) return '';
  const restName = getActiveTenantProfile().displayName || 'Pinch Kitchen+Bar';
  const mesaLabel = data.isRemote ? `Orden #${String(data.order.num).padStart(3, '0')}` : data.order.table;

  if (data.activeMode === 'equal') {
    return `Cuenta ${mesaLabel} · ${restName}\n• Consumo mesa: ${formatMenuPrice(data.tableBase)}\n• Propina (${data.tipPct}%): ${formatMenuPrice(data.tableTipTotal)}\n• Total mesa: ${formatMenuPrice(data.tableGrandTotal)}\n• Dividido entre ${data.peopleCount}: *${formatMenuPrice(data.grandAmount)} c/u*`;
  }
  if (data.activeMode === 'table') {
    const dinersLines = data.groupInfo.diners.length > 1
      ? `\n\nPor persona (sin propina):\n` + data.groupInfo.diners.map(d => `- ${d.guestName}: ${formatMenuPrice(d.total)}`).join('\n')
      : '';
    return `Cuenta Completa ${mesaLabel} · ${restName}\n• Consumo: ${formatMenuPrice(data.baseShown)}\n• Propina (${data.tipPct}%): ${formatMenuPrice(data.tipAmount)}\n• Total: *${formatMenuPrice(data.grandAmount)}*${dinersLines}`;
  }
  const meName = data.groupInfo.myDiner.guestName || 'Mi cuenta';
  return `${meName} (${mesaLabel}) · ${restName}\n• Consumo: ${formatMenuPrice(data.baseShown)}\n• Propina (${data.tipPct}%): ${formatMenuPrice(data.tipAmount)}\n• Total a pagar: *${formatMenuPrice(data.grandAmount)}*`;
}

function copySplitCalculatorSummary() {
  const text = buildSplitCalculatorShareText();
  if (!text) return;
  copyTextWithFallback(text).then(() => {
    hapticTap(8);
    showToast('Desglose de cuenta copiado');
  });
}

function shareSplitCalculatorWhatsApp() {
  const text = buildSplitCalculatorShareText();
  if (!text) return;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  showToast('Resumen listo para enviar');
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

function resetKDSScrollTop() {
  try {
    const scrollers = [
      document.getElementById('kds-unlocked-content'),
      document.getElementById('view-kitchen'),
      document.querySelector('#view-kitchen .dineos-main-stage'),
      document.getElementById('kds-comandas-section'),
      document.getElementById('kds-board-section'),
      document.getElementById('kds-sales-section'),
      document.getElementById('kds-stock-section'),
      document.getElementById('kds-qrs-section'),
      document.scrollingElement,
    ];
    scrollers.forEach(el => {
      if (el && typeof el.scrollTop === 'number') el.scrollTop = 0;
    });
    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  } catch (e) {}
}

function toggleKDSSalesView() {
  setKDSSubView('sales');
}

function toggleKDSStockView() {
  setKDSSubView('stock');
}

function toggleKDSQRsView() {
  setKDSSubView('qrs');
}

function openKDSKanbanBoard() {
  kdsFilter = 'all';
  document.querySelectorAll('.dineos-filters-bar .kds-filter').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === 'all');
  });
  setKDSSubView('board');
}

function setKDSSubView(subView) {
  const valid = ['comandas', 'board', 'sales', 'stock', 'qrs'];
  kdsSubView = valid.includes(subView) ? subView : 'comandas';

  const comandasEl = document.getElementById('kds-comandas-section');
  const boardEl    = document.getElementById('kds-board-section');
  const salesEl    = document.getElementById('kds-sales-section');
  const stockEl    = document.getElementById('kds-stock-section');
  const qrsEl      = document.getElementById('kds-qrs-section');

  const comandasBtn = document.getElementById('btn-kds-comandas');
  const boardBtn    = document.getElementById('btn-rail-board');
  const salesBtn    = document.getElementById('btn-kds-sales');
  const stockBtn    = document.getElementById('btn-kds-stock');
  const qrsBtn      = document.getElementById('btn-kds-qrs');

  if (comandasEl) comandasEl.classList.toggle('hidden', kdsSubView !== 'comandas');
  if (boardEl)    boardEl.classList.toggle('hidden', kdsSubView !== 'board');
  if (salesEl)    salesEl.classList.toggle('hidden', kdsSubView !== 'sales');
  if (stockEl)    stockEl.classList.toggle('hidden', kdsSubView !== 'stock');
  if (qrsEl)      qrsEl.classList.toggle('hidden', kdsSubView !== 'qrs');

  if (comandasBtn) comandasBtn.classList.toggle('active', kdsSubView === 'comandas');
  if (boardBtn)    boardBtn.classList.toggle('active', kdsSubView === 'board');
  if (salesBtn)    salesBtn.classList.toggle('active', kdsSubView === 'sales');
  if (stockBtn)    stockBtn.classList.toggle('active', kdsSubView === 'stock');
  if (qrsBtn)      qrsBtn.classList.toggle('active', kdsSubView === 'qrs');

  const activeMap = {
    comandas: comandasEl,
    board: boardEl,
    sales: salesEl,
    stock: stockEl,
    qrs: qrsEl,
  };
  const activeEl = activeMap[kdsSubView];
  if (activeEl) {
    activeEl.classList.remove('kds-subview-enter');
    void activeEl.offsetWidth;
    activeEl.classList.add('kds-subview-enter');
  }

  resetKDSScrollTop();
  renderKDSServiceAlerts();

  if (kdsSubView === 'sales') {
    setSalesSubTab(salesSubTab, { resetScroll: false });
    renderDailySales();
    renderMonthlyHistory();
    ensureXLSX(); // Precarga la librería de Excel para descargas inmediatas
    const autoChk = document.getElementById('auto-export-shift');
    if (autoChk) autoChk.checked = getAutoExportPreference();
  } else if (kdsSubView === 'stock') {
    setStockSubTab(stockSubTab, { resetScroll: false });
    renderKDSStockPanel();
  } else if (kdsSubView === 'qrs') {
    initQRGeneratorView();
  } else {
    renderKDS();
  }

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(resetKDSScrollTop);
  }
}

// ─── Alertas en Vivo de Mesa (Llamar Mesero / Pedir Cuenta Individual o Grupal) en KDS ──
function renderKDSServiceAlerts() {
  const container = document.getElementById('kds-service-alerts');
  const bellBadge = document.getElementById('dineos-alerts-badge');
  const count = Array.isArray(serviceCalls) ? serviceCalls.length : 0;
  const totalNotifs = count + (Array.isArray(orders) ? orders.length : 0);

  if (bellBadge) {
    bellBadge.textContent = String(totalNotifs);
    bellBadge.classList.toggle('hidden', totalNotifs === 0);
  }

  if (!container) return;

  if (count === 0) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  container.classList.remove('hidden');
  container.innerHTML = serviceCalls.map(call => {
    const isBill = call.type === 'bill';
    let title = `${call.table} · LLAMA AL MESERO`;
    if (isBill) {
      if (call.billScope === 'table') {
        title = `${call.table} · PIDE CUENTA DE TODA LA MESA`;
      } else if (call.guestName) {
        title = `${call.table} (${call.guestName}) · PIDE SU CUENTA INDIVIDUAL`;
      } else {
        title = `${call.table} · PIDE LA CUENTA`;
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
  return PINCH_MENU_CATEGORIES.map(cat => ({
    title: `${cat.title.toUpperCase()} (${PINCH_MENU_ITEMS.filter(i => i.category === cat.id).length})`,
    items: PINCH_MENU_ITEMS
      .filter(i => i.category === cat.id)
      .map(it => ({
        key: `dish:${it.id}`,
        name: `${it.name} · ${formatMenuPrice(it.price)}`,
      })),
  }));
}

// ═══════════════════════════════════════════════════════════════════
//  INVENTARIO INTELIGENTE DE INSUMOS, RECETAS Y CADUCIDADES (PEPS)
//  - Multi-tenant aislado por sucursal (tenantId)
//  - Descuento automático por pedido + devolución al cancelar
//  - Semáforo de frescura / caducidad y Modo 86 Automático
// ═══════════════════════════════════════════════════════════════════
const INVENTORY_SCHEMA_VERSION = 'pinch-v1';

const INVENTORY_RECIPE_META = {
  manual:               { label: 'Insumo manual', unitHint: '', stockKeys: [] },
  pinch_beef_patty:     { label: 'Pinch Burger 8 oz (+ Carne extra)', unitHint: 'burgers', stockKeys: ['dish:pinch_burger'] },
  pinch_angus_steak:    { label: 'Entraña Certified Angus 8 oz (Skirt / Steak n Eggs)', unitHint: 'cortes', stockKeys: ['dish:black_angus_skirt_steak', 'dish:steak_n_eggs'] },
  pinch_ribs_pork:      { label: 'Costillar Baby Back / Panceta BBQ (1× medio · 2× full)', unitHint: 'porciones', stockKeys: ['dish:bbq_baby_back_ribs_half', 'dish:bbq_baby_back_ribs_full', 'dish:bbq_porkbelly'] },
  pinch_chicken_thigh:  { label: 'Muslo de Pollo Frito (Fried Chicken Sandwich)', unitHint: 'sándwiches', stockKeys: ['dish:fried_chicken_sandwich'] },
  pinch_cured_meats:    { label: 'Pavo y Jamón Curados (BLT / Cuban / Croquetas)', unitHint: 'porciones', stockKeys: ['dish:turkey_blt', 'dish:pinch_cuban_sandwich', 'dish:pinch_croquetas'] },
  pinch_seafood:        { label: 'Mariscos (Camarón Patagonia / Mahi Mahi / Bacalao)', unitHint: 'porciones', stockKeys: ['dish:gambas_al_ajillo', 'dish:fried_shrimp', 'dish:mahi_mahi_sandwich', 'dish:croquetas_de_bacalao'] },
  pinch_bacon:          { label: 'Tocino Ahumado (Turkey BLT + Extra Tocino)', unitHint: 'porciones', stockKeys: [] },
  pinch_eggs:           { label: 'Huevos Orgánicos (Brunch + Extra Huevo)', unitHint: 'piezas', stockKeys: ['dish:eggs_any_style'] },
  pinch_brioche:        { label: 'Pan Brioche Artesanal (Burger / Sandwiches / French Toast)', unitHint: 'piezas', stockKeys: ['dish:pinch_burger', 'dish:mahi_mahi_sandwich', 'dish:fried_chicken_sandwich', 'dish:stuffed_french_toast'] },
  pinch_cuban_bread:    { label: 'Pan Cubano Hecho en Casa (BLT / Cuban / Gambas)', unitHint: 'piezas', stockKeys: ['dish:turkey_blt', 'dish:pinch_cuban_sandwich', 'dish:gambas_al_ajillo'] },
  pinch_pasta:          { label: 'Pasta Tagliatelle & Bucatini', unitHint: 'platos', stockKeys: ['dish:tagliatelle_alla_bolognese', 'dish:bucatini_al_pomodoro'] },
  pinch_blue_totopos:   { label: 'Totopos de Maíz Azul (Nachos / K-town Guac)', unitHint: 'porciones', stockKeys: ['dish:pinch_nachos', 'dish:ktown_guac'] },
  pinch_potatoes:       { label: 'Papas Frescas (Fries / House Potatoes / Puré)', unitHint: 'porciones', stockKeys: ['dish:house_cut_french_fries', 'dish:house_potatoes', 'dish:pommes_puree'] },
  pinch_avocado:        { label: 'Aguacate Hass & Guacamole (+ Extra Aguacate)', unitHint: 'porciones', stockKeys: ['dish:ktown_guac'] },
  pinch_cheese:         { label: 'Quesos (Suizo / Parmigiano / Chipotle + Extras)', unitHint: 'porciones', stockKeys: [] },
  pinch_aioli:          { label: 'Alioli Casa, Trufa y Picante (+ Extras)', unitHint: 'porciones', stockKeys: [] },
  pinch_guava_bbq:      { label: 'Salsa BBQ de Guayaba (+ Extra)', unitHint: 'porciones', stockKeys: [] },
  pinch_greens:         { label: 'Arúgula, Lechuga, Coles y Broccolini', unitHint: 'porciones', stockKeys: ['dish:pinch_salad', 'dish:petit_salad', 'dish:broccolini', 'dish:spicy_brussel_sprouts'] },
  pinch_caramel_onion:  { label: 'Cebollas Caramelizadas y al Mojo', unitHint: 'porciones', stockKeys: [] },
  pinch_desserts_base:  { label: 'Repostería Casa (Key Lime / Bread Pudding / Cookie)', unitHint: 'postres', stockKeys: ['dish:key_lime_pie', 'dish:bread_pudding', 'dish:chocolate_chip_cookie'] },
  drink_agua_jamaica:   { label: 'Agua de Jamaica (500 ml)', unitHint: 'vasos', stockKeys: ['dish:agua_jamaica'] },
  drink_agua_horchata:  { label: 'Agua de Horchata (500 ml)', unitHint: 'vasos', stockKeys: ['dish:agua_horchata'] },
  drink_mexican_coke:   { label: 'Mexican Coke (Vidrio 12 oz)', unitHint: 'botellas', stockKeys: ['dish:mexican_coke'] },
  drink_mexican_sprite: { label: 'Mexican Sprite (Vidrio 12 oz)', unitHint: 'botellas', stockKeys: ['dish:mexican_sprite'] },
  drink_saratoga:       { label: 'Saratoga Sparkling Water (12 oz)', unitHint: 'botellas', stockKeys: ['dish:saratoga_sparkling_water'] },
  drink_cans_12oz:      { label: 'Refrescos en Lata 12 oz (Coke / Diet / Sprite)', unitHint: 'latas', stockKeys: ['dish:coke_can_12oz', 'dish:diet_coke_can_12oz', 'dish:sprite_can_12oz'] },
};

const INVENTORY_CATEGORY_META = {
  'Proteínas':         { emoji: 'PR', tone: 'tone-orange' },
  'Panadería y Pastas':{ emoji: 'PP', tone: 'tone-amber' },
  'Verduras y Salsas': { emoji: 'VS', tone: 'tone-sage' },
  'Bebidas':           { emoji: 'BB', tone: 'tone-sky' },
  'Otros':             { emoji: 'OT', tone: 'tone-plum' },
};

let inventoryItems     = [];
let inventoryMovements = [];
let autoMode86Enabled  = true;
let stockSubTab        = 'inventory';
let salesSubTab        = 'overview';
let invActiveFilter    = 'all';
let invSearchQuery     = '';

function offsetDaysISO(deltaDays) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function createDefaultInventoryCatalog() {
  return [
    // Proteínas & Mariscos
    {
      id: 'inv_pinch_beef',
      name: 'Carne Blend Burger 8 oz',
      category: 'Proteínas',
      unit: 'pza',
      stock: 36,
      minStock: 12,
      capacity: 50,
      expiryDate: offsetDaysISO(4),
      lot: 'Cámara Fría A · L-24',
      recipeLink: 'pinch_beef_patty',
      consumptionPerUnit: 1,
    },
    {
      id: 'inv_angus_steak',
      name: 'Entraña Certified Angus 8 oz',
      category: 'Proteínas',
      unit: 'pza',
      stock: 22,
      minStock: 8,
      capacity: 36,
      expiryDate: offsetDaysISO(5),
      lot: 'Angus Reserve · L-11',
      recipeLink: 'pinch_angus_steak',
      consumptionPerUnit: 1,
    },
    {
      id: 'inv_ribs_pork',
      name: 'Costillar Baby Back & Panceta',
      category: 'Proteínas',
      unit: 'pza',
      stock: 28,
      minStock: 10,
      capacity: 40,
      expiryDate: offsetDaysISO(5),
      lot: 'Ahumador · L-08',
      recipeLink: 'pinch_ribs_pork',
      consumptionPerUnit: 1,
    },
    {
      id: 'inv_chicken_thigh',
      name: 'Muslo de Pollo Fresco',
      category: 'Proteínas',
      unit: 'pza',
      stock: 24,
      minStock: 10,
      capacity: 40,
      expiryDate: offsetDaysISO(3),
      lot: 'Avícola Sur · L-19',
      recipeLink: 'pinch_chicken_thigh',
      consumptionPerUnit: 1,
    },
    {
      id: 'inv_cured_meats',
      name: 'Pavo y Jamón Curados en Casa',
      category: 'Proteínas',
      unit: 'g',
      stock: 3200,
      minStock: 1000,
      capacity: 4500,
      expiryDate: offsetDaysISO(6),
      lot: 'Charcutería Pinch · AM',
      recipeLink: 'pinch_cured_meats',
      consumptionPerUnit: 120,
    },
    {
      id: 'inv_seafood',
      name: 'Camarón Patagonia & Mahi Mahi',
      category: 'Proteínas',
      unit: 'pza',
      stock: 14,
      minStock: 16,
      capacity: 40,
      expiryDate: offsetDaysISO(2),
      lot: 'Mariscos Frescos · L-04',
      recipeLink: 'pinch_seafood',
      consumptionPerUnit: 1,
    },
    {
      id: 'inv_bacon',
      name: 'Tocino Ahumado en Manzano',
      category: 'Proteínas',
      unit: 'g',
      stock: 1800,
      minStock: 600,
      capacity: 3000,
      expiryDate: offsetDaysISO(7),
      lot: 'Ahumado · L-31',
      recipeLink: 'pinch_bacon',
      consumptionPerUnit: 45,
    },
    {
      id: 'inv_eggs',
      name: 'Huevos Orgánicos de Granja',
      category: 'Proteínas',
      unit: 'pza',
      stock: 48,
      minStock: 18,
      capacity: 72,
      expiryDate: offsetDaysISO(9),
      lot: 'Granja Local · Caja 2',
      recipeLink: 'pinch_eggs',
      consumptionPerUnit: 1,
    },

    // Panadería y Pastas
    {
      id: 'inv_brioche',
      name: 'Pan Brioche Hecho en Casa',
      category: 'Panadería y Pastas',
      unit: 'pza',
      stock: 42,
      minStock: 16,
      capacity: 60,
      expiryDate: offsetDaysISO(2),
      lot: 'Horno Pinch · Hoy AM',
      recipeLink: 'pinch_brioche',
      consumptionPerUnit: 1,
    },
    {
      id: 'inv_cuban_bread',
      name: 'Pan Cubano Artesanal',
      category: 'Panadería y Pastas',
      unit: 'pza',
      stock: 30,
      minStock: 12,
      capacity: 48,
      expiryDate: offsetDaysISO(3),
      lot: 'Horno Pinch · Hoy AM',
      recipeLink: 'pinch_cuban_bread',
      consumptionPerUnit: 1,
    },
    {
      id: 'inv_pasta',
      name: 'Pasta Tagliatelle & Bucatini',
      category: 'Panadería y Pastas',
      unit: 'g',
      stock: 3600,
      minStock: 1200,
      capacity: 5000,
      expiryDate: offsetDaysISO(25),
      lot: 'Importación Italia · L-12',
      recipeLink: 'pinch_pasta',
      consumptionPerUnit: 160,
    },
    {
      id: 'inv_blue_totopos',
      name: 'Totopos de Maíz Azul',
      category: 'Panadería y Pastas',
      unit: 'g',
      stock: 2400,
      minStock: 800,
      capacity: 3500,
      expiryDate: offsetDaysISO(6),
      lot: 'Freiduría · Lote AM',
      recipeLink: 'pinch_blue_totopos',
      consumptionPerUnit: 120,
    },

    // Verduras, Quesos y Salsas
    {
      id: 'inv_potatoes',
      name: 'Papas Frescas (Corte en Casa)',
      category: 'Verduras y Salsas',
      unit: 'g',
      stock: 12000,
      minStock: 3500,
      capacity: 18000,
      expiryDate: offsetDaysISO(8),
      lot: 'Bodega Seca · Costal 4',
      recipeLink: 'pinch_potatoes',
      consumptionPerUnit: 180,
    },
    {
      id: 'inv_avocado',
      name: 'Aguacate Hass Fresco',
      category: 'Verduras y Salsas',
      unit: 'pza',
      stock: 24,
      minStock: 10,
      capacity: 40,
      expiryDate: offsetDaysISO(1),
      lot: 'Prep Fresco · Caja 1',
      recipeLink: 'pinch_avocado',
      consumptionPerUnit: 0.5,
    },
    {
      id: 'inv_cheese',
      name: 'Quesos (Suizo / Parmigiano / Chipotle)',
      category: 'Verduras y Salsas',
      unit: 'g',
      stock: 2800,
      minStock: 900,
      capacity: 4000,
      expiryDate: offsetDaysISO(10),
      lot: 'Lácteos Frío · L-06',
      recipeLink: 'pinch_cheese',
      consumptionPerUnit: 45,
    },
    {
      id: 'inv_aioli',
      name: 'Alioli de la Casa & Trufa',
      category: 'Verduras y Salsas',
      unit: 'ml',
      stock: 2200,
      minStock: 600,
      capacity: 3000,
      expiryDate: offsetDaysISO(4),
      lot: 'Salsas Frías · Bote 1',
      recipeLink: 'pinch_aioli',
      consumptionPerUnit: 30,
    },
    {
      id: 'inv_guava_bbq',
      name: 'Salsa BBQ de Guayaba Casa',
      category: 'Verduras y Salsas',
      unit: 'ml',
      stock: 1600,
      minStock: 500,
      capacity: 2500,
      expiryDate: offsetDaysISO(7),
      lot: 'Cocina Caliente · L-15',
      recipeLink: 'pinch_guava_bbq',
      consumptionPerUnit: 40,
    },
    {
      id: 'inv_greens',
      name: 'Arúgula, Coles y Broccolini',
      category: 'Verduras y Salsas',
      unit: 'g',
      stock: 1800,
      minStock: 600,
      capacity: 3000,
      expiryDate: offsetDaysISO(3),
      lot: 'Huerta Verde · Mañana',
      recipeLink: 'pinch_greens',
      consumptionPerUnit: 75,
    },
    {
      id: 'inv_caramel_onion',
      name: 'Cebollas Caramelizadas y al Mojo',
      category: 'Verduras y Salsas',
      unit: 'g',
      stock: 1200,
      minStock: 400,
      capacity: 2000,
      expiryDate: offsetDaysISO(4),
      lot: 'Prep Línea · Contenedor 3',
      recipeLink: 'pinch_caramel_onion',
      consumptionPerUnit: 35,
    },

    // Otros / Repostería
    {
      id: 'inv_desserts_base',
      name: 'Repostería Casa (Key Lime / Pudding / Cookie)',
      category: 'Otros',
      unit: 'pza',
      stock: 24,
      minStock: 8,
      capacity: 36,
      expiryDate: offsetDaysISO(3),
      lot: 'Pastelería Pinch · Hoy',
      recipeLink: 'pinch_desserts_base',
      consumptionPerUnit: 1,
    },

    // Bebidas (Aguas Frescas conservadas + 6 bebidas del menú Pinch)
    {
      id: 'inv_jamaica',
      name: 'Agua de Jamaica (Lista)',
      category: 'Bebidas',
      unit: 'ml',
      stock: 3500,
      minStock: 4000,
      capacity: 10000,
      expiryDate: offsetDaysISO(2),
      lot: 'Vitrolero 1 · Hoy',
      recipeLink: 'drink_agua_jamaica',
      consumptionPerUnit: 500,
    },
    {
      id: 'inv_horchata',
      name: 'Agua de Horchata (Lista)',
      category: 'Bebidas',
      unit: 'ml',
      stock: 6500,
      minStock: 3000,
      capacity: 10000,
      expiryDate: offsetDaysISO(3),
      lot: 'Vitrolero 2 · Hoy',
      recipeLink: 'drink_agua_horchata',
      consumptionPerUnit: 500,
    },
    {
      id: 'inv_mexican_coke',
      name: 'Mexican Coke (Vidrio 12 oz)',
      category: 'Bebidas',
      unit: 'pza',
      stock: 32,
      minStock: 12,
      capacity: 48,
      expiryDate: offsetDaysISO(90),
      lot: 'Enfriador Barra · Reja 1',
      recipeLink: 'drink_mexican_coke',
      consumptionPerUnit: 1,
    },
    {
      id: 'inv_mexican_sprite',
      name: 'Mexican Sprite (Vidrio 12 oz)',
      category: 'Bebidas',
      unit: 'pza',
      stock: 24,
      minStock: 10,
      capacity: 48,
      expiryDate: offsetDaysISO(90),
      lot: 'Enfriador Barra · Reja 2',
      recipeLink: 'drink_mexican_sprite',
      consumptionPerUnit: 1,
    },
    {
      id: 'inv_saratoga',
      name: 'Saratoga Sparkling Water (12 oz)',
      category: 'Bebidas',
      unit: 'pza',
      stock: 28,
      minStock: 10,
      capacity: 48,
      expiryDate: offsetDaysISO(120),
      lot: 'Enfriador Barra · Reja 3',
      recipeLink: 'drink_saratoga',
      consumptionPerUnit: 1,
    },
    {
      id: 'inv_cans_12oz',
      name: 'Refrescos en Lata 12 oz (Coke / Diet / Sprite)',
      category: 'Bebidas',
      unit: 'pza',
      stock: 48,
      minStock: 18,
      capacity: 72,
      expiryDate: offsetDaysISO(120),
      lot: 'Enfriador Barra · Pack Latas',
      recipeLink: 'drink_cans_12oz',
      consumptionPerUnit: 1,
    },
  ];
}

function persistInventory() {
  try {
    localStorage.setItem(storageKey('inventory-schema-ver'), INVENTORY_SCHEMA_VERSION);
    localStorage.setItem(storageKey('inventory-items'), JSON.stringify(inventoryItems));
    localStorage.setItem(storageKey('inventory-movements'), JSON.stringify(inventoryMovements.slice(0, 30)));
    localStorage.setItem(storageKey('inventory-auto86'), autoMode86Enabled ? '1' : '0');
  } catch (e) {}
}

function isLegacyTacoHotdogInventory(items) {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.some(it => {
    const id = String(it && it.id || '');
    const rl = String(it && it.recipeLink || '');
    return ['inv_tortillas', 'inv_bistec', 'inv_longaniza', 'inv_pan_hotdog', 'inv_salchicha'].includes(id)
      || rl.startsWith('taco_')
      || rl.startsWith('hotdog_');
  });
}

function loadPersistedInventory() {
  try {
    const schemaVer = localStorage.getItem(storageKey('inventory-schema-ver'));
    const rawItems  = localStorage.getItem(storageKey('inventory-items'));
    const rawMoves  = localStorage.getItem(storageKey('inventory-movements'));
    const rawAuto   = localStorage.getItem(storageKey('inventory-auto86'));
    let parsed      = rawItems !== null ? JSON.parse(rawItems) : null;

    if (!Array.isArray(parsed) || schemaVer !== INVENTORY_SCHEMA_VERSION || isLegacyTacoHotdogInventory(parsed)) {
      inventoryItems = createDefaultInventoryCatalog();
      inventoryMovements = [];
      autoMode86Enabled = rawAuto === null ? true : rawAuto === '1';
      // Limpiar claves obsoletas de tacos/hotdogs en soldOutItems
      if (Array.isArray(soldOutItems)) {
        soldOutItems = soldOutItems.filter(k => String(k || '').startsWith('dish:'));
      }
      persistInventory();
      return;
    }

    inventoryItems = parsed;
    inventoryMovements = rawMoves ? JSON.parse(rawMoves) : [];
    if (!Array.isArray(inventoryMovements)) inventoryMovements = [];
    autoMode86Enabled = rawAuto === null ? true : rawAuto === '1';
  } catch (e) {
    inventoryItems = createDefaultInventoryCatalog();
    inventoryMovements = [];
    autoMode86Enabled = true;
  }
}

function formatQtyUnit(val, unit) {
  const num = Math.round((Number(val) || 0) * 100) / 100;
  return `${num.toLocaleString('es-MX')} ${unit || ''}`.trim();
}

function getExpiryMeta(expiryDateStr) {
  if (!expiryDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(expiryDateStr)) {
    return { daysLeft: null, status: 'none', label: 'Sin caducidad', tone: 'neutral' };
  }
  const [y, m, d] = expiryDateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d, 0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (daysLeft < 0) {
    const ago = Math.abs(daysLeft);
    return {
      daysLeft,
      status: 'expired',
      label: ago === 1 ? 'Caducó ayer' : `Caducó hace ${ago} días`,
      tone: 'red',
    };
  }
  if (daysLeft === 0) {
    return { daysLeft: 0, status: 'expired', label: 'Caduca hoy · Revisar', tone: 'red' };
  }
  if (daysLeft === 1) {
    return { daysLeft: 1, status: 'expiring_soon', label: 'Caduca mañana', tone: 'amber' };
  }
  if (daysLeft <= 3) {
    return { daysLeft, status: 'expiring_soon', label: `Caduca en ${daysLeft} días`, tone: 'amber' };
  }
  return { daysLeft, status: 'fresh', label: `Vigente · ${daysLeft} días`, tone: 'sage' };
}

function getEstimatedServings(item) {
  const perUnit = Number(item.consumptionPerUnit) || 0;
  if (perUnit <= 0 || !item.recipeLink || item.recipeLink === 'manual') return null;
  const stock = Math.max(0, Number(item.stock) || 0);
  return Math.floor(stock / perUnit);
}

function getInventoryItemHealth(item) {
  const stock = Math.max(0, Number(item.stock) || 0);
  const minStock = Math.max(0, Number(item.minStock) || 0);
  const cap = Math.max(Number(item.capacity) || 0, minStock * 2.5, stock, 1);
  const pct = Math.min(100, Math.max(0, Math.round((stock / cap) * 100)));
  const minPct = Math.min(95, Math.max(5, Math.round((minStock / cap) * 100)));
  const expiry = getExpiryMeta(item.expiryDate);
  const servings = getEstimatedServings(item);

  let status = 'ok';
  if (stock <= 0) status = 'out';
  else if (stock <= minStock) status = 'low';

  const needsRestock = status === 'out' || status === 'low';
  const needsExpiryAction = expiry.status === 'expired' || expiry.status === 'expiring_soon';
  const suggestedOrderQty = needsRestock ? Math.max(1, Math.round(cap - stock)) : 0;

  return {
    status,
    pct,
    minPct,
    servings,
    expiry,
    needsRestock,
    needsExpiryAction,
    suggestedOrderQty,
  };
}

function matchOrderItemToRecipeMultiplier(orderItem, recipeLink) {
  if (!orderItem || !recipeLink || recipeLink === 'manual') return 0;
  const qty = Math.max(0, Number(orderItem.qty) || 0);
  if (qty === 0) return 0;

  const rawKey = String(orderItem.key || '').toLowerCase();
  const dishId = orderItem.dishId
    || (rawKey.startsWith('dish:') ? rawKey.slice(5).split('|')[0] : '');
  const nameNorm = normalizeSpanishQuery(orderItem.name || '');

  const extrasIds = Array.isArray(orderItem.extras)
    ? orderItem.extras.map(e => String(e && e.id || '').toLowerCase()).filter(Boolean)
    : [];
  const removedNorm = Array.isArray(orderItem.removed)
    ? orderItem.removed.map(r => normalizeSpanishQuery(r))
    : [];

  const hasRemoved = (...patterns) => removedNorm.some(r => patterns.some(p => r.includes(p)));
  const countExtra = (...ids) => extrasIds.filter(id => ids.includes(id)).length;

  switch (recipeLink) {
    case 'pinch_beef_patty': {
      let units = (dishId === 'pinch_burger' || nameNorm.includes('pinch burger')) ? 1 : 0;
      units += countExtra('extra_patty');
      return qty * units;
    }
    case 'pinch_angus_steak':
      return (['black_angus_skirt_steak', 'steak_n_eggs'].includes(dishId)) ? qty : 0;
    case 'pinch_ribs_pork': {
      if (dishId === 'bbq_baby_back_ribs_full') return qty * 2;
      if (dishId === 'bbq_baby_back_ribs_half' || dishId === 'bbq_porkbelly') return qty;
      return 0;
    }
    case 'pinch_chicken_thigh':
      return dishId === 'fried_chicken_sandwich' ? qty : 0;
    case 'pinch_cured_meats':
      return ['turkey_blt', 'pinch_cuban_sandwich', 'pinch_croquetas'].includes(dishId) ? qty : 0;
    case 'pinch_seafood': {
      let units = ['gambas_al_ajillo', 'fried_shrimp', 'mahi_mahi_sandwich', 'croquetas_de_bacalao'].includes(dishId) ? 1 : 0;
      units += countExtra('shrimp');
      return qty * units;
    }
    case 'pinch_bacon': {
      let units = (dishId === 'turkey_blt' && !hasRemoved('tocino')) ? 1 : 0;
      units += countExtra('bacon');
      return qty * units;
    }
    case 'pinch_eggs': {
      let units = (dishId === 'eggs_any_style' || dishId === 'steak_n_eggs') ? 2 : 0;
      units += countExtra('fried_egg');
      return qty * units;
    }
    case 'pinch_brioche':
      return ['pinch_burger', 'mahi_mahi_sandwich', 'fried_chicken_sandwich', 'stuffed_french_toast'].includes(dishId) ? qty : 0;
    case 'pinch_cuban_bread':
      return ['turkey_blt', 'pinch_cuban_sandwich', 'gambas_al_ajillo'].includes(dishId) ? qty : 0;
    case 'pinch_pasta':
      return ['tagliatelle_alla_bolognese', 'bucatini_al_pomodoro'].includes(dishId) ? qty : 0;
    case 'pinch_blue_totopos':
      return ['pinch_nachos', 'ktown_guac'].includes(dishId) ? qty : 0;
    case 'pinch_potatoes': {
      const sidePotatoes = ['house_cut_french_fries', 'house_potatoes', 'pommes_puree'].includes(dishId);
      const includedFries = ['pinch_burger', 'impossible_vegan_burger', 'mahi_mahi_sandwich', 'fried_chicken_sandwich', 'eggs_any_style', 'steak_n_eggs', 'bbq_baby_back_ribs_half', 'bbq_baby_back_ribs_full'].includes(dishId);
      if (sidePotatoes) return qty;
      if (includedFries && !hasRemoved('papas')) return qty;
      return 0;
    }
    case 'pinch_avocado': {
      let units = 0;
      if (dishId === 'ktown_guac') units += 1;
      else if (dishId === 'impossible_vegan_burger' && !hasRemoved('guacamole', 'aguacate')) units += 1;
      units += countExtra('avocado', 'guacamole');
      return qty * units;
    }
    case 'pinch_cheese': {
      let units = 0;
      const baseCheeseDishes = ['pinch_burger', 'pinch_cuban_sandwich', 'pinch_salad', 'pinch_nachos', 'tagliatelle_alla_bolognese', 'bucatini_al_pomodoro', 'stuffed_french_toast'];
      if (baseCheeseDishes.includes(dishId) && !hasRemoved('queso', 'parmigiano')) units += 1;
      units += countExtra('swiss_cheese', 'cheddar_cheese', 'parmesan', 'chipotle_cheese');
      return qty * units;
    }
    case 'pinch_aioli': {
      let units = 0;
      const baseAioliDishes = ['pinch_croquetas', 'croquetas_de_bacalao', 'fried_shrimp', 'turkey_blt', 'pinch_cuban_sandwich', 'pinch_burger', 'fried_chicken_sandwich'];
      if (baseAioliDishes.includes(dishId) && !hasRemoved('alioli')) units += 1;
      units += countExtra('aioli', 'truffle_aioli', 'spicy_aioli');
      return qty * units;
    }
    case 'pinch_guava_bbq': {
      let units = 0;
      if (['bbq_porkbelly', 'bbq_baby_back_ribs_half', 'bbq_baby_back_ribs_full'].includes(dishId) && !hasRemoved('bbq', 'guayaba')) units += 1;
      units += countExtra('guava_bbq');
      return qty * units;
    }
    case 'pinch_greens': {
      if (['pinch_salad', 'petit_salad', 'broccolini', 'spicy_brussel_sprouts', 'black_angus_skirt_steak'].includes(dishId)) return qty;
      const hasLettuceBase = ['turkey_blt', 'pinch_cuban_sandwich', 'pinch_burger', 'impossible_vegan_burger', 'mahi_mahi_sandwich', 'fried_chicken_sandwich'].includes(dishId);
      if (hasLettuceBase && !hasRemoved('lechuga')) return qty;
      return 0;
    }
    case 'pinch_caramel_onion': {
      const baseOnionDishes = ['pinch_burger', 'bbq_porkbelly', 'fried_chicken_sandwich', 'pinch_nachos'];
      if (baseOnionDishes.includes(dishId) && !hasRemoved('cebolla')) return qty;
      return 0;
    }
    case 'pinch_desserts_base':
      return ['key_lime_pie', 'bread_pudding', 'chocolate_chip_cookie'].includes(dishId) ? qty : 0;
    case 'drink_agua_jamaica':
      return (dishId === 'agua_jamaica' || rawKey === 'drink_jamaica' || nameNorm.includes('jamaica')) ? qty : 0;
    case 'drink_agua_horchata':
      return (dishId === 'agua_horchata' || rawKey === 'drink_horchata' || nameNorm.includes('horchata')) ? qty : 0;
    case 'drink_mexican_coke':
      return (dishId === 'mexican_coke' || nameNorm.includes('mexican coke')) ? qty : 0;
    case 'drink_mexican_sprite':
      return (dishId === 'mexican_sprite' || nameNorm.includes('mexican sprite')) ? qty : 0;
    case 'drink_saratoga':
      return (dishId === 'saratoga_sparkling_water' || nameNorm.includes('saratoga')) ? qty : 0;
    case 'drink_cans_12oz':
      return (['coke_can_12oz', 'diet_coke_can_12oz', 'sprite_can_12oz'].includes(dishId) || nameNorm.includes('can 12oz')) ? qty : 0;
    default:
      return 0;
  }
}

function computeOrderIngredientConsumption(order) {
  const items = Array.isArray(order && order.items) ? order.items : [];
  const deductions = [];

  inventoryItems.forEach(inv => {
    const perUnit = Number(inv.consumptionPerUnit) || 0;
    if (perUnit <= 0 || !inv.recipeLink || inv.recipeLink === 'manual') return;

    let totalMultiplier = 0;
    items.forEach(orderItem => {
      totalMultiplier += matchOrderItemToRecipeMultiplier(orderItem, inv.recipeLink);
    });

    if (totalMultiplier > 0) {
      const amount = Math.round(totalMultiplier * perUnit * 100) / 100;
      deductions.push({
        itemId: inv.id,
        name: inv.name,
        unit: inv.unit,
        amount,
      });
    }
  });

  return deductions;
}

function deductInventoryForOrder(order, { silent = false } = {}) {
  if (!order || order.inventoryDeducted) return [];
  const deductions = computeOrderIngredientConsumption(order);
  order.inventoryDeducted = true;
  if (deductions.length === 0) return [];

  const depletedNames = [];
  deductions.forEach(d => {
    const inv = inventoryItems.find(x => x.id === d.itemId);
    if (!inv) return;
    inv.stock = Math.max(0, Math.round(((Number(inv.stock) || 0) - d.amount) * 100) / 100);
    if (inv.stock <= 0) depletedNames.push(inv.name);
  });

  const summary = deductions.map(d => `−${formatQtyUnit(d.amount, d.unit)} ${d.name}`).join(' · ');
  inventoryMovements.unshift({
    id: Date.now() + Math.floor(Math.random() * 1000),
    type: 'deduct',
    ts: Date.now(),
    title: `Orden #${String(order.num || 0).padStart(3, '0')} · ${order.table || 'Pedido'}`,
    detail: summary,
  });
  if (inventoryMovements.length > 30) inventoryMovements.length = 30;

  syncAutoMode86FromInventory({ notify: !silent });
  persistInventory();
  publishCloudSync('INVENTORY_UPDATE', { inventoryItems, inventoryMovements, autoMode86Enabled });

  if (!silent && depletedNames.length > 0 && kdsUnlocked) {
    showKDSToast(`Stock agotado: ${depletedNames.join(', ')}`);
  }
  return deductions;
}

function restoreInventoryForOrder(order) {
  if (!order || !order.inventoryDeducted) return;
  const deductions = computeOrderIngredientConsumption(order);
  order.inventoryDeducted = false;
  if (deductions.length === 0) return;

  deductions.forEach(d => {
    const inv = inventoryItems.find(x => x.id === d.itemId);
    if (!inv) return;
    inv.stock = Math.round(((Number(inv.stock) || 0) + d.amount) * 100) / 100;
  });

  const summary = deductions.map(d => `+${formatQtyUnit(d.amount, d.unit)} ${d.name}`).join(' · ');
  inventoryMovements.unshift({
    id: Date.now() + Math.floor(Math.random() * 1000),
    type: 'restock',
    ts: Date.now(),
    title: `Cancelación #${String(order.num || 0).padStart(3, '0')} (Devolución)`,
    detail: summary,
  });
  if (inventoryMovements.length > 30) inventoryMovements.length = 30;

  syncAutoMode86FromInventory({ notify: false });
  persistInventory();
  publishCloudSync('INVENTORY_UPDATE', { inventoryItems, inventoryMovements, autoMode86Enabled });
}

function syncAutoMode86FromInventory({ notify = false } = {}) {
  if (!autoMode86Enabled) return false;
  let changed = false;

  // Agrupar insumos vinculados por stockKeys del menú Pinch (cada insumo puede alimentar varios platillos)
  const byStockKey = new Map();
  inventoryItems.forEach(inv => {
    const meta = INVENTORY_RECIPE_META[inv.recipeLink];
    if (!meta) return;
    const keys = Array.isArray(meta.stockKeys)
      ? meta.stockKeys
      : (meta.stockKey ? [meta.stockKey] : []);
    keys.forEach(stockKey => {
      const arr = byStockKey.get(stockKey) || [];
      arr.push(inv);
      byStockKey.set(stockKey, arr);
    });
  });

  byStockKey.forEach((itemsForKey, stockKey) => {
    const anyUnavailable = itemsForKey.some(inv => {
      const h = getInventoryItemHealth(inv);
      return h.status === 'out' || h.expiry.status === 'expired';
    });
    const currentlyOut = soldOutItems.includes(stockKey);
    if (anyUnavailable && !currentlyOut) {
      soldOutItems.push(stockKey);
      changed = true;
    } else if (!anyUnavailable && currentlyOut) {
      soldOutItems = soldOutItems.filter(k => k !== stockKey);
      changed = true;
    }
  });

  if (changed) {
    persistOrders();
    publishCloudSync('STOCK_UPDATE', { soldOutItems });
    sanitizeDraftAgainstStock();
    if (currentView === 'client') {
      renderPinchMenu();
      if (pinchDetailDishId && typeof refreshDishDetailStockState === 'function') {
        refreshDishDetailStockState();
      }
      renderDrinksSection();
      if (currentStation) renderBuilderWorkspace();
    }
    if (notify && kdsUnlocked) {
      showKDSToast('Modo 86 sincronizado con el inventario');
    }
  }
  return changed;
}

function setSalesSubTab(tab, opts = {}) {
  const validTabs = ['overview', 'categories', 'excel', 'history'];
  salesSubTab = validTabs.includes(tab) ? tab : 'overview';

  const panes = {
    overview:   document.getElementById('sales-pane-overview'),
    categories: document.getElementById('sales-pane-categories'),
    excel:      document.getElementById('sales-pane-excel'),
    history:    document.getElementById('sales-pane-history'),
  };
  const btns = {
    overview:   document.getElementById('btn-sales-tab-overview'),
    categories: document.getElementById('btn-sales-tab-categories'),
    excel:      document.getElementById('btn-sales-tab-excel'),
    history:    document.getElementById('btn-sales-tab-history'),
  };

  validTabs.forEach(t => {
    if (panes[t]) panes[t].classList.toggle('hidden', salesSubTab !== t);
    if (btns[t])  btns[t].classList.toggle('active', salesSubTab === t);
  });

  if (opts.resetScroll !== false) resetKDSScrollTop();
}

function setStockSubTab(tab, opts = {}) {
  const validTabs = ['inventory', 'alerts', 'mode86', 'movements'];
  stockSubTab = validTabs.includes(tab) ? tab : 'inventory';

  const panes = {
    inventory: document.getElementById('stock-inventory-pane'),
    alerts:    document.getElementById('stock-alerts-pane'),
    mode86:    document.getElementById('stock-mode86-pane'),
    movements: document.getElementById('stock-movements-pane'),
  };
  const btns = {
    inventory: document.getElementById('btn-stock-tab-inventory'),
    alerts:    document.getElementById('btn-stock-tab-alerts'),
    mode86:    document.getElementById('btn-stock-tab-mode86'),
    movements: document.getElementById('btn-stock-tab-movements'),
  };

  validTabs.forEach(t => {
    if (panes[t]) panes[t].classList.toggle('hidden', stockSubTab !== t);
    if (btns[t])  btns[t].classList.toggle('active', stockSubTab === t);
  });

  if (opts.resetScroll !== false) resetKDSScrollTop();
}

function toggleAutoMode86(enabled) {
  autoMode86Enabled = Boolean(enabled);
  persistInventory();
  if (autoMode86Enabled) {
    syncAutoMode86FromInventory({ notify: false });
  }
  publishCloudSync('INVENTORY_UPDATE', { inventoryItems, inventoryMovements, autoMode86Enabled });
  renderKDSStockPanel();
  showKDSToast(autoMode86Enabled ? 'Auto-86 activado · Sincroniza menú al agotarse' : 'Auto-86 desactivado (modo manual)');
}

function setInventoryFilter(filter) {
  invActiveFilter = filter || 'all';
  if (stockSubTab !== 'inventory') setStockSubTab('inventory');
  document.querySelectorAll('#inv-filter-pills .kds-filter').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.invFilter === invActiveFilter);
  });
  renderInventoryDashboard();
}

function onInventorySearchInput(val) {
  invSearchQuery = String(val || '').trim().toLowerCase();
  renderInventoryDashboard();
}

function renderInventoryDashboard() {
  const gridEl = document.getElementById('inventory-cards-grid');
  if (!gridEl) return;

  const autoChk = document.getElementById('stock-auto86-checkbox');
  if (autoChk) autoChk.checked = autoMode86Enabled;
  setStockSubTab(stockSubTab, { resetScroll: false });

  // Calcular KPIs y alertas de todos los insumos
  const enriched = inventoryItems.map(item => ({ item, health: getInventoryItemHealth(item) }));
  const totalCount = enriched.length;
  const restockList = enriched.filter(e => e.health.needsRestock);
  const expiryList  = enriched.filter(e => e.health.needsExpiryAction);
  const healthyCount = enriched.filter(e => !e.health.needsRestock && !e.health.needsExpiryAction).length;
  const healthPct = totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 100;
  const linkedCount = enriched.filter(e => e.item.recipeLink && e.item.recipeLink !== 'manual').length;
  const deductCount = inventoryMovements.filter(m => m.type === 'deduct').length;

  const kpiTotal = document.getElementById('inv-kpi-total');
  const kpiHealthSub = document.getElementById('inv-kpi-healthy-sub');
  const kpiHealthPct = document.getElementById('inv-kpi-health-pct');
  const kpiHealthBar = document.getElementById('inv-kpi-health-bar');
  const kpiLow = document.getElementById('inv-kpi-low');
  const kpiLowSub = document.getElementById('inv-kpi-low-sub');
  const kpiExp = document.getElementById('inv-kpi-expiring');
  const kpiExpSub = document.getElementById('inv-kpi-exp-sub');
  const kpiDeduct = document.getElementById('inv-kpi-deductions');
  const kpiLinked = document.getElementById('inv-kpi-linked-sub');

  if (kpiTotal) kpiTotal.textContent = String(totalCount);
  if (kpiHealthSub) kpiHealthSub.textContent = `${healthyCount} en nivel óptimo`;
  if (kpiHealthPct) kpiHealthPct.textContent = `${healthPct}%`;
  if (kpiHealthBar) kpiHealthBar.style.width = `${healthPct}%`;
  if (kpiLow) kpiLow.textContent = String(restockList.length);
  if (kpiLowSub) {
    const outCnt = enriched.filter(e => e.health.status === 'out').length;
    kpiLowSub.textContent = outCnt > 0 ? `${outCnt} agotados · ${restockList.length - outCnt} bajos` : (restockList.length > 0 ? 'Bajo stock mínimo' : 'Todo abastecido');
  }
  if (kpiExp) kpiExp.textContent = String(expiryList.length);
  if (kpiExpSub) {
    const expNow = enriched.filter(e => e.health.expiry.status === 'expired').length;
    kpiExpSub.textContent = expNow > 0 ? `${expNow} vencidos · ${expiryList.length - expNow} próximos` : (expiryList.length > 0 ? 'Vencen en ≤ 3 días' : 'Frescura óptima');
  }
  if (kpiDeduct) kpiDeduct.textContent = deductCount === 1 ? '1 orden' : `${deductCount} órdenes`;
  if (kpiLinked) kpiLinked.textContent = `${linkedCount} insumos ligados a receta`;

  // Contadores de filtros
  const cntAll = document.getElementById('inv-cnt-all');
  const cntRestock = document.getElementById('inv-cnt-restock');
  const cntExpiry = document.getElementById('inv-cnt-expiry');
  if (cntAll) cntAll.textContent = String(totalCount);
  if (cntRestock) cntRestock.textContent = String(restockList.length);
  if (cntExpiry) cntExpiry.textContent = String(expiryList.length);

  // Tarjeta de Alertas Inteligentes (Compras & Caducidades)
  const alertsCard = document.getElementById('inv-urgent-alerts-card');
  const alertsListEl = document.getElementById('inv-urgent-alerts-list');
  const alertsBadgeEl = document.getElementById('inv-tab-alerts-badge');
  const urgentItems = enriched.filter(e => e.health.needsRestock || e.health.needsExpiryAction);

  if (alertsBadgeEl) {
    alertsBadgeEl.textContent = String(urgentItems.length);
    alertsBadgeEl.classList.toggle('hidden', urgentItems.length === 0);
  }

  if (alertsCard && alertsListEl) {
    alertsCard.classList.remove('hidden');
    if (urgentItems.length === 0) {
      alertsListEl.innerHTML = `<p class="recent-empty-msg">✓ Todo el inventario está en nivel óptimo y vigente. Sin compras ni caducidades urgentes.</p>`;
    } else {
      alertsListEl.innerHTML = urgentItems.map(({ item, health }) => {
        const isCrit = health.status === 'out' || health.expiry.status === 'expired';
        const reasons = [];
        if (health.status === 'out') reasons.push('Agotado (0 restante)');
        else if (health.status === 'low') reasons.push(`Stock bajo: ${formatQtyUnit(item.stock, item.unit)} (mín. ${formatQtyUnit(item.minStock, item.unit)})`);
        if (health.servings !== null && health.needsRestock) {
          const uHint = INVENTORY_RECIPE_META[item.recipeLink]?.unitHint || 'porciones';
          reasons.push(`alcanza ~${health.servings} ${uHint}`);
        }
        if (health.expiry.status === 'expired' || health.expiry.status === 'expiring_soon') {
          reasons.push(health.expiry.label);
        }
        return `
          <div class="inv-alert-row ${isCrit ? 'is-critical' : 'is-warn'}">
            <div class="inv-alert-dot ${isCrit ? 'dot-red' : 'dot-amber'}"></div>
            <div class="inv-alert-texts">
              <span class="inv-alert-name">${escapeHTML(item.name)}</span>
              <span class="inv-alert-desc">${escapeHTML(reasons.join(' · '))}${health.suggestedOrderQty > 0 ? ` · Sugerido pedir: +${formatQtyUnit(health.suggestedOrderQty, item.unit)}` : ''}</span>
            </div>
            <button type="button" class="btn-inv-quick-action" onclick="openInventoryRestockModal('${item.id}', 'in')">
              + Reabastecer
            </button>
          </div>
        `;
      }).join('');
    }
  }

  // Filtrado de tarjetas
  let visible = enriched;
  if (invActiveFilter === 'restock') visible = visible.filter(e => e.health.needsRestock);
  else if (invActiveFilter === 'expiry') visible = visible.filter(e => e.health.needsExpiryAction);
  else if (invActiveFilter !== 'all') visible = visible.filter(e => e.item.category === invActiveFilter);

  if (invSearchQuery) {
    visible = visible.filter(({ item }) => {
      const hay = `${item.name} ${item.category} ${item.lot || ''} ${item.recipeLink || ''}`.toLowerCase();
      return hay.includes(invSearchQuery);
    });
  }

  if (visible.length === 0) {
    gridEl.innerHTML = `
      <div class="kds-empty inv-empty-state">
        <div class="kds-empty-icon">${uiIcon('box', 'xl')}</div>
        <p class="kds-empty-title">Sin insumos en esta vista</p>
        <p class="kds-empty-sub">Agrega un nuevo insumo o cambia el filtro para ver todo tu inventario.</p>
        <button type="button" class="btn-kds-empty-action" onclick="openInventoryModal()">+ Agregar Insumo</button>
      </div>
    `;
  } else {
    gridEl.innerHTML = visible.map(({ item, health }) => {
      const catMeta = INVENTORY_CATEGORY_META[item.category] || INVENTORY_CATEGORY_META['Otros'];
      const recipeMeta = INVENTORY_RECIPE_META[item.recipeLink] || INVENTORY_RECIPE_META.manual;
      const statusLabel = health.status === 'out' ? 'Agotado' : (health.status === 'low' ? 'Stock Bajo' : 'Óptimo');
      const statusCls = health.status === 'out' ? 'st-out' : (health.status === 'low' ? 'st-low' : 'st-ok');
      const servingsText = health.servings !== null
        ? `~${health.servings} ${recipeMeta.unitHint || 'porciones'}`
        : 'Control manual';
      const recipeLine = (item.recipeLink && item.recipeLink !== 'manual' && Number(item.consumptionPerUnit) > 0)
        ? `Receta: −${formatQtyUnit(item.consumptionPerUnit, item.unit)} / ${recipeMeta.label}`
        : 'Sin descuento automático de receta';

      return `
        <div class="inv-item-card ${statusCls}">
          <div class="inv-card-top">
            <div class="inv-card-title-group">
              <span class="sales-prod-icon-circle ${catMeta.tone}">${catMeta.emoji}</span>
              <div class="inv-card-titles">
                <h4 class="inv-item-name">${escapeHTML(item.name)}</h4>
                <span class="inv-item-meta">${escapeHTML(item.category)}${item.lot ? ` · ${escapeHTML(item.lot)}` : ''}</span>
              </div>
            </div>
            <span class="inv-status-pill ${statusCls}">${statusLabel}</span>
          </div>

          <div class="inv-stock-readout-row">
            <div class="inv-stock-big">
              <span class="inv-stock-value">${formatQtyUnit(item.stock, item.unit)}</span>
              <span class="inv-stock-min">Mínimo: ${formatQtyUnit(item.minStock, item.unit)}</span>
            </div>
            <div class="inv-badges-col">
              <span class="inv-servings-pill">${escapeHTML(servingsText)}</span>
              <span class="inv-expiry-pill exp-${health.expiry.tone}">${escapeHTML(health.expiry.label)}</span>
            </div>
          </div>

          <div class="inv-bar-wrap">
            <div class="inv-bar-track">
              <div class="inv-bar-fill ${statusCls}" style="width:${health.pct}%"></div>
              <span class="inv-bar-min-mark" style="left:${health.minPct}%" title="Nivel mínimo de alerta"></span>
            </div>
          </div>

          <div class="inv-recipe-strip">
            <span>${escapeHTML(recipeLine)}</span>
          </div>

          <div class="inv-card-actions">
            <button type="button" class="inv-act-btn primary" onclick="openInventoryRestockModal('${item.id}', 'in')">+ Entrada</button>
            <button type="button" class="inv-act-btn warn" onclick="openInventoryRestockModal('${item.id}', 'waste')">− Merma</button>
            <button type="button" class="inv-act-btn" onclick="openInventoryModal('${item.id}')">Editar</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Registro reciente de movimientos
  const logEl = document.getElementById('inventory-movements-list');
  if (logEl) {
    if (inventoryMovements.length === 0) {
      logEl.innerHTML = '<p class="recent-empty-msg">Los descuentos aparecerán aquí automáticamente cada vez que llegue un pedido o registres una entrada/merma.</p>';
    } else {
      logEl.innerHTML = inventoryMovements.slice(0, 10).map(mv => {
        const tone = mv.type === 'restock' ? 'tone-sage' : (mv.type === 'waste' ? 'tone-amber' : 'tone-orange');
        const icon = mv.type === 'restock' ? '+' : (mv.type === 'waste' ? '!' : '−');
        return `
          <div class="recent-diner-row">
            <div class="order-avatar ${tone}">${icon}</div>
            <div class="recent-diner-info">
              <span class="recent-diner-name">${escapeHTML(mv.title)}</span>
              <span class="recent-diner-sub">${escapeHTML(mv.detail)}</span>
            </div>
            <span class="recent-diner-time">${localTimeLabel(mv.ts || Date.now())}</span>
          </div>
        `;
      }).join('');
    }
  }
}

function populateInventoryRecipeSelectOptions() {
  const sel = document.getElementById('inv-recipe-link-input');
  if (!sel) return;
  sel.innerHTML = Object.entries(INVENTORY_RECIPE_META).map(([key, meta]) => {
    return `<option value="${key}">${escapeHTML(meta.label)}</option>`;
  }).join('');
}

function openInventoryModal(itemId = null) {
  const overlay = document.getElementById('inv-modal-overlay');
  const modal   = document.getElementById('inventory-item-modal');
  const titleEl = document.getElementById('inv-modal-title');
  const delBtn  = document.getElementById('btn-inv-delete');
  if (!overlay || !modal) return;

  populateInventoryRecipeSelectOptions();
  const existing = itemId ? inventoryItems.find(i => i.id === itemId) : null;
  document.getElementById('inv-edit-id').value = existing ? existing.id : '';
  document.getElementById('inv-name-input').value = existing ? existing.name : '';
  document.getElementById('inv-category-input').value = existing ? (INVENTORY_CATEGORY_META[existing.category] ? existing.category : 'Otros') : 'Proteínas';
  document.getElementById('inv-unit-input').value = existing ? existing.unit : 'g';
  document.getElementById('inv-stock-input').value = existing ? existing.stock : '';
  document.getElementById('inv-min-input').value = existing ? existing.minStock : '';
  document.getElementById('inv-expiry-input').value = existing ? (existing.expiryDate || '') : offsetDaysISO(5);
  document.getElementById('inv-lot-input').value = existing ? (existing.lot || '') : '';
  document.getElementById('inv-recipe-link-input').value = existing && INVENTORY_RECIPE_META[existing.recipeLink] ? existing.recipeLink : 'manual';
  document.getElementById('inv-consumption-input').value = existing ? (existing.consumptionPerUnit || '') : '';

  if (titleEl) titleEl.textContent = existing ? `Editar · ${existing.name}` : 'Agregar Nuevo Insumo';
  if (delBtn) delBtn.classList.toggle('hidden', !existing);

  overlay.classList.add('open');
  modal.classList.add('open');
}

function closeInventoryModal() {
  const overlay = document.getElementById('inv-modal-overlay');
  const modal   = document.getElementById('inventory-item-modal');
  if (overlay) overlay.classList.remove('open');
  if (modal) modal.classList.remove('open');
}

function saveInventoryItemForm() {
  const editId = document.getElementById('inv-edit-id').value.trim();
  const name   = document.getElementById('inv-name-input').value.trim();
  if (!name) {
    showKDSToast('Escribe el nombre del insumo');
    return;
  }

  const category = document.getElementById('inv-category-input').value || 'Otros';
  const unit     = document.getElementById('inv-unit-input').value || 'pza';
  const stock    = Math.max(0, parseFloat(document.getElementById('inv-stock-input').value) || 0);
  const minStock = Math.max(0, parseFloat(document.getElementById('inv-min-input').value) || 0);
  const expiryDate = document.getElementById('inv-expiry-input').value || '';
  const lot      = document.getElementById('inv-lot-input').value.trim();
  const recipeLink = document.getElementById('inv-recipe-link-input').value || 'manual';
  const consumptionPerUnit = Math.max(0, parseFloat(document.getElementById('inv-consumption-input').value) || 0);

  if (editId) {
    const idx = inventoryItems.findIndex(x => x.id === editId);
    if (idx !== -1) {
      const prevCap = Number(inventoryItems[idx].capacity) || 0;
      inventoryItems[idx] = {
        ...inventoryItems[idx],
        name,
        category,
        unit,
        stock,
        minStock,
        capacity: Math.max(prevCap, stock, minStock * 2.5, 1),
        expiryDate,
        lot,
        recipeLink,
        consumptionPerUnit,
      };
    }
  } else {
    inventoryItems.unshift({
      id: `inv_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      name,
      category,
      unit,
      stock,
      minStock,
      capacity: Math.max(stock, minStock * 2.5, 1),
      expiryDate,
      lot,
      recipeLink,
      consumptionPerUnit,
    });
    inventoryMovements.unshift({
      id: Date.now(),
      type: 'restock',
      ts: Date.now(),
      title: `Alta de insumo · ${name}`,
      detail: `Stock inicial: ${formatQtyUnit(stock, unit)}${expiryDate ? ` · Caduca ${expiryDate}` : ''}`,
    });
  }

  syncAutoMode86FromInventory({ notify: false });
  persistInventory();
  publishCloudSync('INVENTORY_UPDATE', { inventoryItems, inventoryMovements, autoMode86Enabled });
  closeInventoryModal();
  renderKDSStockPanel();
  showKDSToast(editId ? `Insumo "${name}" actualizado` : `Insumo "${name}" agregado`);
}

function deleteCurrentEditingInventoryItem() {
  const editId = document.getElementById('inv-edit-id').value.trim();
  if (!editId) return;
  const target = inventoryItems.find(x => x.id === editId);
  inventoryItems = inventoryItems.filter(x => x.id !== editId);
  syncAutoMode86FromInventory({ notify: false });
  persistInventory();
  publishCloudSync('INVENTORY_UPDATE', { inventoryItems, inventoryMovements, autoMode86Enabled });
  closeInventoryModal();
  renderKDSStockPanel();
  showKDSToast(target ? `Eliminado: ${target.name}` : 'Insumo eliminado');
}

function openInventoryRestockModal(itemId, mode = 'in') {
  const item = inventoryItems.find(x => x.id === itemId);
  if (!item) return;
  const isWaste = mode === 'waste';

  document.getElementById('inv-restock-id').value = item.id;
  document.getElementById('inv-restock-mode').value = isWaste ? 'waste' : 'in';
  document.getElementById('inv-restock-title').textContent = isWaste
    ? `Registrar Merma · ${item.name}`
    : `Entrada de Stock · ${item.name}`;
  document.getElementById('inv-restock-sub').textContent = isWaste
    ? `Stock actual: ${formatQtyUnit(item.stock, item.unit)}. Descuenta producto caducado o dañado.`
    : `Stock actual: ${formatQtyUnit(item.stock, item.unit)}. Suma lote nuevo y actualiza caducidad PEPS.`;
  document.getElementById('inv-restock-qty-label').textContent = isWaste
    ? `CANTIDAD DE MERMA (${item.unit.toUpperCase()})`
    : `CANTIDAD A SUMAR (${item.unit.toUpperCase()})`;

  const health = getInventoryItemHealth(item);
  document.getElementById('inv-restock-qty').value = isWaste ? '' : (health.suggestedOrderQty || '');
  document.getElementById('inv-restock-expiry').value = isWaste ? '' : offsetDaysISO(7);
  document.getElementById('inv-restock-note').value = '';

  const expBlock = document.getElementById('inv-restock-expiry-block');
  if (expBlock) expBlock.classList.toggle('hidden', isWaste);

  const confirmBtn = document.getElementById('btn-inv-restock-confirm');
  if (confirmBtn) confirmBtn.textContent = isWaste ? 'Registrar Merma' : 'Sumar al Inventario';

  document.getElementById('inv-restock-overlay').classList.add('open');
  document.getElementById('inventory-restock-modal').classList.add('open');
}

function closeInventoryRestockModal() {
  const overlay = document.getElementById('inv-restock-overlay');
  const modal   = document.getElementById('inventory-restock-modal');
  if (overlay) overlay.classList.remove('open');
  if (modal) modal.classList.remove('open');
}

function confirmInventoryRestock() {
  const itemId = document.getElementById('inv-restock-id').value;
  const mode   = document.getElementById('inv-restock-mode').value;
  const qty    = parseFloat(document.getElementById('inv-restock-qty').value) || 0;
  const newExp = document.getElementById('inv-restock-expiry').value;
  const note   = document.getElementById('inv-restock-note').value.trim();

  const item = inventoryItems.find(x => x.id === itemId);
  if (!item || qty <= 0) {
    showKDSToast('Ingresa una cantidad válida mayor a 0');
    return;
  }

  if (mode === 'waste') {
    item.stock = Math.max(0, Math.round(((Number(item.stock) || 0) - qty) * 100) / 100);
    inventoryMovements.unshift({
      id: Date.now(),
      type: 'waste',
      ts: Date.now(),
      title: `Merma · ${item.name}`,
      detail: `−${formatQtyUnit(qty, item.unit)}${note ? ` · ${note}` : ' · Descarte / Caducidad'}`,
    });
  } else {
    item.stock = Math.round(((Number(item.stock) || 0) + qty) * 100) / 100;
    item.capacity = Math.max(Number(item.capacity) || 0, item.stock);
    if (newExp) item.expiryDate = newExp;
    inventoryMovements.unshift({
      id: Date.now(),
      type: 'restock',
      ts: Date.now(),
      title: `Entrada · ${item.name}`,
      detail: `+${formatQtyUnit(qty, item.unit)}${newExp ? ` · Caduca ${newExp}` : ''}${note ? ` · ${note}` : ''}`,
    });
  }
  if (inventoryMovements.length > 30) inventoryMovements.length = 30;

  syncAutoMode86FromInventory({ notify: false });
  persistInventory();
  publishCloudSync('INVENTORY_UPDATE', { inventoryItems, inventoryMovements, autoMode86Enabled });
  closeInventoryRestockModal();
  renderKDSStockPanel();
  showKDSToast(mode === 'waste' ? `Merma registrada en ${item.name}` : `Reabastecido: +${formatQtyUnit(qty, item.unit)} ${item.name}`);
}

function copyRestockShoppingList() {
  const profile = getActiveTenantProfile();
  const urgent = inventoryItems
    .map(item => ({ item, health: getInventoryItemHealth(item) }))
    .filter(e => e.health.needsRestock || e.health.needsExpiryAction);

  if (urgent.length === 0) {
    showKDSToast('Todo tu inventario está óptimo, no falta nada por pedir');
    return;
  }

  const lines = [
    `LISTA DE COMPRAS & CADUCIDADES — ${profile.name.toUpperCase()}`,
    `Fecha: ${new Date().toLocaleDateString('es-MX')}`,
    '',
  ];
  urgent.forEach(({ item, health }) => {
    const tag = health.status === 'out' ? 'AGOTADO' : (health.status === 'low' ? 'BAJO' : 'CADUCIDAD');
    const suggest = health.suggestedOrderQty > 0 ? ` → Pedir +${formatQtyUnit(health.suggestedOrderQty, item.unit)}` : '';
    lines.push(`[${tag}] ${item.name}: queda ${formatQtyUnit(item.stock, item.unit)} (${health.expiry.label})${suggest}`);
  });

  const text = lines.join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showKDSToast(`Lista copiada (${urgent.length} insumos por atender)`);
    }).catch(() => showKDSToast(`Lista generada (${urgent.length} insumos)`));
  } else {
    showKDSToast(`Lista generada (${urgent.length} insumos)`);
  }
}

function resetDefaultInventoryPrompt() {
  inventoryItems = createDefaultInventoryCatalog();
  inventoryMovements = [];
  syncAutoMode86FromInventory({ notify: false });
  persistInventory();
  publishCloudSync('INVENTORY_UPDATE', { inventoryItems, inventoryMovements, autoMode86Enabled });
  renderKDSStockPanel();
  showKDSToast('Catálogo base de insumos restaurado');
}

function renderKDSStockPanel() {
  renderInventoryDashboard();

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
    const fullUrl = `${baseUrl}?mesa=${encodeURIComponent(t.param)}${tenantParam}`;
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

let kdsSearchQuery = '';

function onKDSSearchInput(val) {
  kdsSearchQuery = String(val || '').trim().toLowerCase();
  if (kdsSearchQuery.length > 0 && kdsSubView === 'comandas') {
    setKDSSubView('board');
    const searchEl = document.getElementById('kds-search-input');
    if (searchEl) searchEl.focus();
  } else {
    renderKDS();
  }
}

function getAvatarInitialsAndTone(name, fallbackLabel) {
  const raw = String(name || fallbackLabel || 'C').trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : raw.slice(0, 2).toUpperCase();
  const tones = ['tone-orange', 'tone-sage', 'tone-sky', 'tone-amber', 'tone-plum'];
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) % tones.length;
  return { initials, tone: tones[Math.abs(hash) % tones.length] };
}

const DINEOS_HERO_MEDIA = {"bistec": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBARXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAACgKADAAQAAAABAAACMAAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgCMAKAAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAgICAgICAwICAwUDAwMFBgUFBQUGCAYGBgYGCAkICAgICAgJCQkJCQkJCQsLCwsLCw0NDQ0NDw8PDw8PDw8PD//bAEMBAgICBAMEBgMDBg8KCQoPDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PD//dAAQAKP/aAAwDAQACEQMRAD8A/eSiiitACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//Q/eSiiitACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//R/eSiiitACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//S/eSiiitACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACikyBSbqAHUUwt70wutAE2RSZFVzMg7j86Tz4+zD86ALORRkVXEqnoaXzAadgJ8ilyKg3il3UgJqKiBp2TQA+im7vWnZzQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAH//0/3kooorQAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKCcUwnNADicU0k1DJMkfXknoB1NQlZZeXOxfQdfxNOwrkrzxx8Zy3oOTURknf7ihB6nr+Q/xqRY0jGEGKWgnmIPLdvvyE/Tj/wCvSeRF3Gfqc1PSUXEQ+VEP4B+VHlx/3R+VSUlFwITDEf4QPpxTTEB91mH45/nU9NouBD++XuH/AENOFwAcOCp96fTSARyM0cw7k6yg1IGrOMWOYzt9u1Is7Idsgx/KmNM1Q1OyDVNZVapg1Kw7lgE04EGoA1PBzSGS0U0N606gAooooAKKKKACiiigAooooAKKKKACiiigD//U/eSiiitACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKOlABSE+lNJzUUkqRjLGgCQnHJqqZXlO2Dp3bsP8aBHJMcy/Kn93ufr/hVkAKMAYApktkKRLGc9WPUnrUlOphOKQgpKYXAqBpgO9AiwcU0ketU2uFB61CbladgNHI9aTNZwuRThcLRYC9SVWEw7GpBJmlYB9JQCD0ooASmMoYYbkU+koApurxZZDlfSp4rkHvT6pTQlP3kX4inuUn0ZrK4PIqUN61iwXOeO9aSSAijyYy4G9aeDiq4NSBqLDJ+tFMBxT+tIAooooAKKKKACiiigAooooAKKKKAP/9X95KKKK0AKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiimlvSgBScUwnuaY7rGNzHAqELLccnKR/qf8KBNitMzN5cI3N39B9afHAEO9zvf1/w9KnRFjXagwBS0xMbSGgkCq8koApCHs4FU5ZwvJNVZ7nHANVIo7q+k2W67sdT0A+pp2AlluuwNVlee4bbAjSH2Ga6S10G3jw90fOb06KP8a3ERI1CRqFUdgMCk5JbDscbHo+py4LbYx/tH/DNW18Oyn/WXIH0XP9RXU0Uudjsc1/wjg/5+D/3z/wDXqNvD0o/1dwD9Vx/U11NFLmYWOMfSNSi5ULJj+6f8cVTMk0DbZkZD6EYrv6Y8aSqUkUMp7EZFNTFynFpcA8k1aWTNaFzocL5e1bym9Oq/4isKRLizfy7hdp7HsfoarR7CaNDrRVdJAenap85HFIQlJS0lAGZcxGI+bH071Lb3Gcc1cIBGD0rElU2s3+w3SqWo0zo0kBqcGsaCbIrSR6WxXmi4rVIDiqwNTKe1DGTUU0HtTqQBRRRQAUUUUAFFFFABRRRQB//W/eSiiitACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACkJxSFvSmFgoyaAHE5qu8uDsjG5z2H+eKaDJcf6v5U/vf4VbjiSIYQdepPU/WmK5DHb8+ZMdzdh2FWaWmkgUhAajZwKY8oFZs9yFHXmgRPLOB3rJnus0i+fdy+VApZj+QHvXS2GkRWpEs37yX17L9P8AGnewWuZNlo810RLd5jj67f4j/gK6qKKKBBHCoRR2FSUVm5XKSCiiikMKKKKACiiigAooooAKjlhinQxzKGU9jUlFAHI3unS2J82Il4f1X6/41FHIDyK7IgMCpGQa5XULE2T+dDzCx/75Pp9K0TuS0J1pKjRwakoJEqvcQLPGUarFJQBz0MjQyGKTqK2oZc1S1C2Lr50Y+df1FVrS4yMGrGmdMj5qdT2rNikzV5GyKkrYtA5qQHNV1apQe9IZJRR1ooAKKKKACiiigAooooA//9f95KKKK0AKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiikJ9KAFJxTCc0hOOTVfe8xKQdB1Y9B/jQA+SVUwByx6AdaEtmkO+459F7fj61PFAkXI+Zj1Y9TU1MQnsKSl6VC8gFIQ5mAqrLOBVea4AHWst5ZJ5PLiBZm6AdaaQMmnuuwp9np1xfESPmOL17n6f41qWOjLHiW8w79l/hH19a3cgUnK2iCxDb20NrH5cC7R39T9TU9MMijqagkuoowSzAAeprNvqykWqKyn1S0UbjMgAzyWA6daZ/a1qekynH+0O1Ze3htzL7y/Zy7GxRWWuowt0cH8amW7U981opJ7Mlq25eoqstwpqYOppiH0UUUAFFFFABRRRQAUx0WRDG4yrDBFPooA4y4geyuDC3KnlT6ipFOa6K/tFu4SvR15U+//wBeuUjZlJRxhl4IrRO5DRapKAciigQ01z95CbWbzk+4x59jXQ1DLEs0ZjcZBpp2ApW04YCtaJ81yq77SYxP26H1FbkEu4A02il2NpT3qZTVGN6sqaQ12LIOKfUQOaeD2pDHUUUUAFFFFABRRRQB/9D95KKKK0AKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKOlITimE9zQApOaiklWMZamGVnby4BuYdT2H1qxFbLGfMc7pPU9vp6UwIFgkn+ab5U/u9z9fT6VeChQFUYA7CnUlIQlNJxTWcCqMtxigRNJMBWZPdY6Gq01yznYuST0Aq/a6XnE18eOyf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5LOXltM9BWbLYqf4a654fWqrwg9qAscVJpw7VTfTu2BXcNbioGtR6UXEcQdO/wBmm/2b7fpXZm0U9RTfsq+lPmA5JdOHep0sFHbNdOLVfSni2XqBS5gMGOzA6LVxLQ962FgA6CpliouwM+O2Aq4kNW1hqwkVKwWKyRVbjhqzHBVxIgOlMaII4cdauJHUqRVaSPFSOxGkdWFTFPC+lSKtHqPcaFqQL60oGKeF9aVxiAZp4GKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/0P3kooorQAooooAKKKKACiiigAooooAKKKKACiiigAooooAaR3FMIzUtIRmgCuVqMr61ZI7GmFadwsUnjzVZ4q0itRlAaBGQ8QPWqzwZraaKoGip3FbsYjQGoTD7VttFUZiHpTuFjEMNN8kVtGEUzyFouIyPKFKIa1vIWnCEUXQGWIfaplgNaIiHpUoiouOxQSCrKRAVbWKp1ipNhbuVliqykVTBAKkC0h+gwKBUoX1pwWngYoCwgWngZpQvrTqQxAMUtFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB//0f3kooorQAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAAjNMINPooAiIzTCtTkA0m2gCttphUVaI9abtp3FYqGMUwxVcKU3bQBT8qm+VV3aaNpoApeVS+VVvbS7TQBWEVPEYqfbTgtAEIUU8KalC0oAouFhgWngCnbTTsCkMaBmnAYpaKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/2Q==", "longaniza": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBARXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAACgKADAAQAAAABAAACMAAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgCMAKAAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAgICAgICAwICAwUDAwMFBgUFBQUGCAYGBgYGCAkICAgICAgJCQkJCQkJCQsLCwsLCw0NDQ0NDw8PDw8PDw8PD//bAEMBAgICBAMEBgMDBg8KCQoPDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PD//dAAQAKP/aAAwDAQACEQMRAD8A/eSiiitACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//Q/eSiiitACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//R/eSiiitACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//S/eSiiitACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACikyBSbqAHUUwt70wutAE2RSZFVzMg7j86Tz4+zD86ALORRkVXEqnoaXzAadgJ8ilyKg3il3UgJqKiBp2TQA+im7vWnZzQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAH//0/3kooorQAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKCcUwnNADicU0k1DJMkfXknoB1NQlZZeXOxfQdfxNOwrkrzxx8Zy3oOTURknf7ihB6nr+Q/xqRY0jGEGKWgnmIPLdvvyE/Tj/wCvSeRF3Gfqc1PSUXEQ+VEP4B+VHlx/3R+VSUlFwITDEf4QPpxTTEB91mH45/nU9NouBD++XuH/AENOFwAcOCp96fTSARyM0cw7k6yg1IGrOMWOYzt9u1Is7Idsgx/KmNM1Q1OyDVNZVapg1Kw7lgE04EGoA1PBzSGS0U0N606gAooooAKKKKACiiigAooooAKKKKACiiigD//U/eSiiitACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKOlABSE+lNJzUUkqRjLGgCQnHJqqZXlO2Dp3bsP8aBHJMcy/Kn93ufr/hVkAKMAYApktkKRLGc9WPUnrUlOphOKQgpKYXAqBpgO9AiwcU0ketU2uFB61CbladgNHI9aTNZwuRThcLRYC9SVWEw7GpBJmlYB9JQCD0ooASmMoYYbkU+koApurxZZDlfSp4rkHvT6pTQlP3kX4inuUn0ZrK4PIqUN61iwXOeO9aSSAijyYy4G9aeDiq4NSBqLDJ+tFMBxT+tIAooooAKKKKACiiigAooooAKKKKAP/9X95KKKK0AKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiimlvSgBScUwnuaY7rGNzHAqELLccnKR/qf8KBNitMzN5cI3N39B9afHAEO9zvf1/w9KnRFjXagwBS0xMbSGgkCq8koApCHs4FU5ZwvJNVZ7nHANVIo7q+k2W67sdT0A+pp2AlluuwNVlee4bbAjSH2Ga6S10G3jw90fOb06KP8a3ERI1CRqFUdgMCk5JbDscbHo+py4LbYx/tH/DNW18Oyn/WXIH0XP9RXU0Uudjsc1/wjg/5+D/3z/wDXqNvD0o/1dwD9Vx/U11NFLmYWOMfSNSi5ULJj+6f8cVTMk0DbZkZD6EYrv6Y8aSqUkUMp7EZFNTFynFpcA8k1aWTNaFzocL5e1bym9Oq/4isKRLizfy7hdp7HsfoarR7CaNDrRVdJAenap85HFIQlJS0lAGZcxGI+bH071Lb3Gcc1cIBGD0rElU2s3+w3SqWo0zo0kBqcGsaCbIrSR6WxXmi4rVIDiqwNTKe1DGTUU0HtTqQBRRRQAUUUUAFFFFABRRRQB//W/eSiiitACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACkJxSFvSmFgoyaAHE5qu8uDsjG5z2H+eKaDJcf6v5U/vf4VbjiSIYQdepPU/WmK5DHb8+ZMdzdh2FWaWmkgUhAajZwKY8oFZs9yFHXmgRPLOB3rJnus0i+fdy+VApZj+QHvXS2GkRWpEs37yX17L9P8AGnewWuZNlo810RLd5jj67f4j/gK6qKKKBBHCoRR2FSUVm5XKSCiiikMKKKKACiiigAooooAKjlhinQxzKGU9jUlFAHI3unS2J82Il4f1X6/41FHIDyK7IgMCpGQa5XULE2T+dDzCx/75Pp9K0TuS0J1pKjRwakoJEqvcQLPGUarFJQBz0MjQyGKTqK2oZc1S1C2Lr50Y+df1FVrS4yMGrGmdMj5qdT2rNikzV5GyKkrYtA5qQHNV1apQe9IZJRR1ooAKKKKACiiigAooooA//9f95KKKK0AKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiikJ9KAFJxTCc0hOOTVfe8xKQdB1Y9B/jQA+SVUwByx6AdaEtmkO+459F7fj61PFAkXI+Zj1Y9TU1MQnsKSl6VC8gFIQ5mAqrLOBVea4AHWst5ZJ5PLiBZm6AdaaQMmnuuwp9np1xfESPmOL17n6f41qWOjLHiW8w79l/hH19a3cgUnK2iCxDb20NrH5cC7R39T9TU9RmRV6moHu4k+8wFZt21ZSXYt0Vlvqdshw0qj6sKj/ta1zgSqT/vD6Vk60P5kVyS7GxRWSNTgY4Ei5+oqwt2p71cZqXwsTTW5eoqutwpqUOpqhD6KKKACiiigAooooAKY6LIhjcZVhgin0UAcZcQPZXBhblTyp9RUinNdFf2i3cJXo68qff8A+vXKRsyko4wy8EVonchotUlAORRQIaa5+8hNrN5yfcY8+xroahliWaMxuMg007AUracMBWtE+a5Vd9pMYn7dD6ityCXcAabRS7G0p71MpqjG9WVNIa7FkHFPqIHNPB7UhjqKKKACiiigAooooA//0P3kooorQAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAo6UhOKYT3NACk5qKSVYxlqYZWdvLgG5h1PYfWrEVssZ8xzuk9T2+npTAgWCSf5pvlT+73P19PpV4KFAVRgDsKdSUhCU0nFNZwKoy3GKBE0kwFZk91joarTXLOdi5JPQCr1rpecTXx47J/j/hT2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5xtzE6MJIzh0OQa9H8P6uup2gDnE0XDD+tcjdQZyQKyba6l0q9W7i6Zww9RTauTfqex0VXtbmK8t0uITlXGasVkWJUToG5qWkoAqoxhO08p/KrYIIyORUbID0qEb4zlenpTsBbopiyK/Tr6U+pAKKKKACiiigBMCmlAafRQBEYlo8palprOq9etADPKXvULEdE/OnMzP14FNqlEBgjUUuBTqSqAKSlppIAyeAKACsjV9b0/RLY3N9KEA6DuT7CuS8T+PrLSN1pp+Li66cH5V+p/p1/nXiF5eahrNybq/kMjnpnoB6AdhVKJLZ0XiPxpqWvu1vbk29p02g4Zh/tH+lc5bWRJGRV61sc44roLe0CDpWmxJStrIDBIrbht+mBVmG3rRjhAqHICCKACr6RVNHFVyOL0pWAiSKrscOanjh9aupHTv2GvIiSIDtVtIqlSOrCpip9CthipipgtOC1IF9aAsIFp4HYUoGaeBikMQD1paKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/9T95KKKK0AKKKKACiiigAooooAKKKKAGkd6jIqamEYoArMKqypV9hUDCmLzMeWPIxWDd2/XiuqlSs2eIMDTQmUvDmrHTrn7DcH9zKflPoa9MBBGRyDXjt3bZ6dR0rqfDXiANjTb5sOv3GPf/P8An2Uo9QTO5ooorMoSkIzS0lMCJowelAaRP9qpaSgBBKvcYp4ZT0IqPApNoosBPRVbYKNoosBYLKOpphlXtzUe0UUWAC7t0+UU0CnUlUAlFFFACUlLXF+JfGmnaAhiU+fdEfLGp/U+g/zzTSC501/qNnplu1zeyiKNRnJNeGeJviBeaqWs9IzBb9C/R2+noP1+lcnq2s6p4hufOvZCVz8qDhV+g9fektbHpxWkY9yGylBaM53NyTXQ2tjjBIq7b2YXtWxDb+1DkIqw22MACtWK3AqeKADtV5Iqi9wIo4quRxVLHFV+OH1p2sMgjhzV+OICpUj9KtpFSbHbuRJFVtI8U9UAqULSGIF9KkVacFp4GaLjGgYp4X1pQMUtIAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//V/eSiiitACiiigAooooAKKKKACiiigAoIzRRQBGR2qJhVgjNRkZoAqOuaoSp3rUYVWkSmLyOfuYAwOK5u6t2Db0+Vl5BFdrInasi5t81SJsX/AA/4pDlbDUjtkHCv2Nd6CGAKnINeH3lpu5A5FaWj+K7vSmFvegzQDv8AxLUyjfYaZ69SVRsNTstSiE1pKHB7Z5FXqgoKSlpKAEooopgJRRRTASkpaSgApKWkoASobi4gtYmmuHCIoySTiuc1/wAXaToMR86QSTY+WNeWNeDa94n1XxJMRMxjtwfljU8fj6/yqlG4mzs/FHxGkn32OgnC9DN6/wC6P615ikEtzIZZmLu5yS3JJ9zVq2sSSOM10NtZBcZFaWsQUbWx6EjArdgtgoAAq1Db1pxQAVLkBXht/UVoxxelSpFV1IqncCGOKrscOanjh9aupF2FMZFHDiriRVIkVWlQCpK2GJHU4X0pwWpAtAWGhakAxSgdhTwMUhiBfWnUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAf/9b95KKKK0AKKKKACiiigAooooAKKKKACiiigAphGKfRQBAwqFh2qyR2qNlpoChIlUJY88GthhmqkkdAt9Dm7i3z2rBurMN1FdpJHmsuaCqJOFH23TpvPspGiYc8dD9R0NdfpvxClhxFq8OR/wA9E/qOv86pz2ue1YlxYK2cDBp+oHsth4g0jUlDWtwrH0JwRWwCCMg5FfMs1g8bbkyrDoRxVm313xDp/EF25Ho3zfz5/Wp5Ow+Y+kaSvCofiNr8GPPhjlHtlf8AGtFPinOOJdPGfZ8/0FLkY+Y9jorx4/FXA4sDn/eqpN8VLwjENgAfd/8A6xp8jC57XTHkjjG6Rgo9zivnu6+Ivia5G2LZAPUDn+eP0rl7vU9c1In7ZdySA9RnA/IYFNUxcx7/AKt430DSQyyTiWUfwJyc/wBPxrynW/iNq2p7oNNX7LCeM9XI/kP1ri49PJxkVqQacfSqUUhXMdbea5kM07GR2OSSckn3z1ratrDpxWrDZKvbJrVitfbim5CKMFqFGAK1YrbHWrUduBV5IqzbuBBHDirscVSpFV6OHPWi3cZBHDV+OECpkiA7VbSKi40iJI6tpHUipipgtIfoNVcdKlC04LTwOwouOwgGKcBmnAetLSAOlFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB//9f95KKKK0AKKKKACiiigAooooAKKKKACiiigAooooAQjNMIzUlNI70AQMKhZQatEZqJlpiaM+SOqckee1bDLmqrx0BuYMsNZ8tuD2ro3j9qpyQ56VV+5LOXltM9BWbLYqf4a654fWqrwg9qAscVJpw7VTfTu2BXcNbioGtR6UXEcQdO/wBmm/2b7fpXZm0U9RTfsq+lPmA5JdOHep0sFHbNdOLVfSni2XqBS5gMGOzA6LVxLQ962FgA6CpliouwM+O2Aq4kNW1hqwkVKwWKyRVbjhqzHBVxIgOlMaII4cdauJHUqRVaSPFSOxGkdWFTFPC+lSKtHqPcaFqQL60oGKeF9aVxiAZp4GKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/0P3kooorQAooooAKKKKACiiigAooooAKKKKACiiigAooooAaR3FMIzUtIRmgCuVqMr61ZI7GmFadwsUnjzVZ4q0itRlAaBGQ8QPWqzwZraaKoGip3FbsYjQGoTD7VttFUZiHpTuFjEMNN8kVtGEUzyFouIyPKFKIa1vIWnCEUXQGWIfaplgNaIiHpUoiouOxQSCrKRAVbWKp1ipNhbuVliqykVTBAKkC0h+gwKBUoX1pwWngYoCwgWngZpQvrTqQxAMUtFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB//0f3kooorQAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAAjNMINPooAiIzTCtTkA0m2gCttphUVaI9abtp3FYqGMUwxVcKU3bQBT8qm+VV3aaNpoApeVS+VVvbS7TQBWEVPEYqfbTgtAEIUU8KalC0oAouFhgWngCnbTTsCkMaBmnAYpaKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/2Q==", "hotdog": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBARXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAACgKADAAQAAAABAAACMAAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgCMAKAAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAgICAgICAwICAwUDAwMFBgUFBQUGCAYGBgYGCAkICAgICAgJCQkJCQkJCQsLCwsLCw0NDQ0NDw8PDw8PDw8PD//bAEMBAgICBAMEBgMDBg8KCQoPDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PD//dAAQAKP/aAAwDAQACEQMRAD8A/eSiiitACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//Q/eSiiitACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//R/eSiiitACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//S/eSiiitACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAopMik3UAOopm40m73oAkoqLcKNwoAloqLcKXd70ASUVHu96XcaAH0U3dTs5oAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//0/3kooorQAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACikJphPc0AO3elNJ9TVY3G4lYRuI79hUZiLnMzb/AG6CmJsla5jBwuXPoOajM07fdQL9TTwoUYUYooJ5iI+eergfQU3ZJ3kP6f4VLSUXC5Ftk/56H9KTEw6SZ+oqWmmi4XGeZOvUA/Q0ougDhsr9aWmnHfmncOYsCUGpA9ZxiA5Q7T/ntSCZ4+HGR60DUjVDU7IqikysPrU4b8aVh3LOTTgRUAang5pDJaKYDing5oAKKKKACiiigAooooAKKKKACiiigAooooA//9T95KKKK0AKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKQnFAC9KYTmkJ7mqzzFz5cIye57CgCSSVIhluvYVBsebmX5V/u/41IkIQ7mO5z3P9PSpKZLY0AAYHAFFLTCwHWkSFJTDIBURlA70AT02q5mHrSecPWiwFikqESj1p3md6AHUlG4UUAJTTTqSgCs0RB3RnHtSx3BB2twRU1QyxCQZ6N2NO/caZeSQNUwasJJmibY/BrSjlDUbFehfDU/PeqwbuKlVqLDuTg5pajBp4OaQC0UUUAFFFFABRRRQAUUUUAFFFFAH//V/eSiiitACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKQnFMJ9aAHE+lRPIsYyxxUbzc7Ixuf0/xoSDB8yU737eg+lMVxgEk/LZRP1P+FTqqoNqDAFPpKRIlMJAFIzgVTlnC/WgCZ5cd6pSXIFUZrrNWrbSL28w8n7lD3bqfoP/ANVO1twK0l371Css0pxEjOfYE/yrrrbRbG3wSnmt6vz+nStVVVRtUAAdhSc10HynCLZam/KwMM+vH88U/wDs3VuphP8A30v+NdzRS5x8pwbWuox/egc/QZ/lmoRcMjbXBU+h4r0Ko5IopRtlQOPQjNPnFynFJcA9asrID0rVuNCtJMtBmFvbkfl/hWHcWd5YndKu5P7y9Px9KaaYmi4CDRVKOYHFWgfWkIWkpaSgCvPCJV4+8OlUoZmRijdRWpWdewkjzo/vL196aY0zUilzVpWzXO20+RxWxHJkUFb6ovq1Sg1VVs1MrUAmTg5pajB71J1pDCiiigAooooAKKKKACiiigD/1v3kooorQAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAoopCcUALTS3pSE5qCSYIQo+Zj0A60ASMwUZY1APNuPufIn97ufpT0t2c77jk9l7D6+tWqYrkaRpEu1Bj+pp1LTGYCkSBIFV3kAqOWYDqayZ7rrzxTSAszXIHSqCLcXsvlW6lm7nsB7mrtlpc98RLNmOH9W+n+NdbBbw20YigUKo/X60OSWw0rmdYaRBaYkk/ezep6D6D+ta9FFZt3KCiiikAUUUUAFFFFABQQCMGiigDn77R1bM1kNrd07H6elYschB2OMEdQeoruqydS04XS+dCMTL/48PQ/0q4y6MloxlbNLVWNz91uCPWrIORmqZIUh54NLSUgMK5jNrN5i/cb9DV63myAaszRLNGY3GQawUL20xic9Oh9RVp3Gjqo3qyD3rHhlyK0Y3qSvNF1TUgOKrg1MDmhjJaKaD2p1IAooooAKKKKACiiigD//1/3kooorQAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACijpTCc0AKW9KYSByaZJKsY56+lNSB5sNP8AKv8Ad/x/woAZveclYOF7sen4etWooUiB28k9SepqUAAADgCigkSkNBIAqrJMB3oAkeQCs6a4C1Xnuuw70y1srm/bcPki7sf6etVa24iuXmuJBFCC7HoBXQWGipDia7xJJ1A/hH+NaVraW9kmyFee7HqfrU5kAqHPsUkS0VXMw9aj88VAy5RVH7RTvPFAFyiqwmBqQSA0AS0U0MKdQAUUUUAFFFFABRRRQBz2r2W0/bYR/vgfz/xrLjcGu0IDAqwyDwRXHXlqbG42jmN+VPt6fhWkXfQlofSU1Tn3p1BIlZ99bGePcn305H+FaFNNNMDCtJ/4W7VuRSZrEv4DDJ9pjHyn73+NWbWfcAKb7lJnQo2RU6ms6J6uqc0h7FoHvTwc1ArVKDikMfRRRQAUUUUAFFFFAH//0P3kooorQAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKQnFIT6VE8ixjLHFADye5quZHkJjgGT3PYfWlWOW45fKR+nc/4VeRFjUKgwBTFcgit1jO9jvc9z/T0qxRTSwFIQpNQvIFpkkoFZU92F780WAtTXAXPNZEtyztsQFiegFJFHc377Yh8o6segrftra2sFLD5nxy5/zwKbaQJXKtnpPSa9/BB/U1uGVUG1eAPSvO/EnxG8P+Honee4WR1z8qsMA+hNfPXiT46397Gy6aPs0LZAIyD+fB6V85mnE+EwV1Vnd9kfQZZwzi8bZ0oWXdn1lqGu6dpqF765SED+8efyrzHWPjT4P0xnjS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v8TfEG61AtZaKTDD0Mn8TfT0+vX6V5/DavI25+SeSauWtjnHFdFb2YXGRzWmxJRtbHoSK3YbYAAAVZht604oAO1S5AV4bfFaEcVSxxVdSKptcCJIquxw1NHD3q8kfpTv2GvIhjiA7VcSOpUiqyqYqSthiR1MF9KcFqULQFhoWngYpwGacBikMQL606iigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//9L95KKKK0AKKKKACiiigApCMilooAiIyKhYVYIxUTCmgKUq1mzR5BFbLDIqjKlHkLfQ5K8t8ggjg10/hXWCw/sy6b51+4T3HpVC5hDA1zs6yQSrPEdrxnINU9USe00lZGi6pHqlmso/1i8MPetesWrFhUMiAipqQ+9CAoRP5Mmxvut+hq/VaWPcOaIZD/q36jp702uoFmiiipAKKKKACiiigAooooATApNop1FADdoo2inUUAJtFGBSkgDJqu8hPCcD1ppAPeRV4HJqA5Y5agDFLVJANwKMClpKYBSUtc/rniPTNBgMt5J85+6g5Zj7CgDammigjaWZgiKMknpXj3ij4i532OgnPYzdR/wH1+vT61xWv+K9U8RylCTDbdo1PX/ePf8AlWTbWRJBIya0USGyuIp7qVprhi7ucksckn3rbtbHpkVetrILjIraht/aqb7CKsFsFwAK1Yrf2qxFABV9IqzuBDHF6VdjiqVIqvRw5oSGQxw5q9HCBUyR+lW0iobHYiSLNW0jqRUxUoWkP0EC+lSBacFp4HYUXGkIBingetKBilpAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAf//T/eSiiitACiiigAooooAKKKKAEIzUZGalppHegCuwqvIuauMKhYdqYmZMidqxruDqRXSSJWfNHuBBppifc5zT76TR75Z1/wBU/Dj2r1uGaOeJZojuVhkGvJ7u3HII4NbHhfVjbS/2ZdH5W+4T29qUlcFoeiUlLSVkUIarSR9x1qzRTuBDHLn5X4b+dT1A8YNIrsnDciiwFiimqyt9006kAUUUUAFFFFABRRSEgcnigBaYzhevWmNJnhfzqPHc96aQAxZjk/lRS0lWAlFFFACU1mVAWY4A6k1narrFho1s1zfyiNR0B6n6V4L4k8c6jrjNa2Wbe16YH3mHv6D2/wD1U0ribO68UfES3sd9lo+JpxwX/hX/ABPsK8ZmkvNTuGuryRpZG6k/09BS21kWIJFdFbWIGCRWqViCha2PTit+C1CgYFW4bbsBWpFABUuQFaG3rSjhxU0cVXI4qncCKOKrscXpU0cJNXkiAp7DIY4cVdSPNSJFVtYwKllEaRVYVQKcFqRVo9Q3GhalAxSgdhTgvrSGIBmn9KKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/1P3kooorQAooooAKKKKACiiigAooooAYRiomWpyM0wjtQBVYZqjKlaTDvUDrmmIwbiLcDXOXUDKwdOGTkGuykSse6gzyKaE0dV4d1hdSthFKcTxcMPX3roq8XWWfTrlby2OGU8j19q9T0nVrfVbYSxHDj7y9waiUeo0+hqUUtJUjEpCBS0UARGP04NG6RfepKSmAnm+opfNSikwKLAL5i0eaOwJpuBRRYALsegxTMZ5PNOopgJSUtFMBKSlqne31rp9u1zeSCONBkknFAFo4Aya8/wDFHjyw0VWtbQi4u/7o6L9T/n+tcL4n+Id1qJay0XMMHQyfxN9PT69fpXnsFq8jbn5J61cY9yXIsX+oalrl0bm/kMhPQfwqPQCrNrY57VftbHoSK3IbbGABV3sSVbe0Ve1a0NvVmG3x1rQji9KhsCGOEDtV1IqmSKrscNKwyGOKr0cPepo4gKuJFRcaREkftVtIqlSOpgvpSH5IaqgVKFpwWngYoCwgWngZpQvrTqQxAMUtFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAf/1f3kooorQAooooAKKKKACiiigAooooAKaR3p1FAELDNQsKskYqNhTQFGRKz5YwRg1rsO1VJEoF5HL3Vv14rGhuLvSbkXVo2MdR2IrsZotwrCurbrxVIk7zRtftNXiG07Jh95D1zW7XgssU9rKLi2Yo68giuy0bxuo222rjaegkHQ/X0qHDsNSPR6KhguILmMSwOHU9xU1QUJRRRTASkpaSmAUlLSUAFJRRTASiql5fWdhE095KsSLySxxXjniX4lvNus9ABAPBlI/wDQR/j+tNK4mzvvEnjHTPD8ZV2824I+WNev4+grwLWde1XxHceZeORHn5Yx90f4n3rOEU93K09wxkdzkknJJrbtbD1FaKNiWzPtbHOOK6K3swuMjmrcFqFGAK1YrehyEV4betKKACp44vSrscVRuBDHFV1IqmjhzV6OECnsMhjh71dSP0FSpFmraR0mx27kaRVZVMU8L6VIFpeoxoWpQtKBingetIY0DNPAxS0UAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAH/1v3kooorQAooooAKKKKACiiigAooooAKKKKAA81GR2qSkIzQBXYVC65FWiM1Cwp+QmZsiVnzRBga3HXNUpI8UC3OXuLbPaufurENnAruZYgRWXNbg9qrcRxVveapo8m+wmKAfw9VP4dvwrstP+I2zEerW5U93Tkfl1/nWXPaA8EViXGnBulD8xXPZLHxRoeoYEF0u4/wk4P5VuJLFJzG4b6HNfMk+mkH7tRJJqVrxb3UkYHYMQPy6UuRdCuY+o6K+aE8ReJ4BtS9fHuFP9Kc3i7xZjH2wj/gI/wo9n5hzH0pULzwx8yOq/U18yy+JPFE42yXz49gB/ICsqeTUrv/AI+biWUejMSPyNNUw5j6L1Dxl4e00ET3asw/hX5j+Q5rzrVfipLJmPRrbbn+OT/Af4ivNE089xV+HTfaq5UhXKV7farrMvm6hO0p6gZ4H0HSpLew9q3YbBV61qRWuOAMU7iM23sguM1rw2/TirkVqBV9IfaobArxQAdqvJFUyRVcjhpWAhSKr0cOamjhxV1I80X7DREkfpVtIqlSKrCqBSK22GKmKlC04LUoGKAsNC08DsKUDNP6UhiAYpaKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//X/eSiiitACiiigAooooAKKKKACiiigAooooAKKKKAGkd6jIzU1MIxQBXIqB0zVwjNREU9xGZJHVKSIGtpkzVV4qA3MCSH1FUJLcGujeP1qm8HpVepPqczJaZ7VQksQf4a6p4fUVXaHPbNAWOQfT17Cq508Z6V2DQCozAOmKLsRyP2Bc9Ketiv92upMA9KQQD+7RcDnls/RatJaGtoQ46CniGldgZiWoHariQgdBV1Yfap1hotfcLFRIqtJFVpICauJCBT2GVo4aupFjpUyRVaSKk2O3ciSKrSxgU9VAqULSGNC1IFpwWngZouMQDsKcF9aUDFLSAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//Q/eSiiitACiiigAooooAKKKKACiiigAooooAKKKKACiiigBhGKYRmpqaV9KAK5X0qIqDVojNMK07isUXiqs0XpWmVqMoDQHqZDRD0qBoK2WiqFoaLit2MUwVEYCK2jEaYYvaquFjG8j1FHkD0rX8r2o8oelFwsZIhI7VIID0rT8r2p4iNFwsZ629TrCBV0RVKsVK47dyqsRqwkVWBGBUoX0pB6EaxgVKF9KcFqQLQFu40LTwMU4DNOAxSGIF9adRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAH//R/eSiiitACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAQjNNIIp9FAERAphWp8Ck20AVttNK+tWSPWm7adwsVigppjFWtlJso0FYq+UKPKHpVnZRsosBW8sU4IBVjZRto0CxCFFOCmpttKAKLhYjC08LT8Gl20rjGgelOC+tOooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//Z", "thumb_bistec": "data:image/jpeg;base64,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", "thumb_longaniza": "data:image/jpeg;base64,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", "thumb_hotdog": "data:image/jpeg;base64,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"};

let kdsChannelFilter = 'all'; // 'all' | 'dine_in' | 'pickup' | 'delivery'
let dineosSelectedHeroDish = null; // null (auto) | 'pinch_burger' | 'skirt_steak' | 'cuban_sandwich'

function buildDineOSPinchHeroPlatterSVG(heroKey) {
  const uid = `dhp_${++plateSvgUidCounter}`;
  let dishArt = '';
  if (heroKey === 'skirt_steak') {
    dishArt = `
      <!-- Entraña Certified Angus Beef 8 oz + Coles de Bruselas + Vinagreta -->
      <ellipse cx="264" cy="244" rx="112" ry="62" transform="rotate(-18 264 244)" fill="#2e1107" opacity="0.16"/>
      <g transform="translate(260, 224) rotate(-18)">
        <path d="M-98 -24 C-92 -52 12 -58 96 -34 C118 -24 114 22 86 38 C28 60 -78 48 -98 16 Z" fill="#6b2b16" stroke="#361106" stroke-width="3"/>
        <path d="M-74 -34 L-44 36 M-38 -38 L-6 40 M0 -38 L32 38 M38 -32 L68 32 M72 -24 L94 20" stroke="#260902" stroke-width="5.2" stroke-linecap="round" opacity="0.72"/>
        <path d="M-76 -16 Q8 -34 84 -10" fill="none" stroke="#d98759" stroke-width="3.6" stroke-linecap="round" opacity="0.62"/>
        <!-- Vinagreta brasileña / chimichurri -->
        <path d="M-54 6 Q-14 -16 24 8 T84 -4" fill="none" stroke="#3a8a3e" stroke-width="9" stroke-linecap="round" opacity="0.88"/>
        <circle cx="-24" cy="2" r="2.8" fill="#ffe58c"/><circle cx="16" cy="4" r="2.6" fill="#eb3824"/><circle cx="52" cy="-2" r="2.8" fill="#a8f078"/>
      </g>
      <!-- Coles de Bruselas picantes tostadas -->
      <g transform="translate(330, 146)">
        <circle cx="0" cy="0" r="19" fill="#4f8f34" stroke="#244a14" stroke-width="2.2"/>
        <circle cx="0" cy="0" r="11" fill="#84c95b"/>
        <circle cx="30" cy="18" r="18" fill="#46822d" stroke="#244a14" stroke-width="2.2"/>
        <circle cx="30" cy="18" r="10" fill="#7dc255"/>
        <circle cx="14" cy="38" r="17" fill="#59993c" stroke="#244a14" stroke-width="2.2"/>
        <circle cx="14" cy="38" r="9.5" fill="#90d466"/>
        <circle cx="2" cy="-3" r="2.2" fill="#e63522"/><circle cx="29" cy="15" r="2" fill="#e63522"/>
      </g>
    `;
  } else if (heroKey === 'cuban_sandwich') {
    dishArt = `
      <!-- Pinch Cuban Sandwich prensado + Papitas hilo -->
      <ellipse cx="262" cy="244" rx="126" ry="56" transform="rotate(-16 262 244)" fill="#4a2b0d" opacity="0.16"/>
      <g transform="translate(256, 224) rotate(-16)">
        <!-- Pan cubano inferior -->
        <rect x="-112" y="-12" width="224" height="54" rx="22" fill="#e3aa54" stroke="#965c19" stroke-width="3"/>
        <!-- Queso suizo + jamón curado + pepinillos -->
        <path d="M-98 -6 L98 -6 L92 14 L52 4 L12 18 L-34 4 L-84 16 Z" fill="#fff0b3" stroke="#c4a645" stroke-width="2"/>
        <rect x="-102" y="-24" width="204" height="22" rx="10" fill="#ed8c8c" stroke="#a64747" stroke-width="2"/>
        <circle cx="-54" cy="-14" r="11" fill="#5a942e" stroke="#274710" stroke-width="2"/>
        <circle cx="4" cy="-16" r="11" fill="#639e36" stroke="#274710" stroke-width="2"/>
        <circle cx="60" cy="-14" r="11" fill="#5a942e" stroke="#274710" stroke-width="2"/>
        <!-- Tapa pan cubano prensado con marcas de plancha -->
        <path d="M-110 -22 C-102 -58 102 -58 110 -22 L104 -6 C48 -2 -48 -2 -104 -6 Z" fill="#f2c478" stroke="#965c19" stroke-width="3"/>
        <path d="M-74 -48 L-54 -14 M-28 -52 L-8 -14 M18 -52 L38 -14 M62 -48 L80 -15" stroke="#8c4e12" stroke-width="4.5" stroke-linecap="round" opacity="0.45"/>
      </g>
      <!-- Guarnición papitas hilo -->
      <g transform="translate(152, 260)" stroke="#e6a622" stroke-width="4" stroke-linecap="round">
        <line x1="-22" y1="8" x2="20" y2="-10"/><line x1="-14" y1="-10" x2="26" y2="10"/>
        <line x1="-26" y1="-2" x2="22" y2="2"/><line x1="-10" y1="16" x2="28" y2="-4"/>
      </g>
    `;
  } else {
    dishArt = `
      <!-- Pinch Burger 8oz + Queso suizo + Cebollas caramelizadas + Papas de la casa -->
      <ellipse cx="264" cy="248" rx="112" ry="52" transform="rotate(-12 264 248)" fill="#47280a" opacity="0.18"/>
      <!-- Papas fritas cortadas a mano a un costado -->
      <g transform="translate(344, 186) rotate(14)" fill="#f5c038" stroke="#9e6d12" stroke-width="2">
        <rect x="-18" y="-36" width="13" height="62" rx="4" transform="rotate(-14)"/>
        <rect x="-2" y="-42" width="13" height="68" rx="4" transform="rotate(-2)"/>
        <rect x="14" y="-34" width="13" height="60" rx="4" transform="rotate(12)"/>
        <rect x="26" y="-26" width="12" height="54" rx="4" transform="rotate(24)"/>
      </g>
      <!-- Hamburguesa Pinch insignia -->
      <g transform="translate(238, 212) rotate(-10)">
        <path d="M-84 18 Q-84 52 0 52 Q84 52 84 18 Z" fill="#e0a243" stroke="#9c5e14" stroke-width="2.8"/>
        <path d="M-92 6 C-92 -10 92 -10 92 6 L92 22 C92 38 -92 38 -92 22 Z" fill="#6b3015" stroke="#3b1506" stroke-width="2.8"/>
        <path d="M-86 0 L86 0 L72 20 L34 8 L0 24 L-40 10 L-74 20 Z" fill="#fff0b3" stroke="#c4a645" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M-88 -8 C-76 -22 -48 -18 -34 -10 C-14 -24 16 -20 34 -10 C54 -22 76 -18 90 -8 C74 4 42 0 18 4 C-12 0 -58 8 -88 -8 Z" fill="#46b84f" stroke="#216927" stroke-width="2.2"/>
        <path d="M-64 -14 Q-26 -30 0 -14 T64 -16" fill="none" stroke="#a65710" stroke-width="7" stroke-linecap="round"/>
        <path d="M-64 -14 Q-26 -30 0 -14 T64 -16" fill="none" stroke="#e8983a" stroke-width="3.6" stroke-linecap="round"/>
        <path d="M-82 -20 C-82 -78 82 -78 82 -20 Z" fill="#eab052" stroke="#9c5e14" stroke-width="2.8"/>
        <path d="M-54 -48 Q0 -62 54 -48" fill="none" stroke="#ffeac2" stroke-width="4" stroke-linecap="round" opacity="0.65"/>
        <circle cx="-36" cy="-42" r="2.6" fill="#fff7db"/><circle cx="0" cy="-52" r="2.6" fill="#fff7db"/>
        <circle cx="36" cy="-42" r="2.6" fill="#fff7db"/><circle cx="-18" cy="-34" r="2.4" fill="#fff7db"/>
        <circle cx="20" cy="-33" r="2.4" fill="#fff7db"/>
      </g>
    `;
  }

  return `
    <svg class="dineos-platter-photo dineos-platter-svg" viewBox="0 0 520 420" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="${uid}_porc" cx="42%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="72%" stop-color="#f5f5f7"/>
          <stop offset="100%" stop-color="#e3e5ea"/>
        </radialGradient>
        <radialGradient id="${uid}_well" cx="50%" cy="46%" r="58%">
          <stop offset="0%" stop-color="#fbfbfc"/>
          <stop offset="100%" stop-color="#eceef2"/>
        </radialGradient>
      </defs>
      <!-- Platón ovalado diagonal de porcelana blanca (estilo DineOS) -->
      <ellipse cx="266" cy="238" rx="224" ry="136" transform="rotate(-18 266 238)" fill="#0f172a" opacity="0.09"/>
      <ellipse cx="260" cy="222" rx="222" ry="134" transform="rotate(-18 260 222)" fill="url(#${uid}_porc)" stroke="#dfe2e8" stroke-width="2.5"/>
      <ellipse cx="260" cy="222" rx="184" ry="104" transform="rotate(-18 260 222)" fill="url(#${uid}_well)" stroke="#e7e9ef" stroke-width="1.8"/>
      <ellipse cx="260" cy="222" rx="216" ry="128" transform="rotate(-18 260 222)" fill="none" stroke="#ffffff" stroke-width="2.2" opacity="0.85"/>
      ${dishArt}
    </svg>
  `;
}

function selectDineOSHeroDish(dishKey) {
  dineosSelectedHeroDish = dishKey;
  document.querySelectorAll('#dineos-carousel-dots .dcd-dot').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.dish === dishKey);
  });
  renderKDSLiveKPIs();
}

function onDineOSSearchEnter(val) {
  const q = String(val || '').trim();
  if (!q) return;
  toggleKitchenAICopilot(true);
  setTimeout(() => runKitchenAIQuickPrompt(q), 120);
}

function scrollToKitchenBoard() {
  setKDSSubView('board');
}

function scrollToKitchenAlerts() {
  const el = document.getElementById('kds-service-alerts');
  if (el && !el.classList.contains('hidden')) {
    resetKDSScrollTop();
    setKDSSubView('board');
  } else {
    showKDSToast('Sin avisos pendientes de mesero o cuenta');
  }
}

function setKDSChannelFilter(channel, btn) {
  kdsChannelFilter = channel || 'all';
  document.querySelectorAll('.dineos-ch-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.channel === kdsChannelFilter);
  });
  renderKDS();
}

function toggleKDSDialFilter(statusKey) {
  const next = (kdsSubView === 'board' && kdsFilter === statusKey) ? 'all' : statusKey;
  kdsFilter = next;
  document.querySelectorAll('.dineos-filters-bar .kds-filter').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === kdsFilter);
  });
  setKDSSubView('board');
}

function buildDineOSRadialDialSVG(pct, color) {
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
  const r = 19.5;
  const cx = 36;
  const cy = 36;
  let wedgePath = '';
  if (clamped >= 99.5) {
    wedgePath = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;
  } else if (clamped > 0) {
    const angleRad = ((clamped / 100) * 360 - 90) * (Math.PI / 180);
    const x2 = cx + r * Math.cos(angleRad);
    const y2 = cy + r * Math.sin(angleRad);
    const largeArc = clamped > 50 ? 1 : 0;
    wedgePath = `<path d="M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${color}"/>`;
  }

  let ticks = '';
  for (let i = 0; i < 8; i++) {
    const a = (i * 45 - 90) * (Math.PI / 180);
    const major = i % 2 === 0;
    const r1 = major ? 24.5 : 27;
    const r2 = major ? 31.5 : 30;
    ticks += `<line x1="${(cx + r1 * Math.cos(a)).toFixed(1)}" y1="${(cy + r1 * Math.sin(a)).toFixed(1)}" x2="${(cx + r2 * Math.cos(a)).toFixed(1)}" y2="${(cy + r2 * Math.sin(a)).toFixed(1)}" stroke="${major ? 'rgba(255,255,255,0.44)' : 'rgba(255,255,255,0.18)'}" stroke-width="${major ? '1.3' : '1'}" stroke-linecap="round"/>`;
  }

  return `
    <svg class="dineos-dial-svg" viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="${cx}" cy="${cy}" r="31.5" fill="none" stroke="rgba(255,255,255,0.09)" stroke-width="1" stroke-dasharray="2 3"/>
      ${ticks}
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#2b2c32"/>
      ${wedgePath}
      <circle cx="${cx}" cy="${cy}" r="2.6" fill="#ffffff"/>
    </svg>
  `;
}

function buildAppleDotMatrixHTML(filledCols, totalCols = 7, rows = 5) {
  const heights = [2, 4, 3, 5, 4, 3, 2];
  let html = '';
  for (let c = 0; c < totalCols; c++) {
    const colActiveCount = filledCols > 0 ? Math.min(rows, Math.max(1, Math.round((heights[c % heights.length] / rows) * Math.min(rows, filledCols)))) : 0;
    html += '<div class="adm-col">';
    for (let r = rows - 1; r >= 0; r--) {
      const isLit = c < Math.max(2, filledCols) && r < colActiveCount;
      html += `<span class="adm-dot ${isLit ? 'lit' : ''}"></span>`;
    }
    html += '</div>';
  }
  return html;
}

// 5 bloques agrupados de 4x3 puntitos oscuros/claros (réplica exacta de "Current preparation" en DINEOS)
function buildDineOSGroupedDotMatrix(pct) {
  const totalCols = 20; // 5 grupos de 4 columnas x 3 filas
  const filledCols = Math.round((Math.max(0, Math.min(100, pct)) / 100) * totalCols);
  let html = '';
  for (let g = 0; g < 5; g++) {
    html += '<div class="ddg-block">';
    for (let r = 0; r < 3; r++) {
      html += '<div class="ddg-row">';
      for (let c = 0; c < 4; c++) {
        const globalCol = g * 4 + c;
        const lit = globalCol < filledCols;
        html += `<span class="ddg-dot${lit ? ' lit' : ''}"></span>`;
      }
      html += '</div>';
    }
    html += '</div>';
  }
  return html;
}

function buildDineOSSparklineSVG(values) {
  const pts = Array.isArray(values) && values.length >= 6 ? values : [0, 0, 0, 0, 0, 0];
  const maxVal = Math.max(4, ...pts);
  const w = 152;
  const h = 48;
  const stepX = w / (pts.length - 1);
  const coords = pts.map((v, i) => [
    +(i * stepX).toFixed(1),
    +(h - 8 - (v / maxVal) * (h - 18)).toFixed(1),
  ]);

  // Curva secundaria sutil ("Meta / Referencia") para réplica visual exacta
  const refVals = pts.map((v, i) => Math.max(0.6, (maxVal * (0.28 + 0.14 * Math.sin(i * 1.1)))));
  const refCoords = refVals.map((v, i) => [
    +(i * stepX).toFixed(1),
    +(h - 8 - (v / maxVal) * (h - 18)).toFixed(1),
  ]);

  const toSpline = (arr) => {
    let s = `M ${arr[0][0]} ${arr[0][1]}`;
    for (let i = 1; i < arr.length; i++) {
      const p = arr[i - 1], c = arr[i];
      const mx = ((p[0] + c[0]) / 2).toFixed(1);
      s += ` C ${mx} ${p[1]}, ${mx} ${c[1]}, ${c[0]} ${c[1]}`;
    }
    return s;
  };

  const mainD = toSpline(coords);
  const refD  = toSpline(refCoords);
  const areaD = `${mainD} L ${w} ${h} L 0 ${h} Z`;

  let peakIdx = 0;
  pts.forEach((v, i) => { if (v >= pts[peakIdx]) peakIdx = i; });
  const peak = coords[peakIdx] || coords[coords.length - 1];

  return `
    <svg class="dineos-spark-svg" viewBox="0 0 ${w} ${h}" aria-hidden="true">
      <defs>
        <linearGradient id="dineosSparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#111216" stop-opacity="0.14"/>
          <stop offset="100%" stop-color="#111216" stop-opacity="0.01"/>
        </linearGradient>
      </defs>
      <path d="${refD}" fill="none" stroke="#c9cdd6" stroke-width="1.2" stroke-linecap="round"/>
      <path d="${areaD}" fill="url(#dineosSparkFill)"/>
      <line x1="${peak[0]}" y1="${peak[1]}" x2="${peak[0]}" y2="${h - 2}" stroke="rgba(17,18,22,0.22)" stroke-width="1" stroke-dasharray="2 2"/>
      <path d="${mainD}" fill="none" stroke="#111216" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="${peak[0]}" cy="${peak[1]}" r="3" fill="#ffffff" stroke="#111216" stroke-width="1.5"/>
    </svg>
  `;
}

function buildDineOSStripedBarsHTML(allShiftOrders) {
  const slots = [
    { label: '12:00 PM', start: 0,  end: 13, amt: 0 },
    { label: '2:00 PM',  start: 13, end: 15, amt: 0 },
    { label: '4:00 PM',  start: 15, end: 17, amt: 0 },
    { label: '6:00 PM',  start: 17, end: 19, amt: 0 },
    { label: '8:00 PM',  start: 19, end: 21, amt: 0 },
    { label: '10:00 PM', start: 21, end: 24, amt: 0 },
  ];

  allShiftOrders.forEach(o => {
    const h = new Date(o.createdAt || Date.now()).getHours();
    const slot = slots.find(s => h >= s.start && h < s.end) || slots[slots.length - 1];
    slot.amt += Number(o.total) || 0;
  });

  const maxAmt = Math.max(...slots.map(s => s.amt), 0);
  const currentHour = new Date().getHours();

  return slots.map((s, idx) => {
    const idleHeights = [34, 46, 56, 38, 48, 52];
    const heightPct = maxAmt > 0
      ? Math.max(16, Math.round((s.amt / maxAmt) * 100))
      : (currentHour >= s.start && currentHour < s.end ? 46 : idleHeights[idx]);
    const isPeak = maxAmt > 0 && s.amt === maxAmt;
    return `
      <div class="dsb-col${isPeak ? ' peak' : ''}${maxAmt === 0 ? ' is-idle' : ''}" title="${s.label} · ${formatMoney(s.amt)}">
        <div class="dsb-track">
          <div class="dsb-bar" style="height:${heightPct}%"></div>
        </div>
        <span class="dsb-lbl">${s.label}</span>
      </div>
    `;
  }).join('');
}

function buildDineOSBlueGaugeSVG(mesaCnt, pickupCnt, deliveryCnt) {
  const total = mesaCnt + pickupCnt + deliveryCnt;
  const cx = 130;
  const cy = 114;
  const r = 92;
  const arcLen = Math.PI * r;

  const mFrac = total > 0 ? mesaCnt / total : 0.65;
  const pFrac = total > 0 ? pickupCnt / total : 0.25;
  const dFrac = total > 0 ? deliveryCnt / total : 0.10;

  let ticks = '';
  for (let i = 0; i <= 40; i++) {
    const a = Math.PI + (i / 40) * Math.PI;
    const rOuter = r - 4;
    const rInner = r - 20;
    const x1 = cx + rOuter * Math.cos(a);
    const y1 = cy + rOuter * Math.sin(a);
    const x2 = cx + rInner * Math.cos(a);
    const y2 = cy + rInner * Math.sin(a);
    const ratio = i / 40;
    const stroke = total === 0
      ? 'rgba(30,58,110,0.16)'
      : (ratio <= mFrac ? 'rgba(20,38,76,0.34)' : (ratio <= mFrac + pFrac ? 'rgba(72,115,176,0.22)' : 'rgba(226,110,66,0.42)'));
    ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${stroke}" stroke-width="1.35" stroke-linecap="round"/>`;
  }

  const semiPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const mLen = mFrac * arcLen;
  const pLen = pFrac * arcLen;
  const dLen = dFrac * arcLen;

  return `
    <svg class="dineos-gauge-svg" viewBox="0 0 260 124" aria-hidden="true">
      <path d="${semiPath}" fill="none" stroke="rgba(15,23,42,0.12)" stroke-width="2.2" stroke-linecap="round"/>
      ${ticks}
      ${total > 0 && mLen > 0 ? `<path d="${semiPath}" fill="none" stroke="#182742" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="${mLen.toFixed(1)} ${(arcLen + 10).toFixed(1)}" stroke-dashoffset="0"/>` : ''}
      ${total > 0 && pLen > 0 ? `<path d="${semiPath}" fill="none" stroke="#8ab2e0" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="${pLen.toFixed(1)} ${(arcLen + 10).toFixed(1)}" stroke-dashoffset="${(-mLen).toFixed(1)}"/>` : ''}
      ${total > 0 && dLen > 0 ? `<path d="${semiPath}" fill="none" stroke="#e26e42" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="${dLen.toFixed(1)} ${(arcLen + 10).toFixed(1)}" stroke-dashoffset="${(-(mLen + pLen)).toFixed(1)}"/>` : ''}
      <circle cx="${cx - r}" cy="${cy}" r="2.6" fill="#182742"/>
      <circle cx="${cx + r}" cy="${cy}" r="2.6" fill="#e26e42"/>
    </svg>
  `;
}

function renderKDSLiveKPIs() {
  if (!kdsUnlocked) return;
  loadPersistedInventory();
  const stats = calculateDailySales();

  // Actualizar mini avatares en "Selección del chef" (barra superior)
  const chefThumbsEl = document.getElementById('dineos-chef-thumbs');
  const stockSlots   = getKDSStockGroups().flatMap(g => g.items);
  const availSlots   = stockSlots.filter(it => !soldOutItems.includes(it.key)).length;
  if (chefThumbsEl && !chefThumbsEl.dataset.ready) {
    chefThumbsEl.dataset.ready = '1';
    chefThumbsEl.innerHTML = `
      <span class="dca-thumb dca-thumb-mono" aria-hidden="true">BG</span>
      <span class="dca-thumb dca-thumb-mono" aria-hidden="true">SS</span>
      <span class="dca-count" id="dineos-chef-avail-pill">+${availSlots}</span>
    `;
  } else {
    const pill = document.getElementById('dineos-chef-avail-pill');
    if (pill) pill.textContent = `+${availSlots}`;
  }

  // Contadores de filtros en vivo (respetando canal elegido para el tablero)
  const channelOrders = kdsChannelFilter === 'all'
    ? orders
    : orders.filter(o => (o.fulfillmentMode || 'dine_in') === kdsChannelFilter);

  const counts = { all: channelOrders.length, pending: 0, received: 0, preparing: 0, ready: 0 };
  channelOrders.forEach(o => {
    if (o.status && counts[o.status] !== undefined) counts[o.status] += 1;
  });

  ['all', 'pending', 'received', 'preparing', 'ready'].forEach(key => {
    const el = document.getElementById(`kds-count-${key}`);
    if (el) el.textContent = String(counts[key]);
  });

  // Badge del ícono de sobre en barra superior (órdenes activas + avisos)
  const notifCount = orders.length + (Array.isArray(serviceCalls) ? serviceCalls.length : 0);
  const badgeEl = document.getElementById('dineos-alerts-badge');
  if (badgeEl) {
    badgeEl.textContent = String(notifCount);
    badgeEl.classList.toggle('hidden', notifCount === 0);
  }

  const railOrdersBadge = document.getElementById('rail-capsule-orders-count');
  if (railOrdersBadge) {
    railOrdersBadge.textContent = String(orders.length);
    railOrdersBadge.classList.toggle('hidden', orders.length === 0);
  }

  // Conteo de canales de todo el turno (activas + cerradas)
  const allShiftMap = new Map();
  completedOrders.forEach(o => { if (o && o.id) allShiftMap.set(o.id, o); });
  orders.forEach(o => { if (o && o.id) allShiftMap.set(o.id, o); });
  const allShiftOrders = Array.from(allShiftMap.values());

  let mesaCnt = 0, pickupCnt = 0, deliveryCnt = 0, totalPaid = 0;
  allShiftOrders.forEach(o => {
    const fm = o.fulfillmentMode || 'dine_in';
    if (fm === 'pickup') pickupCnt += 1;
    else if (fm === 'delivery') deliveryCnt += 1;
    else mesaCnt += 1;
    if (o.paid) totalPaid += 1;
  });

  // 1) Top 4 Mini-KPIs blancos
  const activeCount = counts.pending + counts.received + counts.preparing;
  const kpiActiveEl = document.getElementById('kds-kpi-active');
  if (kpiActiveEl) kpiActiveEl.textContent = pad2(orders.length);

  const availEl = document.getElementById('dineos-kpi-avail');
  if (availEl) availEl.textContent = pad2(availSlots);

  const avgMins = orders.length > 0
    ? Math.max(1, Math.round(orders.reduce((s, o) => s + Math.max(0, (Date.now() - (o.createdAt || Date.now())) / 60000), 0) / orders.length))
    : 0;
  const avgTimeEl = document.getElementById('dineos-kpi-avg-time');
  const avgTimeLabel = avgMins >= 120 ? `${Math.round(avgMins / 60)} <small>h</small>` : `${avgMins} <small>min</small>`;
  const avgTimePlain = avgMins >= 120 ? `${Math.round(avgMins / 60)} h` : `${avgMins} min`;
  if (avgTimeEl) avgTimeEl.innerHTML = avgTimeLabel;

  const lowStockCount = inventoryItems.filter(it => getInventoryItemHealth(it).needsRestock).length;
  const lowStockEl = document.getElementById('dineos-kpi-low-stock');
  if (lowStockEl) lowStockEl.textContent = pad2(lowStockCount);

  // 2) Tarjeta Negra Obsidiana · 4 Diales Radiales tipo reloj (DineOS)
  const obsTotalEl = document.getElementById('dineos-obs-total-num');
  if (obsTotalEl) obsTotalEl.textContent = String(channelOrders.length);

  const dialsEl = document.getElementById('dineos-status-dials');
  if (dialsEl) {
    const denom = Math.max(1, channelOrders.length);
    const dialSpecs = [
      { key: 'pending',   label: 'Nuevas',     count: counts.pending,   color: '#f5df89' },
      { key: 'received',  label: 'Recibidas',  count: counts.received,  color: '#b3cae8' },
      { key: 'preparing', label: 'Preparando', count: counts.preparing, color: '#ffffff' },
      { key: 'ready',     label: 'Listas',     count: counts.ready,     color: '#e67b4c' },
    ];
    dialsEl.innerHTML = dialSpecs.map(d => {
      const pct = channelOrders.length > 0 ? Math.round((d.count / denom) * 100) : 0;
      const isSelected = kdsFilter === d.key;
      return `
        <button type="button" class="dineos-dial-tile${isSelected ? ' active' : ''}" onclick="toggleKDSDialFilter('${d.key}')" title="Filtrar comandas: ${d.label}">
          <span class="ddt-pct">${pct}<small>%</small></span>
          ${buildDineOSRadialDialSVG(pct, d.color)}
          <span class="ddt-label">${d.label} <em>(${d.count})</em></span>
        </button>
      `;
    }).join('');
  }

  // 3) Lienzo Abierto Izquierdo · Platón Diagonal de Estudio + Carrusel de 3 Platillos Pinch
  const bd = stats.breakdown || {};
  const autoKey = (bd.entrees && bd.entrees.qty > ((bd.burgers_sandwiches && bd.burgers_sandwiches.qty) || 0))
    ? 'skirt_steak'
    : 'pinch_burger';
  const heroKey = dineosSelectedHeroDish || autoKey;
  const heroCatalog = {
    pinch_burger:   { title: 'Pinch<br/>Burger',             price: '$20.00', kicker: (bd.burgers_sandwiches && bd.burgers_sandwiches.qty > 0) ? 'Platillo líder hoy' : 'Platillo insignia', rating: '4.9' },
    skirt_steak:    { title: 'Black Angus<br/>Skirt Steak',  price: '$37.00', kicker: (bd.entrees && bd.entrees.qty > 0) ? 'Líder en cortes' : 'Certified Angus Beef', rating: '4.9' },
    cuban_sandwich: { title: 'Pinch Cuban<br/>Sandwich',     price: '$18.00', kicker: 'Favorito de Miami', rating: '4.8' },
  };
  const hc = heroCatalog[heroKey] || heroCatalog.pinch_burger;

  const heroArtEl = document.getElementById('dineos-hero-dish-art');
  const heroNameEl = document.getElementById('dineos-hero-dish-name');
  const heroSubEl = document.getElementById('dineos-hero-dish-sub');
  const heroKickerEl = document.getElementById('dineos-hero-kicker');

  if (heroNameEl) heroNameEl.innerHTML = hc.title;
  if (heroKickerEl) heroKickerEl.textContent = hc.kicker;
  if (heroSubEl) heroSubEl.innerHTML = `<span class="dineos-star">★</span><span>${hc.rating} · ${hc.price}</span>`;

  document.querySelectorAll('#dineos-carousel-dots .dcd-dot').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.dish === heroKey);
  });

  if (heroArtEl && heroArtEl.dataset.renderedDish !== heroKey) {
    heroArtEl.dataset.renderedDish = heroKey;
    const visualMarkup = heroKey === 'pinch_burger'
      ? `<div class="dineos-hero-photo-wrap"><img src="assets/pinch-burger-hero.jpg?v=20261124v43" alt="Pinch Burger" class="dineos-hero-photo-img" /></div>`
      : buildDineOSPinchHeroPlatterSVG(heroKey);
    heroArtEl.innerHTML = `
      ${visualMarkup}
      <span class="dineos-hotspot h1" onclick="setKDSSubView('stock')" title="Ver stock de proteínas y cortes"></span>
      <span class="dineos-hotspot h2" onclick="setKDSSubView('stock')" title="Ver stock de panadería y pastas"></span>
      <span class="dineos-hotspot h3" onclick="setKDSSubView('stock')" title="Ver stock de verduras, quesos y salsas"></span>
    `;
    heroArtEl.classList.remove('hero-platter-swap');
    void heroArtEl.offsetWidth;
    heroArtEl.classList.add('hero-platter-swap');
  }

  // Progreso de preparación del turno (5 bloques 4x3 puntitos + %)
  const doneOrReady = completedOrders.length + counts.ready;
  const prepPct = allShiftOrders.length > 0
    ? Math.round((doneOrReady / allShiftOrders.length) * 100)
    : 0;
  const prepEtaEl = document.getElementById('dineos-prep-eta');
  const prepPctEl = document.getElementById('dineos-prep-pct');
  const dotMatrixEl = document.getElementById('kds-kpi-dot-matrix');
  const kpiActiveSub = document.getElementById('kds-kpi-active-sub');
  const statusSubTxt = activeCount > 0
    ? `${counts.preparing} cocinando · ${counts.pending + counts.received} en cola`
    : (counts.ready > 0 ? `${counts.ready} listos para entregar` : 'Sin espera en barra');

  if (prepEtaEl) prepEtaEl.textContent = orders.length > 0 ? `⏱ ETA: ${avgTimePlain}` : '⏱ Sin espera';
  if (kpiActiveSub) kpiActiveSub.textContent = statusSubTxt;
  if (prepPctEl) prepPctEl.textContent = `${prepPct}%`;
  if (dotMatrixEl) dotMatrixEl.innerHTML = buildDineOSGroupedDotMatrix(prepPct);

  // Platillos vendidos + mini sparkline dual
  const activeUnits = orders.filter(o => o.status !== 'ready').reduce((s, o) => s + (o.items || []).reduce((a, i) => a + (Number(i.qty) || 0), 0), 0);
  const totalShiftUnits = stats.totalUnits + activeUnits;
  const unitsEl = document.getElementById('dineos-units-sold');
  const sparkEl = document.getElementById('dineos-units-sparkline');
  if (unitsEl) unitsEl.textContent = String(totalShiftUnits);
  if (sparkEl) {
    const recentVals = allShiftOrders.slice(-6).map(o => (o.items || []).reduce((a, i) => a + (Number(i.qty) || 0), 0));
    while (recentVals.length < 6) recentVals.unshift(0);
    sparkEl.innerHTML = buildDineOSSparklineSVG(recentVals);
  }

  // 4) Tarjeta Pastel Amarillo: Resumen de Ventas + 6 barras rayadas
  const kpiSalesEl = document.getElementById('kds-kpi-sales');
  const kpiSalesSub = document.getElementById('kds-kpi-sales-sub');
  const closedEl = document.getElementById('dineos-sales-closed');
  const avgEl = document.getElementById('dineos-sales-avg');
  const paidEl = document.getElementById('kds-kpi-paid');
  const yellowBarsEl = document.getElementById('dineos-yellow-bars');
  const avgTicket = stats.ordersCount > 0 ? Math.round(stats.totalRevenue / stats.ordersCount) : 0;

  if (kpiSalesEl) kpiSalesEl.textContent = formatMoney(stats.totalRevenue);
  if (kpiSalesSub) kpiSalesSub.textContent = stats.ordersCount > 0 ? `↑ ${stats.ordersCount} cerradas` : '↑ En vivo';
  if (closedEl) closedEl.textContent = String(stats.ordersCount);
  if (avgEl) avgEl.textContent = formatMoney(avgTicket);
  if (paidEl) paidEl.textContent = String(totalPaid);
  if (yellowBarsEl) yellowBarsEl.innerHTML = buildDineOSStripedBarsHTML(allShiftOrders);

  // 5) Tarjeta Pastel Azul: Canales y Mesas + Gauge semicircular rayado
  const gaugeBox = document.getElementById('dineos-blue-gauge');
  const gaugeTotal = document.getElementById('dineos-gauge-total');
  const chMesa = document.getElementById('dineos-ch-mesa');
  const chPickup = document.getElementById('dineos-ch-pickup');
  const chDeliv = document.getElementById('dineos-ch-delivery');

  if (gaugeBox) gaugeBox.innerHTML = buildDineOSBlueGaugeSVG(mesaCnt, pickupCnt, deliveryCnt);
  if (gaugeTotal) gaugeTotal.textContent = String(allShiftOrders.length);
  if (chMesa) chMesa.textContent = pad2(mesaCnt);
  if (chPickup) chPickup.textContent = pad2(pickupCnt);
  if (chDeliv) chDeliv.textContent = pad2(deliveryCnt);
}

function seedDemoLiveKdsOrders() {
  // Desactivado para producción: el KDS opera únicamente con órdenes reales
}

function setKDSFilter(filter, btn) {
  kdsFilter = filter;
  document.querySelectorAll('.dineos-filters-bar .kds-filter').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === kdsFilter);
  });
  if (btn) btn.classList.add('active');
  renderKDS();
}

function buildKDSOrderCardHTML(order, { compactKanban = false } = {}) {
  const meta = STATUS_META[order.status] || STATUS_META.pending;
  const elapsed = Math.floor((Date.now() - order.createdAt) / 60000);
  const timerClass = elapsed >= 20 ? 'alert' : elapsed >= 10 ? 'warn' : '';
  const timerTxt = elapsed < 1 ? '< 1 min' : `${elapsed} min`;
  const fMode = order.fulfillmentMode || 'dine_in';
  const isRemote = fMode === 'pickup' || fMode === 'delivery';
  const tableGroup = getTableGroupSummary(order.table, order);
  const hasTableGroup = !isRemote && (tableGroup.diners.length > 1 || tableGroup.tableOrdersCount > 1);
  const avatar = getAvatarInitialsAndTone(order.guestName, order.table);

  const justTransitioned = Boolean(
    lastMovedOrderMeta &&
    lastMovedOrderMeta.id === order.id &&
    (Date.now() - lastMovedOrderMeta.ts < 850)
  );

  const payBadgeHtml = order.paid
    ? `<span class="kds-pay-badge">✓ Pagado · ${escapeHTML(order.paymentLabel || 'Apple Pay')}</span>`
    : `<span class="kds-unpaid-badge">En cuenta</span>`;

  let fulfillmentBannerHtml = '';
  if (fMode === 'pickup') {
    fulfillmentBannerHtml = `
      <div class="kds-fulfillment-banner mode-pickup">
        <span>Pickup · ${escapeHTML(order.pickupTime || 'Lo antes posible')}</span>
        ${order.customerPhone ? `<span class="kds-fulfillment-sub">Tel: ${escapeHTML(order.customerPhone)}</span>` : ''}
      </div>
    `;
  } else if (fMode === 'delivery') {
    fulfillmentBannerHtml = `
      <div class="kds-fulfillment-banner mode-delivery">
        <span>A Domicilio (+$${order.deliveryFee || 25})</span>
        <span class="kds-fulfillment-sub">${escapeHTML(order.deliveryAddress || 'Sin dirección')}${order.deliveryNotes ? ` · ${escapeHTML(order.deliveryNotes)}` : ''}</span>
        ${order.customerPhone ? `<span class="kds-fulfillment-sub">Tel: ${escapeHTML(order.customerPhone)}</span>` : ''}
      </div>
    `;
  }

  const actionsBtns = (() => {
    if (order.status === 'pending') return `
      <button class="order-btn btn-primary-step" onclick="changeOrderStatus(${order.id}, 'preparing')">▶ Cocinar</button>
      <button class="order-btn btn-sub-step" onclick="changeOrderStatus(${order.id}, 'received')" title="Confirmar recepción en barra">✓ Recibir</button>
      <button class="order-btn btn-delete" onclick="deleteOrder(${order.id})" title="Cancelar orden">✕</button>
    `;
    if (order.status === 'received') return `
      <button class="order-btn btn-primary-step" onclick="changeOrderStatus(${order.id}, 'preparing')">Pasar a Fuego</button>
      <button class="order-btn" onclick="changeOrderStatus(${order.id}, 'pending')" title="Regresar a pendientes">↩</button>
    `;
    if (order.status === 'preparing') return `
      <button class="order-btn btn-ready" onclick="changeOrderStatus(${order.id}, 'ready')">✓ Marcar Listo</button>
      <button class="order-btn btn-fast-deliver" onclick="readyAndDeliverOrder(${order.id})" title="Marcar listo y entregar en 1 clic">Listo y Entregar</button>
      <button class="order-btn" onclick="changeOrderStatus(${order.id}, 'received')" title="Regresar">↩</button>
    `;
    return `
      <button class="order-btn btn-deliver-final" onclick="deliverOrder(${order.id})">✓ Entregar Orden</button>
      <button class="order-btn" onclick="changeOrderStatus(${order.id}, 'preparing')" title="Volver a preparación">↩ Fuego</button>
    `;
  })();

  return `
    <div class="order-card status-${order.status}${compactKanban ? ' is-kanban-card' : ''}${justTransitioned ? ' just-transitioned' : ''}" id="order-${order.id}">
      <div class="order-card-header">
        <div class="order-card-id-group">
          <span class="order-num">#${String(order.num).padStart(3, '0')}</span>
          <span class="order-timer ${timerClass}" data-order-id="${order.id}">${timerTxt}</span>
        </div>
        <span class="status-badge badge-${order.status}">
          <span class="led-dot ${meta.ledClass}"></span>
          <span>${meta.label}</span>
        </span>
      </div>

      <div class="order-guest-strip">
        <div class="order-avatar ${avatar.tone}">${escapeHTML(avatar.initials)}</div>
        <div class="order-guest-meta">
          <span class="order-table">${escapeHTML(order.table)}</span>
          <span class="order-guest-sub">${order.guestName ? escapeHTML(order.guestName) : 'Comensal'}</span>
        </div>
        <div class="order-price-col">
          <span class="order-price-val">${formatMoney(order.total)}</span>
          ${payBadgeHtml}
        </div>
      </div>

      ${fulfillmentBannerHtml}
      ${(order.loyaltyDiscount > 0 || order.viaMeseroAI) ? `
        <div class="kds-ai-loyalty-strip">
          ${order.viaMeseroAI ? `<span class="kds-ai-order-tag">✦ Mesero IA</span>` : ''}
          ${order.loyaltyDiscount > 0 ? `<span class="kds-loyalty-order-tag">Canje: ${escapeHTML(order.loyaltyRewardLabel || 'Recompensa')} (-$${order.loyaltyDiscount})</span>` : ''}
        </div>
      ` : ''}
      ${hasTableGroup ? `
        <div class="kds-table-group-pill">
          ${escapeHTML(order.table)} · ${tableGroup.diners.length} ${tableGroup.diners.length === 1 ? 'comensal' : 'comensales'} · Mesa: ${formatMoney(tableGroup.tableTotal)}
        </div>
      ` : ''}

      <div class="order-items-list">
        ${order.items.map(it => {
          const extArr = Array.isArray(it.extras) ? it.extras : [];
          const sinArr = Array.isArray(it.removed) ? it.removed : [];
          const hasModTags = Boolean(it.option || extArr.length > 0 || sinArr.length > 0 || it.note);
          const modTagsHtml = hasModTags
            ? `<span class="kds-mod-tags">
                ${it.option ? `<span class="kds-mod-tag mod-opt">${escapeHTML(it.option)}</span>` : ''}
                ${extArr.length > 0 ? `<span class="kds-mod-tag mod-extra">+ EXTRAS: ${extArr.map(e => escapeHTML(e.name)).join(', ')}</span>` : ''}
                ${sinArr.length > 0 ? `<span class="kds-mod-tag mod-sin">SIN: ${sinArr.map(r => escapeHTML(r)).join(', ')}</span>` : ''}
                ${it.note ? `<span class="order-item-note">Nota: ${escapeHTML(it.note)}</span>` : ''}
              </span>`
            : '';
          return `
          <div class="order-item-row">
            <span class="order-item-qty">${it.qty}×</span>
            <span class="order-item-name">${escapeHTML(it.name)}${modTagsHtml}</span>
          </div>`;
        }).join('')}
      </div>

      <div class="order-actions">${actionsBtns}</div>
    </div>`;
}

function renderKDS() {
  if (!kdsUnlocked) return;
  renderKDSLiveKPIs();

  const board = document.getElementById('kds-board');
  if (!board) return;

  let baseOrders = orders.slice();

  if (kdsChannelFilter !== 'all') {
    baseOrders = baseOrders.filter(o => (o.fulfillmentMode || 'dine_in') === kdsChannelFilter);
  }

  if (kdsSearchQuery) {
    baseOrders = baseOrders.filter(o => {
      const hay = [
        String(o.num || ''),
        `#${String(o.num || '').padStart(3, '0')}`,
        o.table || '',
        o.guestName || '',
        o.fulfillmentMode || '',
        ...(Array.isArray(o.items) ? o.items.map(i => i.name || '') : []),
      ].join(' ').toLowerCase();
      return hay.includes(kdsSearchQuery);
    });
  }

  // MODO KANBAN UNIFICADO EN 3 COLUMNAS (SIN BRINCOS DE PESTAÑA)
  if (kdsFilter === 'all') {
    if (baseOrders.length === 0 && kdsSearchQuery) {
      board.classList.remove('is-kanban-mode');
      board.innerHTML = `
        <div class="kds-empty" id="kds-empty">
          <div class="kds-empty-icon">⌕</div>
          <p class="kds-empty-title">Sin resultados para tu búsqueda</p>
          <p class="kds-empty-sub">Prueba con otro número de mesa, cliente o limpia el filtro.</p>
        </div>`;
    } else {
      board.classList.add('is-kanban-mode');
      const colIncoming  = baseOrders.filter(o => o.status === 'pending' || o.status === 'received');
      const colPreparing = baseOrders.filter(o => o.status === 'preparing');
      const colReady     = baseOrders.filter(o => o.status === 'ready');

      const lanes = [
        {
          id: 'incoming',
          title: 'Entrantes',
          sub: 'Por recibir / iniciar',
          emptyIcon: uiIcon('bell', 'xl'),
          emptyText: 'Sin órdenes entrantes',
          list: colIncoming,
          extraAction: '',
        },
        {
          id: 'preparing',
          title: 'En Preparación',
          sub: 'En parrilla y barra fría',
          emptyIcon: uiIcon('flame', 'xl'),
          emptyText: 'Fuego libre por ahora',
          list: colPreparing,
          extraAction: '',
        },
        {
          id: 'ready',
          title: 'Listos / Barra',
          sub: 'Listos para entrega',
          emptyIcon: uiIcon('check', 'xl'),
          emptyText: 'Barra despejada',
          list: colReady,
          extraAction: colReady.length > 1
            ? `<button type="button" class="kds-deliver-all-btn" onclick="deliverAllReadyOrders()">✓ Entregar todas (${colReady.length})</button>`
            : '',
        },
      ];

      board.innerHTML = lanes.map(lane => `
        <div class="kds-kanban-col col-${lane.id}">
          <div class="kds-kanban-col-head">
            <div class="kkc-title-group">
              <span class="kkc-dot"></span>
              <div class="kkc-texts">
                <h3>${lane.title}</h3>
                <span>${lane.sub}</span>
              </div>
            </div>
            <div class="kkc-right-tools">
              ${lane.extraAction}
              <span class="kkc-count">${lane.list.length}</span>
            </div>
          </div>
          <div class="kds-kanban-col-body">
            ${lane.list.length > 0
              ? lane.list.map(o => buildKDSOrderCardHTML(o, { compactKanban: true })).join('')
              : `<div class="kds-kanban-lane-empty"><span>${lane.emptyIcon}</span><p>${lane.emptyText}</p></div>`
            }
          </div>
        </div>
      `).join('');
    }
  } else {
    // MODO ENFOQUE POR ESTADO INDIVIDUAL (CON BOTÓN DE RETORNO RÁPIDO A KANBAN)
    board.classList.remove('is-kanban-mode');
    const filtered = baseOrders.filter(o => o.status === kdsFilter);
    const metaLabel = (STATUS_META[kdsFilter] && STATUS_META[kdsFilter].label) || kdsFilter;
    const focusBanner = `
      <div class="kds-focus-banner">
        <span>Viendo solo estado: <strong>${escapeHTML(metaLabel)}</strong></span>
        <button type="button" onclick="setKDSFilter('all')">⇄ Volver a Vista Kanban (3 columnas)</button>
      </div>
    `;

    if (filtered.length === 0) {
      board.innerHTML = focusBanner + `
        <div class="kds-empty" id="kds-empty">
          <div class="kds-empty-icon">${kdsSearchQuery ? uiIcon('search', 'xl') : uiIcon('utensils', 'xl')}</div>
          <p class="kds-empty-title">${kdsSearchQuery ? 'Sin resultados para tu búsqueda' : `Sin comandas en "${metaLabel}"`}</p>
          <p class="kds-empty-sub">${kdsSearchQuery ? 'Prueba con otro número de mesa, cliente o limpia el filtro.' : 'Cambia a Vista Kanban para monitorear entrantes, fuego y barra juntos.'}</p>
        </div>`;
    } else {
      board.innerHTML = focusBanner + filtered.map(order => buildKDSOrderCardHTML(order, { compactKanban: false })).join('');
    }
  }

  if (typeof updateKitchenCopilotTelemetry === 'function') {
    updateKitchenCopilotTelemetry();
  }
}

function changeOrderStatus(orderId, newStatus) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  const prevStatus = order.status;
  order.status = newStatus;
  if (newStatus === 'ready') order.readyAt = Date.now();
  if ((newStatus === 'preparing' || newStatus === 'ready') && !order.inventoryDeducted) {
    deductInventoryForOrder(order, { silent: false });
  }
  lastMovedOrderMeta = { id: orderId, status: newStatus, ts: Date.now() };
  persistOrders();
  publishCloudSync('ORDER_STATUS', { id: orderId, status: newStatus, readyAt: order.readyAt || null });
  renderKDS();
  renderDailySales();
  renderKDSStockPanel();
  notifyClientIfMyOrderChanged(order.id, prevStatus, newStatus, order.num);

  if (kdsFilter !== 'all' && kdsFilter !== newStatus && typeof showKDSToast === 'function') {
    const label = (STATUS_META[newStatus] && STATUS_META[newStatus].label) || newStatus;
    showKDSToast(`Orden #${String(order.num).padStart(3, '0')} → ${label}`);
  }

  // Historial mensual (base de datos): guardar venta al marcar "Listo"
  if (newStatus === 'ready') {
    recordSalesForOrders([order], { cloud: true });
  } else if (prevStatus === 'ready') {
    removeSaleForOrder(order.id, { cloud: true });
  }
}

function readyAndDeliverOrder(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  const prevStatus = order.status;
  order.status = 'ready';
  order.readyAt = order.readyAt || Date.now();
  if (!order.inventoryDeducted) {
    deductInventoryForOrder(order, { silent: false });
  }
  notifyClientIfMyOrderChanged(order.id, prevStatus, 'ready', order.num);
  deliverOrder(orderId);
}

function deliverAllReadyOrders() {
  const readyList = orders.filter(
    o => o.status === 'ready' && (kdsChannelFilter === 'all' || (o.fulfillmentMode || 'dine_in') === kdsChannelFilter)
  );
  if (readyList.length === 0) return;

  const deliveredIds = new Set();
  readyList.forEach(order => {
    deliveredIds.add(order.id);
    if (!completedOrders.some(c => c.id === order.id)) {
      completedOrders.push({ ...order, status: 'ready', deliveredAt: Date.now() });
    }
    publishCloudSync('ORDER_DELIVER', { id: order.id, order });
  });

  recordSalesForOrders(readyList, { cloud: true });
  orders = orders.filter(o => !deliveredIds.has(o.id));
  persistOrders();
  renderKDS();
  renderDailySales();
  renderClientTracker();
  updateHeaderTrackerPill();

  if (typeof showKDSToast === 'function') {
    showKDSToast(`${readyList.length} ${readyList.length === 1 ? 'orden entregada' : 'órdenes entregadas'}`);
  }
}

// Archiva un pedido "Listo" como entregado para limpiar el tablero KDS sin perder su venta en el Corte del Día
function deliverOrder(orderId) {
  if (deliveringOrderIds.has(orderId)) return;
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  const finalizeDeliver = () => {
    const target = orders.find(o => o.id === orderId) || order;
    if (target && target.status === 'ready') {
      if (!completedOrders.some(c => c.id === target.id)) {
        completedOrders.push({ ...target, status: 'ready', deliveredAt: Date.now() });
      }
      recordSalesForOrders([target], { cloud: true });
    }
    orders = orders.filter(o => o.id !== orderId);
    persistOrders();
    publishCloudSync('ORDER_DELIVER', { id: orderId, order: target });
    renderKDS();
    renderDailySales();
    renderClientTracker();
    updateHeaderTrackerPill();
    if (typeof showKDSToast === 'function' && target) {
      showKDSToast(`Orden #${String(target.num).padStart(3, '0')} entregada`);
    }
  };

  const cardEl = document.getElementById(`order-${orderId}`);
  if (cardEl) {
    deliveringOrderIds.add(orderId);
    cardEl.classList.add('is-delivering-out');
    setTimeout(() => {
      deliveringOrderIds.delete(orderId);
      finalizeDeliver();
    }, 180);
  } else {
    finalizeDeliver();
  }
}

function deleteOrder(orderId) {
  const target = orders.find(o => o.id === orderId);
  if (target && target.inventoryDeducted && target.status === 'pending') {
    restoreInventoryForOrder(target);
  }
  orders = orders.filter(o => o.id !== orderId);
  persistOrders();
  publishCloudSync('ORDER_DELETE', { id: orderId });
  renderKDS();
  renderDailySales();
  renderKDSStockPanel();
  renderClientTracker();
  updateHeaderTrackerPill();
}

// ══════════════════════════════════════════════
//  CORTE DEL DÍA ("VENTAS DEL DÍA" — PEDIDOS LISTOS)
// ══════════════════════════════════════════════
function formatMoney(amount) {
  return '$' + Number(amount || 0).toLocaleString('es-MX');
}

function resolvePinchOrderItemCategory(it) {
  if (!it) return 'pinch_bites';
  const rawCat = String(it.category || '').toLowerCase();
  const validCats = ['pinch_bites', 'burgers_sandwiches', 'entrees', 'sides', 'desserts', 'drinks'];
  if (validCats.includes(rawCat)) return rawCat;

  const key = String(it.key || '').toLowerCase();
  const dishId = it.dishId || (key.startsWith('dish:') ? key.slice(5).split('|')[0] : '');
  if (dishId) {
    const found = PINCH_MENU_ITEMS.find(d => d.id === dishId);
    if (found) return found.category;
  }

  const name = normalizeSpanishQuery(it.name || '');
  const st   = String(it.station || '').toLowerCase();
  if (st === 'drink' || key.startsWith('drink_') || /(jamaica|horchata|coke|coca|sprite|saratoga|agua|bebida)/.test(name)) {
    return 'drinks';
  }
  const byName = PINCH_MENU_ITEMS.find(d => normalizeSpanishQuery(d.name) === name);
  if (byName) return byName.category;
  if (/(burger|sandwich|blt|cuban|mahi)/.test(name)) return 'burgers_sandwiches';
  if (/(steak|ribs|tagliatelle|bucatini|eggs|french toast)/.test(name)) return 'entrees';
  if (/(fries|potato|puree|focaccia|broccolini|brussel|petit salad)/.test(name)) return 'sides';
  if (/(pudding|cookie|lime pie|postre)/.test(name)) return 'desserts';
  return 'pinch_bites';
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
    pinch_bites:        { qty: 0, amount: 0 },
    burgers_sandwiches: { qty: 0, amount: 0 },
    entrees:            { qty: 0, amount: 0 },
    sides:              { qty: 0, amount: 0 },
    desserts:           { qty: 0, amount: 0 },
    drinks:             { qty: 0, amount: 0, aguas: 0, jamaica: 0, horchata: 0, sodas: 0 },
  };
  const dishCountsMap = new Map();

  readyList.forEach(order => {
    const items = Array.isArray(order.items) ? order.items : [];
    let computedOrderTotal = 0;

    items.forEach(it => {
      const qty     = Number(it.qty) || 0;
      const price   = Number(it.price) || 0;
      const lineAmt = qty * price;
      const key     = String(it.key || '').toLowerCase();
      const name    = normalizeSpanishQuery(it.name || '');

      computedOrderTotal += lineAmt;
      totalUnits += qty;

      const labelKey = String(it.name || 'Platillo');
      const prevDish = dishCountsMap.get(labelKey) || { name: labelKey, emoji: '', qty: 0 };
      prevDish.qty += qty;
      dishCountsMap.set(labelKey, prevDish);

      const cat = resolvePinchOrderItemCategory(it);
      if (breakdown[cat]) {
        breakdown[cat].qty    += qty;
        breakdown[cat].amount += lineAmt;
      }
      if (cat === 'drinks') {
        if (key.includes('jamaica') || name.includes('jamaica')) {
          breakdown.drinks.aguas   += qty;
          breakdown.drinks.jamaica += qty;
        } else if (key.includes('horchata') || name.includes('horchata')) {
          breakdown.drinks.aguas    += qty;
          breakdown.drinks.horchata += qty;
        } else {
          breakdown.drinks.sodas += qty;
        }
      }
    });

    totalRevenue += (typeof order.total === 'number' ? order.total : computedOrderTotal);
  });

  const sortedDishes = Array.from(dishCountsMap.values()).sort((a, b) => b.qty - a.qty);
  const topDish = sortedDishes[0] || null;

  return {
    ordersCount: readyList.length,
    totalRevenue,
    totalUnits,
    breakdown,
    topDish,
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
  const listEl        = document.getElementById('sales-products-list');

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
    if (stats.topDish && stats.topDish.qty > 0) {
      topProdEl.textContent = `${stats.topDish.name} (${stats.topDish.qty})`;
    } else {
      topProdEl.textContent = '—';
    }
  }

  const rev = Math.max(1, stats.totalRevenue);
  const pct = (amt) => stats.totalRevenue > 0 ? Math.min(100, Math.round((amt / rev) * 100)) : 0;

  if (listEl) {
    const bd = stats.breakdown;
    const drinksSub = bd.drinks.qty > 0
      ? `Aguas Frescas: ${bd.drinks.aguas} (Jamaica ${bd.drinks.jamaica} · Horchata ${bd.drinks.horchata}) · Bebidas Pinch: ${bd.drinks.sodas}`
      : 'Pinch Drinks + Aguas Frescas (Jamaica y Horchata) · $4–$6';

    const catRows = [
      { id: 'pinch_bites',        emoji: 'PB', tone: 'tone-amber',  name: 'Pinch Bites',              sub: 'Entradas y bocados · $12–$21', data: bd.pinch_bites },
      { id: 'burgers_sandwiches', emoji: 'BS', tone: 'tone-orange', name: 'Burgers & Sandwiches',     sub: 'Hamburguesas y sándwiches · $17–$23', data: bd.burgers_sandwiches },
      { id: 'entrees',            emoji: 'EN', tone: 'tone-plum',   name: 'Entrees',                  sub: 'Cortes Angus, ribs y pastas · $14–$39', data: bd.entrees },
      { id: 'sides',              emoji: 'SD', tone: 'tone-sage',   name: 'Sides',                    sub: 'Guarniciones hechas en casa · $5–$12', data: bd.sides },
      { id: 'desserts',           emoji: 'DS', tone: 'tone-rose',   name: 'Desserts',                 sub: 'Postres artesanales · $5–$16', data: bd.desserts },
      { id: 'drinks',             emoji: 'DR', tone: 'tone-sky',    name: 'Drinks & Aguas Frescas',   sub: drinksSub, data: bd.drinks },
    ];

    listEl.innerHTML = catRows.map(row => `
      <div class="sales-product-row" data-sales-cat="${row.id}">
        <div class="sales-prod-main">
          <div class="sales-prod-left">
            <span class="sales-prod-icon-circle ${row.tone}">${row.emoji}</span>
            <div class="sales-prod-texts">
              <span class="sales-prod-name">${escapeHTML(row.name)}</span>
              <span class="sales-prod-sub">${escapeHTML(row.sub)}</span>
            </div>
          </div>
          <div class="sales-prod-right">
            <span class="sales-prod-qty">${row.data.qty}</span>
            <span class="sales-prod-subtotal">${formatMoney(row.data.amount)}</span>
          </div>
        </div>
        <div class="sales-prod-bar-track">
          <div class="sales-prod-bar-fill" style="width: ${pct(row.data.amount)}%"></div>
        </div>
      </div>
    `).join('');
  }

  renderSalesAppleCharts(stats);
  renderKDSLiveKPIs();
  renderExecutiveExcelPreview();
}

function renderSalesAppleCharts(stats) {
  const DAILY_TARGET = 1500;
  const goalPct = Math.min(100, Math.round((stats.totalRevenue / DAILY_TARGET) * 100));

  // 1. Mini KPI visual helpers (Dot Matrix & Hatched Goal Meter)
  const ticketMatrix = document.getElementById('sales-ticket-dot-matrix');
  if (ticketMatrix) {
    const avgTicket = stats.ordersCount > 0 ? Math.round(stats.totalRevenue / stats.ordersCount) : 0;
    const level = avgTicket > 0 ? Math.min(7, Math.max(2, Math.round(avgTicket / 25))) : 3;
    ticketMatrix.innerHTML = buildAppleDotMatrixHTML(level);
  }
  const goalPctBadge = document.getElementById('sales-goal-pct-badge');
  const goalMiniBar  = document.getElementById('sales-goal-mini-bar');
  if (goalPctBadge) goalPctBadge.textContent = `${goalPct}%`;
  if (goalMiniBar)  goalMiniBar.style.width  = `${goalPct}%`;

  // Recolectar todas las órdenes del turno (activas + completadas)
  const allShiftMap = new Map();
  completedOrders.forEach(o => { if (o && o.id) allShiftMap.set(o.id, o); });
  orders.forEach(o => { if (o && o.id) allShiftMap.set(o.id, o); });
  const allShiftOrders = Array.from(allShiftMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // 2. Gráfica 1: Ritmo de Ventas (Capsules Verde Salvia + Barra Pico Naranja + Rayado Diagonal)
  const hourlyEl = document.getElementById('sales-hourly-chart');
  if (hourlyEl) {
    const slots = [
      { label: '12h', h: 12, val: 0 },
      { label: '13h', h: 13, val: 0 },
      { label: '14h', h: 14, val: 0 },
      { label: '15h', h: 15, val: 0 },
      { label: '16h', h: 16, val: 0 },
      { label: '17h', h: 17, val: 0 },
      { label: '18h', h: 18, val: 0 },
      { label: '19h', h: 19, val: 0 },
    ];

    if (allShiftOrders.length > 0) {
      allShiftOrders.forEach((o, idx) => {
        const dt = new Date(o.readyAt || o.createdAt || Date.now());
        const hr = dt.getHours();
        const found = slots.find(s => s.h === hr);
        if (found) {
          found.val += Number(o.total) || 0;
        } else {
          // Distribuir órdenes fuera de 12-19h en bloques activos para mantener gráfica rica
          slots[idx % slots.length].val += Number(o.total) || 0;
        }
      });
    }

    const hasReal = slots.some(s => s.val > 0);
    // Perfil sutil de guía cuando aún no hay ventas del turno
    const displayVals = hasReal ? slots.map(s => s.val) : [52, 44, 68, 56, 82, 40, 58, 46];
    const maxVal = Math.max(1, ...displayVals);
    let peakIdx = 0;
    displayVals.forEach((v, i) => { if (v >= displayVals[peakIdx]) peakIdx = i; });

    hourlyEl.innerHTML = `
      <div class="apple-bar-chart-grid">
        <div class="apple-bar-yaxis">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0</span>
        </div>
        <div class="apple-bar-cols">
          ${slots.map((slot, idx) => {
            const rawVal = displayVals[idx];
            const isEmptyReal = hasReal && rawVal === 0;
            const pctH = isEmptyReal ? 14 : Math.max(22, Math.round((rawVal / maxVal) * 84));
            const isPeak = idx === peakIdx;
            const tooltipLabel = hasReal ? formatMoney(rawVal) : `${pctH}%`;
            return `
              <div class="apple-bar-col">
                <div class="apple-bar-track">
                  <div class="apple-bar-fill ${isPeak ? 'is-peak' : ''} ${(!hasReal || isEmptyReal) ? 'is-ghost' : ''}" style="height:${pctH}%">
                    ${isPeak ? `<span class="apple-peak-tooltip">${tooltipLabel}</span>` : ''}
                  </div>
                </div>
                <span class="apple-bar-xlabel">${slot.label}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // 3. Gráfica 2: Flujo de Demanda (SVG Spline Elegante sobre Líneas Verticales + Pill Naranja)
  const splineEl = document.getElementById('sales-demand-spline');
  if (splineEl) {
    const bd = stats.breakdown;
    const rawCats = [
      { label: 'Bites',    val: bd.pinch_bites.qty },
      { label: 'Burgers',  val: bd.burgers_sandwiches.qty },
      { label: 'Entrees',  val: bd.entrees.qty },
      { label: 'Sides',    val: bd.sides.qty },
      { label: 'Postres',  val: bd.desserts.qty },
      { label: 'Bebidas',  val: bd.drinks.qty },
    ];
    const hasData = rawCats.some(c => c.val > 0);
    // Construir 24 puntos suaves interpolados a partir de las 6 categorías
    const baseSeries = hasData
      ? rawCats.map(c => c.val)
      : [12, 18, 28, 15, 22, 14];
    const pts = [];
    for (let i = 0; i < baseSeries.length; i++) {
      const curr = baseSeries[i];
      const next = baseSeries[Math.min(baseSeries.length - 1, i + 1)];
      pts.push(curr);
      if (i < baseSeries.length - 1) {
        pts.push((curr * 0.65 + next * 0.35) * 0.86);
        pts.push((curr * 0.35 + next * 0.65) * 1.06);
        pts.push((curr * 0.2 + next * 0.8) * 0.92);
      }
    }

    const W = 420;
    const H = 132;
    const padX = 16;
    const padTop = 30;
    const padBot = 14;
    const maxP = Math.max(1, ...pts);

    const coords = pts.map((v, i) => {
      const x = padX + (i / Math.max(1, pts.length - 1)) * (W - padX * 2);
      const y = H - padBot - (v / maxP) * (H - padTop - padBot);
      return { x, y, v };
    });

    let peakCoordIdx = 0;
    coords.forEach((c, i) => { if (c.v > coords[peakCoordIdx].v) peakCoordIdx = i; });
    const peakCoord = coords[peakCoordIdx];
    const peakValueLabel = hasData ? `${Math.round(peakCoord.v)} u.` : '0 u.';

    // Path suave con curvas cuadráticas
    let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cx = ((prev.x + curr.x) / 2).toFixed(1);
      d += ` Q ${prev.x.toFixed(1)} ${prev.y.toFixed(1)}, ${cx} ${((prev.y + curr.y) / 2).toFixed(1)}`;
    }
    const last = coords[coords.length - 1];
    d += ` T ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;

    // Líneas verticales tenues de fondo (signature de Workforce Summary After)
    let vLines = '';
    for (let i = 0; i <= 36; i++) {
      const lx = (padX + (i / 36) * (W - padX * 2)).toFixed(1);
      const topY = 18 + ((i * 19) % 24);
      vLines += `<line x1="${lx}" y1="${topY}" x2="${lx}" y2="${H - 8}" stroke="#EAE6DF" stroke-width="1" />`;
    }

    const pillW = 46;
    const pillX = Math.max(4, Math.min(W - pillW - 4, peakCoord.x - pillW / 2));
    const pillY = Math.max(2, peakCoord.y - 26);

    splineEl.innerHTML = `
      <svg class="apple-spline-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Flujo de demanda">
        ${vLines}
        <path d="${d}" fill="none" stroke="#E06732" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="${peakCoord.x.toFixed(1)}" cy="${peakCoord.y.toFixed(1)}" r="4" fill="#FFFFFF" stroke="#EB561D" stroke-width="2" />
        <rect x="${pillX.toFixed(1)}" y="${pillY.toFixed(1)}" width="${pillW}" height="19" rx="9.5" fill="#EB561D" />
        <text x="${(pillX + pillW / 2).toFixed(1)}" y="${(pillY + 13).toFixed(1)}" text-anchor="middle" fill="#FFFFFF" font-size="9.5" font-weight="700" font-family="Inter, sans-serif">${peakValueLabel}</text>
      </svg>
      <div class="apple-spline-xlabels">
        ${rawCats.map(c => `<span>${c.label}</span>`).join('')}
      </div>
    `;
  }

  // 4. Mini gráfica de Área + Proyección Rayada (Pie de Payroll Status After)
  const areaEl = document.getElementById('sales-goal-area-chart');
  if (areaEl) {
    const splitX = Math.max(70, Math.min(330, Math.round(30 + (goalPct / 100) * 300)));
    areaEl.innerHTML = `
      <div class="payroll-area-head">
        <span class="payroll-area-caption">Meta diaria (${formatMoney(DAILY_TARGET)})</span>
        <span class="payroll-area-pct-text">${goalPct}% completado</span>
      </div>
      <svg class="payroll-area-svg" viewBox="0 0 380 68" preserveAspectRatio="none">
        <defs>
          <pattern id="appleDiagHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#CFCBC2" stroke-width="1.4" />
          </pattern>
        </defs>
        <path d="M 8 56 L 8 40 Q 75 46, 130 34 T ${splitX} 26 L ${splitX} 58 Z" fill="#DCE5FA" opacity="0.88" />
        <path d="M ${splitX} 26 Q ${Math.min(350, splitX + 60)} 18, 372 8 L 372 58 L ${splitX} 58 Z" fill="url(#appleDiagHatch)" />
        <line x1="${splitX}" y1="16" x2="${splitX}" y2="58" stroke="#D9A84E" stroke-width="1.2" stroke-dasharray="3 3" />
        <rect x="${Math.max(8, splitX - 18)}" y="24" width="36" height="17" rx="8.5" fill="#F2C879" />
        <text x="${splitX}" y="35.5" text-anchor="middle" fill="#4E380B" font-size="9.5" font-weight="700" font-family="Inter, sans-serif">${goalPct}%</text>
      </svg>
    `;
  }

  // 5. Actividad Reciente de Comensales (Inspirado en Pending Leave Requests After con avatares)
  const recentEl = document.getElementById('sales-recent-diners-list');
  if (recentEl) {
    const recent = allShiftOrders.slice(0, 6);
    if (recent.length === 0) {
      recentEl.innerHTML = `
        <div class="recent-empty-wrap">
          <p class="recent-empty-msg">Sin actividad en este turno.</p>
        </div>
      `;
    } else {
      recentEl.innerHTML = recent.map(o => {
        const av = getAvatarInitialsAndTone(o.guestName, o.table);
        const fMode = o.fulfillmentMode || 'dine_in';
        const modeText = fMode === 'delivery' ? 'Domicilio' : fMode === 'pickup' ? 'Pickup' : (o.table || 'Mesa');
        const payText = o.paid ? (o.paymentLabel || 'Apple Pay') : (STATUS_META[o.status]?.label || 'En curso');
        const timeStr = localTimeLabel(o.readyAt || o.createdAt || Date.now());
        return `
          <div class="recent-diner-row">
            <div class="order-avatar ${av.tone}">${escapeHTML(av.initials)}</div>
            <div class="recent-diner-info">
              <span class="recent-diner-name">${escapeHTML(o.guestName || o.table || 'Comensal')}</span>
              <span class="recent-diner-sub">${escapeHTML(modeText)} · ${escapeHTML(payText)}</span>
            </div>
            <div class="recent-diner-right">
              <span class="recent-diner-amt">${formatMoney(o.total)}</span>
              <span class="recent-diner-time">${timeStr}</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }
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
  const cat = resolvePinchOrderItemCategory(it);
  if (cat === 'drinks') {
    const name = normalizeSpanishQuery(it && it.name || '');
    const key  = String(it && it.key || '').toLowerCase();
    if (key.includes('jamaica') || name.includes('jamaica') || key.includes('horchata') || name.includes('horchata')) {
      return 'aguas';
    }
    return 'drinks';
  }
  return cat;
}

// Convierte una comanda en un registro de venta compacto para la base de datos
function buildSaleRecord(order) {
  const ts = order.readyAt || order.deliveredAt || order.createdAt || Date.now();
  const items = (Array.isArray(order.items) ? order.items : []).map(it => ({
    name: String(it.name || ''),
    qty: Number(it.qty) || 0,
    price: Number(it.price) || 0,
    cat: categorizeSaleItem(it),
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
  const c = { bites: 0, burgers: 0, entrees: 0, sides: 0, desserts: 0, aguas: 0, drinks: 0 };
  (record.items || []).forEach(it => {
    const q = Number(it.qty) || 0;
    const cat = it.cat || categorizeSaleItem(it);
    if (cat === 'pinch_bites') c.bites += q;
    else if (cat === 'burgers_sandwiches') c.burgers += q;
    else if (cat === 'entrees') c.entrees += q;
    else if (cat === 'sides') c.sides += q;
    else if (cat === 'desserts') c.desserts += q;
    else if (cat === 'aguas' || cat === 'jamaica' || cat === 'horchata' || cat === 'agua') c.aguas += q;
    else if (cat === 'drinks' || cat === 'coca') c.drinks += q;
    else c.bites += q;
  });
  return c;
}

function aggregateSaleRecords(records) {
  const mk = () => ({ qty: 0, amount: 0 });
  const agg = {
    orders: 0,
    total: 0,
    pinch_bites: mk(),
    burgers_sandwiches: mk(),
    entrees: mk(),
    sides: mk(),
    desserts: mk(),
    aguas: mk(),
    drinks: mk(),
    otro: mk(),
    days: new Map(),
    months: new Map(),
  };

  records.forEach(r => {
    const total = Number(r.total) || 0;
    const counts = countRecordProducts(r);
    agg.orders += 1;
    agg.total += total;

    (r.items || []).forEach(it => {
      let c = it.cat || categorizeSaleItem(it);
      if (c === 'jamaica' || c === 'horchata' || c === 'agua') c = 'aguas';
      if (c === 'coca') c = 'drinks';
      const bucket = agg[c] || agg.otro;
      bucket.qty += Number(it.qty) || 0;
      bucket.amount += (Number(it.qty) || 0) * (Number(it.price) || 0);
    });

    [[agg.days, r.day], [agg.months, r.month]].forEach(([map, k]) => {
      const row = map.get(k) || { key: k, orders: 0, total: 0, bites: 0, burgers: 0, entrees: 0, sides: 0, desserts: 0, aguas: 0, drinks: 0 };
      row.orders += 1;
      row.total += total;
      row.bites += counts.bites;
      row.burgers += counts.burgers;
      row.entrees += counts.entrees;
      row.sides += counts.sides;
      row.desserts += counts.desserts;
      row.aguas += counts.aguas;
      row.drinks += counts.drinks;
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
    statusEl.textContent = hasCloud ? 'Nube + este dispositivo' : 'Guardado en este dispositivo';
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
  const drinksAllQty = agg.aguas.qty + agg.drinks.qty;

  if (totalEl)    totalEl.textContent    = formatMoney(agg.total);
  if (ordersEl)   ordersEl.textContent   = agg.orders;
  if (avgEl)      avgEl.textContent      = formatMoney(daysWithSales ? Math.round(agg.total / daysWithSales) : 0);
  if (daysEl)     daysEl.textContent     = daysWithSales;
  if (productsEl) productsEl.textContent = `Bites ${agg.pinch_bites.qty} · Burgers ${agg.burgers_sandwiches.qty} · Entrees ${agg.entrees.qty} · Sides ${agg.sides.qty} · Postres ${agg.desserts.qty} · Bebidas ${drinksAllQty}`;

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
  const generated = new Date().toLocaleString('es-MX');
  const totalRev = agg.total || 0;
  const shareOf = (amt) => (totalRev > 0 ? Math.round((amt / totalRev) * 1000) / 1000 : 0);
  const totalDrinksQty = agg.aguas.qty + agg.drinks.qty;
  const totalDrinksAmt = agg.aguas.amount + agg.drinks.amount;

  const profile = getActiveTenantProfile();
  const resumen = [
    [`${profile.name.toUpperCase()} — REPORTE EJECUTIVO DE VENTAS`, '', '', ''],
    ['Periodo', periodLabel, 'Sucursal ID', profile.id],
    ['Generado', generated, 'Menú', 'Pinch Kitchen+Bar + Aguas Frescas'],
    [],
    ['Categoría / Concepto', 'Unidades', 'Importe ($)', '% Participación'],
    ['Pinch Bites', agg.pinch_bites.qty, agg.pinch_bites.amount, shareOf(agg.pinch_bites.amount)],
    ['Burgers & Sandwiches', agg.burgers_sandwiches.qty, agg.burgers_sandwiches.amount, shareOf(agg.burgers_sandwiches.amount)],
    ['Entrees', agg.entrees.qty, agg.entrees.amount, shareOf(agg.entrees.amount)],
    ['Sides', agg.sides.qty, agg.sides.amount, shareOf(agg.sides.amount)],
    ['Desserts', agg.desserts.qty, agg.desserts.amount, shareOf(agg.desserts.amount)],
    ['Aguas Frescas (Jamaica / Horchata)', agg.aguas.qty, agg.aguas.amount, shareOf(agg.aguas.amount)],
    ['Bebidas Pinch (Vidrio / Latas / Saratoga)', agg.drinks.qty, agg.drinks.amount, shareOf(agg.drinks.amount)],
  ];
  if (agg.otro.qty > 0) resumen.push(['Otros productos', agg.otro.qty, agg.otro.amount, shareOf(agg.otro.amount)]);
  resumen.push(
    [],
    ['Subtotal Bebidas y Aguas', totalDrinksQty, totalDrinksAmt, shareOf(totalDrinksAmt)],
    ['Total de Pedidos Completados', agg.orders, '', ''],
    ['Días Operativos con Venta', daysWithSales, '', ''],
    ['Ticket Promedio por Orden', '', agg.orders ? Math.round((agg.total / agg.orders) * 100) / 100 : 0, ''],
    ['Promedio de Venta Diaria', '', daysWithSales ? Math.round((agg.total / daysWithSales) * 100) / 100 : 0, ''],
    ['TOTAL DE GANANCIAS ($)', '', agg.total, 1],
  );

  const sheets = [{
    name: 'Resumen',
    sheetType: 'resumen',
    rows: resumen,
    cols: [36, 14, 18, 16],
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
        ['Mes', 'Pedidos', 'Bites', 'Burgers', 'Entrees', 'Sides/Postres', 'Bebidas', 'Total ($)'],
        ...monthRows.map(m => [monthLabel(m.key), m.orders, m.bites, m.burgers, m.entrees, m.sides + m.desserts, m.aguas + m.drinks, m.total]),
        ['TOTAL ACUMULADO', agg.orders, agg.pinch_bites.qty, agg.burgers_sandwiches.qty, agg.entrees.qty, agg.sides.qty + agg.desserts.qty, totalDrinksQty, agg.total],
      ],
      cols: [20, 12, 10, 11, 11, 14, 11, 18],
      moneyCols: [7],
      headerRow: 0,
      hasTotalFooter: true,
    });
  }

  const dayRows = Array.from(agg.days.values()).sort((a, b) => (a.key > b.key ? 1 : -1));
  sheets.push({
    name: 'Por Día',
    sheetType: 'table',
    rows: [
      ['Fecha', 'Pedidos', 'Bites', 'Burgers', 'Entrees', 'Sides/Postres', 'Bebidas', 'Ticket Promedio', 'Total ($)'],
      ...dayRows.map(d => [
        d.key,
        d.orders,
        d.bites,
        d.burgers,
        d.entrees,
        d.sides + d.desserts,
        d.aguas + d.drinks,
        d.orders ? Math.round((d.total / d.orders) * 100) / 100 : 0,
        d.total,
      ]),
      [
        'TOTAL',
        agg.orders,
        agg.pinch_bites.qty,
        agg.burgers_sandwiches.qty,
        agg.entrees.qty,
        agg.sides.qty + agg.desserts.qty,
        totalDrinksQty,
        agg.orders ? Math.round((agg.total / agg.orders) * 100) / 100 : 0,
        agg.total,
      ],
    ],
    cols: [14, 10, 9, 10, 10, 13, 10, 16, 18],
    moneyCols: [7, 8],
    headerRow: 0,
    hasTotalFooter: true,
  });

  const sortedRecords = records.slice().sort((a, b) => a.ts - b.ts);
  sheets.push({
    name: 'Detalle',
    sheetType: 'table',
    rows: [
      ['Fecha', 'Hora', 'Folio', 'Mesa / Comensal', 'Alimentos', 'Aguas', 'Bebidas', 'Detalle de Productos', 'Total ($)'],
      ...sortedRecords.map(r => {
        const c = countRecordProducts(r);
        const foodQty = c.bites + c.burgers + c.entrees + c.sides + c.desserts;
        const productos = (r.items || []).map(it => `${it.qty}x ${it.name}`).join(' · ');
        const tableAndGuest = r.guestName ? `${r.table} (${r.guestName})` : r.table;
        return [r.day, localTimeLabel(r.ts), `#${String(r.num).padStart(3, '0')}`, tableAndGuest, foodQty, c.aguas, c.drinks, productos, Number(r.total) || 0];
      }),
      ['TOTAL', '', `${sortedRecords.length} órdenes`, '', agg.pinch_bites.qty + agg.burgers_sandwiches.qty + agg.entrees.qty + agg.sides.qty + agg.desserts.qty, agg.aguas.qty, agg.drinks.qty, 'SUMA CONTABLE VERIFICADA', agg.total],
    ],
    cols: [13, 9, 10, 24, 11, 9, 10, 58, 16],
    moneyCols: [8],
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
    showKDSToast('Excel Ejecutivo (.xlsx) descargado');
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
  const foodQty   = agg.pinch_bites.qty + agg.burgers_sandwiches.qty + agg.entrees.qty + agg.sides.qty + agg.desserts.qty;
  const drinksQty = agg.aguas.qty + agg.drinks.qty;
  const pct = (amt) => (agg.total > 0 ? ((amt / agg.total) * 100).toFixed(1) + '%' : '0.0%');

  const sampleRowsHtml = records.length > 0
    ? records.slice(-5).map(r => {
        const tableGuest = r.guestName ? `${r.table} · ${r.guestName}` : r.table;
        const prods = (r.items || []).map(it => `${it.qty}x ${it.name}`).join(', ');
        return `
          <tr>
            <td><strong>#${String(r.num).padStart(3, '0')}</strong></td>
            <td>${localTimeLabel(r.ts)}</td>
            <td><span class="xl-badge">${escapeHTML(tableGuest)}</span></td>
            <td>${escapeHTML(prods)}</td>
            <td class="xl-num">$${Number(r.total || 0).toFixed(2)}</td>
          </tr>
        `;
      }).join('')
    : `
      <tr>
        <td colspan="5" style="text-align:center;color:#64748b;padding:12px;">
          Sin órdenes completadas en este turno. Las ventas completadas aparecerán aquí automáticamente.
        </td>
      </tr>
    `;

  wrapEl.innerHTML = `
    <div class="xl-banner" style="border-bottom-color:${profile.accent}">
      <div>
        <div class="xl-banner-title">◈ ${profile.name.toUpperCase()} — REPORTE EJECUTIVO DE VENTAS (.XLSX)</div>
        <div class="xl-banner-sub">Menú: Pinch Kitchen+Bar + Aguas Frescas · Hojas: Resumen, Por Día, Detalle de Comandas</div>
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
        <span class="xl-kpi-k">Alimentos / Bebidas</span>
        <span class="xl-kpi-v">${foodQty} / ${drinksQty}</span>
      </div>
    </div>
    <div class="xl-table-scroll">
      <table class="xl-table">
        <thead>
          <tr>
            <th>Categoría del Menú</th>
            <th style="text-align:center">Unidades</th>
            <th style="text-align:right">Importe ($)</th>
            <th style="text-align:right">% Venta</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Pinch Bites</td>
            <td style="text-align:center">${agg.pinch_bites.qty}</td>
            <td class="xl-num">$${agg.pinch_bites.amount.toFixed(2)}</td>
            <td class="xl-num">${pct(agg.pinch_bites.amount)}</td>
          </tr>
          <tr>
            <td>Burgers &amp; Sandwiches</td>
            <td style="text-align:center">${agg.burgers_sandwiches.qty}</td>
            <td class="xl-num">$${agg.burgers_sandwiches.amount.toFixed(2)}</td>
            <td class="xl-num">${pct(agg.burgers_sandwiches.amount)}</td>
          </tr>
          <tr>
            <td>Entrees</td>
            <td style="text-align:center">${agg.entrees.qty}</td>
            <td class="xl-num">$${agg.entrees.amount.toFixed(2)}</td>
            <td class="xl-num">${pct(agg.entrees.amount)}</td>
          </tr>
          <tr>
            <td>Sides</td>
            <td style="text-align:center">${agg.sides.qty}</td>
            <td class="xl-num">$${agg.sides.amount.toFixed(2)}</td>
            <td class="xl-num">${pct(agg.sides.amount)}</td>
          </tr>
          <tr>
            <td>Desserts</td>
            <td style="text-align:center">${agg.desserts.qty}</td>
            <td class="xl-num">$${agg.desserts.amount.toFixed(2)}</td>
            <td class="xl-num">${pct(agg.desserts.amount)}</td>
          </tr>
          <tr>
            <td>Aguas Frescas (Jamaica / Horchata)</td>
            <td style="text-align:center">${agg.aguas.qty}</td>
            <td class="xl-num">$${agg.aguas.amount.toFixed(2)}</td>
            <td class="xl-num">${pct(agg.aguas.amount)}</td>
          </tr>
          <tr>
            <td>Bebidas Pinch (Vidrio / Latas)</td>
            <td style="text-align:center">${agg.drinks.qty}</td>
            <td class="xl-num">$${agg.drinks.amount.toFixed(2)}</td>
            <td class="xl-num">${pct(agg.drinks.amount)}</td>
          </tr>
          <tr class="xl-total-row">
            <td>TOTAL DE GANANCIAS</td>
            <td style="text-align:center">${foodQty + drinksQty} uds</td>
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
  // Desactivado para producción: los reportes se calculan con ventas reales
}

async function exportCurrentShiftOrMonthExcel() {
  if (!kdsUnlocked) return;
  let records = getActivePreviewSaleRecords();
  if (records.length === 0) {
    const month = historySelectedMonth || localMonthKey(Date.now());
    records = (await ledgerGetAll()).filter(r => r.month === month);
  }
  if (records.length === 0) {
    showKDSToast('No hay órdenes registradas para exportar');
    return;
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

// ═══════════════════════════════════════════════════════════════════
//  7. PROGRAMA DE LEALTAD ("PUNTOS ESCANDÓN"), MESERO IA ("PIDE LO DE SIEMPRE")
//     Y COPILOTO IA OPERATIVO DEL RESTAURANTE EN TIEMPO REAL
// ═══════════════════════════════════════════════════════════════════

const LOYALTY_REWARDS_CATALOG = [
  {
    id: 'reward_drink_100',
    pointsCost: 100,
    discount: 6,
    emoji: 'DR',
    title: 'Bebida o Agua Fresca Gratis',
    subtitle: 'Descuento directo de $6.00 (Mexican Coke, Saratoga, Jamaica u Horchata)',
    minSubtotal: 4,
  },
  {
    id: 'reward_side_180',
    pointsCost: 180,
    discount: 10,
    emoji: 'SD',
    title: 'Guarnición o Postre Gratis',
    subtitle: 'Descuento directo de $10.00 en Sides o Desserts',
    minSubtotal: 10,
  },
  {
    id: 'reward_bite_240',
    pointsCost: 240,
    discount: 15,
    emoji: 'PB',
    title: 'Pinch Bite de Cortesía',
    subtitle: 'Descuento directo de $15.00 en Pinch Bites (Croquetas, Porkbelly...)',
    minSubtotal: 15,
  },
  {
    id: 'reward_vip_350',
    pointsCost: 350,
    discount: 25,
    emoji: 'VIP',
    title: 'Bono VIP Pinch $25',
    subtitle: 'Descuento directo de $25.00 aplicable a toda tu cuenta',
    minSubtotal: 25,
  },
];

let loyaltyProfile = {
  points: 0,
  lifetimePoints: 0,
  ordersCount: 0,
  guestName: '',
  customerPhone: '',
  usualCombo: null, // { label, total, updatedAt, items: [{ key, name, emoji, price, qty, station }] }
  orderHistory: [], // Últimos 15 pedidos del cliente
  pointsLedger: [], // Movimientos de puntos [{ ts, delta, label }]
};

let activeCartLoyaltyRewardId = null;
let clientAIMessages = [];
let kitchenCopilotMessages = [];

const clientAIMemory = {
  offTopicStrikes: 0,
  pendingFollowUp: null,
};

const kitchenCopilotMemory = {
  offTopicStrikes: 0,
  pendingFollowUp: null,
  lastTableMentioned: null,
  lastProductMentioned: null,
};

function getLoyaltyTierMeta(lifetimePts) {
  const pts = Number(lifetimePts) || 0;
  if (pts >= 600) return { name: 'Oro VIP', badge: 'Oro VIP', nextAt: 1000, tone: 'gold' };
  if (pts >= 200) return { name: 'Plata Frecuente', badge: 'Plata Frecuente', nextAt: 600, tone: 'silver' };
  return { name: 'Miembro Club', badge: 'Miembro Escandón', nextAt: 200, tone: 'warm' };
}

function loadLoyaltyProfile() {
  try {
    const raw = localStorage.getItem(storageKey('loyalty-profile-v1'));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        loyaltyProfile = {
          points: Math.max(0, Number(parsed.points) || 0),
          lifetimePoints: Math.max(0, Number(parsed.lifetimePoints) || 0),
          ordersCount: Math.max(0, Number(parsed.ordersCount) || 0),
          guestName: parsed.guestName || readTenantStorage('guest-name') || '',
          customerPhone: parsed.customerPhone || readTenantStorage('customer-phone') || '',
          usualCombo: parsed.usualCombo || null,
          orderHistory: Array.isArray(parsed.orderHistory) ? parsed.orderHistory : [],
          pointsLedger: Array.isArray(parsed.pointsLedger) ? parsed.pointsLedger : [],
        };
      }
    } else {
      loyaltyProfile.guestName = readTenantStorage('guest-name') || '';
      loyaltyProfile.customerPhone = readTenantStorage('customer-phone') || '';
    }
  } catch (e) {}
  return loyaltyProfile;
}

function persistLoyaltyProfile() {
  try {
    localStorage.setItem(storageKey('loyalty-profile-v1'), JSON.stringify(loyaltyProfile));
    // Directorio local por nombre/teléfono para recuperar puntos si cambia de nombre en el mismo navegador
    const dirRaw = localStorage.getItem(storageKey('loyalty-directory-v1'));
    const dir = dirRaw ? JSON.parse(dirRaw) : {};
    const idKey = (loyaltyProfile.customerPhone || loyaltyProfile.guestName || '').trim().toLowerCase();
    if (idKey) {
      dir[idKey] = { ...loyaltyProfile, updatedAt: Date.now() };
      localStorage.setItem(storageKey('loyalty-directory-v1'), JSON.stringify(dir));
    }
  } catch (e) {}
}

function syncLoyaltyProfileIdentity(guestName, phone) {
  loadLoyaltyProfile();
  const cleanName = String(guestName || '').trim();
  const cleanPhone = String(phone || '').trim();
  try {
    const dirRaw = localStorage.getItem(storageKey('loyalty-directory-v1'));
    const dir = dirRaw ? JSON.parse(dirRaw) : {};
    const lookupKey = (cleanPhone || cleanName).toLowerCase();
    if (lookupKey && dir[lookupKey] && loyaltyProfile.ordersCount === 0 && dir[lookupKey].ordersCount > 0) {
      loyaltyProfile = { ...loyaltyProfile, ...dir[lookupKey] };
    }
  } catch (e) {}
  if (cleanName && cleanName !== 'Comensal 1') loyaltyProfile.guestName = cleanName;
  if (cleanPhone) loyaltyProfile.customerPhone = cleanPhone;
  persistLoyaltyProfile();
}

function summarizeComboItems(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items.map(it => `${it.qty}× ${it.name}`.trim()).join(' + ');
}

function computeMostFrequentOrLatestCombo(history, latestItems) {
  if (!Array.isArray(history) || history.length === 0) {
    if (!Array.isArray(latestItems) || latestItems.length === 0) return null;
    const total = latestItems.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
    return {
      label: summarizeComboItems(latestItems),
      total,
      updatedAt: Date.now(),
      items: latestItems.map(it => ({
        key: it.key,
        name: it.name,
        emoji: it.emoji || '',
        price: Number(it.price) || 28,
        qty: Number(it.qty) || 1,
        station: it.station || 'taco',
      })),
    };
  }

  // Contar frecuencia de firma de combo en el historial; en empate gana el más reciente
  const freqMap = new Map();
  history.forEach((h, idx) => {
    if (!Array.isArray(h.items) || h.items.length === 0) return;
    const sig = h.items.map(it => `${it.key}:${it.qty}`).sort().join('|');
    const prev = freqMap.get(sig) || { count: 0, lastIdx: -1, items: h.items };
    prev.count += 1;
    prev.lastIdx = idx;
    prev.items = h.items;
    freqMap.set(sig, prev);
  });

  let best = null;
  freqMap.forEach(entry => {
    if (!best || entry.count > best.count || (entry.count === best.count && entry.lastIdx < best.lastIdx)) {
      best = entry;
    }
  });

  const chosenItems = (best && best.items) ? best.items : latestItems;
  const total = chosenItems.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
  return {
    label: summarizeComboItems(chosenItems),
    total,
    updatedAt: Date.now(),
    items: chosenItems.map(it => ({
      key: it.key,
      name: it.name,
      emoji: it.emoji || '',
      price: Number(it.price) || 28,
      qty: Number(it.qty) || 1,
      station: it.station || 'taco',
    })),
  };
}

function getClientUsualCombo() {
  loadLoyaltyProfile();
  if (loyaltyProfile.usualCombo && Array.isArray(loyaltyProfile.usualCombo.items) && loyaltyProfile.usualCombo.items.length > 0) {
    loyaltyProfile.usualCombo.label = summarizeComboItems(loyaltyProfile.usualCombo.items);
    return loyaltyProfile.usualCombo;
  }
  if (Array.isArray(loyaltyProfile.orderHistory) && loyaltyProfile.orderHistory.length > 0) {
    return computeMostFrequentOrLatestCombo(loyaltyProfile.orderHistory, loyaltyProfile.orderHistory[0].items);
  }
  return null;
}

function getActiveCartLoyaltyReward(foodSubtotal = getCartTotal()) {
  if (!activeCartLoyaltyRewardId) return null;
  loadLoyaltyProfile();
  const reward = LOYALTY_REWARDS_CATALOG.find(r => r.id === activeCartLoyaltyRewardId);
  if (!reward) return null;
  if (loyaltyProfile.points < reward.pointsCost) return null;
  if (foodSubtotal <= 0) return null;
  return {
    ...reward,
    discount: Math.min(foodSubtotal, reward.discount),
  };
}

function getActiveCartLoyaltyDiscount(foodSubtotal = getCartTotal()) {
  const rw = getActiveCartLoyaltyReward(foodSubtotal);
  return rw ? rw.discount : 0;
}

function toggleCartLoyaltyReward(rewardId) {
  loadLoyaltyProfile();
  if (activeCartLoyaltyRewardId === rewardId) {
    activeCartLoyaltyRewardId = null;
    showToast('Recompensa desactivada para esta orden');
  } else {
    const rw = LOYALTY_REWARDS_CATALOG.find(r => r.id === rewardId);
    if (!rw) return;
    if (loyaltyProfile.points < rw.pointsCost) {
      showToast(`⭐ Te faltan ${rw.pointsCost - loyaltyProfile.points} pts para ${rw.title}`);
      return;
    }
    activeCartLoyaltyRewardId = rewardId;
    hapticTap(14);
    showToast(`⭐ ¡${rw.title} aplicada (-$${rw.discount})!`);
  }
  renderCart();
  renderClientLoyaltyHeaderAndBanner();
  renderClientLoyaltyTabContent();
}

function recordLoyaltyOrderSubmission(order) {
  loadLoyaltyProfile();
  const ptsUsed = Math.max(0, Number(order.loyaltyPointsUsed) || 0);
  const ptsEarned = Math.max(1, Number(order.loyaltyPointsEarned) || Math.round(Number(order.total) || 0));

  if (ptsUsed > 0) {
    loyaltyProfile.points = Math.max(0, loyaltyProfile.points - ptsUsed);
    loyaltyProfile.pointsLedger.unshift({
      ts: Date.now(),
      delta: -ptsUsed,
      label: `Canje en Orden #${String(order.num).padStart(3, '0')}: ${order.loyaltyRewardLabel || 'Recompensa'}`,
    });
  }

  loyaltyProfile.points += ptsEarned;
  loyaltyProfile.lifetimePoints += ptsEarned;
  loyaltyProfile.ordersCount += 1;
  if (order.guestName && order.guestName !== 'Comensal 1') {
    loyaltyProfile.guestName = order.guestName;
  }
  if (order.customerPhone) {
    loyaltyProfile.customerPhone = order.customerPhone;
  }

  loyaltyProfile.pointsLedger.unshift({
    ts: Date.now(),
    delta: ptsEarned,
    label: `Consumo Orden #${String(order.num).padStart(3, '0')} ($${order.total} MXN)`,
  });
  loyaltyProfile.pointsLedger = loyaltyProfile.pointsLedger.slice(0, 25);

  const cleanItems = (order.items || []).map(it => ({
    key: it.key || '',
    name: it.name,
    emoji: it.emoji || '',
    price: Number(it.price) || 28,
    qty: Number(it.qty) || 1,
    station: it.station || 'taco',
  }));

  loyaltyProfile.orderHistory.unshift({
    id: order.id,
    num: order.num,
    createdAt: order.createdAt || Date.now(),
    total: order.total,
    items: cleanItems,
  });
  loyaltyProfile.orderHistory = loyaltyProfile.orderHistory.slice(0, 15);

  // Actualizar "Lo de siempre" automáticamente si no fue fijado manualmente o con base en frecuencia
  if (!loyaltyProfile.usualCombo || !loyaltyProfile.usualCombo.pinnedManually) {
    loyaltyProfile.usualCombo = computeMostFrequentOrLatestCombo(loyaltyProfile.orderHistory, cleanItems);
  }

  activeCartLoyaltyRewardId = null;
  persistLoyaltyProfile();
}

function saveCurrentCartAsUsual() {
  if (cartItems.length === 0) {
    const draft = getCurrentDraftSummary();
    if (draft.ready) {
      addBuiltItemToCart();
    } else {
      showToast('Agrega primero tus platillos o bebidas al carrito');
      return;
    }
  }
  loadLoyaltyProfile();
  const cleanItems = cartItems.map(it => ({
    key: it.key,
    name: it.name,
    emoji: it.emoji || '',
    price: Number(it.price) || 28,
    qty: Number(it.qty) || 1,
    station: it.station || 'taco',
  }));
  const total = cleanItems.reduce((s, i) => s + i.price * i.qty, 0);
  loyaltyProfile.usualCombo = {
    label: summarizeComboItems(cleanItems),
    total,
    updatedAt: Date.now(),
    pinnedManually: true,
    items: cleanItems,
  };
  persistLoyaltyProfile();
  renderClientLoyaltyHeaderAndBanner();
  renderClientLoyaltyTabContent();
  renderCart();
  hapticTap(15);
  showToast('Guardado como tu pedido "Lo de siempre"');
}

function loadComboItemsIntoCart(comboItems, { replaceCart = true } = {}) {
  if (!Array.isArray(comboItems) || comboItems.length === 0) return { addedCount: 0, skippedSoldOut: [] };
  if (replaceCart) cartItems = [];
  const skippedSoldOut = [];
  let addedCount = 0;

  comboItems.forEach(it => {
    // Verificar si algún ingrediente clave o platillo está agotado en Modo 86
    const key = String(it.key || '');
    if (it.dishId && isPinchDishSoldOut(it.dishId)) {
      skippedSoldOut.push(it.name);
      return;
    }
    if (it.station === 'drink' && !it.dishId && isStockSoldOut(`drink:${key}`)) {
      skippedSoldOut.push(it.name);
      return;
    }
    if (key.includes('bistec') && isStockSoldOut('protein:bistec')) {
      skippedSoldOut.push(it.name);
      return;
    }
    if (key.includes('longaniza') && isStockSoldOut('protein:longaniza')) {
      skippedSoldOut.push(it.name);
      return;
    }
    const existing = cartItems.find(c => c.key === it.key);
    if (existing) {
      existing.qty += (Number(it.qty) || 1);
    } else {
      cartItems.push({
        key: it.key,
        dishId: it.dishId || '',
        category: it.category || it.station || '',
        name: it.name,
        emoji: it.emoji || '',
        price: Number(it.price) || 0,
        qty: Number(it.qty) || 1,
        station: it.station || 'pinch_bites',
        option: it.option || '',
        note: it.note || '',
      });
    }
    addedCount += (Number(it.qty) || 1);
  });

  window._lastOrderViaMeseroAI = true;
  renderCart();
  if (typeof renderPinchMenu === 'function') renderPinchMenu();
  return { addedCount, skippedSoldOut };
}

function orderUsualOneTap(sendImmediately = false) {
  let usual = getClientUsualCombo();
  if (!usual) {
    const burgerDish = PINCH_MENU_ITEMS.find(i => i.id === 'pinch_burger') || PINCH_MENU_ITEMS[0];
    const cokeDish   = PINCH_MENU_ITEMS.find(i => i.id === 'mexican_coke') || PINCH_MENU_ITEMS[PINCH_MENU_ITEMS.length - 1];
    const defaultItems = [
      {
        key: `dish:${burgerDish.id}`,
        dishId: burgerDish.id,
        category: burgerDish.category,
        name: burgerDish.name,
        emoji: burgerDish.emoji,
        price: burgerDish.price,
        qty: 1,
        station: burgerDish.category,
      },
      {
        key: `dish:${cokeDish.id}`,
        dishId: cokeDish.id,
        category: cokeDish.category,
        name: cokeDish.name,
        emoji: cokeDish.emoji,
        price: cokeDish.price,
        qty: 1,
        station: 'drink',
      },
    ];
    loyaltyProfile.usualCombo = {
      label: summarizeComboItems(defaultItems),
      total: Number((burgerDish.price + cokeDish.price).toFixed(2)),
      updatedAt: Date.now(),
      items: defaultItems,
    };
    persistLoyaltyProfile();
    usual = loyaltyProfile.usualCombo;
  }

  const res = loadComboItemsIntoCart(usual.items, { replaceCart: true });
  renderClientLoyaltyHeaderAndBanner();

  if (res.addedCount === 0) {
    showToast('Los ingredientes de tu pedido habitual están agotados hoy');
    return;
  }

  // Sincronizar también la vista previa animada si el primer platillo es taco o hotdog
  const firstFood = usual.items.find(i => i.station === 'taco' || i.station === 'hotdog');
  if (firstFood) {
    syncVisualPlateFromItemKey(firstFood.key, firstFood.station);
  }

  hapticTap(16);
  if (sendImmediately) {
    closeClientAILoyaltyModal();
    upsellOfferedForCart = true; // Ya incluye su combo completo
    // Pre-cargar datos guardados pero exigir el gesto de "Desliza para pedir" para evitar envíos accidentales
    const savedTable = presetTableFromURL || readTenantStorage('last-table') || '';
    const savedGuest = currentGuestName || readTenantStorage('guest-name') || '';
    const tableIn = document.getElementById('table-input');
    const guestIn = document.getElementById('guest-name-input');
    if (tableIn && savedTable) tableIn.value = savedTable;
    if (guestIn && savedGuest) guestIn.value = savedGuest;
    openOrderModalDirect();
    showToast('"Lo de siempre" listo · Desliza para enviar a cocina');
  } else {
    showToast(`"Lo de siempre" cargado (${res.addedCount} artículos)`);
    toggleCart(true);
  }
}

function syncVisualPlateFromItemKey(itemKey, station) {
  const key = String(itemKey || '');
  if (station === 'taco' || key.startsWith('taco:')) {
    const parts = key.split(':');
    tacoDraft.tortilla = parts[1] || 'sencilla';
    tacoDraft.protein = parts[2] || 'bistec';
    tacoDraft.toppings = parts[3] ? parts[3].split(',').filter(Boolean) : [];
    if (currentStation === 'taco') renderBuilderWorkspace();
  } else if (station === 'hotdog' || key.startsWith('hotdog:')) {
    const parts = key.split(':');
    hotdogDraft.toppings = (parts[1] && parts[1] !== 'natural') ? parts[1].split(',').filter(Boolean) : [];
    if (currentStation === 'hotdog') renderBuilderWorkspace();
  }
}

function renderClientLoyaltyHeaderAndBanner() {
  loadLoyaltyProfile();
  const ptsEl = document.getElementById('header-loyalty-pts');
  if (ptsEl) ptsEl.textContent = loyaltyProfile.points.toLocaleString('es-MX');

  const bannerEl = document.getElementById('client-usual-ai-banner');
  if (!bannerEl) return;

  const guestName = (currentGuestName || loyaltyProfile.guestName || readTenantStorage('guest-name') || '').trim();
  const displayGuest = (guestName && guestName !== 'Comensal 1') ? guestName : '';
  const usual = getClientUsualCombo();
  const tier = getLoyaltyTierMeta(loyaltyProfile.lifetimePoints);
  const unlockedRewards = LOYALTY_REWARDS_CATALOG.filter(r => loyaltyProfile.points >= r.pointsCost);

  if (usual && Array.isArray(usual.items) && usual.items.length > 0) {
    bannerEl.innerHTML = `
      <div class="usual-ai-card has-usual compact-pinch">
        <div class="usual-ai-top">
          <div class="usual-ai-badges">
            <span class="usual-ai-kicker">${uiIcon('star', 'sm')} LO DE SIEMPRE</span>
            <span class="usual-loyalty-pill" onclick="openClientAILoyaltyModal('loyalty')">
              ${uiIcon('star', 'sm')} ${loyaltyProfile.points} pts ${unlockedRewards.length > 0 ? `· ${unlockedRewards.length} premios` : ''}
            </span>
          </div>
        </div>

        <div class="usual-ai-body">
          <h3 class="usual-ai-greeting">
            ${displayGuest ? `Hola de nuevo, ${escapeHTML(displayGuest)}` : '¿Repetimos tu favorito?'}
          </h3>
          <div class="usual-combo-preview">
            <span class="usual-combo-items">${escapeHTML(usual.label)}</span>
            <span class="usual-combo-price">${formatMenuPrice(usual.total)}</span>
          </div>
        </div>

        <div class="usual-ai-actions">
          <button type="button" class="btn-usual-primary" onclick="orderUsualOneTap(true)">
            ${uiIcon('flame', 'sm')} <span>Pedir lo de siempre</span>
          </button>
          <button type="button" class="btn-usual-secondary" onclick="orderUsualOneTap(false)">
            ${uiIcon('bag', 'sm')} <span>Al carrito</span>
          </button>
        </div>
      </div>
    `;
  } else {
    // Visitantes nuevos: mantenemos el banner limpio para que el menú Sticky de Pinch Kitchen+Bar protagonice la vista
    bannerEl.innerHTML = '';
  }
}

function renderCartLoyaltyBox(baseFoodTotal, loyaltyDiscount) {
  const box = document.getElementById('cart-loyalty-box');
  if (!box) return;
  loadLoyaltyProfile();

  const pts = loyaltyProfile.points;
  const netFood = Math.max(0, baseFoodTotal - loyaltyDiscount);
  const earnPts = baseFoodTotal > 0 ? Math.max(1, Math.round(netFood)) : 0;
  const activeRw = getActiveCartLoyaltyReward(baseFoodTotal);

  const rewardsHtml = LOYALTY_REWARDS_CATALOG.map(rw => {
    const isSelected = activeCartLoyaltyRewardId === rw.id && activeRw;
    const canAfford = pts >= rw.pointsCost && baseFoodTotal > 0;
    return `
      <button
        type="button"
        class="cart-reward-chip ${isSelected ? 'active' : ''} ${!canAfford ? 'locked' : ''}"
        onclick="toggleCartLoyaltyReward('${rw.id}')"
        title="${escapeHTML(rw.subtitle)}"
      >
        <span>${rw.emoji} ${escapeHTML(rw.title)} (-$${rw.discount})</span>
        <span class="crw-cost">${isSelected ? '✓ Aplicado' : `${rw.pointsCost} pts`}</span>
      </button>
    `;
  }).join('');

  box.innerHTML = `
    <div class="cart-loyalty-strip">
      <div class="cart-loyalty-top">
        <span class="cart-loyalty-bal">${uiIcon('star', 'sm')} <strong>${pts} pts</strong> disponibles</span>
        ${earnPts > 0 ? `<span class="cart-loyalty-earn">+${earnPts} pts con esta orden</span>` : ''}
      </div>
      ${baseFoodTotal > 0 ? `
        <div class="cart-rewards-scroll">${rewardsHtml}</div>
        ${loyaltyDiscount > 0 && activeRw ? `
          <div class="cart-loyalty-discount-line">
            <span>${uiIcon('gift', 'sm')} Canje: ${escapeHTML(activeRw.title)} (-${activeRw.pointsCost} pts)</span>
            <strong>-$${loyaltyDiscount} MXN</strong>
          </div>
        ` : ''}
        <div class="cart-save-usual-row">
          <button type="button" class="btn-save-cart-usual" onclick="saveCurrentCartAsUsual()">
            ${uiIcon('pin', 'sm')} <span>Guardar como "Lo de siempre"</span>
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════
//  MODAL CLIENTE: MESERO IA (CHAT INTELIGENTE) + PANEL DE LEALTAD PUNTOS ESCANDÓN
// ═══════════════════════════════════════════════════════════════════
function openClientAILoyaltyModal(tab = 'ai') {
  loadLoyaltyProfile();
  const modal = document.getElementById('client-ai-loyalty-modal');
  const overlay = document.getElementById('client-ai-loyalty-overlay');
  if (modal) modal.classList.add('open');
  if (overlay) overlay.classList.add('open');

  switchClientAILoyaltyTab(tab);

  if (clientAIMessages.length === 0) {
    const guest = (currentGuestName || loyaltyProfile.guestName || readTenantStorage('guest-name') || '').trim();
    const usual = getClientUsualCombo();
    const greet = guest && guest !== 'Comensal 1' ? `¡Hola, ${guest}!` : '¡Hola!';
    const usualHint = usual
      ? `¿Te pido lo de siempre (**${usual.label}**, $${usual.total}) o prefieres armar algo distinto?`
      : `¿Qué se te antoja hoy? Puedes escribir *"Pide lo de siempre"* o pedirme cualquier platillo de Pinch Kitchen+Bar, bebidas o aguas frescas.`;
    appendClientAIMessage('assistant', `${greet} ${usualHint}`, usual ? [
      { label: 'Pedir lo de siempre', action: "orderUsualOneTap(true)" },
    ] : []);
  } else {
    renderClientAIChatFeed();
  }

  renderClientLoyaltyTabContent();

  if (tab === 'ai') {
    setTimeout(() => {
      const input = document.getElementById('client-ai-input');
      if (input) input.focus();
    }, 120);
  }
}

function closeClientAILoyaltyModal() {
  const modal = document.getElementById('client-ai-loyalty-modal');
  const overlay = document.getElementById('client-ai-loyalty-overlay');
  if (modal) modal.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

function switchClientAILoyaltyTab(tab) {
  const mode = (tab === 'loyalty' || tab === 'profile') ? tab : 'ai';
  const tabAiBtn  = document.getElementById('tab-client-ai');
  const tabLoyBtn = document.getElementById('tab-client-loyalty');
  const tabProfBtn = document.getElementById('tab-client-profile');
  const paneAi    = document.getElementById('pane-client-ai');
  const paneLoy   = document.getElementById('pane-client-loyalty');
  const paneProf  = document.getElementById('pane-client-profile');

  if (tabAiBtn)  tabAiBtn.classList.toggle('active', mode === 'ai');
  if (tabLoyBtn) tabLoyBtn.classList.toggle('active', mode === 'loyalty');
  if (tabProfBtn) tabProfBtn.classList.toggle('active', mode === 'profile');

  if (paneAi)   paneAi.classList.toggle('hidden', mode !== 'ai');
  if (paneLoy)  paneLoy.classList.toggle('hidden', mode !== 'loyalty');
  if (paneProf) paneProf.classList.toggle('hidden', mode !== 'profile');

  if (mode === 'loyalty') {
    renderClientLoyaltyTabContent();
  } else if (mode === 'profile') {
    renderClientProfileTabContent();
  }
}

// ═══════════════════════════════════════════════════════════════════
//  PIEZA 2: MINI-PERFIL DE GUSTOS Y ALERGIAS (LOCAL EN DISPOSITIVO · $0)
// ═══════════════════════════════════════════════════════════════════
function loadCustomerPrefs() {
  try {
    const raw = localStorage.getItem(CUSTOMER_PREFS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        customerPrefs = {
          name: String(parsed.name || '').trim(),
          avoid: Array.isArray(parsed.avoid) ? parsed.avoid.filter(Boolean) : [],
          preferredDoneness: String(parsed.preferredDoneness || '').trim(),
          autoNote: String(parsed.autoNote || '').trim(),
        };
      }
    }
  } catch (e) {}

  if (!currentGuestName && customerPrefs.name) {
    currentGuestName = customerPrefs.name;
    try { localStorage.setItem(storageKey('guest-name'), customerPrefs.name); } catch (e) {}
  }
  updateHeaderPrefsIndicator();
  return customerPrefs;
}

function persistCustomerPrefs() {
  try {
    localStorage.setItem(CUSTOMER_PREFS_STORAGE_KEY, JSON.stringify(customerPrefs));
  } catch (e) {}
  updateHeaderPrefsIndicator();
}

function hasActiveCustomerPrefs() {
  return Boolean(
    (customerPrefs.avoid && customerPrefs.avoid.length > 0) ||
    customerPrefs.preferredDoneness ||
    customerPrefs.autoNote
  );
}

function updateHeaderPrefsIndicator() {
  const dotEl = document.getElementById('header-prefs-dot');
  const btnEl = document.getElementById('btn-header-prefs');
  const active = hasActiveCustomerPrefs();
  if (dotEl) dotEl.classList.toggle('hidden', !active);
  if (btnEl) btnEl.classList.toggle('has-prefs', active);
}

function renderClientProfileTabContent() {
  const container = document.getElementById('client-profile-panel-content');
  if (!container) return;
  loadCustomerPrefs();

  const currentName = customerPrefs.name || currentGuestName || readTenantStorage('guest-name') || '';

  container.innerHTML = `
    <div class="pref-hero-card">
      <div class="phc-badge-row">
        <span class="phc-pill">GUARDADO EN TU DISPOSITIVO · $0</span>
        <span class="phc-sync-txt">Funciona sin contraseña</span>
      </div>
      <h3 class="phc-title">Tus Gustos y Alergias</h3>
      <p class="phc-sub">Al guardarlos, el menú te avisará ingredientes que evitas y pre-llenará tus pedidos en automático.</p>
    </div>

    <div class="pref-form-block">
      <label class="modal-field-label" for="pref-guest-name-input">1. TU NOMBRE DE COMENSAL</label>
      <input
        type="text"
        id="pref-guest-name-input"
        class="modal-input"
        maxlength="35"
        placeholder="Ej: Juan, Ana..."
        value="${escapeHTML(currentName)}"
        autocomplete="off"
      />
    </div>

    <div class="pref-form-block">
      <span class="modal-field-label">2. ALERGIAS O INGREDIENTES QUE EVITAS (1 TOQUE)</span>
      <div class="pref-chips-grid" id="pref-avoid-chips">
        ${CUSTOMER_AVOID_OPTIONS.map(opt => {
          const selected = (customerPrefs.avoid || []).includes(opt.id);
          return `
            <button
              type="button"
              class="pref-chip${selected ? ' selected' : ''}"
              onclick="toggleCustomerAvoidPref('${opt.id}')"
            >${escapeHTML(opt.label)}</button>
          `;
        }).join('')}
      </div>
    </div>

    <div class="pref-form-block">
      <span class="modal-field-label">3. TÉRMINO FAVORITO EN CARNES Y BURGERS</span>
      <div class="pref-chips-row" id="pref-doneness-chips">
        ${CUSTOMER_DONENESS_OPTIONS.map(opt => {
          const selected = (customerPrefs.preferredDoneness || '') === opt.id;
          return `
            <button
              type="button"
              class="pref-chip sm${selected ? ' selected' : ''}"
              onclick="selectCustomerDonenessPref('${escapeHTML(opt.id)}')"
            >${escapeHTML(opt.label)}</button>
          `;
        }).join('')}
      </div>
    </div>

    <div class="pref-form-block">
      <label class="modal-field-label" for="pref-auto-note-input">4. NOTA FIJA AUTOMÁTICA PARA COCINA (OPCIONAL)</label>
      <input
        type="text"
        id="pref-auto-note-input"
        class="modal-input"
        maxlength="90"
        placeholder="Ej: Salsa aparte, alergia severa a mariscos..."
        value="${escapeHTML(customerPrefs.autoNote || '')}"
        autocomplete="off"
      />
    </div>

    <div class="pref-actions-row">
      <button type="button" class="btn-confirm pref-save-btn" onclick="saveCustomerProfileFromPanel()">
        ✓ Guardar Mis Gustos
      </button>
      ${hasActiveCustomerPrefs() || currentName ? `
        <button type="button" class="btn-cancel pref-reset-btn" onclick="resetCustomerPrefsFromPanel()">
          Limpiar
        </button>
      ` : ''}
    </div>
  `;
}

function toggleCustomerAvoidPref(avoidId) {
  const nameInput = document.getElementById('pref-guest-name-input');
  const noteInput = document.getElementById('pref-auto-note-input');
  if (nameInput) customerPrefs.name = nameInput.value.trim();
  if (noteInput) customerPrefs.autoNote = noteInput.value.trim();

  const idx = customerPrefs.avoid.indexOf(avoidId);
  if (idx >= 0) {
    customerPrefs.avoid.splice(idx, 1);
  } else {
    customerPrefs.avoid.push(avoidId);
  }
  renderClientProfileTabContent();
}

function selectCustomerDonenessPref(val) {
  const nameInput = document.getElementById('pref-guest-name-input');
  const noteInput = document.getElementById('pref-auto-note-input');
  if (nameInput) customerPrefs.name = nameInput.value.trim();
  if (noteInput) customerPrefs.autoNote = noteInput.value.trim();

  customerPrefs.preferredDoneness = val || '';
  renderClientProfileTabContent();
}

function saveCustomerProfileFromPanel() {
  const nameInput = document.getElementById('pref-guest-name-input');
  const noteInput = document.getElementById('pref-auto-note-input');
  const cleanName = nameInput ? nameInput.value.trim() : customerPrefs.name;
  const cleanNote = noteInput ? noteInput.value.trim() : customerPrefs.autoNote;

  customerPrefs.name = cleanName;
  customerPrefs.autoNote = cleanNote;
  persistCustomerPrefs();

  if (cleanName) {
    currentGuestName = cleanName;
    try { localStorage.setItem(storageKey('guest-name'), cleanName); } catch (e) {}
    if (typeof syncLoyaltyProfileIdentity === 'function') syncLoyaltyProfileIdentity(cleanName, '');
  }

  updateClientContextBar();
  if (typeof renderPinchMenu === 'function') renderPinchMenu();
  if (typeof renderClientLoyaltyHeaderAndBanner === 'function') renderClientLoyaltyHeaderAndBanner();

  hapticTap(10);
  showToast('✓ Tus gustos y alergias quedaron guardados');
  closeClientAILoyaltyModal();
}

function resetCustomerPrefsFromPanel() {
  customerPrefs = { name: '', avoid: [], preferredDoneness: '', autoNote: '' };
  persistCustomerPrefs();
  renderClientProfileTabContent();
  updateClientContextBar();
  if (typeof renderPinchMenu === 'function') renderPinchMenu();
  showToast('Preferencias reiniciadas');
}

function getDishPreferenceStatus(dish) {
  const alerts = [];
  let compatLabel = '';
  const avoid = Array.isArray(customerPrefs.avoid) ? customerPrefs.avoid : [];
  if (!dish || avoid.length === 0) return { alerts, compatLabel };

  const badges = Array.isArray(dish.badges) ? dish.badges : [];
  const hay = normalizeSpanishQuery([
    dish.name,
    dish.shortDesc,
    dish.fullDesc,
    ...(Array.isArray(dish.ingredients) ? dish.ingredients : []),
    ...badges,
  ].join(' '));

  if (avoid.includes('sin_mariscos')) {
    if (badges.includes('Mariscos') || /\b(camaron|shrimp|mahi|bacalao|cangrejo|crab|pulpo|salmon|atun|marisco)\b/.test(hay)) {
      alerts.push('Contiene mariscos');
    }
  }
  if (avoid.includes('sin_picante')) {
    if (badges.includes('Picante') || /\b(picante|spicy|jalapeno|habanero|sriracha|gochujang|kimchi|chipotle)\b/.test(hay)) {
      alerts.push('Picante');
    }
  }
  if (avoid.includes('sin_lacteos')) {
    if (/\b(queso|cheese|suizo|swiss|cheddar|feta|crema|cream|mantequilla|butter|aioli de queso|parmesan)\b/.test(hay)) {
      alerts.push('Contiene lácteos');
    }
  }
  if (avoid.includes('sin_nueces')) {
    if (/\b(pistacho|pistachio|nuez|almendra|cacahuate|peanut|walnut|pecan)\b/.test(hay)) {
      alerts.push('Frutos secos');
    }
  }
  if (avoid.includes('sin_gluten')) {
    const isGF = badges.includes('GF');
    const hasGlutenWords = dish.category === 'burgers_sandwiches' || badges.includes('Pasta') || /\b(pan|brioche|focaccia|baguette|pretzel|pasta|bucatini|tagliatelle|croqueta|cookie|galleta|budin|empanizado|harina)\b/.test(hay);
    if (!isGF && hasGlutenWords) {
      alerts.push('Contiene gluten');
    }
  }
  if (avoid.includes('vegetariano')) {
    if (badges.includes('V') || badges.includes('Vegetariano')) {
      compatLabel = 'Apto vegetariano';
    } else if (dish.category !== 'drinks') {
      const hasMeatWords = badges.includes('Mariscos') || badges.includes('Angus Beef') || /\b(pavo|turkey|jamon|ham|res|beef|steak|ribs|costilla|cerdo|pork|pollo|chicken|tocino|bacon|camaron|shrimp|mahi|bacalao|huevo|eggs)\b/.test(hay);
      if (hasMeatWords) alerts.push('No vegetariano');
    }
  }

  if (alerts.length === 0 && !compatLabel && dish.category !== 'drinks') {
    compatLabel = 'Compatible contigo';
  }

  return { alerts, compatLabel };
}

function applyCustomerPrefsToDishDetail(dish) {
  const bannerEl = document.getElementById('dd-prefs-applied-banner');
  const bannerText = document.getElementById('dd-prefs-applied-text');
  const noteInputEl = document.getElementById('dd-special-note');
  if (!dish) {
    if (bannerEl) bannerEl.classList.add('hidden');
    return;
  }

  const appliedReasons = [];
  const avoid = Array.isArray(customerPrefs.avoid) ? customerPrefs.avoid : [];

  // 1. Término de cocción favorito
  if (
    customerPrefs.preferredDoneness &&
    dish.optionGroup &&
    Array.isArray(dish.optionGroup.choices) &&
    dish.optionGroup.choices.includes(customerPrefs.preferredDoneness)
  ) {
    pinchDetailOption = customerPrefs.preferredDoneness;
    appliedReasons.push(`Término ${customerPrefs.preferredDoneness}`);
  }

  // 2. Omitir ingredientes base si coinciden con "Evitar"
  const baseIngs = typeof getDishBaseIngredients === 'function' ? getDishBaseIngredients(dish) : [];
  const autoRemoved = [];
  baseIngs.forEach(ing => {
    const ingLabel = typeof ing === 'string' ? ing : String((ing && ing.label) || '').trim();
    if (!ingLabel) return;
    const norm = normalizeSpanishQuery(ingLabel);
    if (avoid.includes('sin_cebolla') && /\b(cebollas?|onions?)\b/.test(norm)) {
      autoRemoved.push(ingLabel);
    }
    if (avoid.includes('sin_cilantro') && /\bcilantros?\b/.test(norm)) {
      autoRemoved.push(ingLabel);
    }
    if (avoid.includes('sin_lacteos') && /\b(quesos?|cheeses?|cheddar|suizos?|swiss|feta|crema|parmesan)\b/.test(norm)) {
      autoRemoved.push(ingLabel);
    }
  });
  if (autoRemoved.length > 0) {
    pinchDetailRemoved = Array.from(new Set(autoRemoved));
    appliedReasons.push(`Sin ${autoRemoved.slice(0, 2).join(', ')}`);
  }

  // 3. Nota fija de cocina + recordatorio de alergia
  const autoNotes = [];
  if (avoid.includes('sin_picante') && (dish.badges || []).includes('Picante')) {
    autoNotes.push('Sin picante');
  }
  if (avoid.includes('sin_nueces')) {
    autoNotes.push('Alergia a nueces');
  }
  if (customerPrefs.autoNote) {
    autoNotes.push(customerPrefs.autoNote);
  }
  const finalAutoNote = Array.from(new Set(autoNotes)).join(' · ').slice(0, 140);
  if (noteInputEl && finalAutoNote) {
    noteInputEl.value = finalAutoNote;
    appliedReasons.push('Nota cocina');
  }

  if (bannerEl) {
    bannerEl.classList.toggle('hidden', appliedReasons.length === 0);
    if (appliedReasons.length > 0 && bannerText) {
      bannerText.textContent = `Tus gustos: ${appliedReasons.join(' · ')}`;
    }
  }
}

function renderClientLoyaltyTabContent() {
  const container = document.getElementById('client-loyalty-panel-content');
  if (!container) return;
  loadLoyaltyProfile();

  const pts = loyaltyProfile.points;
  const lifePts = loyaltyProfile.lifetimePoints;
  const tier = getLoyaltyTierMeta(lifePts);
  const nextReward = LOYALTY_REWARDS_CATALOG.find(r => r.pointsCost > pts) || LOYALTY_REWARDS_CATALOG[LOYALTY_REWARDS_CATALOG.length - 1];
  const progressPct = Math.min(100, Math.round((pts / Math.max(1, nextReward.pointsCost)) * 100));
  const usual = getClientUsualCombo();
  const guest = (currentGuestName || loyaltyProfile.guestName || 'Comensal Escandón').trim();

  container.innerHTML = `
    <div class="loyalty-wallet-card">
      <div class="lw-top">
        <div>
          <span class="lw-kicker">CLUB DE LEALTAD · 1 PESO = 1 PUNTO</span>
          <h3 class="lw-member-name">${escapeHTML(guest)}</h3>
        </div>
        <span class="lw-tier-pill">${tier.badge}</span>
      </div>
      <div class="lw-points-hero">
        <span class="lw-points-num">${uiIcon('star', 'md')} ${pts.toLocaleString('es-MX')}</span>
        <span class="lw-points-label">Puntos Escandón disponibles</span>
      </div>
      <div class="lw-progress-track">
        <div class="lw-progress-fill" style="width:${progressPct}%"></div>
      </div>
      <div class="lw-meta-row">
        <span>${pts >= nextReward.pointsCost ? `Tienes recompensas listas para canjear` : `Te faltan ${nextReward.pointsCost - pts} pts para ${nextReward.title}`}</span>
        <span>${loyaltyProfile.ordersCount} ${loyaltyProfile.ordersCount === 1 ? 'visita' : 'visitas'}</span>
      </div>
    </div>

    <div class="loyalty-section-block">
      <div class="loyalty-sec-head">
        <span class="step-label">TU PLATILLO HABITUAL ("LO DE SIEMPRE")</span>
        ${cartItems.length > 0 ? `<button type="button" class="btn-link-accent" onclick="saveCurrentCartAsUsual()">Fijar carrito actual</button>` : ''}
      </div>
      ${usual ? `
        <div class="loyalty-usual-box">
          <div class="lub-info">
            <span class="lub-title">${escapeHTML(usual.label)}</span>
            <span class="lub-sub">Total habitual: $${usual.total} MXN · Acumula +${usual.total} pts</span>
          </div>
          <div class="lub-actions">
            <button type="button" class="btn-usual-primary compact" onclick="orderUsualOneTap(true)">${uiIcon('flame', 'sm')} Pedir en 1 toque</button>
          </div>
        </div>
      ` : `
        <div class="loyalty-usual-box empty">
          <span class="lub-sub">Tu primer pedido se guardará automáticamente como "Lo de siempre", o arma tu carrito y toca "Guardar como Lo de siempre".</span>
          <button type="button" class="btn-usual-secondary compact" onclick="orderUsualOneTap(false)">Probar combo clásico Escandón</button>
        </div>
      `}
    </div>

    <div class="loyalty-section-block">
      <div class="loyalty-sec-head">
        <span class="step-label">CATÁLOGO DE RECOMPENSAS (CANJE EN 1 TOQUE)</span>
      </div>
      <div class="loyalty-rewards-grid">
        ${LOYALTY_REWARDS_CATALOG.map(rw => {
          const unlocked = pts >= rw.pointsCost;
          const isSelected = activeCartLoyaltyRewardId === rw.id;
          return `
            <div class="loyalty-reward-card ${unlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''}">
              <div class="lrc-left">
                <span class="lrc-mono">${rw.emoji}</span>
                <div class="lrc-texts">
                  <span class="lrc-title">${escapeHTML(rw.title)}</span>
                  <span class="lrc-sub">${escapeHTML(rw.subtitle)}</span>
                </div>
              </div>
              <div class="lrc-right">
                <span class="lrc-cost">${rw.pointsCost} pts</span>
                <button
                  type="button"
                  class="btn-lrc-redeem ${isSelected ? 'active' : ''}"
                  ${!unlocked ? 'disabled' : ''}
                  onclick="toggleCartLoyaltyReward('${rw.id}')"
                >
                  ${isSelected ? '✓ Aplicado' : (unlocked ? 'Canjear' : 'Bloqueado')}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    ${loyaltyProfile.pointsLedger.length > 0 ? `
      <div class="loyalty-section-block">
        <div class="loyalty-sec-head">
          <span class="step-label">MOVIMIENTOS RECIENTES DE PUNTOS</span>
        </div>
        <div class="loyalty-ledger-list">
          ${loyaltyProfile.pointsLedger.slice(0, 6).map(m => `
            <div class="loyalty-ledger-row">
              <span class="llr-label">${escapeHTML(m.label)}</span>
              <span class="llr-delta ${m.delta >= 0 ? 'pos' : 'neg'}">${m.delta >= 0 ? '+' : ''}${m.delta} pts</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

// ═══════════════════════════════════════════════════════════════════
//  MOTOR NLP EN ESPAÑOL DEL MESERO IA (CLIENTE)
// ═══════════════════════════════════════════════════════════════════
function appendClientAIMessage(role, markdownText, actions = []) {
  clientAIMessages.push({
    id: Date.now() + Math.random(),
    role,
    text: markdownText,
    actions,
    ts: Date.now(),
  });
  if (clientAIMessages.length > 30) clientAIMessages.shift();
  renderClientAIChatFeed();
}

function formatSimpleMarkdown(text) {
  const safe = escapeHTML(String(text || ''));
  return safe
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

function renderClientAIChatFeed() {
  const feed = document.getElementById('client-ai-chat-feed');
  if (!feed) return;
  feed.innerHTML = clientAIMessages.map(msg => `
    <div class="ai-msg-row ${msg.role}">
      <div class="ai-msg-bubble">
        <div class="ai-msg-text">${formatSimpleMarkdown(msg.text)}</div>
        ${Array.isArray(msg.actions) && msg.actions.length > 0 ? `
          <div class="ai-msg-actions">
            ${msg.actions.map(a => `
              <button type="button" class="ai-msg-action-btn" onclick="${a.action}">${escapeHTML(a.label)}</button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
  feed.scrollTop = feed.scrollHeight;
}

function parseSpanishQtyFromSegment(seg) {
  const numMatch = seg.match(/\b(\d{1,2})\b/);
  if (numMatch) return Math.max(1, Math.min(25, parseInt(numMatch[1], 10)));
  if (/\b(diez)\b/.test(seg)) return 10;
  if (/\b(nueve)\b/.test(seg)) return 9;
  if (/\b(ocho)\b/.test(seg)) return 8;
  if (/\b(siete)\b/.test(seg)) return 7;
  if (/\b(seis)\b/.test(seg)) return 6;
  if (/\b(cinco)\b/.test(seg)) return 5;
  if (/\b(cuatro)\b/.test(seg)) return 4;
  if (/\b(tres)\b/.test(seg)) return 3;
  if (/\b(dos|par de)\b/.test(seg)) return 2;
  if (/\b(un|una|uno)\b/.test(seg)) return 1;
  return 1;
}

function buildStandardTacoItem({ protein = 'bistec', tortilla = 'sencilla', toppings = ['cilantro', 'cebolla', 'salsa_roja'], qty = 1 }) {
  const baseObj = TACO_CONFIG.base.find(b => b.id === tortilla) || TACO_CONFIG.base[0];
  const protObj = TACO_CONFIG.protein.find(p => p.id === protein) || TACO_CONFIG.protein[0];
  const validTops = TACO_CONFIG.toppings.filter(t => toppings.includes(t.id));
  const topIds = validTops.map(t => t.id).sort();
  const topNames = validTops.map(t => t.shortLabel);
  const topText = topNames.length > 0 ? `con ${joinNaturalSpanish(topNames)}` : 'natural';
  return {
    key: `taco:${baseObj.id}:${protObj.id}:${topIds.join(',') || 'natural'}`,
    name: `Taco de ${protObj.name} (${baseObj.shortLabel}, ${topText})`,
    emoji: '🌮',
    price: TACO_CONFIG.basePrice,
    qty: Math.max(1, qty),
    station: 'taco',
  };
}

function buildStandardHotdogItem({ toppings = ['ketchup', 'mayonesa', 'mostaza', 'chiles', 'tomate', 'cebolla'], qty = 1 }) {
  const validTops = HOTDOG_CONFIG.toppings.filter(t => toppings.includes(t.id));
  const topIds = validTops.map(t => t.id).sort();
  const topNames = validTops.map(t => t.shortLabel);
  const topText = topNames.length > 0 ? `con ${joinNaturalSpanish(topNames)}` : 'solo pan y salchicha';
  return {
    key: `hotdog:${topIds.join(',') || 'natural'}`,
    name: `Hot Dog (${topText})`,
    emoji: '🌭',
    price: HOTDOG_CONFIG.basePrice,
    qty: Math.max(1, qty),
    station: 'hotdog',
  };
}

function parseNaturalMenuOrder(rawText) {
  const norm = String(rawText || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Dividir la oración en segmentos de producto sin romper "con cilantro y cebolla"
  const protectedText = norm
    .replace(/cilantro\s+y\s+cebolla/g, 'cilantro_cebolla')
    .replace(/cebolla\s+y\s+cilantro/g, 'cilantro_cebolla')
    .replace(/ketchup\s+y\s+mostaza/g, 'ketchup_mostaza')
    .replace(/mayonesa\s+y\s+mostaza/g, 'mayonesa_mostaza')
    .replace(/bistec\s+y\s+longaniza/g, 'campechano_mix');

  const segments = protectedText.split(/(?:,|\+|\by\b|\bmas\b|\btambien\b)/).map(s => s.trim()).filter(Boolean);
  const parsedItems = [];

  const pinchAliases = [
    ['mexican_coke', /\b(mexican coke|coca mexicana)\b/],
    ['mexican_sprite', /\b(mexican sprite|sprite mexican)\b/],
    ['saratoga_sparkling_water', /\b(saratoga|sparkling|agua mineral|agua con gas)\b/],
    ['diet_coke_can_12oz', /\b(diet coke|coca diet|coca light)\b/],
    ['coke_can_12oz', /\b(coke can|lata coca|coca cola)\b/],
    ['sprite_can_12oz', /\b(sprite can|lata sprite|sprite)\b/],
    ['pinch_burger', /\b(pinch burger|hamburguesa pinch|burger)\b/],
    ['impossible_vegan_burger', /\b(impossible|vegan burger|hamburguesa vegana)\b/],
    ['pinch_cuban_sandwich', /\b(cuban|cubano)\b/],
    ['turkey_blt', /\b(turkey|blt|pavo)\b/],
    ['mahi_mahi_sandwich', /\b(mahi|dorado)\b/],
    ['fried_chicken_sandwich', /\b(fried chicken|sandwich de pollo|pollo frito)\b/],
    ['pinch_nachos', /\b(nachos|totopos)\b/],
    ['ktown_guac', /\b(ktown|k-town|guac|guacamole|kimchi)\b/],
    ['croquetas_de_bacalao', /\b(bacalao)\b/],
    ['pinch_croquetas', /\b(croquetas|croqueta)\b/],
    ['gambas_al_ajillo', /\b(gambas|ajillo)\b/],
    ['fried_shrimp', /\b(fried shrimp|camarones fritos)\b/],
    ['bbq_porkbelly', /\b(porkbelly|pork belly|panceta)\b/],
    ['seasonal_soup', /\b(soup|sopa)\b/],
    ['pinch_salad', /\b(pinch salad|ensalada pinch)\b/],
    ['olives', /\b(olives|aceitunas)\b/],
    ['steak_n_eggs', /\b(steak n eggs|steak and eggs)\b/],
    ['black_angus_skirt_steak', /\b(skirt steak|angus|entrana)\b/],
    ['eggs_any_style', /\b(eggs|huevos)\b/],
    ['stuffed_french_toast', /\b(french toast|pan frances)\b/],
    ['tagliatelle_alla_bolognese', /\b(tagliatelle|bolognese|bolonesa)\b/],
    ['bucatini_al_pomodoro', /\b(bucatini|pomodoro)\b/],
    ['bbq_baby_back_ribs_full', /\b(full rack|costillar completo)\b/],
    ['bbq_baby_back_ribs_half', /\b(ribs|costillas|half rack|medio costillar)\b/],
    ['spicy_brussel_sprouts', /\b(brussel|coles de bruselas)\b/],
    ['petit_salad', /\b(petit salad|ensalada chica)\b/],
    ['house_cut_french_fries', /\b(french fries|fries|papas fritas)\b/],
    ['pinch_focaccia', /\b(focaccia)\b/],
    ['house_potatoes', /\b(house potatoes|zaatar|za'atar)\b/],
    ['pommes_puree', /\b(pommes|pure)\b/],
    ['broccolini', /\b(broccolini|brocoli)\b/],
    ['bread_pudding', /\b(bread pudding|budin)\b/],
    ['chocolate_chip_cookie', /\b(cookie|galleta)\b/],
    ['key_lime_pie', /\b(key lime|pay de limon|pie)\b/],
  ];

  segments.forEach(seg => {
    const qty = parseSpanishQtyFromSegment(seg);

    // 0. Intentar empatar primero con cualquiera de los 40 platillos de Pinch Kitchen+Bar
    let matchedPinch = PINCH_MENU_ITEMS.find(item => {
      const nItem = item.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return seg.includes(nItem);
    });
    if (!matchedPinch) {
      const aliasHit = pinchAliases.find(([, re]) => re.test(seg));
      if (aliasHit) {
        matchedPinch = PINCH_MENU_ITEMS.find(item => item.id === aliasHit[0]);
      }
    }
    if (matchedPinch) {
      parsedItems.push({
        key: `dish:${matchedPinch.id}`,
        dishId: matchedPinch.id,
        category: matchedPinch.category,
        name: matchedPinch.name,
        emoji: matchedPinch.emoji,
        price: matchedPinch.price,
        qty,
        station: matchedPinch.category === 'drinks' ? 'drink' : matchedPinch.category,
      });
      return;
    }

    // 1. Alias coloquiales para platillos Pinch y Bebidas/Aguas Frescas
    const aliasDishMap = [
      { re: /\b(jamaica)\b/, id: 'agua_jamaica' },
      { re: /\b(horchata)\b/, id: 'agua_horchata' },
      { re: /\b(saratoga|agua mineral|agua con gas)\b/, id: 'saratoga_sparkling_water' },
      { re: /\b(diet coke|coca light|coca zero)\b/, id: 'diet_coke_can_12oz' },
      { re: /\b(sprite)\b/, id: 'mexican_sprite' },
      { re: /\b(coca|coke|refresco|soda|cola)\b/, id: 'mexican_coke' },
      { re: /\b(hamburguesa|burger)\b/, id: 'pinch_burger' },
      { re: /\b(cubano|cuban)\b/, id: 'pinch_cuban_sandwich' },
      { re: /\b(nachos)\b/, id: 'pinch_nachos' },
      { re: /\b(guac|guacamole)\b/, id: 'ktown_guac' },
      { re: /\b(costillas|ribs)\b/, id: 'bbq_baby_back_ribs_half' },
      { re: /\b(entrana|skirt|steak|corte)\b/, id: 'black_angus_skirt_steak' },
      { re: /\b(papas fritas|fries)\b/, id: 'house_cut_french_fries' },
      { re: /\b(pay de limon|key lime)\b/, id: 'key_lime_pie' },
    ];
    const aliasHit = aliasDishMap.find(a => a.re.test(seg));
    if (aliasHit) {
      const d = PINCH_MENU_ITEMS.find(x => x.id === aliasHit.id);
      if (d) {
        parsedItems.push({
          key: `dish:${d.id}`,
          dishId: d.id,
          category: d.category,
          name: d.name,
          emoji: d.emoji,
          price: d.price,
          qty,
          station: d.category === 'drinks' ? 'drink' : d.category,
        });
      }
      return;
    }
  });

  return parsedItems;
}

function sendClientAIMessage() {
  const input = document.getElementById('client-ai-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  processClientAICommand(text);
}

function runClientAIQuickPrompt(promptText) {
  processClientAICommand(promptText);
}

// ═══════════════════════════════════════════════════════════════════
//  UTILIDADES DE RAZONAMIENTO LOCAL Y CONTROL DE CONTEXTO (GUARDRAILS)
// ═══════════════════════════════════════════════════════════════════
function normalizeSpanishQuery(raw) {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAffirmativeFollowUp(norm) {
  return /^(si+|claro|dale|va|sale|por favor|porfa|revisa|revisalo|checa|checalo|investiga|investigalo|hazlo|muestra|muestrame|dime|a ver|si por favor|si revisa|si checa|si dime|si manda|si envia|si envio|mandalo|envialo|abrelo|abrela|si gracias|de acuerdo|simon|orale)\b/.test(norm);
}

function isNegativeFollowUp(norm) {
  return /^(no+|nel|nop|no gracias|asi esta bien|luego|despues|nada|nah|por ahora no|no hace falta)\b/.test(norm);
}

function isPureGreeting(norm) {
  return /^(hola|buenas|buenos dias|buenas tardes|buenas noches|que tal|hey|oye|holi|saludos|que onda|como estas)\s*$/.test(norm);
}

function isPureThanks(norm) {
  return /^(gracias|muchas gracias|mil gracias|perfecto|excelente|genial|super|listo|ok|okay|va|entendido|vale|chido|todo bien)\s*$/.test(norm);
}

function detectOffTopicCategory(norm) {
  if (/\b(clima|llover|lluvia|llueve|temperatura|pronostico|soleado|nublado|tormenta|grados|frio|calor|humedad|viento|tiempo hace)\b/.test(norm)) {
    return 'weather';
  }
  if (/\b(futbol|partido|marcador|goles|champions|america|chivas|cruz azul|pumas|seleccion|nfl|nba|box|beisbol|deporte|mundial|liga mx|gano el)\b/.test(norm)) {
    return 'sports';
  }
  if (/\b(poema|poesia|chiste|cancion|cuento|adivinanza|rap|rima|versos|broma)\b/.test(norm)) {
    return 'creative';
  }
  if (/\b(presidente|politica|elecciones|noticia|noticias|pelicula|peliculas|serie|series|netflix|horoscopo|zodiaco|bitcoin|cripto|dolar|capital de|quien descubrio|novia|novio|amor|cuantos anos tienes|quien te creo|donde vives|musica|youtube|tiktok|videojuego|universo|planeta|matematicas|tarea)\b/.test(norm)) {
    return 'world';
  }
  return 'general';
}

function buildClientOffTopicReply(category) {
  clientAIMemory.offTopicStrikes += 1;
  clientAIMemory.pendingFollowUp = null;

  if (clientAIMemory.offTopicStrikes >= 3) {
    return 'Este asistente atiende únicamente pedidos del menú, estatus de tu orden y Puntos Escandón. Indícame qué platillo o bebida deseas ordenar.';
  }
  if (clientAIMemory.offTopicStrikes === 2) {
    return 'Me encantaría platicar de eso, pero aquí solo puedo ayudarte con el menú, tus pedidos y tus Puntos Escandón. ¿Qué se te antoja pedir hoy?';
  }
  if (category === 'weather') {
    return 'No tengo el reporte del clima a la mano, pero aquí en Pinch Kitchen+Bar la cocina está lista y al momento. ¿Pedimos lo de siempre o te sugiero algo del menú?';
  }
  if (category === 'sports') {
    return 'Del partido no tengo el marcador, yo ando pendiente de tu mesa y de cocina. ¿Te ayudo a pedir una Pinch Burger, unos Bites o revisar tus puntos?';
  }
  if (category === 'creative') {
    return 'Lo mío es armar tu pedido y recordar tus platillos favoritos de Pinch Kitchen+Bar, no los chistes ni la poesía. ¿Qué se te antoja pedir hoy?';
  }
  return 'Esa se me escapa, porque solo conozco el menú de Pinch Kitchen+Bar y tus pedidos. ¿Quieres pedir lo de siempre o armar una orden nueva?';
}

async function processClientAICommand(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return;

  const priorHistory = clientAIMessages.slice(-8).map(m => ({ role: m.role, text: m.text }));
  appendClientAIMessage('user', text);
  const norm = normalizeSpanishQuery(text);

  // Ejecutar acciones reales del carrito si el cliente pide "lo de siempre" o platillos concretos
  const wantsUsual = /(lo de siempre|mi favorito|lo mismo|pedido habitual|repetir pedido|usual)/.test(norm);
  const parsedOrderItems = !wantsUsual ? parseNaturalMenuOrder(text) : [];
  if (wantsUsual) {
    const wantsImmediateSend = /(manda|envia|comanda|cocina|directo|confirma)/.test(norm);
    orderUsualOneTap(false);
    const loadedUsual = getClientUsualCombo();
    if (wantsImmediateSend) {
      appendClientAIMessage('assistant', `¡Listo! Mandando tu pedido de siempre: **${loadedUsual.label}** ($${loadedUsual.total}).`);
      setTimeout(() => orderUsualOneTap(true), 250);
      return;
    }
    clientAIMemory.pendingFollowUp = { type: 'send_cart_to_kitchen' };
    appendClientAIMessage('assistant', `Cargué tu pedido de siempre: **${loadedUsual.label}** ($${loadedUsual.total} MXN). ¿Lo mandamos directo a cocina?`, [
      { label: 'Mandar a cocina', action: 'orderUsualOneTap(true)' },
      { label: 'Ver carrito', action: 'closeClientAILoyaltyModal(); toggleCart(true);' },
    ]);
    return;
  }
  if (parsedOrderItems.length > 0) {
    loadComboItemsIntoCart(parsedOrderItems, { replaceCart: false });
    const firstFood = parsedOrderItems.find(i => i.station === 'taco' || i.station === 'hotdog');
    if (firstFood) syncVisualPlateFromItemKey(firstFood.key, firstFood.station);
    const addedSummary = summarizeComboItems(parsedOrderItems);
    const cartTotal = getCartTotal();
    clientAIMemory.pendingFollowUp = { type: 'send_cart_to_kitchen' };
    appendClientAIMessage('assistant', `Agregué **${addedSummary}** a tu carrito (llevas **$${cartTotal} MXN**). ¿Lo mandamos a cocina o agregas algo más?`, [
      { label: 'Mandar a cocina', action: 'closeClientAILoyaltyModal(); openOrderModal();' },
      { label: 'Guardar como "Lo de siempre"', action: 'saveCurrentCartAsUsual()' },
    ]);
    return;
  }

  // Consultar al backend Gemini Flash para razonamiento conversacional natural
  const thinkingId = 'thinking_' + Date.now();
  clientAIMessages.push({ id: thinkingId, role: 'assistant', text: '*Pensando...*', actions: [], ts: Date.now() });
  renderClientAIChatFeed();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'client',
        query: text,
        history: priorHistory,
        liveState: {
          comensal: currentGuestName || loyaltyProfile.guestName || 'Comensal',
          puntos_lealtad: loyaltyProfile.points,
          pedido_habitual: getClientUsualCombo() ? getClientUsualCombo().label : 'Aún sin favorito registrado',
          articulos_en_carrito: cartItems.map(i => `${i.qty}x ${i.name}`),
          total_carrito: getCartTotal(),
        }
      })
    });
    clientAIMessages = clientAIMessages.filter(m => m.id !== thinkingId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.text) {
        appendClientAIMessage('assistant', data.text, cartItems.length > 0 ? [
          { label: 'Mandar a cocina', action: 'closeClientAILoyaltyModal(); openOrderModal();' },
        ] : []);
        return;
      }
    }
  } catch (e) {
    clientAIMessages = clientAIMessages.filter(m => m.id !== thinkingId);
    console.warn('Backend Gemini no disponible en cliente, usando fallback local:', e);
  }

  // Fallback local si no hay conexión al backend /api/chat

  // 0. Seguimiento conversacional (cuando el asistente ofreció una acción previa)
  if (clientAIMemory.pendingFollowUp) {
    const pending = clientAIMemory.pendingFollowUp;
    if (isAffirmativeFollowUp(norm)) {
      clientAIMemory.pendingFollowUp = null;
      clientAIMemory.offTopicStrikes = 0;
      if (pending.type === 'send_cart_to_kitchen') {
        if (cartItems.length > 0) {
          appendClientAIMessage('assistant', '¡Va! Te abro la confirmación para mandar tu orden directo a cocina.');
          closeClientAILoyaltyModal();
          openOrderModal();
          return;
        }
      } else if (pending.type === 'order_usual') {
        orderUsualOneTap(true);
        return;
      } else if (pending.type === 'apply_best_reward' && pending.rewardId) {
        toggleCartLoyaltyReward(pending.rewardId);
        appendClientAIMessage('assistant', 'Listo, ya quedó aplicada tu recompensa al carrito.');
        return;
      }
    } else if (isNegativeFollowUp(norm)) {
      clientAIMemory.pendingFollowUp = null;
      clientAIMemory.offTopicStrikes = 0;
      appendClientAIMessage('assistant', 'Sin problema. Avísame si quieres agregar algo más o ver tus puntos.');
      return;
    }
  }

  // Saludos y agradecimientos naturales
  if (isPureGreeting(norm)) {
    clientAIMemory.offTopicStrikes = 0;
    const usual = getClientUsualCombo();
    if (usual) {
      clientAIMemory.pendingFollowUp = { type: 'order_usual' };
      appendClientAIMessage('assistant', `¡Hola! ¿Te pedimos lo de siempre (**${usual.label}**, $${usual.total}) o quieres probar algo distinto?`, [
        { label: 'Pedir lo de siempre', action: 'orderUsualOneTap(true)' },
      ]);
    } else {
      appendClientAIMessage('assistant', '¡Hola! ¿Qué se te antoja hoy? Tenemos Pinch Bites, Burgers & Sandwiches, Entrees, Sides, Desserts, Bebidas Pinch y Aguas Frescas de Jamaica y Horchata.');
    }
    return;
  }

  if (isPureThanks(norm)) {
    clientAIMemory.offTopicStrikes = 0;
    appendClientAIMessage('assistant', '¡Con gusto! Aquí estoy si se te antoja agregar algo más.');
    return;
  }

  // 1. "Pide lo de siempre" / favorito
  if (/(lo de siempre|mi favorito|lo mismo|pedido habitual|repetir pedido|usual)/.test(norm)) {
    clientAIMemory.offTopicStrikes = 0;
    const wantsImmediateSend = /(manda|envia|comanda|cocina|directo|confirma)/.test(norm);
    const usual = getClientUsualCombo();
    const hadHistory = Boolean(usual);
    orderUsualOneTap(false);
    const loadedUsual = getClientUsualCombo();

    if (wantsImmediateSend) {
      appendClientAIMessage('assistant', `¡Listo! Mandando tu pedido habitual: **${loadedUsual.label}** ($${loadedUsual.total}).`);
      setTimeout(() => orderUsualOneTap(true), 250);
      return;
    }

    clientAIMemory.pendingFollowUp = { type: 'send_cart_to_kitchen' };
    const reply = hadHistory
      ? `Cargué tu pedido de siempre: **${loadedUsual.label}** ($${loadedUsual.total} MXN). ¿Lo mandamos directo a cocina?`
      : `Como es tu primera visita aquí, te cargué el favorito de la casa: **${loadedUsual.label}** ($${loadedUsual.total} MXN). ¿Lo mandamos a cocina o le cambiamos algo?`;

    appendClientAIMessage('assistant', reply, [
      { label: 'Mandar a cocina', action: 'orderUsualOneTap(true)' },
      { label: 'Ver carrito', action: 'closeClientAILoyaltyModal(); toggleCart(true);' },
    ]);
    return;
  }

  // 2. Preguntas sobre el menú y precios
  if (/(que venden|que tienen|menu|carta|cuanto cuestan|cuanto cuesta|precio|precios|que bebidas|que hamburguesas|que postres)/.test(norm) && !/(quiero|dame|ponme|agrega|pide)/.test(norm)) {
    clientAIMemory.offTopicStrikes = 0;
    if (/(burger|hamburguesa|sandwich|cuban)/.test(norm)) {
      appendClientAIMessage('assistant', 'En Burgers & Sandwiches tenemos Pinch Burger ($20), Pinch Cuban Sandwich ($18), Turkey BLT ($17), Impossible Vegan Burger ($19), Mahi Mahi ($23) y Fried Chicken Sandwich ($21).');
    } else if (/(bebida|agua|coca|coke|sprite|saratoga|tomar|jamaica|horchata)/.test(norm)) {
      appendClientAIMessage('assistant', 'De tomar tenemos Aguas Frescas hechas en casa de Jamaica y Horchata ($5), Mexican Coke y Sprite ($6), Saratoga Sparkling Water ($6) y latas de 12 oz ($4). ¿Cuál te agrego?');
    } else if (/(postre|dulce|dessert|pie|cookie)/.test(norm)) {
      appendClientAIMessage('assistant', 'En postres tenemos Key Lime Pie ($16), Bread Pudding con helado de tomillo ($14) y Chocolate Chip Cookie ($5).');
    } else {
      appendClientAIMessage('assistant', 'En Pinch Kitchen+Bar tenemos **Pinch Bites** ($12–$21), **Burgers & Sandwiches** ($17–$23), **Entrees** ($14–$39), **Sides** ($5–$12), **Desserts** ($5–$16), **Bebidas** y **Aguas Frescas** ($4–$6). ¿Qué te armo?');
    }
    return;
  }

  // 3. Puntos de lealtad y canjes
  if (/(punto|puntos|lealtad|recompensa|canje|canjear|descuento|nivel|club)/.test(norm)) {
    clientAIMemory.offTopicStrikes = 0;
    loadLoyaltyProfile();
    const pts = loyaltyProfile.points;
    const unlocked = LOYALTY_REWARDS_CATALOG.filter(r => pts >= r.pointsCost);
    if (unlocked.length > 0) {
      const best = unlocked[unlocked.length - 1];
      if (/(canjea|usar|aplica|quiero mi)/.test(norm)) {
        activeCartLoyaltyRewardId = best.id;
        renderCart();
        appendClientAIMessage('assistant', `Listo, apliqué tu **${best.title} (-$${best.discount})** a tu pedido.`);
        return;
      }
      clientAIMemory.pendingFollowUp = { type: 'apply_best_reward', rewardId: best.id };
      appendClientAIMessage('assistant', `Tienes **${pts} Puntos Escandón**. Ya puedes canjear **${best.title} (-$${best.discount})**; ¿quieres que la aplique a tu carrito?`, unlocked.map(r => ({
        label: `Canjear ${r.title} (-$${r.discount})`,
        action: `toggleCartLoyaltyReward('${r.id}')`,
      })));
    } else {
      const missing = Math.max(0, 100 - pts);
      appendClientAIMessage('assistant', `Tienes **${pts} Puntos Escandón** (ganas 1 punto por cada $1 MXN). Te faltan **${missing} pts** para tu primera bebida gratis.`);
    }
    return;
  }

  // 4. Mandar carrito a cocina
  if (/(manda.*cocina|enviar.*cocina|mandar.*comanda|enviar.*comanda|confirmar pedido|pedir ahora|ya pide)/.test(norm)) {
    clientAIMemory.offTopicStrikes = 0;
    if (cartItems.length === 0) {
      clientAIMemory.pendingFollowUp = { type: 'order_usual' };
      appendClientAIMessage('assistant', 'Tu carrito está vacío todavía. ¿Quieres que pidamos **lo de siempre** o dime qué te agrego?', [
        { label: 'Pedir lo de siempre', action: 'orderUsualOneTap(true)' },
      ]);
      return;
    }
    const total = Math.max(0, getCartTotal() - getActiveCartLoyaltyDiscount());
    appendClientAIMessage('assistant', `Perfecto, abro la confirmación para enviar tu orden ($${total} MXN) a cocina.`);
    closeClientAILoyaltyModal();
    openOrderModal();
    return;
  }

  // 5. Estatus de pedido activo
  if (/(como va mi pedido|estatus|estado de mi orden|cuanto falta|mi orden|mi pedido)/.test(norm)) {
    clientAIMemory.offTopicStrikes = 0;
    const activeOrder = activeTrackedOrderId ? orders.find(o => o.id === activeTrackedOrderId) : null;
    if (activeOrder) {
      const meta = STATUS_META[activeOrder.status] || STATUS_META.pending;
      appendClientAIMessage('assistant', `Tu **Orden #${String(activeOrder.num).padStart(3, '0')}** está en **${meta.label}**. ${meta.description}`, [
        { label: 'Ver rastreador', action: 'closeClientAILoyaltyModal(); openActiveTracker();' },
      ]);
    } else {
      appendClientAIMessage('assistant', 'No tienes ninguna orden activa en este momento. ¿Te ayudo a armar una?');
    }
    return;
  }

  // 6. Orden natural de platillos y bebidas
  const parsedItems = parseNaturalMenuOrder(text);
  if (parsedItems.length > 0) {
    clientAIMemory.offTopicStrikes = 0;
    loadComboItemsIntoCart(parsedItems, { replaceCart: false });
    const firstFood = parsedItems.find(i => i.station === 'taco' || i.station === 'hotdog');
    if (firstFood) syncVisualPlateFromItemKey(firstFood.key, firstFood.station);
    const addedSummary = summarizeComboItems(parsedItems);
    const cartTotal = getCartTotal();
    clientAIMemory.pendingFollowUp = { type: 'send_cart_to_kitchen' };
    appendClientAIMessage('assistant', `Agregué **${addedSummary}** a tu carrito (llevas **$${cartTotal} MXN**). ¿Lo mandamos a cocina o agregas algo más?`, [
      { label: 'Mandar a cocina', action: 'closeClientAILoyaltyModal(); openOrderModal();' },
      { label: 'Guardar como "Lo de siempre"', action: 'saveCurrentCartAsUsual()' },
    ]);
    return;
  }

  // 7. Fuera de contexto (Reorientación amable -> Delimitación estricta al 3er intento)
  const offCat = detectOffTopicCategory(norm);
  const offReply = buildClientOffTopicReply(offCat);
  appendClientAIMessage('assistant', offReply, clientAIMemory.offTopicStrikes < 3 ? [
    { label: 'Pedir lo de siempre', action: 'orderUsualOneTap(true)' },
  ] : []);
}

// ═══════════════════════════════════════════════════════════════════
//  COPILOTO IA OPERATIVO DEL RESTAURANTE (MOTOR DE RAZONAMIENTO LOCAL)
//  - 100% texto limpio (cero voz / cero micrófonos)
//  - Razonamiento conciso con memoria de seguimiento conversacional
//  - Análisis en tiempo real de mesas, ventas por producto, carne e insumos PEPS
//  - Guardrails de contexto: reorientación amable -> delimitación estricta (3er intento)
// ═══════════════════════════════════════════════════════════════════
let kitchenCopilotOpen = false;

function toggleKitchenAICopilot(forceState) {
  kitchenCopilotOpen = typeof forceState === 'boolean' ? forceState : !kitchenCopilotOpen;
  const drawer = document.getElementById('kds-copilot-drawer');
  const overlay = document.getElementById('kds-copilot-overlay');
  const navBtn = document.getElementById('btn-kds-copilot-nav');
  const railBtn = document.getElementById('btn-rail-copilot');

  if (drawer) drawer.classList.toggle('open', kitchenCopilotOpen);
  if (overlay) overlay.classList.toggle('open', kitchenCopilotOpen);
  if (navBtn) navBtn.classList.toggle('active', kitchenCopilotOpen);
  if (railBtn) railBtn.classList.toggle('active', kitchenCopilotOpen);

  if (kitchenCopilotOpen) {
    loadPersistedInventory();
    updateKitchenCopilotTelemetry();
    if (kitchenCopilotMessages.length === 0) {
      const greeting = buildKitchenCopilotInitialBriefing();
      appendKitchenCopilotMessage('assistant', greeting.text, greeting.actions, greeting.cardHtml);
    } else {
      renderKitchenCopilotChatFeed();
    }
    setTimeout(() => {
      const input = document.getElementById('kds-copilot-input');
      if (input) input.focus();
    }, 120);
  }
}

function updateKitchenCopilotTelemetry() {
  const strip = document.getElementById('kds-copilot-telemetry');
  if (!strip) return;
  loadPersistedInventory();

  const activeCount = orders.length;
  const beefItem  = inventoryItems.find(i => i.recipeLink === 'pinch_beef_patty');
  const steakItem = inventoryItems.find(i => i.recipeLink === 'pinch_angus_steak');
  const ribsItem  = inventoryItems.find(i => i.recipeLink === 'pinch_ribs_pork');
  const proteinServings = (beefItem ? (getEstimatedServings(beefItem) || 0) : 0)
    + (steakItem ? (getEstimatedServings(steakItem) || 0) : 0)
    + (ribsItem ? (getEstimatedServings(ribsItem) || 0) : 0);
  const sales = calculateDailySales();

  strip.innerHTML = `
    <button type="button" class="copilot-tel-pill" onclick="runKitchenAIQuickPrompt('¿Qué comandas están activas ahorita?')">
      <span class="ct-dot ${activeCount > 0 ? 'live' : ''}"></span>
      <span><strong>${activeCount}</strong> activas</span>
    </button>
    <button type="button" class="copilot-tel-pill" onclick="runKitchenAIQuickPrompt('¿Cuánta carne queda?')">
      ${uiIcon('stock', 'sm')}
      <span>Proteínas: <strong>~${proteinServings} porc.</strong></span>
    </button>
    <button type="button" class="copilot-tel-pill" onclick="runKitchenAIQuickPrompt('¿Cuánto he vendido hoy?')">
      ${uiIcon('chart', 'sm')}
      <span>Hoy: <strong>${formatMoney(sales.totalRevenue)}</strong></span>
    </button>
  `;
}

function buildKitchenCopilotInitialBriefing() {
  loadPersistedInventory();
  const activeCount = orders.length;
  const sales = calculateDailySales();
  const statusLine = activeCount > 0
    ? `Tienes **${activeCount} ${activeCount === 1 ? 'comanda activa' : 'comandas activas'}** y **${formatMoney(sales.totalRevenue)} MXN** en ventas del turno.`
    : (sales.totalRevenue > 0
      ? `Llevas **${formatMoney(sales.totalRevenue)} MXN** vendidos hoy y cocina está despejada.`
      : `Turno en cero todavía y cocina lista para recibir pedidos.`);

  return {
    text: `¡Hola! Estoy conectado en tiempo real al restaurante. ${statusLine} Pregúntame directo por cualquier mesa, ventas o insumos.`,
    cardHtml: '',
    actions: [],
  };
}

function appendKitchenCopilotMessage(role, markdownText, actions = [], cardHtml = '') {
  kitchenCopilotMessages.push({
    id: Date.now() + Math.random(),
    role,
    text: markdownText,
    actions,
    cardHtml,
    ts: Date.now(),
  });
  if (kitchenCopilotMessages.length > 40) kitchenCopilotMessages.shift();
  renderKitchenCopilotChatFeed();
}

function renderKitchenCopilotChatFeed() {
  const feed = document.getElementById('kds-copilot-chat-feed');
  if (!feed) return;
  feed.innerHTML = kitchenCopilotMessages.map(msg => `
    <div class="ai-msg-row ${msg.role}">
      <div class="ai-msg-bubble">
        <div class="ai-msg-text">${formatSimpleMarkdown(msg.text)}</div>
        ${msg.cardHtml ? `<div class="ai-msg-rich-card">${msg.cardHtml}</div>` : ''}
        ${Array.isArray(msg.actions) && msg.actions.length > 0 ? `
          <div class="ai-msg-actions">
            ${msg.actions.map(a => `
              <button type="button" class="ai-msg-action-btn" onclick="${a.action}">${escapeHTML(a.label)}</button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
  feed.scrollTop = feed.scrollHeight;
}

function sendKitchenAIMessage() {
  const input = document.getElementById('kds-copilot-input');
  if (!input) return;
  const query = input.value.trim();
  if (!query) return;
  input.value = '';
  processKitchenAICommand(query);
}

function runKitchenAIQuickPrompt(promptText) {
  processKitchenAICommand(promptText);
}

function copilotNavigateTo(subView, subTab = null) {
  setKDSSubView(subView);
  if (subView === 'stock' && subTab) {
    setStockSubTab(subTab);
  } else if (subView === 'sales' && subTab) {
    setSalesSubTab(subTab);
  }
  const labels = {
    stock: 'Insumos & Stock',
    sales: 'Dashboard de Ventas',
    qrs: 'Códigos QR',
    board: 'Tablero de Comandas',
    comandas: 'Dashboard Cocina',
  };
  showKDSToast(`Abierto: ${labels[subView] || 'Panel de Cocina'}`);
}

function copilotRestockItemQuick(itemId, addQty) {
  loadPersistedInventory();
  const item = inventoryItems.find(i => i.id === itemId);
  if (!item) return;
  const qty = Number(addQty) || 0;
  if (qty <= 0) return;

  item.stock = Math.round((Number(item.stock) + qty) * 100) / 100;
  inventoryMovements.unshift({
    id: 'mov_' + Date.now(),
    ts: Date.now(),
    type: 'in',
    itemName: item.name,
    qty,
    unit: item.unit,
    note: 'Reabastecimiento vía Copiloto IA',
  });
  persistInventory();
  syncAutoMode86FromInventory({ notify: true });
  if (kdsSubView === 'stock') renderInventoryDashboard();
  updateKitchenCopilotTelemetry();

  const servings = getEstimatedServings(item);
  const msg = `Listo, sumé **+${formatGramsAndKg(qty, item.unit)}** a **${item.name}**. Ahora tienes **${formatGramsAndKg(item.stock, item.unit)}**${servings !== null ? ` (~${servings} porciones)` : ''}.`;
  appendKitchenCopilotMessage('assistant', msg, [
    { label: 'Ver en Insumos', action: "copilotNavigateTo('stock', 'inventory')" },
  ]);
}

function copilotAdvanceOrderStatus(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) {
    showKDSToast('Esa comanda ya fue entregada o no está activa');
    return;
  }
  const nextMap = { pending: 'received', received: 'preparing', preparing: 'ready', ready: 'delivered' };
  const next = nextMap[order.status] || 'ready';
  if (next === 'delivered') {
    deliverOrder(order.id);
    appendKitchenCopilotMessage('assistant', `Listo, marqué la **Orden #${String(order.num).padStart(3, '0')} (${order.table})** como **Entregada**.`);
  } else {
    changeOrderStatus(order.id, next);
    const meta = STATUS_META[next] || STATUS_META.pending;
    appendKitchenCopilotMessage('assistant', `Listo, pasé la **Orden #${String(order.num).padStart(3, '0')} (${order.table})** a **${meta.label}**.`);
  }
  updateKitchenCopilotTelemetry();
}

function formatGramsAndKg(val, unit) {
  const num = Number(val) || 0;
  if (unit === 'g' && num >= 1000) {
    const kg = Math.round((num / 1000) * 100) / 100;
    return `${kg} kg`;
  }
  if (unit === 'ml' && num >= 1000) {
    const l = Math.round((num / 1000) * 100) / 100;
    return `${l} L`;
  }
  return formatQtyUnit(num, unit);
}

// Calcula ventas cerradas + artículos en preparación en cocina por categoría Pinch y Bebidas
function getLiveDetailedProductMetrics() {
  const closedStats = calculateDailySales();
  const readyMap = new Map();
  completedOrders.forEach(o => { if (o && o.id) readyMap.set(o.id, o); });
  orders.forEach(o => { if (o && o.id && o.status === 'ready') readyMap.set(o.id, o); });
  const closedList = Array.from(readyMap.values());
  const inProgressList = orders.filter(o => o && o.status !== 'ready');

  const countBucket = (orderList) => {
    const b = {
      bites:    { qty: 0, amt: 0 },
      burgers:  { qty: 0, amt: 0 },
      entrees:  { qty: 0, amt: 0 },
      sides:    { qty: 0, amt: 0 },
      desserts: { qty: 0, amt: 0 },
      aguas:    { qty: 0, amt: 0 },
      jamaica:  { qty: 0, amt: 0 },
      horchata: { qty: 0, amt: 0 },
      sodas:    { qty: 0, amt: 0 },
      bebidas:  { qty: 0, amt: 0 },
      totalMoney: 0,
    };
    orderList.forEach(order => {
      b.totalMoney += Number(order.total) || 0;
      (order.items || []).forEach(it => {
        const qty  = Number(it.qty) || 0;
        const amt  = qty * (Number(it.price) || 0);
        const cat  = resolvePinchOrderItemCategory(it);
        const name = normalizeSpanishQuery(it.name || '');
        if (cat === 'pinch_bites') { b.bites.qty += qty; b.bites.amt += amt; }
        else if (cat === 'burgers_sandwiches') { b.burgers.qty += qty; b.burgers.amt += amt; }
        else if (cat === 'entrees') { b.entrees.qty += qty; b.entrees.amt += amt; }
        else if (cat === 'sides') { b.sides.qty += qty; b.sides.amt += amt; }
        else if (cat === 'desserts') { b.desserts.qty += qty; b.desserts.amt += amt; }
        else if (cat === 'drinks') {
          b.bebidas.qty += qty; b.bebidas.amt += amt;
          if (name.includes('jamaica')) {
            b.aguas.qty += qty; b.aguas.amt += amt;
            b.jamaica.qty += qty; b.jamaica.amt += amt;
          } else if (name.includes('horchata')) {
            b.aguas.qty += qty; b.aguas.amt += amt;
            b.horchata.qty += qty; b.horchata.amt += amt;
          } else {
            b.sodas.qty += qty; b.sodas.amt += amt;
          }
        }
      });
    });
    return b;
  };

  return {
    closedStats,
    closed: countBucket(closedList),
    active: countBucket(inProgressList),
    inProgressOrdersCount: inProgressList.length,
  };
}

// Revisa disponibilidad real de ingredientes Pinch y Bebidas
function runKitchenIngredientsReadinessCheck(product = 'all') {
  loadPersistedInventory();
  const pickByLinks = (links) => inventoryItems.filter(i => links.includes(i.recipeLink));

  if (['burgers', 'sandwiches'].includes(product)) {
    const items = pickByLinks(['pinch_beef_patty', 'pinch_brioche', 'pinch_cuban_bread', 'pinch_cured_meats', 'pinch_cheese', 'pinch_bacon']);
    const summary = items.map(i => `**${i.name}**: ${formatGramsAndKg(i.stock, i.unit)}`).join(' · ');
    const low = items.filter(i => getInventoryItemHealth(i).needsRestock);
    let msg = `Insumos para Burgers & Sandwiches: ${summary}.`;
    if (low.length > 0) msg += ` Bajo mínimo: **${low.map(i => i.name).join(', ')}**.`;
    kitchenCopilotMemory.pendingFollowUp = { type: 'open_inventory' };
    appendKitchenCopilotMessage('assistant', msg, [
      { label: 'Abrir Insumos', action: "copilotNavigateTo('stock', 'inventory')" },
    ]);
    return;
  }

  if (['entrees', 'cortes', 'ribs'].includes(product)) {
    const items = pickByLinks(['pinch_angus_steak', 'pinch_ribs_pork', 'pinch_pasta', 'pinch_eggs']);
    const summary = items.map(i => `**${i.name}**: ${formatGramsAndKg(i.stock, i.unit)}`).join(' · ');
    kitchenCopilotMemory.pendingFollowUp = { type: 'open_inventory' };
    appendKitchenCopilotMessage('assistant', `Insumos para Entrees y Cortes: ${summary}.`, [
      { label: 'Abrir Insumos', action: "copilotNavigateTo('stock', 'inventory')" },
    ]);
    return;
  }

  if (['aguas', 'jamaica', 'horchata', 'sodas', 'bebidas'].includes(product)) {
    const links = product === 'jamaica' ? ['drink_agua_jamaica']
      : (product === 'horchata' ? ['drink_agua_horchata']
        : (product === 'aguas' ? ['drink_agua_jamaica', 'drink_agua_horchata']
          : (product === 'sodas' ? ['drink_mexican_coke', 'drink_mexican_sprite', 'drink_saratoga', 'drink_cans_12oz']
            : ['drink_agua_jamaica', 'drink_agua_horchata', 'drink_mexican_coke', 'drink_mexican_sprite', 'drink_saratoga', 'drink_cans_12oz'])));
    const items = pickByLinks(links);
    const summary = items.map(i => `**${i.name}**: ${formatGramsAndKg(i.stock, i.unit)} (~${getEstimatedServings(i)} porciones)`).join(' · ');
    const low = items.filter(i => getInventoryItemHealth(i).needsRestock);
    let msg = `En bebidas tienes: ${summary}.`;
    if (low.length > 0) msg += ` Ojo: **${low.map(i => i.name).join(', ')}** está bajo el mínimo.`;
    appendKitchenCopilotMessage('assistant', msg, [
      { label: 'Abrir Insumos', action: "copilotNavigateTo('stock', 'inventory')" },
    ]);
    return;
  }

  // Revisión general de arranque de turno
  const lowItems = inventoryItems.filter(i => getInventoryItemHealth(i).needsRestock);
  const expItems = inventoryItems.filter(i => getInventoryItemHealth(i).needsExpiryAction);
  if (lowItems.length === 0 && expItems.length === 0) {
    appendKitchenCopilotMessage('assistant', 'Todo el inventario de Pinch Kitchen+Bar está en nivel óptimo y vigente. Estás listo para el turno.');
    return;
  }
  const bits = [];
  if (lowItems.length > 0) bits.push(`bajo stock: **${lowItems.map(i => `${i.name} (${formatGramsAndKg(i.stock, i.unit)})`).join(', ')}**`);
  if (expItems.length > 0) bits.push(`por caducar pronto: **${expItems.map(i => `${i.name} (${getExpiryMeta(i.expiryDate).label.toLowerCase()})`).join(', ')}**`);
  kitchenCopilotMemory.pendingFollowUp = { type: 'open_inventory' };
  appendKitchenCopilotMessage('assistant', `El menú está operando, pero revisa ${bits.join('; y ')}. ¿Te abro el panel de insumos?`, [
    { label: 'Ir a Insumos', action: "copilotNavigateTo('stock', 'inventory')" },
    { label: 'Copiar lista de compras', action: 'copyRestockShoppingList()' },
  ]);
}

function buildKitchenOffTopicReply(category) {
  kitchenCopilotMemory.offTopicStrikes += 1;
  kitchenCopilotMemory.pendingFollowUp = null;

  if (kitchenCopilotMemory.offTopicStrikes >= 3) {
    return 'Este asistente está dedicado exclusivamente a la operación de Escandón (mesas, comandas, inventario y ventas). Por favor indícame qué consulta operativa necesitas.';
  }
  if (kitchenCopilotMemory.offTopicStrikes === 2) {
    return 'Me encantaría ayudarte con eso, pero mi enfoque es 100% la operación del restaurante. Si necesitas revisar alguna mesa, ventas o inventario, dime y lo vemos al momento.';
  }
  if (category === 'weather') {
    return 'No tengo el reporte del clima a la mano, pero aquí en Escandón el comal está caliente y listo. ¿Quieres que revise las ventas de hoy o alguna mesa?';
  }
  if (category === 'sports') {
    return 'Ni idea de cómo quedó el partido, yo no me despego de la plancha ni de las comandas. ¿Checamos cómo va el turno o cuánta carne queda?';
  }
  if (category === 'creative') {
    return 'Para poemas o chistes no soy muy bueno, lo mío son las comandas, las mesas y el inventario. ¿Te ayudo con algo del turno?';
  }
  return 'Esa se me escapa porque solo tengo vista de lo que pasa aquí adentro en Escandón. ¿Revisamos comandas, ventas o insumos?';
}

async function processKitchenAICommand(rawQuery) {
  const query = String(rawQuery || '').trim();
  if (!query) return;

  const priorHistory = kitchenCopilotMessages.slice(-8).map(m => ({ role: m.role, text: m.text }));
  appendKitchenCopilotMessage('user', query);
  loadPersistedInventory();
  updateKitchenCopilotTelemetry();

  const norm = normalizeSpanishQuery(query);

  // Armar estado vivo completo en tiempo real para Gemini Flash
  const sales = calculateDailySales();
  const detailed = getLiveDetailedProductMetrics();
  const liveState = {
    ventas_turno_cerradas: sales.totalRevenue,
    ordenes_cerradas_count: sales.ordersCount,
    desglose_vendido_cerrado: {
      pinch_bites: detailed.closed.bites.qty,
      burgers_sandwiches: detailed.closed.burgers.qty,
      entrees: detailed.closed.entrees.qty,
      sides: detailed.closed.sides.qty,
      desserts: detailed.closed.desserts.qty,
      aguas_frescas: detailed.closed.aguas.qty,
      agua_jamaica: detailed.closed.jamaica.qty,
      agua_horchata: detailed.closed.horchata.qty,
      bebidas_pinch: detailed.closed.sodas.qty,
    },
    en_preparacion_cocina: {
      comandas_pendientes_count: detailed.inProgressOrdersCount,
      dinero_en_cocina: detailed.active.totalMoney,
      pinch_bites: detailed.active.bites.qty,
      burgers_sandwiches: detailed.active.burgers.qty,
      entrees: detailed.active.entrees.qty,
      sides: detailed.active.sides.qty,
      desserts: detailed.active.desserts.qty,
      aguas_frescas: detailed.active.aguas.qty,
      bebidas_pinch: detailed.active.sodas.qty,
    },
    comandas_activas: orders.map(o => ({
      numero: o.num,
      mesa: o.table,
      cliente: o.guestName,
      estatus: o.status,
      total: o.total,
      pagado: Boolean(o.paid),
      articulos: (o.items || []).map(i => `${i.qty}x ${i.name}`),
    })),
    pedidos_entregados_recientes: completedOrders.slice(-10).map(o => ({
      numero: o.num,
      mesa: o.table,
      cliente: o.guestName,
      total: o.total,
      articulos: (o.items || []).map(i => `${i.qty}x ${i.name}`),
    })),
    inventario_insumos: inventoryItems.map(item => {
      const h = getInventoryItemHealth(item);
      return {
        nombre: item.name,
        categoria: item.category,
        stock: `${item.stock} ${item.unit}`,
        minimo: `${item.minStock} ${item.unit}`,
        estado: h.status,
        porciones_estimadas: h.servings,
        caducidad: h.expiry.label,
      };
    }),
    agotados_modo86: soldOutItems.slice(),
  };

  const thinkingId = 'kthinking_' + Date.now();
  kitchenCopilotMessages.push({ id: thinkingId, role: 'assistant', text: '*Pensando...*', actions: [], cardHtml: '', ts: Date.now() });
  renderKitchenCopilotChatFeed();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'kitchen',
        query,
        history: priorHistory,
        liveState,
      }),
    });
    kitchenCopilotMessages = kitchenCopilotMessages.filter(m => m.id !== thinkingId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.text) {
        const actions = [];
        if (data.action === 'navegar_stock') {
          const wantMode86 = /(agotad|modo 86|pausar|bloquear|desactivar)/.test(norm);
          const tab = wantMode86 ? 'mode86' : 'inventory';
          actions.push({ label: wantMode86 ? 'Ver Modo 86' : 'Ver Insumos & Stock', action: `copilotNavigateTo('stock', '${tab}')` });
          copilotNavigateTo('stock', tab);
        } else if (data.action === 'navegar_ventas') {
          actions.push({ label: 'Ir al Dashboard', action: "copilotNavigateTo('sales')" });
          copilotNavigateTo('sales');
        } else if (data.action === 'navegar_comandas') {
          actions.push({ label: 'Ir a Comandas', action: "copilotNavigateTo('board')" });
          copilotNavigateTo('board');
        } else if (data.action === 'navegar_qrs') {
          actions.push({ label: 'Ir a Códigos QR', action: "copilotNavigateTo('qrs')" });
          copilotNavigateTo('qrs');
        }
        appendKitchenCopilotMessage('assistant', data.text, actions);
        return;
      }
    }
  } catch (e) {
    kitchenCopilotMessages = kitchenCopilotMessages.filter(m => m.id !== thinkingId);
    console.warn('Backend Gemini no disponible, usando fallback local:', e);
  }

  // Fallback local si no hay conexión al backend /api/chat

  // ─────────────────────────────────────────────────────────────────
  // 0) SEGUIMIENTO CONVERSACIONAL ("sí", "revisa", "dale", "no gracias")
  // ─────────────────────────────────────────────────────────────────
  if (kitchenCopilotMemory.pendingFollowUp) {
    const pending = kitchenCopilotMemory.pendingFollowUp;
    if (isAffirmativeFollowUp(norm)) {
      kitchenCopilotMemory.pendingFollowUp = null;
      kitchenCopilotMemory.offTopicStrikes = 0;

      if (pending.type === 'check_product_ingredients') {
        runKitchenIngredientsReadinessCheck(pending.product || 'all');
        return;
      }
      if (pending.type === 'check_readiness') {
        runKitchenIngredientsReadinessCheck('all');
        return;
      }
      if (pending.type === 'open_inventory') {
        copilotNavigateTo('stock', 'inventory');
        appendKitchenCopilotMessage('assistant', 'Listo, ya te abrí el panel de **Insumos & Stock** en pantalla.');
        return;
      }
      if (pending.type === 'copy_shopping_list') {
        copyRestockShoppingList();
        appendKitchenCopilotMessage('assistant', 'Listo, copié la lista de compras al portapapeles.');
        return;
      }
      if (pending.type === 'sales_breakdown') {
        const s = calculateDailySales();
        const b = s.breakdown;
        appendKitchenCopilotMessage('assistant',
          `Desglose del turno (**${formatMoney(s.totalRevenue)}**): Bites ${b.pinch_bites.qty} · Burgers/Sandwiches ${b.burgers_sandwiches.qty} · Entrees ${b.entrees.qty} · Sides ${b.sides.qty} · Postres ${b.desserts.qty} · Bebidas ${b.drinks.qty} (Aguas: ${b.drinks.aguas}).`,
          [{ label: 'Abrir Dashboard', action: "copilotNavigateTo('sales')" }]
        );
        return;
      }
    } else if (isNegativeFollowUp(norm)) {
      kitchenCopilotMemory.pendingFollowUp = null;
      kitchenCopilotMemory.offTopicStrikes = 0;
      appendKitchenCopilotMessage('assistant', 'Perfecto, aquí sigo al pendiente si necesitas algo más del turno.');
      return;
    }
  }

  // Saludos y agradecimientos naturales
  if (isPureGreeting(norm)) {
    kitchenCopilotMemory.offTopicStrikes = 0;
    appendKitchenCopilotMessage('assistant', '¡Hola! Aquí listo con todo lo del turno en tiempo real. ¿Revisamos ventas, alguna mesa o insumos?');
    return;
  }
  if (isPureThanks(norm)) {
    kitchenCopilotMemory.offTopicStrikes = 0;
    appendKitchenCopilotMessage('assistant', '¡A la orden! Cualquier duda del restaurante, aquí estoy.');
    return;
  }

  // ─────────────────────────────────────────────────────────────────
  // A) ACCIONES DIRECTAS DE INVENTARIO ("recarga 10 panes brioche", "agrega 2 kg de tocino")
  // ─────────────────────────────────────────────────────────────────
  if (/\b(recarga|agrega|suma|abastece|anade|meter)\b/.test(norm) && /(carne|angus|costillar|pollo|pavo|jamon|camaron|tocino|huevo|brioche|pan|pasta|totopos|papa|aguacate|queso|alioli|bbq|arugula|cebolla|jamaica|horchata|coke|sprite|saratoga|lata)/.test(norm)) {
    kitchenCopilotMemory.offTopicStrikes = 0;
    kitchenCopilotMemory.pendingFollowUp = null;
    const numMatch = norm.match(/(\d+(?:\.\d+)?)/);
    let qty = numMatch ? parseFloat(numMatch[1]) : 1000;
    const isKgOrL = /\b(kilo|kilos|kg|litro|litros)\b/.test(norm);

    const matchedItem = inventoryItems.find(it => {
      const n = normalizeSpanishQuery(it.name);
      return norm.split(/\s+/).some(w => w.length >= 4 && n.includes(w));
    });

    if (matchedItem) {
      if (isKgOrL && (matchedItem.unit === 'g' || matchedItem.unit === 'ml')) qty *= 1000;
      copilotRestockItemQuick(matchedItem.id, qty);
      return;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // B) ACCIONES SOBRE COMANDAS ("marca la mesa 2 como lista", "avanza la orden 1")
  // ─────────────────────────────────────────────────────────────────
  if (/\b(marca|marcala|pasa|avanza|pon)\b/.test(norm) && /(listo|lista|preparando|cocinando|recibido|entregado|entregar)/.test(norm)) {
    kitchenCopilotMemory.offTopicStrikes = 0;
    kitchenCopilotMemory.pendingFollowUp = null;
    const tableMatch = norm.match(/mesa\s*(\d+)/);
    const orderMatch = norm.match(/(?:orden|comanda|#)\s*0*(\d+)/);
    let targetOrder = null;
    if (tableMatch) {
      targetOrder = orders.find(o => String(o.table || '').toLowerCase() === `mesa ${tableMatch[1]}`);
    } else if (orderMatch) {
      targetOrder = orders.find(o => o.num === parseInt(orderMatch[1], 10));
    } else if (kitchenCopilotMemory.lastTableMentioned) {
      targetOrder = orders.find(o => String(o.table || '').toLowerCase() === kitchenCopilotMemory.lastTableMentioned.toLowerCase());
    } else if (orders.length === 1) {
      targetOrder = orders[0];
    }

    if (targetOrder) {
      let targetStatus = 'ready';
      if (/(preparando|cocinando)/.test(norm)) targetStatus = 'preparing';
      else if (/recibido/.test(norm)) targetStatus = 'received';
      else if (/(entregado|entregar)/.test(norm)) {
        deliverOrder(targetOrder.id);
        appendKitchenCopilotMessage('assistant', `Listo, marqué la **Orden #${String(targetOrder.num).padStart(3, '0')} (${targetOrder.table})** como entregada.`);
        updateKitchenCopilotTelemetry();
        return;
      }
      changeOrderStatus(targetOrder.id, targetStatus);
      const meta = STATUS_META[targetStatus] || STATUS_META.ready;
      appendKitchenCopilotMessage('assistant', `Listo, cambié la **Orden #${String(targetOrder.num).padStart(3, '0')} (${targetOrder.table})** a **${meta.label}**.`);
      updateKitchenCopilotTelemetry();
      return;
    } else {
      appendKitchenCopilotMessage('assistant', 'No encontré una comanda activa que coincida con esa mesa u orden.');
      return;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // C) NAVEGACIÓN Y GUÍA DEL SOFTWARE ("¿en qué parte se ve lo de insumos?")
  // ─────────────────────────────────────────────────────────────────
  if (/(en que parte|donde se ve|donde veo|donde esta|como veo|abrir|ir a|llevame a|mostrar seccion|como hago)/.test(norm)) {
    if (/(insumo|insumos|inventario|stock|caducidad|peps|materia prima|almacen)/.test(norm)) {
      kitchenCopilotMemory.offTopicStrikes = 0;
      kitchenCopilotMemory.pendingFollowUp = null;
      copilotNavigateTo('stock', 'inventory');
      appendKitchenCopilotMessage('assistant', 'Te acabo de abrir **Insumos & Stock** en pantalla. Siempre puedes entrar desde el botón **Stock 86** en la barra superior.', [
        { label: '+ Agregar Insumo', action: 'openInventoryModal()' },
        { label: 'Modo 86 Rápido', action: "copilotNavigateTo('stock', 'mode86')" },
      ]);
      return;
    }
    if (/(modo 86|agotar|bloquear ingrediente)/.test(norm)) {
      kitchenCopilotMemory.offTopicStrikes = 0;
      kitchenCopilotMemory.pendingFollowUp = null;
      copilotNavigateTo('stock', 'mode86');
      appendKitchenCopilotMessage('assistant', 'Te abrí **Modo 86** dentro de **Stock 86**. Toca cualquier ingrediente ahí para pausarlo en los celulares de los clientes.');
      return;
    }
    if (/(venta|ventas|dashboard|finanzas|corte|turno|excel|reporte|ganancia|ingresos)/.test(norm)) {
      kitchenCopilotMemory.offTopicStrikes = 0;
      kitchenCopilotMemory.pendingFollowUp = null;
      copilotNavigateTo('sales');
      appendKitchenCopilotMessage('assistant', 'Te abrí el **Dashboard de Ventas** (botón **Dashboard** arriba). Ahí ves el corte del turno y puedes exportar el Excel.', [
        { label: 'Exportar Excel', action: 'exportCurrentShiftOrMonthExcel()' },
      ]);
      return;
    }
    if (/(qr|qrs|codigo|imprim)/.test(norm)) {
      kitchenCopilotMemory.offTopicStrikes = 0;
      kitchenCopilotMemory.pendingFollowUp = null;
      copilotNavigateTo('qrs');
      appendKitchenCopilotMessage('assistant', 'Te abrí el generador de **Códigos QR por Mesa** (botón **QRs** arriba).');
      return;
    }
    if (/(comanda|comandas|tablero)/.test(norm)) {
      kitchenCopilotMemory.offTopicStrikes = 0;
      kitchenCopilotMemory.pendingFollowUp = null;
      copilotNavigateTo('board');
      appendKitchenCopilotMessage('assistant', 'Listo, te abrí el **Tablero de Comandas** en vivo.');
      return;
    }
    if (/(cocina|inicio|principal|resumen)/.test(norm)) {
      kitchenCopilotMemory.offTopicStrikes = 0;
      kitchenCopilotMemory.pendingFollowUp = null;
      copilotNavigateTo('comandas');
      appendKitchenCopilotMessage('assistant', 'Listo, regresamos al **Dashboard de Cocina**.');
      return;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // D) CONSULTAS DE MESA ESPECÍFICA, CLIENTE O COMANDA (CON MEMORIA DE MESA)
  // ─────────────────────────────────────────────────────────────────
  const tableNumMatch = norm.match(/\bmesa\s*(\d+)\b/);
  const orderNumMatch = norm.match(/\b(?:orden|comanda|folio|#)\s*0*(\d+)\b/);
  const asksAboutChannel = /\b(mostrador|pickup|para llevar|domicilio|envio)\b/.exec(norm);
  const asksFollowUpOnLastTable = Boolean(kitchenCopilotMemory.lastTableMentioned) && /\b(ya pago|cuanto debe|cuanto es su cuenta|como va esa mesa|que mas pidio)\b/.test(norm);

  if (tableNumMatch || orderNumMatch || asksFollowUpOnLastTable || (asksAboutChannel && /(pidio|pedido|comanda|cuenta|orden|debe|pago)/.test(norm))) {
    kitchenCopilotMemory.offTopicStrikes = 0;
    kitchenCopilotMemory.pendingFollowUp = null;

    let targetLabel = '';
    let activeMatches = [];
    let completedMatches = [];

    if (tableNumMatch) {
      const num = tableNumMatch[1];
      targetLabel = `Mesa ${num}`;
      kitchenCopilotMemory.lastTableMentioned = targetLabel;
      const regex = new RegExp(`^mesa\\s*0*${num}\\b`, 'i');
      activeMatches = orders.filter(o => regex.test(String(o.table || '').trim()));
      completedMatches = completedOrders.filter(o => regex.test(String(o.table || '').trim()));
    } else if (orderNumMatch) {
      const oNum = parseInt(orderNumMatch[1], 10);
      targetLabel = `Orden #${String(oNum).padStart(3, '0')}`;
      activeMatches = orders.filter(o => o.num === oNum);
      completedMatches = completedOrders.filter(o => o.num === oNum);
      if (activeMatches[0]) kitchenCopilotMemory.lastTableMentioned = activeMatches[0].table;
    } else if (asksFollowUpOnLastTable) {
      targetLabel = kitchenCopilotMemory.lastTableMentioned;
      activeMatches = orders.filter(o => String(o.table || '').toLowerCase() === targetLabel.toLowerCase());
      completedMatches = completedOrders.filter(o => String(o.table || '').toLowerCase() === targetLabel.toLowerCase());
    } else if (asksAboutChannel) {
      const ch = asksAboutChannel[1];
      targetLabel = ch.includes('domicilio') || ch.includes('envio') ? 'A Domicilio' : (ch.includes('pickup') || ch.includes('llevar') ? 'Pickup' : 'Mostrador');
      kitchenCopilotMemory.lastTableMentioned = targetLabel;
      activeMatches = orders.filter(o => String(o.table || '').toLowerCase().includes(targetLabel.toLowerCase()));
      completedMatches = completedOrders.filter(o => String(o.table || '').toLowerCase().includes(targetLabel.toLowerCase()));
    }

    const allMatches = [...activeMatches, ...completedMatches];

    if (allMatches.length === 0) {
      const activeNames = orders.length > 0
        ? ` Las mesas activas ahorita son: ${orders.map(o => `**${o.table}**`).join(', ')}.`
        : '';
      appendKitchenCopilotMessage('assistant', `La **${targetLabel}** no tiene pedidos registrados en este turno todavía.${activeNames}`);
      return;
    }

    const totalMoney = allMatches.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const unpaidMoney = allMatches.filter(o => !o.paid).reduce((s, o) => s + (Number(o.total) || 0), 0);

    // Si solo preguntó si ya pagó o cuánto debe, responder de forma ultra concisa
    if (/\b(ya pago|pago|pagado)\b/.test(norm) && !/que.*pidio/.test(norm)) {
      const msg = unpaidMoney === 0
        ? `Sí, **${targetLabel}** ya está pagada en su totalidad (**${formatMoney(totalMoney)} MXN**).`
        : `No, **${targetLabel}** todavía tiene **${formatMoney(unpaidMoney)} MXN** pendientes por cobrar.`;
      appendKitchenCopilotMessage('assistant', msg);
      return;
    }
    if (/\b(cuanto debe|cuanto es su cuenta|total de)\b/.test(norm) && !/que.*pidio/.test(norm)) {
      appendKitchenCopilotMessage('assistant', `El total de **${targetLabel}** es de **${formatMoney(totalMoney)} MXN** (${unpaidMoney > 0 ? `por cobrar: ${formatMoney(unpaidMoney)}` : 'ya pagado'}).`);
      return;
    }

    // Resumen natural y conciso de lo que pidió la mesa + tarjeta limpia
    const summaryParts = allMatches.map(o => {
      const isDone = !orders.some(act => act.id === o.id);
      const st = isDone ? 'entregado' : (STATUS_META[o.status] ? STATUS_META[o.status].label.toLowerCase() : 'pendiente');
      const itemsText = (o.items || []).map(it => `${it.qty}× ${it.name}`).join(', ');
      return `**#${String(o.num).padStart(3, '0')}** (${o.guestName || 'Comensal'}, ${st}): ${itemsText}`;
    });

    const cardRows = allMatches.map(o => {
      const isDone = !orders.some(act => act.id === o.id);
      const meta = isDone ? { label: 'Entregado' } : (STATUS_META[o.status] || STATUS_META.pending);
      const mins = Math.max(0, Math.floor((Date.now() - (o.createdAt || Date.now())) / 60000));
      return `
        <div class="copilot-order-mini-card">
          <div class="comc-head">
            <strong>#${String(o.num).padStart(3, '0')} · ${escapeHTML(o.guestName || 'Comensal')}</strong>
            <span class="comc-status">${escapeHTML(meta.label)} · ${mins} min</span>
          </div>
          <div class="comc-items">${(o.items || []).map(it => `${it.qty}× ${it.emoji || ''} ${it.name}`).join('<br/>')}</div>
          <div class="comc-foot">
            <span><strong>$${o.total} MXN</strong></span>
            <span>${o.paid ? '✓ Pagado' : 'Por cobrar'}</span>
          </div>
        </div>
      `;
    }).join('');

    const actions = activeMatches.slice(0, 2).map(o => ({
      label: `▶ Avanzar #${String(o.num).padStart(3, '0')}`,
      action: `copilotAdvanceOrderStatus(${o.id})`,
    }));

    appendKitchenCopilotMessage(
      'assistant',
      `**${targetLabel}** pidió: ${summaryParts.join(' · ')}. Total: **${formatMoney(totalMoney)} MXN** (${unpaidMoney === 0 ? 'pagado' : 'por cobrar'}).`,
      actions,
      cardRows
    );
    return;
  }

  // ─────────────────────────────────────────────────────────────────
  // E) RAZONAMIENTO SOBRE VENTAS (ESPECÍFICO POR PRODUCTO VS TOTAL GENERAL)
  // ─────────────────────────────────────────────────────────────────
  const isSalesQuery = /(vendido|vendimos|venta|ventas|salido|salieron|llevo vendido|llevamos vendido|cuanto llevo|cuanto llevamos|cuanto he|ingresos|dinero|caja|platillo lider|mas vendido|ticket promedio|desglose)/.test(norm);

  if (isSalesQuery) {
    kitchenCopilotMemory.offTopicStrikes = 0;
    const m = getLiveDetailedProductMetrics();
    const s = m.closedStats;

    // 1. ¿Pregunta por una categoría/producto específico? ("¿he vendido burgers?", "¿cuántas jamaicas van?")
    const productMatchers = [
      { key: 'burgers',  re: /\b(burger|burgers|hamburguesa|hamburguesas|sandwich|sandwiches|cubano|cuban|blt)\b/, singular: 'burger/sándwich', plural: 'burgers y sándwiches', offer: 'si tenemos carne 8oz y pan brioche listos' },
      { key: 'bites',    re: /\b(bite|bites|entrada|entradas|nacho|nachos|croqueta|croquetas|guac|porkbelly|gamba|gambas|camaron|camarones)\b/, singular: 'Pinch Bite', plural: 'Pinch Bites', offer: 'el stock de entradas y mariscos' },
      { key: 'entrees',  re: /\b(entree|entrees|corte|cortes|steak|entrana|ribs|costilla|costillas|pasta|tagliatelle|bucatini)\b/, singular: 'plato fuerte', plural: 'platos fuertes', offer: 'el stock de entraña Angus y costillar' },
      { key: 'sides',    re: /\b(side|sides|guarnicion|papas|fries|focaccia|broccolini|pure)\b/, singular: 'guarnición', plural: 'guarniciones', offer: 'el stock de papas frescas y vegetales' },
      { key: 'desserts', re: /\b(postre|postres|dessert|desserts|pie|cookie|pudding|galleta)\b/, singular: 'postre', plural: 'postres', offer: 'cuántos postres quedan en barra' },
      { key: 'jamaica',  re: /\b(jamaica)\b/, singular: 'agua de jamaica', plural: 'aguas de jamaica', offer: 'cuánta agua de jamaica queda' },
      { key: 'horchata', re: /\b(horchata)\b/, singular: 'agua de horchata', plural: 'aguas de horchata', offer: 'cuánta agua de horchata queda' },
      { key: 'aguas',    re: /\b(agua|aguas)\b/, singular: 'agua fresca', plural: 'aguas frescas', offer: 'cuánta agua fresca queda en inventario' },
      { key: 'sodas',    re: /\b(coca|coke|sprite|saratoga|refresco|refrescos|lata|latas)\b/, singular: 'bebida Pinch', plural: 'bebidas Pinch', offer: 'cuántas botellas y latas quedan en enfriador' },
      { key: 'bebidas',  re: /\b(bebida|bebidas)\b/, singular: 'bebida', plural: 'bebidas', offer: 'cómo estamos de inventario de bebidas y aguas' },
    ];

    const prodMatch = productMatchers.find(p => p.re.test(norm));
    if (prodMatch && !/\b(desglose|todo|general)\b/.test(norm)) {
      const closedQty = m.closed[prodMatch.key].qty;
      const closedAmt = m.closed[prodMatch.key].amt;
      const activeQty = m.active[prodMatch.key].qty;
      const labelClosed = closedQty === 1 ? prodMatch.singular : prodMatch.plural;
      const labelActive = activeQty === 1 ? prodMatch.singular : prodMatch.plural;

      if (closedQty === 0 && activeQty === 0) {
        kitchenCopilotMemory.pendingFollowUp = { type: 'check_product_ingredients', product: prodMatch.key };
        appendKitchenCopilotMessage(
          'assistant',
          `No, aún no hemos vendido ningún ${prodMatch.singular} hoy. ¿Quieres que revise ${prodMatch.offer}?`
        );
        return;
      }
      if (closedQty === 0 && activeQty > 0) {
        kitchenCopilotMemory.pendingFollowUp = null;
        appendKitchenCopilotMessage(
          'assistant',
          `Todavía no se entrega ninguno como vendido, pero ahorita hay **${activeQty} ${labelActive}** preparándose en cocina.`
        );
        return;
      }
      kitchenCopilotMemory.pendingFollowUp = null;
      appendKitchenCopilotMessage(
        'assistant',
        `Sí, hoy van **${closedQty} ${labelClosed}** vendidos (**${formatMoney(closedAmt)}**)${activeQty > 0 ? `, más **${activeQty} ${labelActive}** en preparación` : ''}.`
      );
      return;
    }

    // 2. ¿Pregunta explícitamente por el platillo líder / más vendido?
    if (/(platillo lider|mas vendido|lo que mas se vende)/.test(norm)) {
      kitchenCopilotMemory.pendingFollowUp = null;
      if (s.totalUnits === 0) {
        appendKitchenCopilotMessage('assistant', 'Todavía no hay ventas cerradas hoy para definir un platillo líder.');
        return;
      }
      if (s.topDish && s.topDish.qty > 0) {
        appendKitchenCopilotMessage('assistant', `El platillo líder hoy es **${s.topDish.name}** con **${s.topDish.qty} unidades**.`);
        return;
      }
      const b = s.breakdown;
      const cats = [
        { name: 'Burgers & Sandwiches', qty: b.burgers_sandwiches.qty, amt: b.burgers_sandwiches.amount },
        { name: 'Pinch Bites', qty: b.pinch_bites.qty, amt: b.pinch_bites.amount },
        { name: 'Entrees', qty: b.entrees.qty, amt: b.entrees.amount },
        { name: 'Sides', qty: b.sides.qty, amt: b.sides.amount },
        { name: 'Desserts', qty: b.desserts.qty, amt: b.desserts.amount },
        { name: 'Bebidas y Aguas', qty: b.drinks.qty, amt: b.drinks.amount },
      ].sort((a, b2) => b2.qty - a.qty);
      appendKitchenCopilotMessage('assistant', `La categoría líder hoy es **${cats[0].name}** con **${cats[0].qty} unidades** (${formatMoney(cats[0].amt)}).`);
      return;
    }

    // 3. ¿Pidió explícitamente el desglose?
    if (/\b(desglose|detalle|por producto|por categoria)\b/.test(norm)) {
      kitchenCopilotMemory.pendingFollowUp = null;
      if (s.totalRevenue === 0) {
        appendKitchenCopilotMessage('assistant', 'Aún no hay ventas cerradas en el turno ($0) para desglosar.');
        return;
      }
      const b = s.breakdown;
      appendKitchenCopilotMessage(
        'assistant',
        `Desglose del turno (**${formatMoney(s.totalRevenue)}**): Bites ${b.pinch_bites.qty} · Burgers/Sandwiches ${b.burgers_sandwiches.qty} · Entrees ${b.entrees.qty} · Sides ${b.sides.qty} · Postres ${b.desserts.qty} · Bebidas ${b.drinks.qty} (Aguas: ${b.drinks.aguas}).`,
        [{ label: 'Abrir Dashboard', action: "copilotNavigateTo('sales')" }]
      );
      return;
    }

    // 4. Pregunta general concisa: "¿Cuánto he vendido hoy?"
    if (s.totalRevenue === 0 && m.inProgressOrdersCount === 0) {
      kitchenCopilotMemory.pendingFollowUp = { type: 'check_readiness' };
      appendKitchenCopilotMessage(
        'assistant',
        'Hoy llevas **$0 MXN**; aún no se ha registrado ninguna venta en el turno. ¿Quieres que revise si todos los ingredientes están listos para arrancar?'
      );
      return;
    }
    if (s.totalRevenue === 0 && m.inProgressOrdersCount > 0) {
      kitchenCopilotMemory.pendingFollowUp = null;
      appendKitchenCopilotMessage(
        'assistant',
        `Aún llevas **$0 MXN** en ventas cerradas, pero tienes **${formatMoney(m.active.totalMoney)} MXN** en ${m.inProgressOrdersCount} ${m.inProgressOrdersCount === 1 ? 'comanda activa' : 'comandas activas'} preparándose.`
      );
      return;
    }
    const avgTicket = Math.round(s.totalRevenue / Math.max(1, s.ordersCount));
    kitchenCopilotMemory.pendingFollowUp = { type: 'sales_breakdown' };
    appendKitchenCopilotMessage(
      'assistant',
      `Hoy llevas **${formatMoney(s.totalRevenue)} MXN** en **${s.ordersCount} ${s.ordersCount === 1 ? 'orden cerrada' : 'órdenes cerradas'}** (ticket promedio de ${formatMoney(avgTicket)})${m.inProgressOrdersCount > 0 ? `, más ${formatMoney(m.active.totalMoney)} en cocina` : ''}. ¿Quieres ver el desglose por producto?`,
      [{ label: 'Ir al Dashboard', action: "copilotNavigateTo('sales')" }]
    );
    return;
  }

  // ─────────────────────────────────────────────────────────────────
  // F) INVENTARIO, CARNE, INGREDIENTES Y CADUCIDADES PEPS (CONCISO)
  // ─────────────────────────────────────────────────────────────────
  const asksReadyIngredients = /(ingredientes|hay todo|tenemos todo|listo para|alcanza para)/.test(norm);
  const asksMeat = /(cuanta carne|carne queda|proteina|proteinas|alcanza la carne)/.test(norm);
  const asksLowOrExp = /(bajo|bajos|agotado|agotados|falta comprar|reabastecer|por pedir|caduca|caducar|vence|vencer|alerta|alertas)/.test(norm);
  const specificIng = /(burger|burgers|sandwich|angus|entrana|costillar|ribs|pollo|pavo|jamon|camaron|mariscos|tocino|huevo|brioche|pan|pasta|totopos|papa|aguacate|queso|alioli|bbq|arugula|cebolla|jamaica|horchata|coke|coca|sprite|saratoga|refresco|bebida|bebidas)/.exec(norm);

  if (asksReadyIngredients && specificIng) {
    kitchenCopilotMemory.offTopicStrikes = 0;
    const kw = specificIng[1];
    if (/burger|sandwich|brioche/.test(kw)) { runKitchenIngredientsReadinessCheck('burgers'); return; }
    if (/angus|entrana|costillar|ribs/.test(kw)) { runKitchenIngredientsReadinessCheck('entrees'); return; }
    if (/coke|coca|sprite|saratoga|refresco/.test(kw)) { runKitchenIngredientsReadinessCheck('sodas'); return; }
    if (/jamaica|horchata|bebida/.test(kw)) { runKitchenIngredientsReadinessCheck('bebidas'); return; }
  }

  if (asksMeat) {
    kitchenCopilotMemory.offTopicStrikes = 0;
    const beef  = inventoryItems.find(i => i.recipeLink === 'pinch_beef_patty');
    const steak = inventoryItems.find(i => i.recipeLink === 'pinch_angus_steak');
    const ribs  = inventoryItems.find(i => i.recipeLink === 'pinch_ribs_pork');
    const bacon = inventoryItems.find(i => i.recipeLink === 'pinch_bacon');
    kitchenCopilotMemory.pendingFollowUp = { type: 'open_inventory' };
    appendKitchenCopilotMessage(
      'assistant',
      `Proteínas disponibles: **${beef ? formatGramsAndKg(beef.stock, beef.unit) : '0'}** Blend Burger 8 oz · **${steak ? formatGramsAndKg(steak.stock, steak.unit) : '0'}** Entraña Angus · **${ribs ? formatGramsAndKg(ribs.stock, ribs.unit) : '0'}** Costillar/Panceta · **${bacon ? formatGramsAndKg(bacon.stock, bacon.unit) : '0'}** Tocino ahumado. ¿Te abro Insumos?`,
      [{ label: 'Abrir Insumos', action: "copilotNavigateTo('stock', 'inventory')" }]
    );
    return;
  }

  if (asksLowOrExp && /(stock|insumo|insumos|inventario|caduc|vence|comprar|falta|bajo|agotad|alerta)/.test(norm)) {
    kitchenCopilotMemory.offTopicStrikes = 0;
    runKitchenIngredientsReadinessCheck('all');
    return;
  }

  if (specificIng && /(cuanto|cuanta|cuantos|cuantas|queda|quedan|hay|tenemos|stock|inventario|insumo|alcanza)/.test(norm)) {
    kitchenCopilotMemory.offTopicStrikes = 0;
    const kw = specificIng[1].replace(/s$/, '');
    const matched = inventoryItems.filter(i => normalizeSpanishQuery(`${i.name} ${i.category} ${i.recipeLink}`).includes(kw));
    if (matched.length > 0) {
      const summary = matched.map(item => {
        const h = getInventoryItemHealth(item);
        const expNote = h.needsExpiryAction ? ` · ${h.expiry.label.toLowerCase()}` : '';
        const lowNote = h.status === 'out' ? ' · agotado' : (h.status === 'low' ? ' · bajo mínimo' : '');
        return `**${item.name}**: **${formatGramsAndKg(item.stock, item.unit)}**${h.servings !== null ? ` (~${h.servings} porciones)` : ''}${lowNote}${expNote}`;
      }).join(' | ');
      kitchenCopilotMemory.pendingFollowUp = { type: 'open_inventory' };
      appendKitchenCopilotMessage('assistant', `${summary}.`, [
        { label: 'Ver en Insumos', action: "copilotNavigateTo('stock', 'inventory')" },
      ]);
      return;
    }
  }

  if (/\b(insumo|insumos|inventario|stock)\b/.test(norm)) {
    kitchenCopilotMemory.offTopicStrikes = 0;
    runKitchenIngredientsReadinessCheck('all');
    return;
  }

  // ─────────────────────────────────────────────────────────────────
  // G) COMANDAS ACTIVAS / PENDIENTES EN COCINA
  // ─────────────────────────────────────────────────────────────────
  if (/(comanda|comandas|pendiente|pendientes|activa|activas|pedidos en cocina|que hay en cocina|mesas ocupadas|mesas activas)/.test(norm)) {
    kitchenCopilotMemory.offTopicStrikes = 0;
    kitchenCopilotMemory.pendingFollowUp = null;
    if (orders.length === 0) {
      appendKitchenCopilotMessage('assistant', `No hay comandas pendientes en cocina ahorita (${completedOrders.length} entregadas en el turno).`);
      return;
    }
    const listStr = orders.map(o => {
      const meta = STATUS_META[o.status] || STATUS_META.pending;
      return `**#${String(o.num).padStart(3, '0')} ${o.table}** (${meta.label}, $${o.total})`;
    }).join(' · ');
    appendKitchenCopilotMessage('assistant', `Hay **${orders.length} ${orders.length === 1 ? 'comanda activa' : 'comandas activas'}**: ${listStr}.`, [
      { label: 'Ver Tablero', action: "copilotNavigateTo('comandas')" },
    ]);
    return;
  }

  // ─────────────────────────────────────────────────────────────────
  // H) RESUMEN DEL TURNO (solo si lo pide explícitamente)
  // ─────────────────────────────────────────────────────────────────
  if (/\b(resumen|como va el turno|status general|reporte general|como vamos)\b/.test(norm)) {
    kitchenCopilotMemory.offTopicStrikes = 0;
    const s = calculateDailySales();
    const lowCount = inventoryItems.filter(i => getInventoryItemHealth(i).needsRestock).length;
    appendKitchenCopilotMessage(
      'assistant',
      `Resumen rápido: **${formatMoney(s.totalRevenue)} MXN** vendidos (${s.ordersCount} órdenes cerradas), **${orders.length} comandas activas** en cocina y **${lowCount} insumo(s)** bajo stock mínimo.`
    );
    return;
  }

  // ─────────────────────────────────────────────────────────────────
  // I) FUERA DE CONTEXTO (REORIENTACIÓN AMABLE -> DELIMITACIÓN ESTRICTA AL 3ER INTENTO)
  // ─────────────────────────────────────────────────────────────────
  const offCategory = detectOffTopicCategory(norm);
  const offReply = buildKitchenOffTopicReply(offCategory);
  appendKitchenCopilotMessage('assistant', offReply);
}

// ══════════════════════════════════════════════
//  ATAJOS DE TECLADO E INICIALIZACIÓN
// ══════════════════════════════════════════════
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (dcOpen) {
      closeDishConfigurator(false);
      return;
    }
    closeDishDetailModal();
    closePinchCategorySheet();
    closeOrderModal();
    closePaymentModal();
    closeUpsellModal();
    closeServiceTableModal();
    closeCloseShiftModal();
    closeClientAILoyaltyModal();
    if (kitchenCopilotOpen) toggleKitchenAICopilot(false);
    if (cartOpen) toggleCart(false);
  }
  if (e.key === 'Enter' && document.getElementById('order-modal').classList.contains('open')) {
    if (identityPreselectOnly) {
      submitOrder();
    } else {
      const knob = document.getElementById('order-slide-knob');
      if (document.activeElement && document.activeElement !== knob) {
        if (typeof document.activeElement.blur === 'function') document.activeElement.blur();
        if (knob) knob.focus();
      }
    }
  }
  if (e.key === 'Enter' && document.getElementById('service-table-modal').classList.contains('open')) {
    confirmServiceTableModal();
  }
});

// ══════════════════════════════════════════════
//  MOTOR DEL MENÚ PINCH KITCHEN+BAR + DETALLE FULL-SCREEN
// ══════════════════════════════════════════════
const PINCH_DIET_FILTERS = [
  { id: 'all',           label: 'Todos' },
  { id: 'V',             label: 'Vegano' },
  { id: 'GF',            label: 'Sin Gluten' },
  { id: 'Signature',     label: 'Signature' },
  { id: 'Picante',       label: 'Picante' },
  { id: 'Hecho en Casa', label: 'En Casa' },
  { id: 'Mariscos',      label: 'Mariscos' },
  { id: 'Brunch',        label: 'Brunch' },
];

const PINCH_BADGE_TONES = {
  'V':             'tone-green',
  'GF':            'tone-green',
  'Vegetariano':   'tone-green',
  'Signature':     'tone-gold',
  'Angus Beef':    'tone-gold',
  'Picante':       'tone-spicy',
  'Hecho en Casa': 'tone-neutral',
  'Mariscos':      'tone-sea',
  'Brunch':        'tone-amber',
  'Pasta':         'tone-neutral',
  'Para Compartir':'tone-neutral',
};

function isPinchDishSoldOut(dishId) {
  return isStockSoldOut(`dish:${dishId}`);
}

function getFilteredPinchItems() {
  const q = normalizeSpanishQuery(pinchSearchQuery || '');
  return PINCH_MENU_ITEMS.filter(dish => {
    if (pinchDietFilter !== 'all') {
      if (!Array.isArray(dish.badges) || !dish.badges.includes(pinchDietFilter)) {
        return false;
      }
    }
    if (q) {
      const catMeta = PINCH_MENU_CATEGORIES.find(c => c.id === dish.category);
      const hay = normalizeSpanishQuery([
        dish.name,
        dish.shortDesc,
        dish.fullDesc,
        (dish.ingredients || []).join(' '),
        (dish.badges || []).join(' '),
        catMeta ? `${catMeta.title} ${catMeta.subtitle}` : '',
      ].join(' '));
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function buildPinchCategoryVectorMark(catId, stroke = '#7c6f60') {
  if (catId === 'pinch_bites') {
    return `<svg viewBox="0 0 64 64" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="32" cy="36" rx="22" ry="12"/><ellipse cx="32" cy="36" rx="14" ry="7"/><circle cx="26" cy="34" r="2.6"/><circle cx="35" cy="35" r="2.8"/><circle cx="31" cy="39" r="2.2"/><path d="M24 22c2-3 5-3 7 0"/></svg>`;
  }
  if (catId === 'burgers_sandwiches') {
    return `<svg viewBox="0 0 64 64" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 28c0-8 7-13 16-13s16 5 16 13H16Z"/><path d="M14 34c3 2 6-2 9 0s6-2 9 0 6-2 9 0 6-2 9 0"/><rect x="15" y="37" width="34" height="5" rx="2.5"/><path d="M17 42h30c0 5-5 7-15 7s-15-2-15-7Z"/><circle cx="27" cy="21" r="1"/><circle cx="34" cy="19" r="1"/><circle cx="39" cy="23" r="1"/></svg>`;
  }
  if (catId === 'entrees') {
    return `<svg viewBox="0 0 64 64" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="32" cy="34" r="20"/><circle cx="32" cy="34" r="14"/><path d="M23 35c2-6 8-9 15-7 4 1 6 5 4 9-2 4-8 6-14 4-4-1-6-3-5-6Z"/><path d="M16 14v10M13 14v5c0 2 6 2 6 0v-5M48 14v12M48 14c3 3 3 6 0 8"/></svg>`;
  }
  if (catId === 'sides') {
    return `<svg viewBox="0 0 64 64" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 32c0 9 6 15 14 15s14-6 14-15H18Z"/><path d="M22 32l4-12h4l-2 12"/><path d="M31 32l2-14h4l-1 14"/><path d="M38 32l5-10h3l-4 10"/><path d="M20 47h24"/></svg>`;
  }
  if (catId === 'desserts') {
    return `<svg viewBox="0 0 64 64" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 38h32l-4 10H20l-4-10Z"/><path d="M20 38c0-6 5-10 12-10s12 4 12 10"/><path d="M27 28c0-4 2.5-7 5-7s5 3 5 7"/><circle cx="32" cy="18" r="2.6"/></svg>`;
  }
  return `<svg viewBox="0 0 64 64" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M26 14h12v5l3 6v22c0 2-1.5 3-3.5 3h-11c-2 0-3.5-1-3.5-3V25l3-6v-5Z"/><path d="M23 30h18"/><path d="M23 39h18"/><path d="M28 14h8v-3h-8z"/></svg>`;
}

function buildPinchPlaceholderArt(dish, cat, mode = 'card') {
  if (dish.imageUrl) {
    return `<img class="pinch-real-img" src="${escapeHTML(dish.imageUrl)}" alt="${escapeHTML(dish.name)}" loading="lazy" />`;
  }
  const palette = (cat && cat.palette) || ['#f5f4f0', '#eae7df', '#6b655c'];
  const bgStyle = `background: linear-gradient(145deg, ${palette[0]} 0%, ${palette[1]} 100%);`;
  if (mode === 'hero') {
    return `
      <div class="dd-placeholder-canvas" style="${bgStyle}">
        <div class="dd-placeholder-emblem">${buildPinchCategoryVectorMark(dish.category, palette[2])}</div>
        <span class="dd-placeholder-monogram">${escapeHTML(dish.monogram || dish.emoji)} · PINCH KITCHEN+BAR</span>
        <span class="dd-placeholder-hint">Espacio reservado para fotografía HD del platillo</span>
      </div>
    `;
  }
  return `
      <div class="pinch-media-placeholder" style="${bgStyle}">
        <div class="pinch-ph-svg">${buildPinchCategoryVectorMark(dish.category, palette[2])}</div>
        <span class="pinch-ph-mono">${escapeHTML(dish.monogram || dish.emoji)}</span>
      </div>
  `;
}

function renderPinchCategoryTabs() {
  const tabsEl = document.getElementById('pinch-cat-tabs');
  if (!tabsEl) return;

  tabsEl.innerHTML = PINCH_MENU_CATEGORIES.map(cat => `
    <button
      type="button"
      class="pinch-cat-tab${pinchActiveCategory === cat.id ? ' active' : ''}"
      data-cat="${cat.id}"
      role="tab"
      aria-selected="${pinchActiveCategory === cat.id ? 'true' : 'false'}"
      onclick="scrollToPinchCategory('${cat.id}')"
    >
      ${escapeHTML(cat.title)}
    </button>
  `).join('');

  const dietChipsEl = document.getElementById('pinch-diet-chips');
  if (dietChipsEl) {
    dietChipsEl.innerHTML = PINCH_DIET_FILTERS.map(f => `
      <button
        type="button"
        class="pinch-diet-chip${pinchDietFilter === f.id ? ' active' : ''}"
        onclick="setPinchDietFilter('${f.id}')"
      >
        ${escapeHTML(f.label)}
      </button>
    `).join('');
  }
}

function renderPinchMenu() {
  const listEl = document.getElementById('pinch-menu-list');
  if (!listEl) return;

  const filtered = getFilteredPinchItems();
  const countEl  = document.getElementById('pinch-search-count');
  const clearEl  = document.getElementById('btn-pinch-search-clear');
  if (countEl) countEl.textContent = `${filtered.length} de ${PINCH_MENU_ITEMS.length} platillos`;
  if (clearEl) clearEl.classList.toggle('hidden', !pinchSearchQuery);

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="pinch-empty-state">
        <div class="pinch-empty-ico">${uiIcon('search', 'xl')}</div>
        <h3>Sin platillos coincidentes</h3>
        <p>No encontramos resultados para "${escapeHTML(pinchSearchQuery || pinchDietFilter)}".</p>
        <button type="button" class="pinch-empty-reset" onclick="clearPinchSearch(true)">Mostrar los ${PINCH_MENU_ITEMS.length} platillos</button>
      </div>
    `;
    return;
  }

  // Mapa rápido de cantidades en carrito por dishId
  const qtyByDish = new Map();
  cartItems.forEach(it => {
    const id = it.dishId || (String(it.key || '').startsWith('dish:') ? String(it.key).slice(5).split('|')[0] : '');
    if (id) qtyByDish.set(id, (qtyByDish.get(id) || 0) + (Number(it.qty) || 0));
  });

  const sectionsHtml = PINCH_MENU_CATEGORIES.map(cat => {
    const catItems = filtered.filter(i => i.category === cat.id);
    if (catItems.length === 0) return '';

    const rowsHtml = catItems.map(dish => {
      const isOut    = isPinchDishSoldOut(dish.id);
      const qtyIn    = qtyByDish.get(dish.id) || 0;
      const badgeStr = (dish.badges || []).slice(0, 3).map(b => {
        const tone = PINCH_BADGE_TONES[b] || 'tone-neutral';
        return `<span class="pinch-badge ${tone}">${escapeHTML(b)}</span>`;
      }).join('');
      const prefInfo = typeof getDishPreferenceStatus === 'function' ? getDishPreferenceStatus(dish) : { alerts: [], compatLabel: '' };
      const prefBadgesHtml = [
        ...prefInfo.alerts.slice(0, 2).map(a => `<span class="pinch-badge tone-pref-warn">${escapeHTML(a)}</span>`),
        ...(prefInfo.alerts.length === 0 && prefInfo.compatLabel ? [`<span class="pinch-badge tone-pref-ok">${escapeHTML(prefInfo.compatLabel)}</span>`] : []),
      ].join('');
      const allBadgesHtml = badgeStr + prefBadgesHtml;

      let floatingCtrlHtml = '';
      if (isOut) {
        floatingCtrlHtml = `<span class="pinch-soldout-pill">Agotado</span>`;
      } else if (qtyIn > 0) {
        floatingCtrlHtml = `
          <div class="pinch-quick-stepper" onclick="event.stopPropagation()">
            <button type="button" class="pqs-btn" onclick="adjustPinchDishQuickQty('${dish.id}', -1)" aria-label="Quitar uno">−</button>
            <span class="pqs-val">${qtyIn}</span>
            <button type="button" class="pqs-btn" onclick="adjustPinchDishQuickQty('${dish.id}', 1)" aria-label="Agregar uno">+</button>
          </div>
        `;
      } else {
        floatingCtrlHtml = `
          <button
            type="button"
            class="pinch-quick-add-btn"
            onclick="event.stopPropagation(); quickAddPinchDish('${dish.id}')"
            aria-label="Agregar ${escapeHTML(dish.name)}"
          >+</button>
        `;
      }

      return `
        <article
          class="pinch-dish-row${isOut ? ' is-sold-out' : ''}${qtyIn > 0 ? ' in-cart' : ''}"
          data-dish-id="${dish.id}"
          onclick="openDishDetailModal('${dish.id}')"
        >
          <div class="pinch-dish-info">
            <div class="pinch-dish-title-row">
              <h3 class="pinch-dish-title">${escapeHTML(dish.name)}</h3>
              ${isOut ? '<span class="pinch-badge tone-out">Agotado</span>' : ''}
            </div>
            ${allBadgesHtml ? `<div class="pinch-badges-row">${allBadgesHtml}</div>` : ''}
            <p class="pinch-dish-desc">${escapeHTML(dish.shortDesc)}</p>
            <div class="pinch-dish-bottom">
              <span class="pinch-dish-price">${formatMenuPrice(dish.price)}</span>
              <span class="pinch-expand-cue">Ampliar vista ↗</span>
            </div>
          </div>

          <div class="pinch-dish-media" aria-hidden="true">
            ${buildPinchPlaceholderArt(dish, cat, 'card')}
            <span class="pinch-media-expand-badge" title="Ver en pantalla completa">⤢</span>
            ${floatingCtrlHtml}
          </div>
        </article>
      `;
    }).join('');

    return `
      <section class="pinch-category-section" id="pinch-sec-${cat.id}" data-category="${cat.id}">
        <div class="pinch-category-head">
          <h2 class="pinch-category-title">${escapeHTML(cat.title)}</h2>
          <span class="pinch-category-count">${catItems.length}</span>
        </div>
        <div class="pinch-dish-rows">${rowsHtml}</div>
      </section>
    `;
  }).join('');

  listEl.innerHTML = sectionsHtml;
}

function quickAddPinchDish(dishId, { silentToast = false } = {}) {
  const dish = PINCH_MENU_ITEMS.find(d => d.id === dishId);
  if (!dish) return;
  if (isPinchDishSoldOut(dish.id)) {
    showToast(`${dish.name} está agotado por hoy`);
    return;
  }

  unlockAudioContext();
  const baseKey = `dish:${dish.id}`;
  const existing = cartItems.find(it => it.key === baseKey);
  if (existing) {
    existing.qty += 1;
  } else {
    cartItems.push({
      key: baseKey,
      dishId: dish.id,
      category: dish.category,
      name: dish.name,
      emoji: dish.emoji,
      price: dish.price,
      qty: 1,
      station: dish.category === 'drinks' ? 'drink' : dish.category,
      option: '',
      note: '',
    });
  }

  hapticTap(10);
  renderCart();
  renderPinchMenu();
  if (!silentToast) {
    showToast(`✓ ${dish.name} (${formatMenuPrice(dish.price)})`);
  }
}

function adjustPinchDishQuickQty(dishId, delta) {
  if (delta > 0) {
    quickAddPinchDish(dishId, { silentToast: true });
    return;
  }
  const baseKey = `dish:${dishId}`;
  let idx = cartItems.findIndex(it => it.key === baseKey);
  if (idx === -1) {
    for (let i = cartItems.length - 1; i >= 0; i--) {
      if (cartItems[i].dishId === dishId) {
        idx = i;
        break;
      }
    }
  }
  if (idx === -1) return;
  cartItems[idx].qty += delta;
  if (cartItems[idx].qty <= 0) {
    cartItems.splice(idx, 1);
  }
  hapticTap(8);
  renderCart();
  renderPinchMenu();
}

function togglePinchSearch(forceState) {
  pinchSearchOpen = typeof forceState === 'boolean' ? forceState : !pinchSearchOpen;
  const panelEl = document.getElementById('pinch-search-panel');
  const btnEl   = document.getElementById('btn-pinch-search-toggle');
  if (panelEl) panelEl.classList.toggle('hidden', !pinchSearchOpen);
  if (btnEl)   btnEl.classList.toggle('active', pinchSearchOpen);

  if (pinchSearchOpen) {
    setTimeout(() => {
      const inp = document.getElementById('pinch-search-input');
      if (inp) inp.focus();
    }, 60);
  }
}

function onPinchSearchInput(val) {
  pinchSearchQuery = String(val || '');
  renderPinchMenu();
}

function clearPinchSearch(resetDiet = false) {
  pinchSearchQuery = '';
  const inp = document.getElementById('pinch-search-input');
  if (inp) inp.value = '';
  if (resetDiet) {
    pinchDietFilter = 'all';
    renderPinchCategoryTabs();
  }
  renderPinchMenu();
  if (inp && pinchSearchOpen) inp.focus();
}

function setPinchDietFilter(filterId) {
  pinchDietFilter = filterId || 'all';
  hapticTap(6);
  renderPinchCategoryTabs();
  renderPinchMenu();
}

function setActiveCategoryTabUI(catId) {
  pinchActiveCategory = catId;
  const tabsEl = document.getElementById('pinch-cat-tabs');
  if (!tabsEl) return;
  tabsEl.querySelectorAll('.pinch-cat-tab').forEach(btn => {
    const isAct = btn.dataset.cat === catId;
    btn.classList.toggle('active', isAct);
    btn.setAttribute('aria-selected', isAct ? 'true' : 'false');
    if (isAct && typeof btn.scrollIntoView === 'function') {
      try {
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } catch (e) {}
    }
  });
}

function scrollToPinchCategory(catId) {
  if (pinchSearchQuery || pinchDietFilter !== 'all') {
    pinchSearchQuery = '';
    pinchDietFilter = 'all';
    const inp = document.getElementById('pinch-search-input');
    if (inp) inp.value = '';
    renderPinchCategoryTabs();
    renderPinchMenu();
  }

  const scroller  = document.getElementById('client-scroll-container');
  const secEl     = document.getElementById(`pinch-sec-${catId}`);
  const stickyBar = document.getElementById('pinch-sticky-bar');
  if (!scroller || !secEl) return;

  pinchScrollSpyLockedUntil = Date.now() + 750;
  setActiveCategoryTabUI(catId);

  const stickyH = stickyBar ? stickyBar.getBoundingClientRect().height : 56;
  const scRect  = scroller.getBoundingClientRect();
  const secRect = secEl.getBoundingClientRect();
  const targetY = scroller.scrollTop + (secRect.top - scRect.top) - stickyH - 6;

  scroller.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
  hapticTap(6);
}

function initPinchScrollSpy() {
  if (pinchScrollSpyBound) return;
  const scroller = document.getElementById('client-scroll-container');
  if (!scroller) return;
  pinchScrollSpyBound = true;

  let rafPending = false;
  scroller.addEventListener('scroll', () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (clientMode !== 'menu' || pinchDetailDishId || Date.now() < pinchScrollSpyLockedUntil) return;
      const stickyBar = document.getElementById('pinch-sticky-bar');
      const threshold = (stickyBar ? stickyBar.getBoundingClientRect().bottom : 110) + 28;
      const sections  = Array.from(document.querySelectorAll('.pinch-category-section'));
      if (sections.length === 0) return;

      let chosen = sections[0].dataset.category;
      for (const sec of sections) {
        if (sec.getBoundingClientRect().top <= threshold) {
          chosen = sec.dataset.category;
        } else {
          break;
        }
      }
      // Si llegó al fondo del scroll, marcar la última categoría visible
      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 24) {
        chosen = sections[sections.length - 1].dataset.category;
      }
      if (chosen && chosen !== pinchActiveCategory) {
        setActiveCategoryTabUI(chosen);
      }
    });
  }, { passive: true });
}

function openPinchCategorySheet() {
  const listEl  = document.getElementById('pinch-cat-sheet-list');
  const sheet   = document.getElementById('pinch-cat-sheet');
  const overlay = document.getElementById('pinch-cat-overlay');
  if (!listEl || !sheet || !overlay) return;

  listEl.innerHTML = PINCH_MENU_CATEGORIES.map(cat => {
    const count = PINCH_MENU_ITEMS.filter(i => i.category === cat.id).length;
    const isCur = pinchActiveCategory === cat.id;
    return `
      <button type="button" class="pinch-cat-sheet-row${isCur ? ' active' : ''}" onclick="selectPinchCategoryFromSheet('${cat.id}')">
        <div class="pcs-left">
          <span class="pcs-mono">${escapeHTML(cat.title.slice(0, 2).toUpperCase())}</span>
          <div class="pcs-texts">
            <strong>${escapeHTML(cat.title)}</strong>
            <span>${escapeHTML(cat.subtitle)} · ${cat.priceRange}</span>
          </div>
        </div>
        <span class="pcs-count">${count} items →</span>
      </button>
    `;
  }).join('');

  overlay.classList.add('open');
  sheet.classList.add('open');
}

function closePinchCategorySheet() {
  const sheet   = document.getElementById('pinch-cat-sheet');
  const overlay = document.getElementById('pinch-cat-overlay');
  if (sheet)   sheet.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

function selectPinchCategoryFromSheet(catId) {
  closePinchCategorySheet();
  scrollToPinchCategory(catId);
}

// ─── VISOR FULL-SCREEN / APPLE SHEET DE PLATILLO ────────────────
let ddSwipeBound = false;

function bindDishDetailSwipeDismiss() {
  if (ddSwipeBound) return;
  const sheet = document.getElementById('dish-detail-sheet');
  const dragArea = document.getElementById('dd-drag-bar');
  if (!sheet || !dragArea) return;
  ddSwipeBound = true;

  let startY = 0;
  let curDy  = 0;
  let tracking = false;

  dragArea.addEventListener('touchstart', (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    startY = e.touches[0].clientY;
    curDy = 0;
    tracking = true;
    sheet.style.transition = 'none';
  }, { passive: true });

  dragArea.addEventListener('touchmove', (e) => {
    if (!tracking || !e.touches || e.touches.length !== 1) return;
    curDy = Math.max(0, e.touches[0].clientY - startY);
    sheet.style.transform = `translateY(${curDy}px)`;
  }, { passive: true });

  const endSwipe = () => {
    if (!tracking) return;
    tracking = false;
    sheet.style.transition = '';
    sheet.style.transform = '';
    if (curDy > 85) {
      closeDishDetailModal();
    }
  };

  dragArea.addEventListener('touchend', endSwipe, { passive: true });
  dragArea.addEventListener('touchcancel', endSwipe, { passive: true });
}

// ══════════════════════════════════════════════
//  CONFIGURADOR VISUAL INDEPENDIENTE DE PLATILLOS PINCH
// ══════════════════════════════════════════════
const PINCH_CONFIG_ART = {
  bacon: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <g transform="rotate(-14 28 28)">
        <path d="M9 21 Q19 15 28 21 T47 19 L49 26 Q38 30 28 25 T11 27 Z" fill="#b8361c" stroke="#691708" stroke-width="1.3" stroke-linejoin="round"/>
        <path d="M12 23 Q20 18 28 23 T46 21" fill="none" stroke="#ffd4b8" stroke-width="2.1" stroke-linecap="round"/>
        <path d="M11 26 Q20 21 28 25 T46 24" fill="none" stroke="#851f0d" stroke-width="1.3" stroke-linecap="round"/>
        <path d="M8 31 Q18 25 28 31 T48 29 L49 36 Q38 40 28 35 T10 37 Z" fill="#c94022" stroke="#691708" stroke-width="1.3" stroke-linejoin="round"/>
        <path d="M11 33 Q19 28 28 33 T46 31" fill="none" stroke="#ffe0cc" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>`,

  avocado: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <g transform="translate(0, 2)">
        <path d="M10 34 C13 21 24 14 35 16 C28 22 23 30 20 38 C16 38 12 37 10 34 Z" fill="#65a82c" stroke="#2d590e" stroke-width="1.3" stroke-linejoin="round"/>
        <path d="M13 33 C16 23 24 18 32 19 C26 24 22 30 19.5 36 Z" fill="#c9e86b"/>
        <path d="M18 37 C22 23 33 17 44 19 C37 25 32 33 29 41 C24 41 20 40 18 37 Z" fill="#5b9c25" stroke="#2d590e" stroke-width="1.3" stroke-linejoin="round"/>
        <path d="M21 36 C25 25 33 21 41 22 C35 27 31 33 28 39 Z" fill="#d8f27e"/>
        <path d="M27 40 C31 27 40 22 48 24 C43 30 39 36 37 43 C32 43 29 42 27 40 Z" fill="#4f8f1e" stroke="#2d590e" stroke-width="1.3" stroke-linejoin="round"/>
        <path d="M30 39 C33 29 39 25 46 26.5 C42 31 38.5 36 36.5 41 Z" fill="#dff78d"/>
      </g>
    </svg>`,

  fried_egg: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <ellipse cx="28" cy="31" rx="19" ry="15" fill="#d9cfc0" opacity="0.45"/>
      <path d="M11 28 C9 21 16 14 25 14 C33 12 43 16 45 24 C47 32 43 41 34 42 C26 44 16 41 12 35 C10 32 12 30 11 28 Z" fill="#fffef9" stroke="#cfc4b0" stroke-width="1.45"/>
      <path d="M15 24 C17 19 22 17 26 17" fill="none" stroke="#f2eadc" stroke-width="2" stroke-linecap="round"/>
      <circle cx="29" cy="28" r="8.5" fill="#f7a81b" stroke="#c97808" stroke-width="1.25"/>
      <circle cx="28.5" cy="27.5" r="6.5" fill="#ffc42e"/>
      <ellipse cx="26" cy="24.5" rx="2.5" ry="1.4" transform="rotate(-24 26 24.5)" fill="#fff7d6" opacity="0.9"/>
    </svg>`,

  swiss_cheese: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <path d="M10 35 L46 29 L43 17 L13 24 Z" fill="#f5e396" stroke="#c4a645" stroke-width="1.35" stroke-linejoin="round"/>
      <path d="M10 35 L46 29 L46 39 L10 43 Z" fill="#fff1b8" stroke="#c4a645" stroke-width="1.35" stroke-linejoin="round"/>
      <circle cx="20" cy="37.5" r="2.6" fill="#d4b34e"/>
      <circle cx="31" cy="34.5" r="3.2" fill="#d4b34e"/>
      <circle cx="40" cy="36" r="2.1" fill="#d4b34e"/>
      <circle cx="27" cy="24.5" r="2.2" fill="#d4b34e"/>
      <circle cx="36" cy="22.5" r="1.7" fill="#d4b34e"/>
    </svg>`,

  cheddar_cheese: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <path d="M10 36 L28 15 L46 36 C41 40 35 37 28 40 C21 37 15 40 10 36 Z" fill="#ffb629" stroke="#bd7308" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M16 32 L28 19 L40 32" fill="none" stroke="#ffe18c" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
    </svg>`,

  parmesan: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <path d="M12 31 L36 16 L45 25 L22 38 Z" fill="#f5df9c" stroke="#b89844" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M12 31 L22 38 L22 44 L12 37 Z" fill="#e6c873" stroke="#b89844" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M22 38 L45 25 L45 31 L22 44 Z" fill="#fff2c2" stroke="#b89844" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M29 36 Q33 34 36 37" fill="none" stroke="#f5df9c" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M36 39 Q40 37 43 40" fill="none" stroke="#e6c873" stroke-width="2.4" stroke-linecap="round"/>
    </svg>`,

  extra_patty: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <ellipse cx="28" cy="37" rx="19" ry="7" fill="#3d1708" opacity="0.22"/>
      <path d="M9 28 C9 22 47 22 47 28 L47 34 C47 40 9 40 9 34 Z" fill="#6b3015" stroke="#3d1708" stroke-width="1.4"/>
      <ellipse cx="28" cy="27" rx="19" ry="7.5" fill="#823c1b" stroke="#421a09" stroke-width="1.35"/>
      <path d="M16 25 L23 31 M25 23 L32 30 M34 24 L40 29" stroke="#361306" stroke-width="2.1" stroke-linecap="round"/>
      <path d="M18 22.5 Q28 20.5 38 23" fill="none" stroke="#cf8453" stroke-width="1.6" stroke-linecap="round" opacity="0.8"/>
    </svg>`,

  shrimp: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <path d="M38 17 C24 14 14 24 18 35 C20 40 26 42 30 39 C33 36 32 32 28 31 C25 30 25 26 28 24 C32 22 36 24 38 22 Z" fill="#f57c5b" stroke="#a6361c" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M37 17 L44 13 L42 19 L46 22 L38 22 Z" fill="#e65737" stroke="#a6361c" stroke-width="1.15" stroke-linejoin="round"/>
      <path d="M23 20 Q26 22 25 25 M19 27 Q22 28 22 31 M20 35 Q24 34 26 36" fill="none" stroke="#ffd2bf" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,

  ham_turkey: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <ellipse cx="24" cy="31" rx="13" ry="9" transform="rotate(-12 24 31)" fill="#f09595" stroke="#a84c4c" stroke-width="1.3"/>
      <path d="M15 29 Q24 26 32 32" fill="none" stroke="#ffd4d4" stroke-width="1.5" stroke-linecap="round"/>
      <ellipse cx="33" cy="27" rx="13" ry="9" transform="rotate(14 33 27)" fill="#f7adad" stroke="#a84c4c" stroke-width="1.3"/>
      <path d="M24 25 Q33 23 41 29" fill="none" stroke="#ffe3e3" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,

  caramelized_onion: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <path d="M12 31 Q20 18 28 28 T44 26" fill="none" stroke="#8f4a0e" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M12 31 Q20 18 28 28 T44 26" fill="none" stroke="#d9872b" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M14 37 Q24 24 34 34 T46 33" fill="none" stroke="#783b08" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M14 37 Q24 24 34 34 T46 33" fill="none" stroke="#eb9f44" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M18 23 Q28 15 37 22" fill="none" stroke="#c9721e" stroke-width="3.2" stroke-linecap="round"/>
    </svg>`,

  red_onion: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <circle cx="24" cy="30" r="11" fill="none" stroke="#8e286e" stroke-width="3.6"/>
      <circle cx="24" cy="30" r="9.4" fill="none" stroke="#f5d9eb" stroke-width="1.3"/>
      <circle cx="34" cy="25" r="10" fill="none" stroke="#a63682" stroke-width="3.5"/>
      <circle cx="34" cy="25" r="8.5" fill="none" stroke="#fae6f3" stroke-width="1.2"/>
    </svg>`,

  lettuce: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <path d="M11 33 C9 24 16 17 24 19 C28 14 37 15 41 21 C47 24 46 34 39 37 C34 42 23 42 18 38 C13 38 12 36 11 33 Z" fill="#46b84f" stroke="#226e29" stroke-width="1.35" stroke-linejoin="round"/>
      <path d="M16 32 C17 25 23 22 28 24 C32 20 38 22 39 28 C37 35 28 38 21 36 Z" fill="#6ad46e"/>
      <path d="M28 38 Q27 28 25 22 M28 35 Q33 30 37 27" fill="none" stroke="#d9fcda" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`,

  tomato_slice: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <circle cx="28" cy="28" r="16.5" fill="#e63522" stroke="#8f180c" stroke-width="1.5"/>
      <circle cx="28" cy="28" r="13" fill="#ff6654"/>
      <path d="M28 28 L28 16 M28 28 L39 24 M28 28 L35 38 M28 28 L21 38 M28 28 L17 24" stroke="#e63522" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="24" cy="22" r="1.2" fill="#ffe17d"/>
      <circle cx="33" cy="22" r="1.2" fill="#ffe17d"/>
      <circle cx="34" cy="31" r="1.2" fill="#ffe17d"/>
      <circle cx="23" cy="32" r="1.2" fill="#ffe17d"/>
      <circle cx="28" cy="35" r="1.1" fill="#ffe17d"/>
    </svg>`,

  pickles: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <g transform="translate(22 31)">
        <circle r="11" fill="#4f8527" stroke="#274710" stroke-width="1.35"/>
        <circle r="8.4" fill="#9bc758"/>
        <circle cx="-2.5" cy="-2" r="1" fill="#f0f7c8"/>
        <circle cx="2.5" cy="1.5" r="1" fill="#f0f7c8"/>
      </g>
      <g transform="translate(35 25)">
        <circle r="11" fill="#5a942e" stroke="#274710" stroke-width="1.35"/>
        <circle r="8.4" fill="#a8d663"/>
        <circle cx="-2" cy="-2.2" r="1" fill="#f0f7c8"/>
        <circle cx="2.2" cy="1.8" r="1" fill="#f0f7c8"/>
        <circle cx="0" cy="0" r="1" fill="#6aa336"/>
      </g>
    </svg>`,

  mushrooms: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <g transform="translate(20 30) rotate(-12)">
        <path d="M-9 0 C-9 -10 9 -10 9 0 L3 0 L4 9 L-4 9 L-3 0 Z" fill="#9c714d" stroke="#523720" stroke-width="1.3" stroke-linejoin="round"/>
        <path d="M-3 1 L3 1 L4 8.5 L-4 8.5 Z" fill="#f0dfcb"/>
      </g>
      <g transform="translate(36 27) rotate(14)">
        <path d="M-10 0 C-10 -11 10 -11 10 0 L3.5 0 L4.5 10 L-4.5 10 L-3.5 0 Z" fill="#ab7e57" stroke="#523720" stroke-width="1.3" stroke-linejoin="round"/>
        <path d="M-3.5 1 L3.5 1 L4.5 9.5 L-4.5 9.5 Z" fill="#f5e7d5"/>
      </g>
    </svg>`,

  potato_sticks: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <g stroke="#b87a14" stroke-width="3.2" stroke-linecap="round">
        <line x1="12" y1="35" x2="36" y2="21"/>
        <line x1="15" y1="22" x2="41" y2="36"/>
        <line x1="18" y1="38" x2="44" y2="24"/>
        <line x1="11" y1="28" x2="43" y2="30"/>
      </g>
      <g stroke="#ffd257" stroke-width="2" stroke-linecap="round">
        <line x1="12" y1="35" x2="36" y2="21"/>
        <line x1="15" y1="22" x2="41" y2="36"/>
        <line x1="18" y1="38" x2="44" y2="24"/>
        <line x1="11" y1="28" x2="43" y2="30"/>
      </g>
    </svg>`,

  fries: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <rect x="13" y="18" width="6.5" height="23" rx="2" transform="rotate(-10 16 29)" fill="#f5c038" stroke="#a67212" stroke-width="1.2"/>
      <rect x="22" y="14" width="6.5" height="26" rx="2" transform="rotate(-3 25 27)" fill="#ffd154" stroke="#a67212" stroke-width="1.2"/>
      <rect x="30" y="16" width="6.5" height="24" rx="2" transform="rotate(8 33 28)" fill="#f5c038" stroke="#a67212" stroke-width="1.2"/>
      <rect x="37" y="20" width="6" height="21" rx="2" transform="rotate(15 40 30)" fill="#e8b02e" stroke="#a67212" stroke-width="1.2"/>
    </svg>`,

  guacamole: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <path d="M12 33 C12 24 19 18 28 18 C37 18 44 24 44 33 C44 38 38 40 28 40 C18 40 12 38 12 33 Z" fill="#73b832" stroke="#37660e" stroke-width="1.35"/>
      <circle cx="24" cy="27" r="2.2" fill="#e63522"/>
      <circle cx="33" cy="29" r="2" fill="#e63522"/>
      <circle cx="29" cy="23" r="1.8" fill="#ffffff"/>
      <ellipse cx="22" cy="31" rx="2.5" ry="1.4" fill="#2d7a22"/>
    </svg>`,

  kimchi: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <path d="M13 33 C11 24 20 18 29 22 C37 18 45 25 43 34 C38 40 20 40 13 33 Z" fill="#e04f26" stroke="#851e08" stroke-width="1.3"/>
      <path d="M18 32 Q27 26 37 31" fill="none" stroke="#ffcab8" stroke-width="2" stroke-linecap="round"/>
      <circle cx="24" cy="25" r="1.2" fill="#ffd966"/>
      <circle cx="33" cy="27" r="1.2" fill="#ffd966"/>
      <circle cx="29" cy="34" r="1.1" fill="#851e08"/>
    </svg>`,

  pikliz: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <path d="M14 29 Q25 19 38 25" fill="none" stroke="#65b844" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M16 35 Q28 24 41 32" fill="none" stroke="#f27a24" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M18 24 Q30 33 42 23" fill="none" stroke="#d92b2b" stroke-width="2.6" stroke-linecap="round"/>
    </svg>`,

  chili_flakes: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <path d="M15 26 L22 22 L20 29 Z" fill="#d92316" stroke="#750d06" stroke-width="1"/>
      <path d="M29 20 L37 22 L33 28 Z" fill="#eb3824" stroke="#750d06" stroke-width="1"/>
      <path d="M23 33 L31 31 L28 39 Z" fill="#c91c10" stroke="#750d06" stroke-width="1"/>
      <path d="M36 31 L43 35 L36 39 Z" fill="#e02c1b" stroke="#750d06" stroke-width="1"/>
      <circle cx="26" cy="27" r="1.6" fill="#ffd257"/>
      <circle cx="33" cy="32" r="1.5" fill="#ffd257"/>
      <circle cx="19" cy="34" r="1.4" fill="#ffd257"/>
    </svg>`,

  olives: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <ellipse cx="22" cy="30" rx="8.5" ry="10.5" transform="rotate(-18 22 30)" fill="#739c2b" stroke="#3b5411" stroke-width="1.3"/>
      <circle cx="20" cy="22" r="2.6" fill="#db3321"/>
      <ellipse cx="35" cy="28" rx="8" ry="10" transform="rotate(20 35 28)" fill="#4d3d4a" stroke="#241a22" stroke-width="1.3"/>
      <path d="M32 23 Q34 21 36 23" fill="none" stroke="#998295" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,

  beans: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <path d="M12 34 C12 24 20 19 28 20 C36 19 44 24 44 34 C44 39 36 41 28 41 C20 41 12 39 12 34 Z" fill="#6b3b24" stroke="#3b1d0f" stroke-width="1.35"/>
      <path d="M18 30 Q28 25 38 30" fill="none" stroke="#9c6144" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`,

  aioli: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <g transform="translate(22 25) rotate(-24)">
        <path d="M-3 -17 L0 -23 L3 -17 Z" fill="#f7f2e4" stroke="#9e937c" stroke-width="1.1"/>
        <rect x="-6.5" y="-17" width="13" height="5" rx="2" fill="#e8e0cc" stroke="#9e937c" stroke-width="1.1"/>
        <rect x="-8.5" y="-12" width="17" height="26" rx="5.5" fill="#fffdf5" stroke="#9e937c" stroke-width="1.35"/>
        <rect x="-7.2" y="-3" width="14.4" height="9" rx="1.5" fill="#76a35d" opacity="0.92"/>
        <line x1="-4" y1="1.5" x2="4" y2="1.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>
      </g>
      <path d="M25 42 Q30 36 35 42 T46 40" fill="none" stroke="#9e937c" stroke-width="5.2" stroke-linecap="round"/>
      <path d="M25 42 Q30 36 35 42 T46 40" fill="none" stroke="#fffef7" stroke-width="3.4" stroke-linecap="round"/>
    </svg>`,

  truffle_aioli: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <g transform="translate(22 25) rotate(-24)">
        <path d="M-3 -17 L0 -23 L3 -17 Z" fill="#f2ecdf" stroke="#524a3e" stroke-width="1.1"/>
        <rect x="-6.5" y="-17" width="13" height="5" rx="2" fill="#2c2925" stroke="#181614" stroke-width="1.1"/>
        <rect x="-8.5" y="-12" width="17" height="26" rx="5.5" fill="#f5efe2" stroke="#6e6456" stroke-width="1.35"/>
        <rect x="-7.2" y="-3" width="14.4" height="9" rx="1.5" fill="#2b2723"/>
        <line x1="-4" y1="1.5" x2="4" y2="1.5" stroke="#e5c16c" stroke-width="2" stroke-linecap="round"/>
      </g>
      <path d="M25 42 Q30 36 35 42 T46 40" fill="none" stroke="#807566" stroke-width="5.2" stroke-linecap="round"/>
      <path d="M25 42 Q30 36 35 42 T46 40" fill="none" stroke="#f7f2e6" stroke-width="3.4" stroke-linecap="round"/>
      <circle cx="30" cy="39" r="0.9" fill="#2c2925"/>
      <circle cx="39" cy="41" r="0.9" fill="#2c2925"/>
    </svg>`,

  spicy_aioli: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <g transform="translate(22 25) rotate(-24)">
        <path d="M-3 -17 L0 -23 L3 -17 Z" fill="#f26b3a" stroke="#993210" stroke-width="1.1"/>
        <rect x="-6.5" y="-17" width="13" height="5" rx="2" fill="#fff2eb" stroke="#993210" stroke-width="1.1"/>
        <rect x="-8.5" y="-12" width="17" height="26" rx="5.5" fill="#f57547" stroke="#993210" stroke-width="1.35"/>
        <rect x="-7.2" y="-3" width="14.4" height="9" rx="1.5" fill="#ffffff" opacity="0.92"/>
        <line x1="-4" y1="1.5" x2="4" y2="1.5" stroke="#e03a14" stroke-width="2" stroke-linecap="round"/>
      </g>
      <path d="M25 42 Q30 36 35 42 T46 40" fill="none" stroke="#a63612" stroke-width="5" stroke-linecap="round" opacity="0.3"/>
      <path d="M25 42 Q30 36 35 42 T46 40" fill="none" stroke="#f26835" stroke-width="3.6" stroke-linecap="round"/>
    </svg>`,

  guava_bbq: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <g transform="translate(22 25) rotate(-24)">
        <path d="M-3 -17 L0 -23 L3 -17 Z" fill="#7d1f28" stroke="#420c11" stroke-width="1.1"/>
        <rect x="-6.5" y="-17" width="13" height="5" rx="2" fill="#2b2122" stroke="#181213" stroke-width="1.1"/>
        <rect x="-8.5" y="-12" width="17" height="26" rx="5.5" fill="#8f242e" stroke="#470e13" stroke-width="1.35"/>
        <rect x="-7.2" y="-3" width="14.4" height="9" rx="1.5" fill="#ff9e9e" opacity="0.92"/>
        <line x1="-4" y1="1.5" x2="4" y2="1.5" stroke="#5e1118" stroke-width="2" stroke-linecap="round"/>
      </g>
      <path d="M25 42 Q30 36 35 42 T46 40" fill="none" stroke="#470e13" stroke-width="5.2" stroke-linecap="round" opacity="0.32"/>
      <path d="M25 42 Q30 36 35 42 T46 40" fill="none" stroke="#992933" stroke-width="3.8" stroke-linecap="round"/>
      <path d="M26 41 Q30 36.8 34.5 41" fill="none" stroke="#ff99a3" stroke-width="1.1" stroke-linecap="round" opacity="0.75"/>
    </svg>`,

  chimichurri: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <path d="M11 31 C11 22 19 18 28 18 C37 18 45 22 45 31 C45 39 37 42 28 42 C19 42 11 39 11 31 Z" fill="#47423e" stroke="#24211f" stroke-width="1.4"/>
      <ellipse cx="28" cy="28" rx="15" ry="9" fill="#3a8a3e" stroke="#1e5421" stroke-width="1.2"/>
      <circle cx="22" cy="27" r="1.4" fill="#9ae675"/>
      <circle cx="33" cy="29" r="1.3" fill="#fff3c4"/>
      <circle cx="28" cy="24" r="1.2" fill="#e6422e"/>
      <circle cx="26" cy="31" r="1.2" fill="#1b4d1e"/>
    </svg>`,

  avocado_ranch: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <g transform="translate(22 25) rotate(-24)">
        <path d="M-3 -17 L0 -23 L3 -17 Z" fill="#98d468" stroke="#477522" stroke-width="1.1"/>
        <rect x="-6.5" y="-17" width="13" height="5" rx="2" fill="#f5faf0" stroke="#7ea85b" stroke-width="1.1"/>
        <rect x="-8.5" y="-12" width="17" height="26" rx="5.5" fill="#b4e386" stroke="#53852a" stroke-width="1.35"/>
        <rect x="-7.2" y="-3" width="14.4" height="9" rx="1.5" fill="#ffffff" opacity="0.94"/>
        <line x1="-4" y1="1.5" x2="4" y2="1.5" stroke="#53852a" stroke-width="2" stroke-linecap="round"/>
      </g>
      <path d="M25 42 Q30 36 35 42 T46 40" fill="none" stroke="#53852a" stroke-width="5" stroke-linecap="round" opacity="0.28"/>
      <path d="M25 42 Q30 36 35 42 T46 40" fill="none" stroke="#a6db72" stroke-width="3.6" stroke-linecap="round"/>
    </svg>`,

  chipotle_cheese: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <g transform="translate(22 25) rotate(-24)">
        <path d="M-3 -17 L0 -23 L3 -17 Z" fill="#f29f24" stroke="#995606" stroke-width="1.1"/>
        <rect x="-6.5" y="-17" width="13" height="5" rx="2" fill="#fff5de" stroke="#995606" stroke-width="1.1"/>
        <rect x="-8.5" y="-12" width="17" height="26" rx="5.5" fill="#f5a62c" stroke="#995606" stroke-width="1.35"/>
        <rect x="-7.2" y="-3" width="14.4" height="9" rx="1.5" fill="#7d2514"/>
        <line x1="-4" y1="1.5" x2="4" y2="1.5" stroke="#ffd257" stroke-width="2" stroke-linecap="round"/>
      </g>
      <path d="M25 42 Q30 36 35 42 T46 40" fill="none" stroke="#995606" stroke-width="5" stroke-linecap="round" opacity="0.28"/>
      <path d="M25 42 Q30 36 35 42 T46 40" fill="none" stroke="#f7a928" stroke-width="3.6" stroke-linecap="round"/>
    </svg>`,

  vinaigrette: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <path d="M28 11 C28 11 16 25 16 34 C16 41 21.5 46 28 46 C34.5 46 40 41 40 34 C40 25 28 11 28 11 Z" fill="#9bd654" stroke="#4a7518" stroke-width="1.4"/>
      <path d="M22 33 C22 38 25 41 29 41" fill="none" stroke="#ebffd1" stroke-width="2" stroke-linecap="round"/>
      <circle cx="29" cy="30" r="1.4" fill="#3a630d"/>
      <circle cx="25" cy="35" r="1.2" fill="#3a630d"/>
    </svg>`,

  ice_cream: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <path d="M15 34 C15 24 21 18 28 18 C35 18 41 24 41 34 C41 38 35 39 28 39 C21 39 15 38 15 34 Z" fill="#fff7e2" stroke="#c7b287" stroke-width="1.4"/>
      <circle cx="20" cy="37" r="3.5" fill="#fff7e2" stroke="#c7b287" stroke-width="1.2"/>
      <circle cx="28" cy="38" r="3.8" fill="#fff7e2" stroke="#c7b287" stroke-width="1.2"/>
      <circle cx="36" cy="37" r="3.5" fill="#fff7e2" stroke="#c7b287" stroke-width="1.2"/>
      <path d="M28 18 Q25 13 21 15 M28 18 Q32 12 35 15" fill="none" stroke="#3c9142" stroke-width="2" stroke-linecap="round"/>
    </svg>`,

  whipped_cream: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <path d="M14 39 C11 39 11 32 17 31 C15 26 20 22 25 22 C24 16 28 12 31 12 C29 17 34 21 34 25 C40 25 44 31 39 33 C45 34 44 39 39 39 Z" fill="#ffffff" stroke="#c9ccd4" stroke-width="1.45" stroke-linejoin="round"/>
      <path d="M18 33 Q28 31 37 33" fill="none" stroke="#e4e7ed" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,

  berry_compote: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <circle cx="22" cy="32" r="9" fill="#c91e3a" stroke="#6e0a1a" stroke-width="1.3"/>
      <circle cx="35" cy="31" r="8.5" fill="#3a408f" stroke="#1b1f54" stroke-width="1.3"/>
      <circle cx="28" cy="23" r="8" fill="#e02b48" stroke="#6e0a1a" stroke-width="1.3"/>
      <circle cx="25" cy="20" r="1.4" fill="#ff9eb0"/>
      <circle cx="36" cy="27" r="1.3" fill="#8f97eb"/>
    </svg>`,

  maple_guava: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <path d="M25 12 Q28 24 22 33 C17 39 21 44 29 44 C37 44 40 39 35 33 Q29 24 31 12 Z" fill="#db7618" stroke="#853d06" stroke-width="1.35" stroke-linejoin="round"/>
      <path d="M24 35 C23 39 26 41 30 41" fill="none" stroke="#ffd27d" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`,

  chocolate_sauce: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <path d="M13 38 Q21 26 28 36 T43 32" fill="none" stroke="#3b1e10" stroke-width="7.5" stroke-linecap="round"/>
      <path d="M14 37 Q21 26 28 35 T42 32" fill="none" stroke="#8c5438" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
      <path d="M18 19 L25 25 L16 25 Z" fill="#4a2614" stroke="#240e04" stroke-width="1"/>
      <path d="M31 17 L38 23 L29 23 Z" fill="#4a2614" stroke="#240e04" stroke-width="1"/>
    </svg>`,

  ice_cubes: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <rect x="13" y="23" width="16" height="16" rx="4" transform="rotate(-14 21 31)" fill="#d6effc" stroke="#5ea7d1" stroke-width="1.4"/>
      <path d="M15 26 L21 24" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>
      <rect x="27" y="19" width="16" height="16" rx="4" transform="rotate(12 35 27)" fill="#bfe6fa" stroke="#4d9ac7" stroke-width="1.4"/>
      <path d="M31 23 L37 22" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`,

  lime_wedge: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <path d="M11 32 C14 43 42 43 45 32 Z" fill="#328a24" stroke="#1b5412" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M14 32 C17 40 39 40 42 32 Z" fill="#f0fce3"/>
      <path d="M17 32 L28 32 L21 37 Z M28 32 L28 38 M28 32 L39 32 L35 37 Z" fill="#9ce653"/>
    </svg>`,

  mint_leaves: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <path d="M27 42 Q28 30 22 18" fill="none" stroke="#1d7033" stroke-width="2" stroke-linecap="round"/>
      <path d="M25 28 C14 27 12 15 22 15 C27 15 28 22 25 28 Z" fill="#35ba5b" stroke="#17612b" stroke-width="1.3"/>
      <path d="M28 30 C30 20 40 16 44 23 C46 28 36 33 28 30 Z" fill="#2aa34c" stroke="#17612b" stroke-width="1.3"/>
      <path d="M17 20 L23 25 M38 22 L31 27" stroke="#b3f7c4" stroke-width="1.2" stroke-linecap="round"/>
    </svg>`,

  chilled_glass: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <path d="M17 15 L20 42 Q20.5 44 23 44 L33 44 Q35.5 44 36 42 L39 15 Z" fill="#eef6fc" stroke="#6ca5c9" stroke-width="1.45" stroke-linejoin="round"/>
      <line x1="21" y1="20" x2="23" y2="39" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
      <path d="M16 15 L40 15" stroke="#85bddf" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`,

  generic_ing: `
    <svg class="tap-svg-art" viewBox="0 0 56 56" aria-hidden="true">
      <circle cx="28" cy="28" r="15" fill="#f3f5ef" stroke="#9aa38c" stroke-width="1.4"/>
      <path d="M22 33 C20 25 26 19 34 19 C35 26 30 33 22 33 Z" fill="#5aa84f" stroke="#2d6625" stroke-width="1.3"/>
      <path d="M22 33 L30 24" stroke="#d4f5cf" stroke-width="1.3" stroke-linecap="round"/>
    </svg>`,
};

function getPinchConfigArtSVG(artKey) {
  if (PINCH_CONFIG_ART[artKey]) return PINCH_CONFIG_ART[artKey];
  if (INGREDIENT_ART[artKey]) {
    // Asegura cero colisiones de ID SVG cuando el mismo ícono aparece varias veces en la misma vista
    const uid = `ca_${++plateSvgUidCounter}_`;
    return INGREDIENT_ART[artKey]
      .replace(/id="ia_/g, `id="${uid}`)
      .replace(/url\(#ia_/g, `url(#${uid}`);
  }
  return PINCH_CONFIG_ART.generic_ing;
}

const PINCH_BOTTLE_PALETTES = {
  salsa_roja: {
    bodyL: '#8a1207', bodyM: '#d92716', bodyR: '#ff6e59', bodyEdge: '#6e0d04',
    cap: '#242120', capStroke: '#121010', nozzle: '#cf2414',
    label: '#f7c852', labelAccent: '#7a1006', stream: '#d42415', highlight: '#ff8a7a',
  },
  ketchup: {
    bodyL: '#99150b', bodyM: '#e3291b', bodyR: '#ff7a6e', bodyEdge: '#7d1008',
    cap: '#f7f4ec', capStroke: '#cbc3b4', nozzle: '#e02819',
    label: '#ffffff', labelAccent: '#e02819', stream: '#dc2214', highlight: '#ff9c94',
  },
  mostaza: {
    bodyL: '#b88205', bodyM: '#f5c21b', bodyR: '#fff1a6', bodyEdge: '#966903',
    cap: '#f5c21b', capStroke: '#a87a05', nozzle: '#e3ad09',
    label: '#fffbe6', labelAccent: '#a87804', stream: '#f2bc16', highlight: '#fff7bf',
  },
  mayonesa: {
    bodyL: '#d4cab3', bodyM: '#fffdf5', bodyR: '#ffffff', bodyEdge: '#aba089',
    cap: '#eae1cc', capStroke: '#aba089', nozzle: '#f5efe0',
    label: '#e3a642', labelAccent: '#ffffff', stream: '#fffdf5', highlight: '#ffffff',
  },
  aioli: {
    bodyL: '#d6cdb8', bodyM: '#fffdf7', bodyR: '#ffffff', bodyEdge: '#9e937c',
    cap: '#ebe3cf', capStroke: '#9e937c', nozzle: '#f5efe0',
    label: '#76a35d', labelAccent: '#ffffff', stream: '#fffdf5', highlight: '#ffffff',
  },
  truffle_aioli: {
    bodyL: '#cfc5b0', bodyM: '#f7f2e6', bodyR: '#ffffff', bodyEdge: '#524a3e',
    cap: '#2c2925', capStroke: '#181614', nozzle: '#f2ecdf',
    label: '#2b2723', labelAccent: '#e5c16c', stream: '#f5efe2', highlight: '#ffffff',
  },
  spicy_aioli: {
    bodyL: '#ba3e16', bodyM: '#f26b3a', bodyR: '#ffa985', bodyEdge: '#8f2c0c',
    cap: '#fff2eb', capStroke: '#a63612', nozzle: '#eb5e2d',
    label: '#ffffff', labelAccent: '#e03a14', stream: '#f26835', highlight: '#ffc2ab',
  },
  guava_bbq: {
    bodyL: '#591118', bodyM: '#8f242e', bodyR: '#cc525d', bodyEdge: '#420c11',
    cap: '#2b2122', capStroke: '#181213', nozzle: '#7d1f28',
    label: '#ff9e9e', labelAccent: '#5e1118', stream: '#992933', highlight: '#ff99a3',
  },
  chipotle_cheese: {
    bodyL: '#b86c08', bodyM: '#f5a62c', bodyR: '#ffd67d', bodyEdge: '#8c4e04',
    cap: '#fff5de', capStroke: '#995606', nozzle: '#eb971e',
    label: '#7d2514', labelAccent: '#ffd257', stream: '#f7a928', highlight: '#ffe299',
  },
  avocado_ranch: {
    bodyL: '#5f9433', bodyM: '#a6db72', bodyR: '#dcf7ba', bodyEdge: '#477522',
    cap: '#f5faf0', capStroke: '#7ea85b', nozzle: '#98d468',
    label: '#ffffff', labelAccent: '#53852a', stream: '#a6db72', highlight: '#e6ffd1',
  },
  chimichurri: {
    bodyL: '#1d5420', bodyM: '#3a8a3e', bodyR: '#7ed17b', bodyEdge: '#154017',
    cap: '#27662a', capStroke: '#154017', nozzle: '#327d36',
    label: '#e8fce6', labelAccent: '#1d5420', stream: '#3a8a3e', highlight: '#9ae675',
  },
  vinaigrette: {
    bodyL: '#5e8c22', bodyM: '#9bd654', bodyR: '#d8f7a6', bodyEdge: '#426614',
    cap: '#f4fae8', capStroke: '#5e8c22', nozzle: '#8ec944',
    label: '#ffffff', labelAccent: '#426614', stream: '#9bd654', highlight: '#ebffd1',
  },
  maple_guava: {
    bodyL: '#9e4d08', bodyM: '#db7618', bodyR: '#ffb866', bodyEdge: '#6b3204',
    cap: '#fff4de', capStroke: '#853d06', nozzle: '#cc6810',
    label: '#fff8e8', labelAccent: '#853d06', stream: '#db7618', highlight: '#ffd27d',
  },
  chocolate_sauce: {
    bodyL: '#261107', bodyM: '#4a2614', bodyR: '#8c5438', bodyEdge: '#1c0b04',
    cap: '#5c311b', capStroke: '#240e04', nozzle: '#3b1e10',
    label: '#f5dec2', labelAccent: '#3b1e10', stream: '#4a2614', highlight: '#9e6346',
  },
};

function renderConfiguratorBottleSVG(bottleKey, uid) {
  const p = PINCH_BOTTLE_PALETTES[bottleKey] || PINCH_BOTTLE_PALETTES.aioli;
  const gradId = `${uid}_cBtlGrad`;
  return `
    <defs>
      <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${p.bodyL}"/>
        <stop offset="28%" stop-color="${p.bodyR}"/>
        <stop offset="58%" stop-color="${p.bodyM}"/>
        <stop offset="100%" stop-color="${p.bodyL}"/>
      </linearGradient>
    </defs>
    <g class="squeeze-bottle-rig sweep-hotdog" pointer-events="none">
      <g class="squeeze-jet-group">
        <path class="squeeze-jet-line" d="M 0 1 Q 2 15, -1 30" fill="none" stroke="${p.bodyEdge}" stroke-width="5.6" stroke-linecap="round" opacity="0.35"/>
        <path class="squeeze-jet-line" d="M 0 1 Q 2 15, -1 30" fill="none" stroke="${p.stream}" stroke-width="3.8" stroke-linecap="round"/>
        <circle class="squeeze-drop d1" cx="-1" cy="19" r="2.3" fill="${p.stream}"/>
        <circle class="squeeze-drop d2" cx="2" cy="29" r="1.9" fill="${p.stream}"/>
      </g>
      <g class="squeeze-bottle-body">
        <path d="M -4.2 -11 L 0 0 L 4.2 -11 Z" fill="${p.nozzle}" stroke="${p.bodyEdge}" stroke-width="1.15" stroke-linejoin="round"/>
        <rect x="-10.5" y="-19.5" width="21" height="9" rx="3" fill="${p.cap}" stroke="${p.capStroke}" stroke-width="1.25"/>
        <path d="M -10.5 -19.5 C -14.5 -21.5, -16.5 -27.5, -16.5 -37 L -16 -57 C -16 -64.5, -11 -68.5, 0 -68.5 C 11 -68.5, 16 -64.5, 16 -57 L 16.5 -37 C 16.5 -27.5, 14.5 -21.5, 10.5 -19.5 Z"
              fill="url(#${gradId})" stroke="${p.bodyEdge}" stroke-width="1.45" stroke-linejoin="round"/>
        <rect x="-15.5" y="-50" width="31" height="14.5" rx="2" fill="${p.label}" opacity="0.94"/>
        <line x1="-8" y1="-42.8" x2="8" y2="-42.8" stroke="${p.labelAccent}" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M -9.5 -59.5 C -10.8 -51, -10.8 -36, -8.8 -25" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" opacity="0.52"/>
      </g>
    </g>
  `;
}

const PINCH_EXTRAS_BY_CATEGORY = {
  burgers_sandwiches: [
    { id: 'bacon',          name: 'Tocino ahumado',      price: 3.00, artKey: 'bacon',          animKind: 'drop' },
    { id: 'avocado',        name: 'Aguacate fresco',     price: 2.50, artKey: 'avocado',        animKind: 'drop' },
    { id: 'fried_egg',      name: 'Huevo estrellado',    price: 2.00, artKey: 'fried_egg',      animKind: 'drop' },
    { id: 'swiss_cheese',   name: 'Queso suizo extra',   price: 1.50, artKey: 'swiss_cheese',   animKind: 'drop' },
    { id: 'cheddar_cheese', name: 'Queso cheddar',       price: 1.50, artKey: 'cheddar_cheese', animKind: 'drop' },
    { id: 'mushrooms',      name: 'Champiñones ajillo',  price: 2.00, artKey: 'mushrooms',      animKind: 'toss' },
    { id: 'jalapenos',      name: 'Jalapeños curados',   price: 1.00, artKey: 'chiles',         animKind: 'toss' },
    { id: 'truffle_aioli',  name: 'Alioli de trufa',     price: 1.50, artKey: 'truffle_aioli',  animKind: 'sauce' },
    { id: 'guava_bbq',      name: 'BBQ de guayaba',      price: 1.50, artKey: 'guava_bbq',      animKind: 'sauce' },
    { id: 'spicy_aioli',    name: 'Alioli picante',      price: 1.00, artKey: 'spicy_aioli',    animKind: 'sauce' },
    { id: 'potato_sticks',  name: 'Papitas hilo extra',  price: 1.00, artKey: 'potato_sticks',  animKind: 'toss' },
    { id: 'extra_patty',    name: 'Carne extra 8 oz',    price: 6.00, artKey: 'extra_patty',    animKind: 'drop', onlyIds: ['pinch_burger', 'impossible_vegan_burger'] },
  ],
  pinch_bites: [
    { id: 'avocado',        name: 'Aguacate fresco',     price: 2.50, artKey: 'avocado',        animKind: 'drop' },
    { id: 'guacamole',      name: 'Guacamole extra',     price: 3.00, artKey: 'guacamole',      animKind: 'drop' },
    { id: 'bacon',          name: 'Tocino crujiente',    price: 3.00, artKey: 'bacon',          animKind: 'drop' },
    { id: 'jalapenos',      name: 'Jalapeños curados',   price: 1.00, artKey: 'chiles',         animKind: 'toss' },
    { id: 'chipotle_cheese',name: 'Queso al chipotle',   price: 2.00, artKey: 'chipotle_cheese',animKind: 'sauce' },
    { id: 'aioli',          name: 'Alioli de la casa',   price: 1.50, artKey: 'aioli',          animKind: 'sauce' },
    { id: 'guava_bbq',      name: 'BBQ de guayaba',      price: 1.50, artKey: 'guava_bbq',      animKind: 'sauce' },
    { id: 'shrimp',         name: 'Camarones extra',     price: 7.00, artKey: 'shrimp',         animKind: 'toss' },
  ],
  entrees: [
    { id: 'fried_egg',      name: 'Huevo estrellado',    price: 2.50, artKey: 'fried_egg',      animKind: 'drop' },
    { id: 'avocado',        name: 'Aguacate fresco',     price: 2.50, artKey: 'avocado',        animKind: 'drop' },
    { id: 'bacon',          name: 'Tocino ahumado',      price: 3.00, artKey: 'bacon',          animKind: 'drop' },
    { id: 'mushrooms',      name: 'Champiñones ajillo',  price: 2.50, artKey: 'mushrooms',      animKind: 'toss' },
    { id: 'parmesan',       name: 'Parmigiano extra',    price: 2.00, artKey: 'parmesan',       animKind: 'toss' },
    { id: 'chimichurri',    name: 'Vinagreta / Chimi',   price: 1.50, artKey: 'chimichurri',    animKind: 'sauce' },
    { id: 'guava_bbq',      name: 'BBQ de guayaba',      price: 1.50, artKey: 'guava_bbq',      animKind: 'sauce' },
    { id: 'truffle_aioli',  name: 'Alioli de trufa',     price: 1.50, artKey: 'truffle_aioli',  animKind: 'sauce' },
  ],
  stuffed_french_toast: [
    { id: 'whipped_cream',  name: 'Crema batida casa',   price: 1.50, artKey: 'whipped_cream',  animKind: 'drop' },
    { id: 'berry_compote',  name: 'Compota frutos rojos',price: 2.00, artKey: 'berry_compote',  animKind: 'toss' },
    { id: 'ice_cream',      name: 'Helado de tomillo',   price: 3.50, artKey: 'ice_cream',      animKind: 'drop' },
    { id: 'maple_guava',    name: 'Jarabe guayaba-maple',price: 1.50, artKey: 'maple_guava',    animKind: 'sauce' },
    { id: 'bacon',          name: 'Tocino ahumado',      price: 3.00, artKey: 'bacon',          animKind: 'drop' },
    { id: 'fried_egg',      name: 'Huevo estrellado',    price: 2.50, artKey: 'fried_egg',      animKind: 'drop' },
  ],
  sides: [
    { id: 'bacon',          name: 'Tocino crujiente',    price: 2.50, artKey: 'bacon',          animKind: 'drop' },
    { id: 'chipotle_cheese',name: 'Queso al chipotle',   price: 2.00, artKey: 'chipotle_cheese',animKind: 'sauce' },
    { id: 'parmesan',       name: 'Parmigiano rallado',  price: 1.50, artKey: 'parmesan',       animKind: 'toss' },
    { id: 'truffle_aioli',  name: 'Alioli de trufa',     price: 1.50, artKey: 'truffle_aioli',  animKind: 'sauce' },
    { id: 'ketchup_extra',  name: 'Kétchup extra',       price: 0.00, artKey: 'ketchup',        animKind: 'sauce' },
    { id: 'chili_flakes',   name: 'Hojuelas de chile',   price: 0.50, artKey: 'chili_flakes',   animKind: 'toss' },
  ],
  desserts: [
    { id: 'ice_cream',      name: 'Helado de tomillo',   price: 3.50, artKey: 'ice_cream',      animKind: 'drop' },
    { id: 'whipped_cream',  name: 'Crema batida casa',   price: 1.50, artKey: 'whipped_cream',  animKind: 'drop' },
    { id: 'berry_compote',  name: 'Compota frutos rojos',price: 2.00, artKey: 'berry_compote',  animKind: 'toss' },
    { id: 'maple_guava',    name: 'Jarabe guayaba-maple',price: 1.50, artKey: 'maple_guava',    animKind: 'sauce' },
    { id: 'chocolate_sauce',name: 'Salsa de chocolate',  price: 1.50, artKey: 'chocolate_sauce',animKind: 'sauce' },
  ],
  drinks: [
    { id: 'ice_cubes',      name: 'Vaso con hielo',      price: 0.00, artKey: 'ice_cubes',      animKind: 'drop' },
    { id: 'lime_wedge',     name: 'Rodaja de limón',     price: 0.00, artKey: 'lime_wedge',     animKind: 'drop' },
    { id: 'mint_leaves',    name: 'Menta fresca',        price: 0.50, artKey: 'mint_leaves',    animKind: 'toss' },
    { id: 'chilled_glass',  name: 'Sin hielo / Al tiempo',price: 0.00, artKey: 'chilled_glass',  animKind: 'drop' },
  ],
};

function resolvePinchIngredientArtKey(label) {
  const n = normalizeSpanishQuery(label || '');
  if (n.includes('trufa')) return { artKey: 'truffle_aioli', animKind: 'sauce' };
  if (n.includes('alioli picante')) return { artKey: 'spicy_aioli', animKind: 'sauce' };
  if (n.includes('alioli') || n.includes('mayo')) return { artKey: 'aioli', animKind: 'sauce' };
  if (n.includes('ranch')) return { artKey: 'avocado_ranch', animKind: 'sauce' };
  if (n.includes('vinagreta')) return { artKey: 'vinaigrette', animKind: 'sauce' };
  if (n.includes('bbq') || n.includes('guayaba')) {
    return n.includes('jarabe') || n.includes('maple')
      ? { artKey: 'maple_guava', animKind: 'sauce' }
      : { artKey: 'guava_bbq', animKind: 'sauce' };
  }
  if (n.includes('salsa de queso') || n.includes('chipotle')) return { artKey: 'chipotle_cheese', animKind: 'sauce' };
  if (n.includes('mostaza')) return { artKey: 'mostaza', animKind: 'sauce' };
  if (n.includes('ketchup')) return { artKey: 'ketchup', animKind: 'sauce' };
  if (n.includes('salsa de tomate') || n.includes('pomodoro')) return { artKey: 'salsa_roja', animKind: 'sauce' };
  if (n.includes('jarabe') || n.includes('maple')) return { artKey: 'maple_guava', animKind: 'sauce' };
  if (n.includes('chocolate')) return { artKey: 'chocolate_sauce', animKind: 'sauce' };

  if (n.includes('tocino') || n.includes('chicharron') || n.includes('panceta')) return { artKey: 'bacon', animKind: 'drop' };
  if (n.includes('guacamole')) return { artKey: 'guacamole', animKind: 'drop' };
  if (n.includes('aguacate')) return { artKey: 'avocado', animKind: 'drop' };
  if (n.includes('huevo')) return { artKey: 'fried_egg', animKind: 'drop' };
  if (n.includes('queso suizo')) return { artKey: 'swiss_cheese', animKind: 'drop' };
  if (n.includes('parmigiano') || n.includes('parmesan')) return { artKey: 'parmesan', animKind: 'toss' };
  if (n.includes('queso crema') || n.includes('queso')) return { artKey: 'swiss_cheese', animKind: 'drop' };
  if (n.includes('pepinillo')) return { artKey: 'pickles', animKind: 'drop' };
  if (n.includes('carameliz')) return { artKey: 'caramelized_onion', animKind: 'drop' };
  if (n.includes('cebolla morada')) return { artKey: 'red_onion', animKind: 'toss' };
  if (n.includes('cebolla')) return { artKey: 'cebolla', animKind: 'toss' };
  if (n.includes('lechuga') || n.includes('arugula') || n.includes('vegetal') || n.includes('broccolini') || n.includes('coles')) {
    return { artKey: 'lettuce', animKind: 'drop' };
  }
  if (n.includes('cilantro') || n.includes('albahaca') || n.includes('hierbas') || n.includes('zaatar')) {
    return { artKey: 'cilantro', animKind: 'toss' };
  }
  if (n.includes('tomate')) return { artKey: 'tomate', animKind: 'toss' };
  if (n.includes('jalapeno') || n.includes('pikliz')) return { artKey: n.includes('pikliz') ? 'pikliz' : 'chiles', animKind: 'toss' };
  if (n.includes('hojuelas de chile')) return { artKey: 'chili_flakes', animKind: 'toss' };
  if (n.includes('papitas hilo') || n.includes('tortilla crujiente') || n.includes('totopos')) return { artKey: 'potato_sticks', animKind: 'toss' };
  if (n.includes('papas')) return { artKey: 'fries', animKind: 'drop' };
  if (n.includes('kimchi')) return { artKey: 'kimchi', animKind: 'toss' };
  if (n.includes('frijol')) return { artKey: 'beans', animKind: 'drop' };
  if (n.includes('aceituna')) return { artKey: 'olives', animKind: 'drop' };
  if (n.includes('helado')) return { artKey: 'ice_cream', animKind: 'drop' };
  if (n.includes('crema batida')) return { artKey: 'whipped_cream', animKind: 'drop' };
  if (n.includes('compota') || n.includes('frutos')) return { artKey: 'berry_compote', animKind: 'toss' };
  if (n.includes('ajo')) return { artKey: 'cebolla', animKind: 'toss' };
  if (n.includes('citricos') || n.includes('limon')) return { artKey: 'lime_wedge', animKind: 'drop' };
  if (n.includes('pavo') || n.includes('jamon') || n.includes('ragu')) return { artKey: 'ham_turkey', animKind: 'drop' };
  if (n.includes('camaron')) return { artKey: 'shrimp', animKind: 'toss' };
  if (n.includes('zanahoria')) return { artKey: 'pikliz', animKind: 'toss' };
  return { artKey: 'generic_ing', animKind: 'toss' };
}

const PINCH_SPLITTABLE_COMPOUND = {
  'lechuga y tomate': ['Lechuga', 'Tomate'],
  'mostaza y alioli': ['Mostaza', 'Alioli'],
  'tomate y cilantro': ['Tomate', 'Cilantro'],
  'zanahoria y lechuga': ['Zanahoria', 'Lechuga'],
};

const PINCH_CORE_SKIP_PATTERNS = [
  'pan cubano',
  'pan brioche',
  'pan pretzel',
  'focaccia artesanal',
  'carne mezcla de la casa',
  'proteina impossible',
  'filete local de mahi',
  'muslo de pollo frito',
  'pavo curado en casa',
  'jamon curado en casa',
  'entrana certified angus',
  '2 huevos organicos',
  'pasta tagliatelle',
  'pasta bucatini',
  'medio costillar',
  'costillar completo',
  '6 croquetas artesanales',
  'croquetas de jamon estilo miami',
  '8 camarones salvajes',
  'empanizado crujiente',
  'vegetales de temporada',
  'caldo 100% vegetal',
  'aceitunas marinadas',
  'camaron rojo salvaje',
  'totopos de maiz azul',
  'budin de pan artesanal',
  'masa de galleta',
  'pay de limon verde',
  'papas frescas',
  'preparacion francesa artesanal',
];

function getDishBaseIngredients(dish) {
  if (!dish || dish.category === 'drinks') return [];
  const rawList = Array.isArray(dish.ingredients) ? dish.ingredients : [];
  const expanded = [];
  rawList.forEach(raw => {
    const clean = String(raw || '').trim();
    if (!clean) return;
    const norm = normalizeSpanishQuery(clean);
    if (PINCH_SPLITTABLE_COMPOUND[norm]) {
      PINCH_SPLITTABLE_COMPOUND[norm].forEach(part => expanded.push(part));
    } else {
      expanded.push(clean);
    }
  });

  const seen = new Set();
  const result = [];
  expanded.forEach(label => {
    const norm = normalizeSpanishQuery(label);
    if (seen.has(norm)) return;
    const isCore = PINCH_CORE_SKIP_PATTERNS.some(pat => norm.includes(pat));
    if (isCore) return;
    seen.add(norm);
    const meta = resolvePinchIngredientArtKey(label);
    result.push({
      label,
      artKey: meta.artKey,
      animKind: meta.animKind,
    });
  });
  return result;
}

function getDishExtrasCatalog(dish) {
  if (!dish) return [];
  if (dish.id === 'stuffed_french_toast') {
    return PINCH_EXTRAS_BY_CATEGORY.stuffed_french_toast;
  }
  const pool = PINCH_EXTRAS_BY_CATEGORY[dish.category] || PINCH_EXTRAS_BY_CATEGORY.entrees;
  return pool.filter(ex => !Array.isArray(ex.onlyIds) || ex.onlyIds.includes(dish.id));
}

function getDishPlateArchetype(dish) {
  if (!dish) return 'bites';
  if (dish.category === 'drinks') return 'drink';
  if (dish.category === 'desserts') return 'dessert';
  if (dish.id === 'pinch_burger' || dish.id === 'impossible_vegan_burger') return 'burger';
  if (dish.category === 'burgers_sandwiches') return 'sandwich';
  if (dish.id === 'pinch_nachos') return 'nachos';
  if (dish.id === 'pinch_salad' || dish.id === 'petit_salad') return 'salad';
  if (dish.id === 'tagliatelle_alla_bolognese' || dish.id === 'bucatini_al_pomodoro' || dish.id === 'seasonal_soup') return 'pasta';
  if (dish.id === 'black_angus_skirt_steak' || dish.id === 'steak_n_eggs' || dish.id.includes('ribs')) return 'steak';
  if (dish.category === 'sides') return 'fries';
  return 'bites';
}

function renderBaseDishArchetypeSVG(dish, archetype, uid) {
  if (archetype === 'burger') {
    const isDarkPretzel = dish && dish.id === 'impossible_vegan_burger';
    const bunFill = isDarkPretzel ? '#8c5328' : '#e3a64b';
    const bunDark = isDarkPretzel ? '#522c10' : '#a86919';
    return `
      <ellipse cx="190" cy="176" rx="84" ry="20" fill="#47280a" opacity="0.22"/>
      <!-- Pan inferior brioche / pretzel -->
      <path d="M114 152 Q114 176 190 176 Q266 176 266 152 Z" fill="${bunFill}" stroke="${bunDark}" stroke-width="1.8"/>
      <!-- Carne 8oz sellada a la parrilla -->
      <path d="M108 140 C108 130 272 130 272 140 L272 152 C272 162 108 162 108 152 Z" fill="${isDarkPretzel ? '#6e4526' : '#6b3015'}" stroke="#3d1708" stroke-width="1.8"/>
      <path d="M132 137 L148 150 M170 136 L186 150 M208 136 L224 150 M240 137 L254 149" stroke="#2e0f04" stroke-width="2.6" stroke-linecap="round" opacity="0.65"/>
      <!-- Domo superior sutilmente elevado para lucir ingredientes -->
      <path d="M118 118 C118 82 262 82 262 118 Z" fill="${bunFill}" stroke="${bunDark}" stroke-width="1.8" opacity="0.93"/>
      <path d="M138 98 Q190 88 242 98" fill="none" stroke="#ffe5ad" stroke-width="2.6" stroke-linecap="round" opacity="0.52"/>
      <circle cx="158" cy="100" r="1.8" fill="#fff6d6"/><circle cx="190" cy="94" r="1.8" fill="#fff6d6"/>
      <circle cx="222" cy="100" r="1.8" fill="#fff6d6"/><circle cx="174" cy="106" r="1.6" fill="#fff6d6"/>
      <circle cx="208" cy="107" r="1.6" fill="#fff6d6"/>
    `;
  }
  if (archetype === 'sandwich') {
    return `
      <ellipse cx="190" cy="178" rx="108" ry="20" fill="#472a0b" opacity="0.2"/>
      <!-- Base pan cubano / brioche prensado -->
      <rect x="86" y="138" width="208" height="34" rx="15" fill="#e6b05c" stroke="#9e621c" stroke-width="1.8"/>
      <rect x="94" y="128" width="192" height="22" rx="10" fill="#d9756c" stroke="#8a3832" stroke-width="1.4" opacity="0.86"/>
      <!-- Tapa superior prensada con marcas de plancha -->
      <path d="M88 124 C92 100 288 100 292 124 L288 134 C252 136 128 136 92 134 Z" fill="#f0c173" stroke="#9e621c" stroke-width="1.8"/>
      <path d="M124 107 L142 128 M168 106 L186 128 M212 106 L230 128 M248 108 L264 127" stroke="#8f4d14" stroke-width="3" stroke-linecap="round" opacity="0.45"/>
    `;
  }
  if (archetype === 'steak') {
    return `
      <ellipse cx="190" cy="174" rx="110" ry="22" fill="#38180a" opacity="0.22"/>
      <path d="M96 144 C92 118 148 108 214 114 C274 118 292 138 282 156 C272 172 204 176 142 170 C106 166 98 156 96 144 Z" fill="#702f18" stroke="#3b1307" stroke-width="2"/>
      <path d="M126 122 L152 162 M162 118 L190 165 M202 120 L228 164 M242 125 L264 156" stroke="#2d0c03" stroke-width="3.2" stroke-linecap="round" opacity="0.72"/>
      <path d="M122 130 Q188 118 258 134" fill="none" stroke="#d48155" stroke-width="2.2" stroke-linecap="round" opacity="0.65"/>
    `;
  }
  if (archetype === 'pasta') {
    return `
      <ellipse cx="190" cy="156" rx="96" ry="44" fill="#d93b26" stroke="#8f1e0e" stroke-width="1.6"/>
      <g fill="none" stroke="#f7cf6a" stroke-width="5.5" stroke-linecap="round">
        <path d="M122 146 Q155 124 192 148 T258 146"/>
        <path d="M114 158 Q154 136 196 158 T262 156"/>
        <path d="M134 166 Q175 148 214 166 T248 162"/>
      </g>
      <circle cx="176" cy="144" r="14" fill="#c92914" opacity="0.86"/>
      <circle cx="212" cy="154" r="12" fill="#c92914" opacity="0.82"/>
    `;
  }
  if (archetype === 'nachos') {
    const mkChip = (x, y, rot, fill) => `
      <polygon points="0,-24 22,16 -22,16" transform="translate(${x}, ${y}) rotate(${rot})" fill="${fill}" stroke="#141a26" stroke-width="1.5" stroke-linejoin="round"/>`;
    return `
      ${mkChip(136, 152, -26, '#334155')}
      ${mkChip(244, 152, 24, '#3b4a61')}
      ${mkChip(172, 134, -10, '#475569')}
      ${mkChip(212, 136, 14, '#334155')}
      ${mkChip(190, 158, 3, '#475569')}
    `;
  }
  if (archetype === 'salad') {
    return `
      <ellipse cx="190" cy="154" rx="102" ry="46" fill="#46a844" stroke="#236622" stroke-width="1.6"/>
      <circle cx="148" cy="146" r="24" fill="#5cc458"/>
      <circle cx="192" cy="140" r="26" fill="#4db54a"/>
      <circle cx="232" cy="148" r="24" fill="#63cf5f"/>
      <circle cx="176" cy="164" r="22" fill="#3f9e3d"/>
      <circle cx="214" cy="162" r="22" fill="#5cc458"/>
    `;
  }
  if (archetype === 'fries') {
    return `
      <ellipse cx="190" cy="164" rx="92" ry="26" fill="#b38229" opacity="0.18"/>
      <g fill="#f5c038" stroke="#9e6d12" stroke-width="1.5">
        <rect x="118" y="138" width="84" height="12" rx="4" transform="rotate(-12 160 144)"/>
        <rect x="148" y="128" width="90" height="12" rx="4" transform="rotate(8 193 134)"/>
        <rect x="172" y="144" width="88" height="12" rx="4" transform="rotate(-6 216 150)"/>
        <rect x="128" y="154" width="86" height="12" rx="4" transform="rotate(5 171 160)"/>
        <rect x="160" y="156" width="82" height="12" rx="4" transform="rotate(-14 201 162)"/>
      </g>
    `;
  }
  if (archetype === 'dessert') {
    return `
      <ellipse cx="190" cy="168" rx="82" ry="20" fill="#4a311e" opacity="0.18"/>
      <path d="M120 156 L194 114 L256 146 L252 166 L124 166 Z" fill="#e6cf6a" stroke="#9c7e22" stroke-width="1.7" stroke-linejoin="round"/>
      <path d="M120 156 L252 166 L254 174 L122 166 Z" fill="#b37b3b" stroke="#6e4618" stroke-width="1.5" stroke-linejoin="round"/>
    `;
  }
  if (archetype === 'drink') {
    const isJamaica  = dish && dish.id === 'agua_jamaica';
    const isHorchata = dish && dish.id === 'agua_horchata';
    const isClear    = dish && dish.id === 'saratoga_sparkling_water';
    const isSprite   = dish && dish.id.includes('sprite');
    const liqColor   = isJamaica ? '#a81332' : (isHorchata ? '#f2e6cf' : (isClear ? '#d9f2fc' : (isSprite ? '#d4f7b5' : '#3d170c')));
    const topColor   = isJamaica ? '#d12649' : (isHorchata ? '#fffaf0' : (isClear ? '#edfaff' : (isSprite ? '#e8ffd1' : '#632917')));
    return `
      <ellipse cx="190" cy="184" rx="58" ry="12" fill="#263645" opacity="0.16"/>
      <path d="M152 82 L162 180 Q164 188 174 188 L206 188 Q216 188 218 180 L228 82 Z" fill="#f0f8fc" stroke="#85bddf" stroke-width="2" stroke-linejoin="round"/>
      <path d="M156 102 L164 178 Q165.5 184 173 184 L207 184 Q214.5 184 216 178 L224 102 Z" fill="${liqColor}" opacity="0.9"/>
      <ellipse cx="190" cy="102" rx="34" ry="6" fill="${topColor}"/>
      ${isHorchata
        ? '<circle cx="182" cy="102" r="1.4" fill="#9e5a2b"/><circle cx="192" cy="103" r="1.3" fill="#9e5a2b"/><circle cx="201" cy="101" r="1.2" fill="#9e5a2b"/>'
        : '<circle cx="178" cy="144" r="2.2" fill="#ffffff" opacity="0.65"/><circle cx="198" cy="126" r="1.8" fill="#ffffff" opacity="0.7"/><circle cx="186" cy="162" r="2.5" fill="#ffffff" opacity="0.6"/>'}
      <line x1="164" y1="96" x2="171" y2="174" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" opacity="0.52"/>
    `;
  }
  // 'bites' default (guacamole, croquetas, shrimp, olives, eggs, french toast)
  return `
    <ellipse cx="190" cy="166" rx="90" ry="26" fill="#5e3e1b" opacity="0.16"/>
    <ellipse cx="152" cy="152" rx="32" ry="18" fill="#dba04b" stroke="#8c5a18" stroke-width="1.6"/>
    <ellipse cx="222" cy="154" rx="32" ry="18" fill="#e6ad55" stroke="#8c5a18" stroke-width="1.6"/>
    <ellipse cx="188" cy="142" rx="34" ry="19" fill="#f0bc65" stroke="#8c5a18" stroke-width="1.6"/>
  `;
}

function renderPlateDropLayerSVG(artKey, slotIdx, animate, uid) {
  const ox = ((slotIdx % 5) - 2) * 18;
  const oy = (slotIdx % 3) * -6;
  let inner = '';

  if (artKey === 'bacon') {
    inner = `
      <g transform="translate(${190 + ox * 0.4}, ${134 + oy})">
        <path d="M-54 0 Q-26 -10 0 0 T54 0 L52 10 Q24 14 0 8 T-52 10 Z" fill="#b8361c" stroke="#631507" stroke-width="1.4"/>
        <path d="M-46 4 Q-20 -4 0 4 T46 4" fill="none" stroke="#ffd4b8" stroke-width="2.4" stroke-linecap="round"/>
      </g>`;
  } else if (artKey === 'avocado' || artKey === 'guacamole') {
    inner = `
      <g transform="translate(${190 + ox * 0.5}, ${136 + oy})">
        <path d="M-38 6 C-30 -10 -12 -14 2 -10 C-6 -2 -12 6 -16 14 Z" fill="#65a82c" stroke="#2d590e" stroke-width="1.3"/>
        <path d="M-32 4 C-24 -7 -12 -10 -2 -7 C-8 0 -13 6 -15 11 Z" fill="#d8f27e"/>
        <path d="M-8 8 C0 -8 18 -12 32 -8 C24 0 18 8 14 16 Z" fill="#5b9c25" stroke="#2d590e" stroke-width="1.3"/>
        <path d="M-2 6 C6 -5 18 -8 28 -5 C22 2 17 8 14 13 Z" fill="#dff78d"/>
      </g>`;
  } else if (artKey === 'fried_egg') {
    inner = `
      <g transform="translate(${190 + ox * 0.3}, ${126 + oy})">
        <path d="M-34 2 C-38 -12 -18 -20 2 -18 C22 -20 38 -10 34 4 C32 16 14 18 0 16 C-18 18 -32 14 -34 2 Z" fill="#fffef7" stroke="#cfc4b0" stroke-width="1.4"/>
        <circle cx="2" cy="-2" r="11" fill="#ffb824" stroke="#bd7106" stroke-width="1.3"/>
        <ellipse cx="-2" cy="-6" rx="3.4" ry="1.8" transform="rotate(-20 -2 -6)" fill="#fff8d6"/>
      </g>`;
  } else if (artKey === 'swiss_cheese' || artKey === 'cheddar_cheese') {
    const fill = artKey === 'cheddar_cheese' ? '#ffb629' : '#fff0b3';
    const stroke = artKey === 'cheddar_cheese' ? '#bd7308' : '#c4a645';
    inner = `
      <g transform="translate(${190 + ox * 0.25}, ${138 + oy})">
        <path d="M-64 -4 L64 -4 L54 12 L24 4 L0 14 L-32 5 L-56 12 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.4" stroke-linejoin="round"/>
        ${artKey === 'swiss_cheese' ? '<circle cx="-22" cy="1" r="3" fill="#d9ba57"/><circle cx="14" cy="2" r="3.2" fill="#d9ba57"/>' : ''}
      </g>`;
  } else if (artKey === 'extra_patty') {
    inner = `
      <g transform="translate(190, 128)">
        <ellipse cx="0" cy="4" rx="68" ry="15" fill="#783719" stroke="#3d1708" stroke-width="1.5"/>
        <path d="M-34 -3 L-18 8 M-4 -4 L12 8 M24 -3 L38 7" stroke="#2e0f04" stroke-width="2.4" stroke-linecap="round" opacity="0.65"/>
      </g>`;
  } else if (artKey === 'caramelized_onion') {
    inner = `
      <g transform="translate(${190 + ox * 0.4}, ${134 + oy})">
        <path d="M-44 2 Q-20 -10 0 2 T44 0" fill="none" stroke="#8f4a0e" stroke-width="5.2" stroke-linecap="round"/>
        <path d="M-44 2 Q-20 -10 0 2 T44 0" fill="none" stroke="#e39234" stroke-width="2.8" stroke-linecap="round"/>
      </g>`;
  } else if (artKey === 'pickles') {
    inner = `
      <g transform="translate(190, ${134 + oy})">
        <ellipse cx="-26" cy="2" rx="14" ry="8" fill="#528a29" stroke="#274710" stroke-width="1.3"/>
        <ellipse cx="0" cy="-2" rx="14" ry="8" fill="#639e36" stroke="#274710" stroke-width="1.3"/>
        <ellipse cx="26" cy="2" rx="14" ry="8" fill="#528a29" stroke="#274710" stroke-width="1.3"/>
      </g>`;
  } else if (artKey === 'lettuce') {
    inner = `
      <g transform="translate(190, 142)">
        <path d="M-74 2 C-66 -10 -46 -6 -36 0 C-22 -10 0 -6 14 0 C30 -10 54 -6 72 2 C58 10 34 8 16 10 C-6 8 -50 12 -74 2 Z" fill="#4ac254" stroke="#216b27" stroke-width="1.4" stroke-linejoin="round"/>
      </g>`;
  } else if (artKey === 'ice_cubes') {
    inner = `
      <g transform="translate(190, 114)">
        <rect x="-24" y="-8" width="20" height="20" rx="5" transform="rotate(-14 -14 2)" fill="#e3f6ff" stroke="#6db7de" stroke-width="1.4" opacity="0.92"/>
        <rect x="2" y="-12" width="20" height="20" rx="5" transform="rotate(14 12 -2)" fill="#d1effc" stroke="#5ba8d1" stroke-width="1.4" opacity="0.92"/>
      </g>`;
  } else if (artKey === 'lime_wedge') {
    inner = `
      <g transform="translate(222, 86) rotate(22)">
        <path d="M-16 0 C-14 16 14 16 16 0 Z" fill="#328a24" stroke="#1b5412" stroke-width="1.4"/>
        <path d="M-12 0 C-10 11 10 11 12 0 Z" fill="#a8eb5e"/>
      </g>`;
  } else if (artKey === 'ice_cream') {
    inner = `
      <g transform="translate(${224 + ox * 0.2}, 134)">
        <circle cx="0" cy="-6" r="18" fill="#fff7e2" stroke="#c7b287" stroke-width="1.4"/>
        <path d="M0 -24 Q-4 -30 -9 -27 M0 -24 Q5 -31 9 -27" fill="none" stroke="#3c9142" stroke-width="2" stroke-linecap="round"/>
      </g>`;
  } else if (artKey === 'whipped_cream') {
    inner = `
      <g transform="translate(${176 + ox * 0.25}, 130)">
        <path d="M-16 10 C-18 2 -10 -4 -4 -6 C-5 -14 0 -20 4 -20 C3 -12 10 -8 10 -2 C18 0 18 10 12 10 Z" fill="#ffffff" stroke="#c9ccd4" stroke-width="1.4"/>
      </g>`;
  } else if (artKey === 'chilled_glass') {
    inner = `
      <g transform="translate(232, 114)">
        <circle cx="0" cy="0" r="13" fill="#e8f6ff" stroke="#7fb9db" stroke-width="1.3"/>
        <path d="M-5 0 L-1 4 L6 -4" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </g>`;
  } else {
    inner = `
      <g transform="translate(${190 + ox}, ${134 + oy})">
        <ellipse cx="0" cy="0" rx="22" ry="9" fill="#9c6b43" stroke="#573519" stroke-width="1.3" opacity="0.92"/>
      </g>`;
  }

  return animate ? `<g class="svg-tortilla-drop">${inner}</g>` : `<g>${inner}</g>`;
}

function renderPlateTossLayerSVG(artKey, animate) {
  if (artKey === 'chiles') {
    return renderJalapenoRingsSVG([
      [136, 146, 8.5, 6.2, -16], [168, 136, 9, 6.5, 14], [198, 148, 9, 6.5, -8],
      [230, 138, 8.5, 6.2, 18],  [252, 150, 8, 5.8, -12], [154, 156, 8.2, 6, 10],
    ], animate, false);
  }
  if (artKey === 'cebolla') {
    return renderOnionCubesSVG([
      [142, 142, 6.5, -16], [166, 152, 6.2, 18], [188, 136, 6.8, 10],
      [214, 148, 6.5, -12], [238, 138, 6.2, 22], [176, 144, 6.4, -8],
    ], animate, false);
  }
  if (artKey === 'cilantro' || artKey === 'mint_leaves') {
    return renderCilantroLeavesSVG([
      [148, 138, 0.9, -20, 0], [178, 130, 1, 18, 1], [206, 134, 0.95, -12, 0],
      [234, 140, 0.92, 24, 1], [190, 148, 1.0, 8, 0], [162, 150, 0.88, -16, 1],
    ], animate, false);
  }
  if (artKey === 'tomate') {
    return renderTomatoCubesSVG([
      [140, 144, 7, -14], [168, 152, 7.2, 16], [196, 138, 7, 12],
      [226, 150, 7.2, -18], [248, 142, 6.8, 10], [184, 150, 6.6, -8],
    ], animate, false);
  }
  if (artKey === 'mushrooms') {
    const mkM = (x, y, rot) => `
      <g transform="translate(${x}, ${y}) rotate(${rot})">
        <path d="M-8 0 C-8 -9 8 -9 8 0 L2.5 0 L3 7 L-3 7 L-2.5 0 Z" fill="#9c714d" stroke="#523720" stroke-width="1.15"/>
      </g>`;
    return wrapVectorWaves([
      `${mkM(144, 144, -18)}${mkM(224, 148, 16)}`,
      `${mkM(176, 136, 12)}${mkM(246, 140, -14)}`,
      `${mkM(202, 144, -6)}${mkM(162, 152, 20)}`,
    ], animate, false);
  }
  if (artKey === 'parmesan') {
    const mkCurl = (x, y, rot) => `<path d="M-6 0 Q0 -5 6 0" transform="translate(${x}, ${y}) rotate(${rot})" fill="none" stroke="#ffe599" stroke-width="3.2" stroke-linecap="round"/>`;
    return wrapVectorWaves([
      `${mkCurl(148, 142, -14)}${mkCurl(216, 146, 20)}`,
      `${mkCurl(176, 136, 8)}${mkCurl(238, 138, -18)}`,
      `${mkCurl(194, 148, 12)}${mkCurl(160, 150, -8)}`,
    ], animate, false);
  }
  if (artKey === 'potato_sticks') {
    const mkStick = (x, y, rot) => `<line x1="-12" y1="0" x2="12" y2="0" transform="translate(${x}, ${y}) rotate(${rot})" stroke="#ffd257" stroke-width="3" stroke-linecap="round"/>`;
    return wrapVectorWaves([
      `${mkStick(148, 146, -24)}${mkStick(224, 144, 28)}`,
      `${mkStick(182, 138, 16)}${mkStick(242, 150, -18)}`,
      `${mkStick(204, 146, -12)}${mkStick(164, 152, 22)}`,
    ], animate, false);
  }
  if (artKey === 'shrimp') {
    const mkSh = (x, y, rot) => `<path d="M8 -5 C-2 -7 -8 0 -5 7 C-2 10 3 8 2 4" transform="translate(${x}, ${y}) rotate(${rot})" fill="none" stroke="#f57c5b" stroke-width="5.5" stroke-linecap="round"/>`;
    return wrapVectorWaves([
      `${mkSh(150, 144, -15)}${mkSh(228, 146, 20)}`,
      `${mkSh(190, 138, 8)}`,
      `${mkSh(170, 152, -22)}${mkSh(210, 150, 12)}`,
    ], animate, false);
  }
  if (artKey === 'berry_compote') {
    const mkB = (x, y, fill) => `<circle cx="${x}" cy="${y}" r="5.5" fill="${fill}" stroke="#3b0b1d" stroke-width="1"/>`;
    return wrapVectorWaves([
      `${mkB(156, 144, '#d62442')}${mkB(218, 146, '#3a408f')}`,
      `${mkB(188, 136, '#e63250')}${mkB(236, 140, '#d62442')}`,
      `${mkB(172, 150, '#3a408f')}${mkB(204, 148, '#e63250')}`,
    ], animate, false);
  }
  // Red onion / chili flakes / kimch / pikliz / generic scatter
  const dotColor = artKey === 'red_onion' ? '#a63682' : artKey === 'chili_flakes' ? '#d92316' : '#f27a24';
  const coords = [[148, 144], [172, 136], [192, 146], [216, 138], [238, 148], [162, 152]];
  const groups = [0, 1, 2].map(w => coords.filter((_, i) => i % 3 === w)
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6" fill="${dotColor}" stroke="#ffffff" stroke-width="0.8"/>`).join(''));
  return wrapVectorWaves(groups, animate, false);
}

function renderPlateSauceLayerSVG(artKey, offsetIdx, animate) {
  const p = PINCH_BOTTLE_PALETTES[artKey] || PINCH_BOTTLE_PALETTES.aioli;
  const dy = (offsetIdx % 3) * 5 - 3;
  const path = `M 118 ${146 + dy} Q 134 ${131 + dy}, 150 ${148 + dy} T 182 ${147 + dy} T 214 ${147 + dy} T 246 ${146 + dy} T 264 ${145 + dy}`;
  return `
    <g class="svg-sauce-layer${animate ? ' svg-sauce-anim sauce-dog' : ''}">
      <path class="svg-sauce-stroke" pathLength="100" d="${path}" fill="none" stroke="${p.bodyEdge}" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.24"/>
      <path class="svg-sauce-stroke" pathLength="100" d="${path}" fill="none" stroke="${p.stream}" stroke-width="6.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path class="svg-sauce-stroke" pathLength="100" d="${path}" fill="none" stroke="${p.highlight}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.72"/>
    </g>
  `;
}

function buildPinchConfiguratorPlateSVG(dish, baseItems, removedList, extrasList, animAction, uid) {
  const archetype = getDishPlateArchetype(dish);
  const removedSet = new Set(removedList || []);
  const activeBase = (baseItems || []).filter(b => !removedSet.has(b.label));

  const layers = [
    ...activeBase.map((b, i) => ({ uidKey: `base:${b.label}`, artKey: b.artKey, animKind: b.animKind, slotIdx: i })),
    ...(extrasList || []).map((ex, i) => ({ uidKey: `extra:${ex.id}`, artKey: ex.artKey, animKind: ex.animKind, slotIdx: activeBase.length + i })),
  ];

  const dropLayers  = layers.filter(l => l.animKind === 'drop');
  const tossLayers  = layers.filter(l => l.animKind === 'toss');
  const sauceLayers = layers.filter(l => l.animKind === 'sauce');

  const bounceClass = (animAction && animAction.animKind === 'drop') ? ' dish-impact-bounce' : '';
  const showTossBurst = Boolean(animAction && animAction.animKind === 'toss');
  const activeBottle = (animAction && animAction.animKind === 'sauce') ? animAction.artKey : null;
  const isHotDish = !['drink', 'dessert', 'salad'].includes(archetype);

  return `
    <div class="vector-plate-stage dc-plate-stage" data-uid="${uid}">
      <svg class="food-plate-svg" viewBox="0 0 380 232" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="${uid}_plateGrad" cx="44%" cy="38%" r="64%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="70%" stop-color="#f7f1e8"/>
            <stop offset="100%" stop-color="#e5dbcd"/>
          </radialGradient>
          <radialGradient id="${uid}_plateWell" cx="50%" cy="46%" r="58%">
            <stop offset="0%" stop-color="#faf6f0"/>
            <stop offset="100%" stop-color="#efe6d9"/>
          </radialGradient>
        </defs>

        <g class="svg-dish-stack${bounceClass}">
          ${renderCeramicPlateSVG(190, 156, 144, 62, uid)}
          ${renderBaseDishArchetypeSVG(dish, archetype, uid)}
          ${dropLayers.map((l, i) => renderPlateDropLayerSVG(l.artKey, i, Boolean(animAction && animAction.uidKey === l.uidKey), uid)).join('')}
          ${tossLayers.map(l => renderPlateTossLayerSVG(l.artKey, Boolean(animAction && animAction.uidKey === l.uidKey))).join('')}
          ${sauceLayers.map((l, i) => renderPlateSauceLayerSVG(l.artKey, i, Boolean(animAction && animAction.uidKey === l.uidKey))).join('')}
        </g>

        ${isHotDish ? renderSteamWispsSVG(190, 96, Boolean(animAction)) : ''}
        ${showTossBurst ? renderHandTossBurstSVG(190, 38, '#53a649') : ''}
        ${activeBottle ? renderConfiguratorBottleSVG(activeBottle, uid) : ''}
      </svg>
    </div>
  `;
}

function getPinchDetailUnitPrice(dish) {
  if (!dish) return 0;
  const extrasSum = (pinchDetailExtras || []).reduce((sum, ex) => sum + (Number(ex.price) || 0), 0);
  return Math.round(((Number(dish.price) || 0) + extrasSum) * 100) / 100;
}

function openDishConfigurator() {
  const dish = PINCH_MENU_ITEMS.find(d => d.id === pinchDetailDishId);
  const modal = document.getElementById('dish-configurator-modal');
  if (!dish || !modal) return;
  if (isPinchDishSoldOut(dish.id)) {
    showToast(`${dish.name} está agotado por hoy`);
    return;
  }

  dcDraftRemoved     = [...pinchDetailRemoved];
  dcDraftExtras      = pinchDetailExtras.map(e => ({ ...e }));
  dcCurrentBaseItems = getDishBaseIngredients(dish);
  dcLastAction       = null;
  dcLastTappedKey    = null;
  dcOpen             = true;

  const titleEl = document.getElementById('dc-title');
  if (titleEl) titleEl.textContent = dish.name;

  renderDishConfigurator();

  modal.classList.remove('hidden');
  const scrollBody = document.getElementById('dc-scroll-body');
  requestAnimationFrame(() => {
    modal.classList.add('open');
    if (scrollBody) scrollBody.scrollTop = 0;
  });
  hapticTap(6);
}

function closeDishConfigurator(commit = false) {
  const modal = document.getElementById('dish-configurator-modal');
  if (!modal || modal.classList.contains('hidden')) return;

  if (commit) {
    pinchDetailRemoved = [...dcDraftRemoved];
    pinchDetailExtras  = dcDraftExtras.map(e => ({ ...e }));
    refreshDishDetailCustomizationUI();
    refreshDishDetailActionBar();
  }

  dcOpen = false;
  modal.classList.remove('open');
  setTimeout(() => {
    if (!modal.classList.contains('open')) {
      modal.classList.add('hidden');
    }
  }, 240);
}

function applyDishConfigurator() {
  closeDishConfigurator(true);
  hapticTap(10);
  const modsCount = pinchDetailRemoved.length + pinchDetailExtras.length;
  if (modsCount > 0) {
    showToast(`✓ Personalización aplicada (${modsCount} ${modsCount === 1 ? 'ajuste' : 'ajustes'})`);
  }
}

function resetDishConfiguratorDraft() {
  dcDraftRemoved  = [];
  dcDraftExtras   = [];
  dcLastAction    = null;
  dcLastTappedKey = null;
  hapticTap(6);
  showConfiguratorFloatFeedback('Receta original restaurada', 'neutral');
  renderDishConfigurator();
}

function showConfiguratorFloatFeedback(text, tone = 'add') {
  const el = document.getElementById('dc-float-feedback');
  if (!el) return;
  if (dcFloatTimer) clearTimeout(dcFloatTimer);
  el.innerHTML = `<span class="dc-float-pill is-${tone}">${escapeHTML(text)}</span>`;
  dcFloatTimer = setTimeout(() => {
    if (el) el.innerHTML = '';
  }, 1150);
}

function toggleConfigBaseIngredient(idx) {
  const item = dcCurrentBaseItems[idx];
  if (!item) return;

  const pos = dcDraftRemoved.indexOf(item.label);
  dcLastTappedKey = `base:${idx}`;
  if (pos === -1) {
    dcDraftRemoved.push(item.label);
    dcLastAction = null;
    showConfiguratorFloatFeedback(`Sin ${item.label}`, 'remove');
  } else {
    dcDraftRemoved.splice(pos, 1);
    dcLastAction = {
      uidKey: `base:${item.label}`,
      artKey: item.artKey,
      animKind: item.animKind,
      ts: Date.now(),
    };
    showConfiguratorFloatFeedback(`+ ${item.label}`, 'add');
  }
  hapticTap(8);
  renderDishConfigurator();
}

function toggleConfigExtra(extraId) {
  const dish = PINCH_MENU_ITEMS.find(d => d.id === pinchDetailDishId);
  if (!dish) return;
  const catalog = getDishExtrasCatalog(dish);
  const extra   = catalog.find(e => e.id === extraId);
  if (!extra) return;

  const pos = dcDraftExtras.findIndex(e => e.id === extraId);
  dcLastTappedKey = `extra:${extraId}`;
  if (pos === -1) {
    dcDraftExtras.push({ id: extra.id, name: extra.name, price: extra.price, artKey: extra.artKey, animKind: extra.animKind });
    dcLastAction = {
      uidKey: `extra:${extra.id}`,
      artKey: extra.artKey,
      animKind: extra.animKind,
      ts: Date.now(),
    };
    const priceSuffix = extra.price > 0 ? ` · +${formatMenuPrice(extra.price)}` : '';
    showConfiguratorFloatFeedback(`+1 ${extra.name}${priceSuffix}`, 'add');
  } else {
    dcDraftExtras.splice(pos, 1);
    dcLastAction = null;
    showConfiguratorFloatFeedback(`Quitado: ${extra.name}`, 'remove');
  }
  hapticTap(10);
  renderDishConfigurator();
}

function renderDishConfigurator() {
  const dish = PINCH_MENU_ITEMS.find(d => d.id === pinchDetailDishId);
  if (!dish) return;

  const canvasEl   = document.getElementById('dc-plate-canvas');
  const pillsEl    = document.getElementById('dc-stage-pills');
  const priceEl    = document.getElementById('dc-stage-price');
  const baseGroup  = document.getElementById('dc-base-group');
  const baseGrid   = document.getElementById('dc-base-grid');
  const extTitleEl = document.getElementById('dc-extras-title');
  const extHintEl  = document.getElementById('dc-extras-hint');
  const extGrid    = document.getElementById('dc-extras-grid');
  const applyBtn   = document.getElementById('dc-apply-btn');
  const resetBtn   = document.getElementById('dc-reset-btn');

  const extrasSum = dcDraftExtras.reduce((s, e) => s + (Number(e.price) || 0), 0);
  const totalUnit = Math.round(((Number(dish.price) || 0) + extrasSum) * 100) / 100;

  if (canvasEl) {
    canvasEl.innerHTML = buildPinchConfiguratorPlateSVG(
      dish,
      dcCurrentBaseItems,
      dcDraftRemoved,
      dcDraftExtras,
      dcLastAction,
      `dc_${++plateSvgUidCounter}`
    );
  }

  if (pillsEl) {
    const chips = [
      ...dcDraftExtras.map(e => `<span class="dc-status-chip is-extra">+ ${escapeHTML(e.name)}</span>`),
      ...dcDraftRemoved.map(r => `<span class="dc-status-chip is-sin">Sin ${escapeHTML(r)}</span>`),
    ];
    pillsEl.innerHTML = chips.length > 0
      ? chips.join('')
      : '<span class="dc-status-chip is-neutral">Receta original de Pinch</span>';
  }

  if (priceEl) priceEl.textContent = formatMenuPrice(totalUnit);

  if (baseGroup && baseGrid) {
    if (dcCurrentBaseItems.length > 0) {
      baseGroup.classList.remove('hidden');
      baseGrid.innerHTML = dcCurrentBaseItems.map((item, idx) => {
        const isRemoved  = dcDraftRemoved.includes(item.label);
        const justTapped = dcLastTappedKey === `base:${idx}`;
        return `
          <button
            type="button"
            class="dc-ing-card${isRemoved ? ' removed' : ' included'}${justTapped ? ' just-tapped' : ''}"
            onclick="toggleConfigBaseIngredient(${idx})"
          >
            <span class="dc-ing-badge">${isRemoved ? '✕' : '✓'}</span>
            <div class="dc-ing-art">${getPinchConfigArtSVG(item.artKey)}</div>
            <div class="dc-ing-texts">
              <span class="dc-ing-name">${escapeHTML(item.label)}</span>
              <span class="dc-ing-sub">${isRemoved ? 'SIN' : 'Incluido'}</span>
            </div>
          </button>
        `;
      }).join('');
    } else {
      baseGroup.classList.add('hidden');
      baseGrid.innerHTML = '';
    }
  }

  if (extGrid) {
    const extrasCatalog = getDishExtrasCatalog(dish);
    if (extTitleEl && extHintEl) {
      if (dish.category === 'drinks') {
        extTitleEl.textContent = 'PREFERENCIA DE SERVICIO Y HIELO';
        extHintEl.textContent  = 'Toca para personalizar tu bebida';
      } else {
        extTitleEl.textContent = 'AGREGA EXTRAS Y TOPPINGS';
        extHintEl.textContent  = 'Toca para sumar al plato';
      }
    }
    extGrid.innerHTML = extrasCatalog.map(ex => {
      const isSelected = dcDraftExtras.some(d => d.id === ex.id);
      const justTapped = dcLastTappedKey === `extra:${ex.id}`;
      return `
        <button
          type="button"
          class="dc-ing-card dc-extra-card${isSelected ? ' selected' : ''}${justTapped ? ' just-tapped' : ''}"
          onclick="toggleConfigExtra('${ex.id}')"
        >
          <span class="dc-ing-badge">${isSelected ? '✓' : '+'}</span>
          <div class="dc-ing-art">${getPinchConfigArtSVG(ex.artKey)}</div>
          <div class="dc-ing-texts">
            <span class="dc-ing-name">${escapeHTML(ex.name)}</span>
            <span class="dc-ing-sub is-price">${ex.price > 0 ? `+${formatMenuPrice(ex.price)}` : 'Incluido'}</span>
          </div>
        </button>
      `;
    }).join('');
  }

  const hasChanges = dcDraftRemoved.length > 0 || dcDraftExtras.length > 0;
  if (applyBtn) {
    applyBtn.textContent = hasChanges
      ? `Listo · Aplicar cambios (${formatMenuPrice(totalUnit)})`
      : `Listo · Mantener receta (${formatMenuPrice(totalUnit)})`;
  }
  if (resetBtn) {
    resetBtn.disabled = !hasChanges;
  }

  dcLastAction    = null;
  dcLastTappedKey = null;
}

function refreshDishDetailCustomizationUI() {
  const dish = PINCH_MENU_ITEMS.find(d => d.id === pinchDetailDishId);
  if (!dish) return;

  const unitPrice = getPinchDetailUnitPrice(dish);
  const priceEl   = document.getElementById('dd-price');
  const ingEl     = document.getElementById('dd-ingredients-list');
  const triggerEl = document.getElementById('dd-configurator-trigger');
  const clSubEl   = document.getElementById('dd-cl-sub');
  const clPillsEl = document.getElementById('dd-cl-pills');
  const clArrowEl = document.getElementById('dd-cl-arrow');

  if (priceEl) priceEl.textContent = formatMenuPrice(unitPrice);

  if (ingEl) {
    const baseItems = getDishBaseIngredients(dish);
    const removedSet = new Set(pinchDetailRemoved || []);
    let chipsHtml = '';

    if (baseItems.length > 0) {
      chipsHtml = (dish.ingredients || []).map(raw => {
        const clean = String(raw || '').trim();
        const norm  = normalizeSpanishQuery(clean);
        if (PINCH_SPLITTABLE_COMPOUND[norm]) {
          return PINCH_SPLITTABLE_COMPOUND[norm].map(part => {
            const isRem = removedSet.has(part);
            return `<span class="dd-ingredient-chip${isRem ? ' dd-ing-removed' : ''}">${isRem ? `Sin ${escapeHTML(part)}` : escapeHTML(part)}</span>`;
          }).join('');
        }
        const isRem = removedSet.has(clean);
        return `<span class="dd-ingredient-chip${isRem ? ' dd-ing-removed' : ''}">${isRem ? `Sin ${escapeHTML(clean)}` : escapeHTML(clean)}</span>`;
      }).join('');
    } else {
      chipsHtml = (dish.ingredients || []).map(ing =>
        `<span class="dd-ingredient-chip">${escapeHTML(ing)}</span>`
      ).join('');
    }

    const extrasChipsHtml = (pinchDetailExtras || []).map(ex =>
      `<span class="dd-ingredient-chip dd-ing-extra">+ ${escapeHTML(ex.name)}${ex.price > 0 ? ` (${formatMenuPrice(ex.price)})` : ''}</span>`
    ).join('');

    ingEl.innerHTML = chipsHtml + extrasChipsHtml;
  }

  const extCount = (pinchDetailExtras || []).length;
  const sinCount = (pinchDetailRemoved || []).length;
  const hasCustom = extCount > 0 || sinCount > 0;
  const extrasSum = (pinchDetailExtras || []).reduce((s, e) => s + (Number(e.price) || 0), 0);

  if (triggerEl) {
    triggerEl.classList.toggle('has-custom', hasCustom);
    triggerEl.disabled = isPinchDishSoldOut(dish.id);
  }
  if (clSubEl) {
    if (hasCustom) {
      const parts = [];
      if (extCount > 0) parts.push(`${extCount} ${extCount === 1 ? 'extra' : 'extras'}`);
      if (sinCount > 0) parts.push(`${sinCount} quitado${sinCount === 1 ? '' : 's'}`);
      if (extrasSum > 0) parts.push(`+${formatMenuPrice(extrasSum)}`);
      clSubEl.textContent = parts.join(' · ');
    } else if (dish.category === 'drinks') {
      clSubEl.textContent = 'Agrega vaso con hielo, limón fresco o menta';
    } else if (dish.category === 'desserts') {
      clSubEl.textContent = 'Agrega helado extra, crema batida o compota';
    } else {
      clSubEl.textContent = 'Quita ingredientes o agrega extras (tocino, aguacate, salsas...)';
    }
  }
  if (clPillsEl) {
    if (hasCustom) {
      clPillsEl.classList.remove('hidden');
      clPillsEl.innerHTML = [
        ...(pinchDetailExtras || []).map(e => `<span class="dd-cl-pill is-extra">+${escapeHTML(e.name)}</span>`),
        ...(pinchDetailRemoved || []).map(r => `<span class="dd-cl-pill is-sin">Sin ${escapeHTML(r)}</span>`),
      ].join('');
    } else {
      clPillsEl.classList.add('hidden');
      clPillsEl.innerHTML = '';
    }
  }
  if (clArrowEl) {
    clArrowEl.textContent = hasCustom ? 'Editar →' : 'Abrir →';
  }
}

function openDishDetailModal(dishId) {
  const dish = PINCH_MENU_ITEMS.find(d => d.id === dishId);
  if (!dish) return;
  const modal = document.getElementById('dish-detail-modal');
  if (!modal) return;

  const scroller = document.getElementById('client-scroll-container');
  pinchSavedScrollTop = scroller ? scroller.scrollTop : 0;

  pinchDetailDishId   = dish.id;
  pinchDetailQty      = 1;
  pinchDetailMediaTab = 'photos';
  pinchDetailOption   = dish.optionGroup && dish.optionGroup.choices.length > 0
    ? dish.optionGroup.choices[0]
    : '';
  pinchDetailRemoved  = [];
  pinchDetailExtras   = [];
  dcOpen              = false;
  const cfgModal = document.getElementById('dish-configurator-modal');
  if (cfgModal) {
    cfgModal.classList.remove('open');
    cfgModal.classList.add('hidden');
  }

  const catMeta = PINCH_MENU_CATEGORIES.find(c => c.id === dish.category);

  const catPillEl   = document.getElementById('dd-cat-pill');
  const titleEl     = document.getElementById('dd-title');
  const fullDescEl  = document.getElementById('dd-full-desc');
  const badgesEl    = document.getElementById('dd-badges-row');
  const optBlockEl  = document.getElementById('dd-options-block');
  const optLabelEl  = document.getElementById('dd-options-label');
  const optChipsEl  = document.getElementById('dd-options-chips');
  const noteInputEl = document.getElementById('dd-special-note');
  const scrollBody  = modal.querySelector('.dd-scroll-body');

  if (noteInputEl) noteInputEl.value = '';
  if (typeof applyCustomerPrefsToDishDetail === 'function') {
    applyCustomerPrefsToDishDetail(dish);
  }

  if (catPillEl) catPillEl.textContent = catMeta ? catMeta.title : 'Pinch Kitchen+Bar';
  if (titleEl)   titleEl.textContent   = dish.name;
  if (fullDescEl) fullDescEl.textContent = dish.fullDesc;

  if (badgesEl) {
    const baseB = (dish.badges || []).map(b => {
      const tone = PINCH_BADGE_TONES[b] || 'tone-neutral';
      return `<span class="pinch-badge ${tone}">${escapeHTML(b)}</span>`;
    }).join('');
    const prefInfo = typeof getDishPreferenceStatus === 'function' ? getDishPreferenceStatus(dish) : { alerts: [], compatLabel: '' };
    const prefB = [
      ...prefInfo.alerts.map(a => `<span class="pinch-badge tone-pref-warn">${escapeHTML(a)}</span>`),
      ...(prefInfo.alerts.length === 0 && prefInfo.compatLabel ? [`<span class="pinch-badge tone-pref-ok">${escapeHTML(prefInfo.compatLabel)}</span>`] : []),
    ].join('');
    badgesEl.innerHTML = baseB + prefB;
  }

  if (optBlockEl && optLabelEl && optChipsEl) {
    if (dish.optionGroup && Array.isArray(dish.optionGroup.choices)) {
      optBlockEl.classList.remove('hidden');
      optLabelEl.textContent = dish.optionGroup.label.toUpperCase();
      optChipsEl.innerHTML = dish.optionGroup.choices.map(choice => `
        <button
          type="button"
          class="dd-option-chip${pinchDetailOption === choice ? ' selected' : ''}"
          onclick="selectDishDetailOption('${escapeHTML(choice)}')"
        >${escapeHTML(choice)}</button>
      `).join('');
    } else {
      optBlockEl.classList.add('hidden');
      optChipsEl.innerHTML = '';
    }
  }

  renderDishDetailMedia();
  refreshDishDetailCustomizationUI();
  refreshDishDetailActionBar();
  bindDishDetailSwipeDismiss();

  modal.classList.remove('hidden');
  requestAnimationFrame(() => {
    modal.classList.add('open');
    if (scrollBody) scrollBody.scrollTop = 0;
  });
  hapticTap(6);
}

function renderDishDetailMedia() {
  const dish = PINCH_MENU_ITEMS.find(d => d.id === pinchDetailDishId);
  const heroEl = document.getElementById('dd-media-hero');
  if (!dish || !heroEl) return;

  const cat = PINCH_MENU_CATEGORIES.find(c => c.id === dish.category);

  let innerHtml = '';
  if (pinchDetailMediaTab === 'video') {
    if (dish.videoUrl) {
      innerHtml = `<video class="dd-real-video" src="${escapeHTML(dish.videoUrl)}" controls playsinline autoplay muted loop></video>`;
    } else {
      innerHtml = `
        <div class="dd-video-placeholder">
          <div class="dd-video-play-circle" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="8 5 19 12 8 19 8 5"/></svg>
          </div>
          <span class="dd-video-kicker">REEL DEL CHEF · PRÓXIMAMENTE</span>
          <p class="dd-video-caption">${escapeHTML(dish.name)} · Emplatado en cocina Pinch Kitchen+Bar</p>
        </div>
      `;
    }
  } else {
    if (Array.isArray(dish.photos) && dish.photos.length > 0) {
      innerHtml = `<img class="dd-real-photo" src="${escapeHTML(dish.photos[0])}" alt="${escapeHTML(dish.name)}" />`;
    } else {
      innerHtml = `
        ${buildPinchPlaceholderArt(dish, cat, 'hero')}
        <div class="dd-photo-dots" aria-hidden="true">
          <span class="active"></span><span></span><span></span>
        </div>
      `;
    }
  }

  heroEl.innerHTML = `
    ${innerHtml}
    <div class="dd-media-switcher" role="tablist">
      <button type="button" class="dd-media-tab${pinchDetailMediaTab === 'photos' ? ' active' : ''}" onclick="switchDishDetailMedia('photos')">
        ${uiIcon('camera', 'sm')} <span>Fotos</span>
      </button>
      <button type="button" class="dd-media-tab${pinchDetailMediaTab === 'video' ? ' active' : ''}" onclick="switchDishDetailMedia('video')">
        ${uiIcon('video', 'sm')} <span>Video</span>
      </button>
    </div>
  `;
}

function switchDishDetailMedia(tab) {
  pinchDetailMediaTab = tab === 'video' ? 'video' : 'photos';
  hapticTap(5);
  renderDishDetailMedia();
}

function selectDishDetailOption(choice) {
  pinchDetailOption = choice;
  hapticTap(5);
  document.querySelectorAll('#dd-options-chips .dd-option-chip').forEach(btn => {
    btn.classList.toggle('selected', (btn.textContent || '').trim() === choice);
  });
}

function appendDishQuickNote(phrase) {
  const inp = document.getElementById('dd-special-note');
  if (!inp) return;
  const cur = inp.value.trim();
  if (cur.toLowerCase().includes(phrase.toLowerCase())) return;
  inp.value = cur ? `${cur}, ${phrase}` : phrase;
  hapticTap(5);
}

function changeDishDetailQty(delta) {
  pinchDetailQty = Math.max(1, Math.min(25, (pinchDetailQty || 1) + delta));
  hapticTap(6);
  refreshDishDetailActionBar();
}

function refreshDishDetailStockState() {
  if (!pinchDetailDishId) return;
  refreshDishDetailCustomizationUI();
  refreshDishDetailActionBar();
}

function refreshDishDetailActionBar() {
  const dish = PINCH_MENU_ITEMS.find(d => d.id === pinchDetailDishId);
  if (!dish) return;
  const qtyEl   = document.getElementById('dd-qty-val');
  const minusEl = document.getElementById('dd-qty-minus');
  const addBtn  = document.getElementById('dd-add-btn');
  const isOut   = isPinchDishSoldOut(dish.id);
  const unitPrice = getPinchDetailUnitPrice(dish);

  if (qtyEl)   qtyEl.textContent = String(pinchDetailQty);
  if (minusEl) minusEl.disabled = pinchDetailQty <= 1 || isOut;
  if (addBtn) {
    addBtn.disabled = isOut;
    addBtn.textContent = isOut
      ? 'Agotado temporalmente'
      : `+ Agregar al pedido · ${formatMenuPrice(unitPrice * pinchDetailQty)}`;
  }
}

function addDishFromDetailModal() {
  const dish = PINCH_MENU_ITEMS.find(d => d.id === pinchDetailDishId);
  if (!dish) return;
  if (isPinchDishSoldOut(dish.id)) {
    showToast(`${dish.name} está agotado por hoy`);
    return;
  }

  unlockAudioContext();
  const noteEl      = document.getElementById('dd-special-note');
  const note        = noteEl ? noteEl.value.trim() : '';
  const option      = pinchDetailOption || '';
  const qty         = Math.max(1, pinchDetailQty || 1);
  const unitPrice   = getPinchDetailUnitPrice(dish);
  const extrasCopy  = (pinchDetailExtras || []).map(e => ({ id: e.id, name: e.name, price: e.price }));
  const removedCopy = [...(pinchDetailRemoved || [])];

  const keyParts = [`dish:${dish.id}`];
  if (option) keyParts.push(`opt:${option}`);
  if (extrasCopy.length > 0) keyParts.push(`ext:${extrasCopy.map(e => e.id).sort().join(',')}`);
  if (removedCopy.length > 0) keyParts.push(`sin:${removedCopy.map(r => r.toLowerCase()).sort().join(',')}`);
  if (note) keyParts.push(`note:${note.toLowerCase()}`);
  const itemKey = keyParts.join('|');

  const existing = cartItems.find(it => it.key === itemKey);
  if (existing) {
    existing.qty += qty;
  } else {
    cartItems.push({
      key: itemKey,
      dishId: dish.id,
      category: dish.category,
      name: dish.name,
      emoji: dish.emoji,
      basePrice: dish.price,
      price: unitPrice,
      qty,
      station: dish.category === 'drinks' ? 'drink' : dish.category,
      option,
      extras: extrasCopy,
      removed: removedCopy,
      note,
    });
  }

  hapticTap(14);
  renderCart();
  renderPinchMenu();
  showToast(`✓ ${qty > 1 ? qty + '× ' : ''}${dish.name} (${formatMenuPrice(unitPrice * qty)})`);
  closeDishDetailModal();
}

function closeDishDetailModal() {
  closeDishConfigurator(false);
  const modal = document.getElementById('dish-detail-modal');
  if (!modal || modal.classList.contains('hidden')) return;

  const targetScroll = pinchSavedScrollTop;
  pinchDetailDishId = null;
  modal.classList.remove('open');

  const scroller = document.getElementById('client-scroll-container');
  pinchScrollSpyLockedUntil = Date.now() + 300;
  requestAnimationFrame(() => {
    if (scroller) scroller.scrollTop = targetScroll;
  });

  setTimeout(() => {
    if (!modal.classList.contains('open')) {
      modal.classList.add('hidden');
      if (scroller) scroller.scrollTop = targetScroll;
    }
  }, 240);
}

(function init() {
  applyTenantBranding();
  loadPersistedOrders();
  initCloudWebSockets();
  initFirebaseIfConfigured();

  const vistaParam  = (urlParams.get('vista') || urlParams.get('view') || window.location.hash.replace('#', '')).toLowerCase();
  const pathClean   = String(window.location.pathname || '').replace(/\/+$/, '').toLowerCase();
  const isAdminLink = (
    vistaParam === 'cocina' ||
    vistaParam === 'kitchen' ||
    vistaParam === 'kds' ||
    vistaParam === 'admin' ||
    vistaParam === 'restaurante' ||
    (typeof urlParams.has === 'function' && (urlParams.has('admin') || urlParams.has('cocina'))) ||
    pathClean.endsWith('/admin') ||
    pathClean.endsWith('/cocina')
  );

  if (isAdminLink) {
    showView('kitchen');
    return;
  }

  const rawMesaParam  = urlParams.get('mesa') || '';
  const mesaParam     = normalizeMesaInputParam(rawMesaParam);
  const invitaParam   = (urlParams.get('invita') || urlParams.get('invite') || '').trim();
  const modoParam     = (urlParams.get('modo') || urlParams.get('mode') || '').toLowerCase();
  if (typeof loadCustomerPrefs === 'function') loadCustomerPrefs();

  if (mesaParam) {
    presetTableFromURL = mesaParam;
    try { localStorage.setItem(storageKey('last-table'), mesaParam); } catch (e) {}
  }
  if (invitaParam) {
    invitedByGuest = invitaParam;
    inviteWelcomeDismissed = false;
  }

  if (mesaParam || modoParam === 'mesa' || modoParam === 'dine_in') {
    setFulfillmentMode('dine_in');
  } else if (modoParam === 'domicilio' || modoParam === 'delivery' || modoParam === 'envio') {
    setFulfillmentMode('delivery');
  } else {
    // Link general de clientes (Instagram / WhatsApp / Google Maps): inicia directo en Pickup
    setFulfillmentMode('pickup');
  }

  // Si el cliente recarga mientras espera su pedido activo y no abrió un link de modo distinto, ir directo al rastreador
  const activeOrder = activeTrackedOrderId ? orders.find(o => o.id === activeTrackedOrderId) : null;
  if (activeOrder && !modoParam) {
    clientMode = 'tracker';
    showView('client');
    return;
  }

  showView('client');
})();
