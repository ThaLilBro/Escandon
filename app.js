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
      showKDSToast(`🔗 Link para clientes copiado`);
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
  if (typeof loadLoyaltyProfile === 'function') loadLoyaltyProfile();
  renderStationHeroIllustrations();
  renderDrinksSection();
  updateClientContextBar();
  if (typeof renderClientLoyaltyHeaderAndBanner === 'function') renderClientLoyaltyHeaderAndBanner();

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
    if (backBtnEl) {
      backBtnEl.textContent = '← Menú';
      backBtnEl.classList.remove('hidden');
    }
    renderClientTracker();
  } else {
    menuFlowEl.classList.remove('hidden');
    trackerViewEl.classList.add('hidden');
    mainBarEl.classList.remove('hidden');
    trackerBarEl.classList.add('hidden');
    builderBarEl.classList.toggle('hidden', !currentStation);
    if (backBtnEl) {
      backBtnEl.textContent = '← Menú';
      backBtnEl.classList.toggle('hidden', !currentStation);
    }
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
  preloadFoodPhotoAssets();
  const tacoEl = document.getElementById('StationSvgTaco');
  const dogEl  = document.getElementById('StationSvgHotdog');
  if (tacoEl && !tacoEl.innerHTML) {
    tacoEl.innerHTML = buildTacoPlateSVG({
      tortilla: 'doble',
      protein: 'bistec',
      toppings: ['cilantro', 'cebolla', 'salsa_roja'],
    }, { uid: 'hero_taco', compact: true });
  }
  if (dogEl && !dogEl.innerHTML) {
    dogEl.innerHTML = buildHotdogPlateSVG({
      toppings: ['ketchup', 'mostaza', 'mayonesa', 'chiles', 'tomate', 'cebolla'],
    }, { uid: 'hero_dog', compact: true });
  }
}

function showStationSelector() {
  currentStation = null;
  document.getElementById('station-selector').classList.remove('hidden');
  document.getElementById('builder-workspace').classList.add('hidden');
  document.getElementById('dock-builder-bar').classList.add('hidden');
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
  const loyaltyDisc    = typeof getActiveCartLoyaltyDiscount === 'function' ? getActiveCartLoyaltyDiscount(baseFoodTotal) : 0;
  const effectiveTotal = Math.max(0, baseFoodTotal - loyaltyDisc) + deliveryFee;
  const canOrder       = (cartItems.length > 0 || summary.ready);

  if (typeof renderCartLoyaltyBox === 'function') {
    renderCartLoyaltyBox(baseFoodTotal, loyaltyDisc);
  }

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
  if (typeof syncLoyaltyProfileIdentity === 'function') syncLoyaltyProfileIdentity(guestVal, phoneVal);
  if (typeof renderClientLoyaltyHeaderAndBanner === 'function') renderClientLoyaltyHeaderAndBanner();
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
      station: it.station || '',
      name: it.name,
      emoji: it.emoji,
      price: it.price,
      qty: it.qty,
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
      errEl.textContent = 'Verifica los datos de tu tarjeta';
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
    const loyaltyDiscRow = (Number(order.loyaltyDiscount) > 0)
      ? `<div class="tracker-item-row loyalty-discount-row">
           <span class="ti-left"><span class="tracker-item-qty">⭐</span><span class="ti-name">Canje: ${escapeHTML(order.loyaltyRewardLabel || 'Puntos Escandón')}</span></span>
           <span class="ti-amount">-$${order.loyaltyDiscount}</span>
         </div>`
      : '';
    if (itemsEl) itemsEl.innerHTML = myItems.map(itemRow).join('') + loyaltyDiscRow;
  }

  const receiptFootEl = document.getElementById('receipt-foot-text');
  if (receiptFootEl) {
    const ptsEarned = Number(order.loyaltyPointsEarned) || Math.max(1, Math.round(Number(order.total) || 0));
    receiptFootEl.innerHTML = `⭐ <strong>+${ptsEarned} Puntos Escandón</strong> acumulados · IVA incluido`;
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

  const comandasBtn = document.getElementById('btn-kds-comandas');
  const salesBtn    = document.getElementById('btn-kds-sales');
  const stockBtn    = document.getElementById('btn-kds-stock');
  const qrsBtn      = document.getElementById('btn-kds-qrs');

  if (comandasEl) comandasEl.classList.toggle('hidden', kdsSubView !== 'comandas');
  if (salesEl)    salesEl.classList.toggle('hidden', kdsSubView !== 'sales');
  if (stockEl)    stockEl.classList.toggle('hidden', kdsSubView !== 'stock');
  if (qrsEl)      qrsEl.classList.toggle('hidden', kdsSubView !== 'qrs');

  if (comandasBtn) comandasBtn.classList.toggle('active', kdsSubView === 'comandas');
  if (salesBtn)    salesBtn.classList.toggle('active', kdsSubView === 'sales');
  if (stockBtn)    stockBtn.classList.toggle('active', kdsSubView === 'stock');
  if (qrsBtn)      qrsBtn.classList.toggle('active', kdsSubView === 'qrs');

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

// ═══════════════════════════════════════════════════════════════════
//  INVENTARIO INTELIGENTE DE INSUMOS, RECETAS Y CADUCIDADES (PEPS)
//  - Multi-tenant aislado por sucursal (tenantId)
//  - Descuento automático por pedido + devolución al cancelar
//  - Semáforo de frescura / caducidad y Modo 86 Automático
// ═══════════════════════════════════════════════════════════════════
const INVENTORY_RECIPE_META = {
  manual:          { label: 'Insumo manual', unitHint: '', stockKey: null },
  taco_tortilla:   { label: 'Taco (1× sencilla · 2× doble)', unitHint: 'tacos', stockKey: null },
  taco_bistec:     { label: 'Taco de Bistec', unitHint: 'tacos', stockKey: 'protein:bistec' },
  taco_longaniza:  { label: 'Taco de Longaniza', unitHint: 'tacos', stockKey: 'protein:longaniza' },
  taco_cilantro:   { label: 'Taco con Cilantro', unitHint: 'tacos', stockKey: 'taco:topping:cilantro' },
  taco_cebolla:    { label: 'Taco / Hot Dog con Cebolla', unitHint: 'porciones', stockKey: 'taco:topping:cebolla' },
  taco_salsa_roja: { label: 'Taco con Salsa Roja', unitHint: 'tacos', stockKey: 'taco:topping:salsa_roja' },
  hotdog_base:     { label: 'Hot Dog (Base)', unitHint: 'hot dogs', stockKey: 'station:hotdog' },
  hotdog_ketchup:  { label: 'Hot Dog con Ketchup', unitHint: 'hot dogs', stockKey: 'hotdog:topping:ketchup' },
  hotdog_mayonesa: { label: 'Hot Dog con Mayonesa', unitHint: 'hot dogs', stockKey: 'hotdog:topping:mayonesa' },
  hotdog_mostaza:  { label: 'Hot Dog con Mostaza', unitHint: 'hot dogs', stockKey: 'hotdog:topping:mostaza' },
  hotdog_chiles:   { label: 'Hot Dog con Chiles Curados', unitHint: 'hot dogs', stockKey: 'hotdog:topping:chiles' },
  hotdog_tomate:   { label: 'Hot Dog con Tomate', unitHint: 'hot dogs', stockKey: 'hotdog:topping:tomate' },
  drink_jamaica:   { label: 'Agua de Jamaica (500 ml)', unitHint: 'vasos', stockKey: 'drink:drink_jamaica' },
  drink_horchata:  { label: 'Agua de Horchata (500 ml)', unitHint: 'vasos', stockKey: 'drink:drink_horchata' },
  drink_coca:      { label: 'Coca-Cola (500 ml)', unitHint: 'botellas', stockKey: 'drink:drink_coca' },
};

const INVENTORY_CATEGORY_META = {
  'Proteínas':         { emoji: '🥩', tone: 'tone-orange' },
  'Tortillas y Pan':   { emoji: '🌮', tone: 'tone-amber' },
  'Verduras y Salsas': { emoji: '🌿', tone: 'tone-sage' },
  'Bebidas':           { emoji: '🥤', tone: 'tone-sky' },
  'Otros':             { emoji: '📦', tone: 'tone-plum' },
};

let inventoryItems     = [];
let inventoryMovements = [];
let autoMode86Enabled  = true;
let stockSubTab        = 'inventory';
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
    {
      id: 'inv_tortillas',
      name: 'Tortillas de Maíz',
      category: 'Tortillas y Pan',
      unit: 'pza',
      stock: 240,
      minStock: 60,
      capacity: 300,
      expiryDate: offsetDaysISO(2),
      lot: 'Tortillería La Flor · Lote Hoy',
      recipeLink: 'taco_tortilla',
      consumptionPerUnit: 1,
    },
    {
      id: 'inv_bistec',
      name: 'Bistec de Res',
      category: 'Proteínas',
      unit: 'g',
      stock: 4200,
      minStock: 1200,
      capacity: 5000,
      expiryDate: offsetDaysISO(4),
      lot: 'Carnicería Norte · L-18',
      recipeLink: 'taco_bistec',
      consumptionPerUnit: 80,
    },
    {
      id: 'inv_longaniza',
      name: 'Longaniza Artesanal',
      category: 'Proteínas',
      unit: 'g',
      stock: 2600,
      minStock: 1000,
      capacity: 4000,
      expiryDate: offsetDaysISO(6),
      lot: 'Lote Toluca · L-09',
      recipeLink: 'taco_longaniza',
      consumptionPerUnit: 75,
    },
    {
      id: 'inv_cilantro',
      name: 'Cilantro Fresco',
      category: 'Verduras y Salsas',
      unit: 'g',
      stock: 320,
      minStock: 200,
      capacity: 600,
      expiryDate: offsetDaysISO(1),
      lot: 'Central de Abastos · Mañana',
      recipeLink: 'taco_cilantro',
      consumptionPerUnit: 10,
    },
    {
      id: 'inv_cebolla',
      name: 'Cebolla Blanca Picada',
      category: 'Verduras y Salsas',
      unit: 'g',
      stock: 950,
      minStock: 350,
      capacity: 1500,
      expiryDate: offsetDaysISO(3),
      lot: 'Prep Diario · Caja 2',
      recipeLink: 'taco_cebolla',
      consumptionPerUnit: 15,
    },
    {
      id: 'inv_salsa_roja',
      name: 'Salsa Roja de Molcajete',
      category: 'Verduras y Salsas',
      unit: 'ml',
      stock: 1800,
      minStock: 500,
      capacity: 2500,
      expiryDate: offsetDaysISO(4),
      lot: 'Cocina · Lote AM',
      recipeLink: 'taco_salsa_roja',
      consumptionPerUnit: 25,
    },
    {
      id: 'inv_pan_hotdog',
      name: 'Pan Artesanal Hot Dog',
      category: 'Tortillas y Pan',
      unit: 'pza',
      stock: 36,
      minStock: 15,
      capacity: 60,
      expiryDate: offsetDaysISO(5),
      lot: 'Panadería Sur · Paq 3',
      recipeLink: 'hotdog_base',
      consumptionPerUnit: 1,
    },
    {
      id: 'inv_salchicha',
      name: 'Salchicha Asada',
      category: 'Proteínas',
      unit: 'pza',
      stock: 12,
      minStock: 15,
      capacity: 60,
      expiryDate: offsetDaysISO(7),
      lot: 'Refrigerado B · L-44',
      recipeLink: 'hotdog_base',
      consumptionPerUnit: 1,
    },
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
      recipeLink: 'drink_jamaica',
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
      recipeLink: 'drink_horchata',
      consumptionPerUnit: 500,
    },
    {
      id: 'inv_coca',
      name: 'Coca-Cola Retornable 500ml',
      category: 'Bebidas',
      unit: 'pza',
      stock: 28,
      minStock: 12,
      capacity: 48,
      expiryDate: offsetDaysISO(60),
      lot: 'Reja 1 · Enfriador',
      recipeLink: 'drink_coca',
      consumptionPerUnit: 1,
    },
  ];
}

function persistInventory() {
  try {
    localStorage.setItem(storageKey('inventory-items'), JSON.stringify(inventoryItems));
    localStorage.setItem(storageKey('inventory-movements'), JSON.stringify(inventoryMovements.slice(0, 30)));
    localStorage.setItem(storageKey('inventory-auto86'), autoMode86Enabled ? '1' : '0');
  } catch (e) {}
}

function loadPersistedInventory() {
  try {
    const rawItems = localStorage.getItem(storageKey('inventory-items'));
    const rawMoves = localStorage.getItem(storageKey('inventory-movements'));
    const rawAuto  = localStorage.getItem(storageKey('inventory-auto86'));
    inventoryItems = rawItems !== null ? JSON.parse(rawItems) : createDefaultInventoryCatalog();
    if (!Array.isArray(inventoryItems)) inventoryItems = createDefaultInventoryCatalog();
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
  const qty     = Math.max(0, Number(orderItem.qty) || 0);
  if (qty === 0) return 0;

  const key     = String(orderItem.key || '').toLowerCase();
  const station = String(orderItem.station || '').toLowerCase();
  const name    = String(orderItem.name || '').toLowerCase();

  const isTaco   = station === 'taco' || key.startsWith('taco:') || name.startsWith('taco');
  const isHotdog = station === 'hotdog' || key.startsWith('hotdog:') || name.includes('hot dog') || name.includes('hotdog');

  // Parseo estructurado para tacos: taco:<tortilla>:<protein>:<toppings>
  const keyParts = key.split(':');
  const toppingsList = isTaco ? (keyParts[3] || '').split(',').filter(Boolean) : (isHotdog ? (keyParts[1] || '').split(',').filter(Boolean) : []);

  switch (recipeLink) {
    case 'taco_tortilla': {
      if (!isTaco) return 0;
      const isDoble = keyParts[1] === 'doble' || name.includes('doble');
      return qty * (isDoble ? 2 : 1);
    }
    case 'taco_bistec':
      return (isTaco && (keyParts[2] === 'bistec' || name.includes('bistec'))) ? qty : 0;
    case 'taco_longaniza':
      return (isTaco && (keyParts[2] === 'longaniza' || name.includes('longaniza'))) ? qty : 0;
    case 'taco_cilantro':
      return (isTaco && (toppingsList.includes('cilantro') || name.includes('cilantro'))) ? qty : 0;
    case 'taco_cebolla':
      return ((isTaco || isHotdog) && (toppingsList.includes('cebolla') || name.includes('cebolla'))) ? qty : 0;
    case 'taco_salsa_roja':
      return (isTaco && (toppingsList.includes('salsa_roja') || name.includes('salsa roja') || name.includes('con todo'))) ? qty : 0;
    case 'hotdog_base':
      return isHotdog ? qty : 0;
    case 'hotdog_ketchup':
      return (isHotdog && (toppingsList.includes('ketchup') || name.includes('ketchup'))) ? qty : 0;
    case 'hotdog_mayonesa':
      return (isHotdog && (toppingsList.includes('mayonesa') || name.includes('mayonesa'))) ? qty : 0;
    case 'hotdog_mostaza':
      return (isHotdog && (toppingsList.includes('mostaza') || name.includes('mostaza'))) ? qty : 0;
    case 'hotdog_chiles':
      return (isHotdog && (toppingsList.includes('chiles') || name.includes('chile'))) ? qty : 0;
    case 'hotdog_tomate':
      return (isHotdog && (toppingsList.includes('tomate') || name.includes('tomate'))) ? qty : 0;
    case 'drink_jamaica':
      return (key === 'drink_jamaica' || name.includes('jamaica')) ? qty : 0;
    case 'drink_horchata':
      return (key === 'drink_horchata' || name.includes('horchata')) ? qty : 0;
    case 'drink_coca':
      return (key === 'drink_coca' || name.includes('coca')) ? qty : 0;
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
    showKDSToast(`⚠️ Stock agotado: ${depletedNames.join(', ')}`);
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

  // Agrupar insumos vinculados por stockKey del menú (ej. hotdog_base puede tener Pan y Salchicha)
  const byStockKey = new Map();
  inventoryItems.forEach(inv => {
    const meta = INVENTORY_RECIPE_META[inv.recipeLink];
    if (!meta || !meta.stockKey) return;
    const arr = byStockKey.get(meta.stockKey) || [];
    arr.push(inv);
    byStockKey.set(meta.stockKey, arr);
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
      renderDrinksSection();
      if (currentStation) renderBuilderWorkspace();
    }
    if (notify && kdsUnlocked) {
      showKDSToast('Modo 86 sincronizado con el inventario');
    }
  }
  return changed;
}

function setStockSubTab(tab) {
  stockSubTab = tab === 'mode86' ? 'mode86' : 'inventory';
  const invPane = document.getElementById('stock-inventory-pane');
  const m86Pane = document.getElementById('stock-mode86-pane');
  const invBtn  = document.getElementById('btn-stock-tab-inventory');
  const m86Btn  = document.getElementById('btn-stock-tab-mode86');

  if (invPane) invPane.classList.toggle('hidden', stockSubTab !== 'inventory');
  if (m86Pane) m86Pane.classList.toggle('hidden', stockSubTab !== 'mode86');
  if (invBtn)  invBtn.classList.toggle('active', stockSubTab === 'inventory');
  if (m86Btn)  m86Btn.classList.toggle('active', stockSubTab === 'mode86');
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
  setStockSubTab(stockSubTab);

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
  const urgentItems = enriched.filter(e => e.health.needsRestock || e.health.needsExpiryAction);
  if (alertsCard && alertsListEl) {
    if (urgentItems.length === 0) {
      alertsCard.classList.add('hidden');
    } else {
      alertsCard.classList.remove('hidden');
      alertsListEl.innerHTML = urgentItems.slice(0, 6).map(({ item, health }) => {
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
        <div class="kds-empty-icon">📦</div>
        <p class="kds-empty-title">Sin insumos en esta vista</p>
        <p class="kds-empty-sub">Agrega un nuevo insumo o cambia el filtro para ver todo tu inventario.</p>
        <button type="button" class="btn-kds-empty-action" onclick="openInventoryModal()">+ Agregar Insumo</button>
      </div>
    `;
  } else {
    gridEl.innerHTML = visible.map(({ item, health }) => {
      const catMeta = INVENTORY_CATEGORY_META[item.category] || INVENTORY_CATEGORY_META['Otros'];
      const recipeMeta = INVENTORY_RECIPE_META[item.recipeLink] || INVENTORY_RECIPE_META.manual;
      const statusLabel = health.status === 'out' ? '✕ Agotado' : (health.status === 'low' ? '⚠ Stock Bajo' : '● Óptimo');
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
              <span class="inv-expiry-pill exp-${health.expiry.tone}">⏳ ${escapeHTML(health.expiry.label)}</span>
            </div>
          </div>

          <div class="inv-bar-wrap">
            <div class="inv-bar-track">
              <div class="inv-bar-fill ${statusCls}" style="width:${health.pct}%"></div>
              <span class="inv-bar-min-mark" style="left:${health.minPct}%" title="Nivel mínimo de alerta"></span>
            </div>
          </div>

          <div class="inv-recipe-strip">
            <span>⚡ ${escapeHTML(recipeLine)}</span>
          </div>

          <div class="inv-card-actions">
            <button type="button" class="inv-act-btn primary" onclick="openInventoryRestockModal('${item.id}', 'in')">+ Entrada</button>
            <button type="button" class="inv-act-btn warn" onclick="openInventoryRestockModal('${item.id}', 'waste')">− Merma</button>
            <button type="button" class="inv-act-btn" onclick="openInventoryModal('${item.id}')">✎ Editar</button>
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

function openInventoryModal(itemId = null) {
  const overlay = document.getElementById('inv-modal-overlay');
  const modal   = document.getElementById('inventory-item-modal');
  const titleEl = document.getElementById('inv-modal-title');
  const delBtn  = document.getElementById('btn-inv-delete');
  if (!overlay || !modal) return;

  const existing = itemId ? inventoryItems.find(i => i.id === itemId) : null;
  document.getElementById('inv-edit-id').value = existing ? existing.id : '';
  document.getElementById('inv-name-input').value = existing ? existing.name : '';
  document.getElementById('inv-category-input').value = existing ? existing.category : 'Proteínas';
  document.getElementById('inv-unit-input').value = existing ? existing.unit : 'g';
  document.getElementById('inv-stock-input').value = existing ? existing.stock : '';
  document.getElementById('inv-min-input').value = existing ? existing.minStock : '';
  document.getElementById('inv-expiry-input').value = existing ? (existing.expiryDate || '') : offsetDaysISO(5);
  document.getElementById('inv-lot-input').value = existing ? (existing.lot || '') : '';
  document.getElementById('inv-recipe-link-input').value = existing ? (existing.recipeLink || 'manual') : 'manual';
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
    showKDSToast('✓ Todo tu inventario está óptimo, no falta nada por pedir');
    return;
  }

  const lines = [
    `📋 LISTA DE COMPRAS & CADUCIDADES — ${profile.name.toUpperCase()}`,
    `Fecha: ${new Date().toLocaleDateString('es-MX')}`,
    '',
  ];
  urgent.forEach(({ item, health }) => {
    const tag = health.status === 'out' ? '🔴 AGOTADO' : (health.status === 'low' ? '🟡 BAJO' : '⏳ CADUCIDAD');
    const suggest = health.suggestedOrderQty > 0 ? ` → Pedir +${formatQtyUnit(health.suggestedOrderQty, item.unit)}` : '';
    lines.push(`${tag} · ${item.name}: queda ${formatQtyUnit(item.stock, item.unit)} (${health.expiry.label})${suggest}`);
  });

  const text = lines.join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showKDSToast(`📋 Lista copiada (${urgent.length} insumos por atender)`);
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
  renderKDS();
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

function buildAppleDotMatrixHTML(filledCols, totalCols = 7, rows = 5) {
  // Matriz de puntos estilo Worktail "Employees on Leave": 7 columnas x 5 filas
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

function renderKDSLiveKPIs() {
  if (!kdsUnlocked) return;
  const stats = calculateDailySales();

  // Fecha actual en formato minimalista Apple ("21 Nov · Turno Activo")
  const datePill = document.getElementById('kds-date-pill');
  if (datePill) {
    try {
      const now = new Date();
      const dayNum = now.getDate();
      const mon = (MONTH_NAMES_ES[now.getMonth()] || '').slice(0, 3);
      datePill.textContent = `📅 ${dayNum} ${mon} · Turno Activo`;
    } catch (e) {}
  }

  // Contadores de filtros en vivo
  const counts = { all: orders.length, pending: 0, received: 0, preparing: 0, ready: 0 };
  let mesaCnt = 0, pickupCnt = 0, deliveryCnt = 0, paidCnt = 0;

  orders.forEach(o => {
    if (o.status && counts[o.status] !== undefined) counts[o.status] += 1;
    const fm = o.fulfillmentMode || 'dine_in';
    if (fm === 'pickup') pickupCnt += 1;
    else if (fm === 'delivery') deliveryCnt += 1;
    else mesaCnt += 1;
    if (o.paid) paidCnt += 1;
  });

  ['all', 'pending', 'received', 'preparing', 'ready'].forEach(key => {
    const el = document.getElementById(`kds-count-${key}`);
    if (el) el.textContent = String(counts[key]);
  });

  // KPI 1: Ventas del Turno
  const kpiSalesEl = document.getElementById('kds-kpi-sales');
  const kpiSalesSub = document.getElementById('kds-kpi-sales-sub');
  if (kpiSalesEl) kpiSalesEl.textContent = formatMoney(stats.totalRevenue);
  if (kpiSalesSub) {
    kpiSalesSub.textContent = stats.ordersCount === 1
      ? '1 pedido listo'
      : `${stats.ordersCount} pedidos listos`;
  }

  // KPI 2: Comandas Activas + Dot Matrix
  const activeCount = counts.pending + counts.received + counts.preparing;
  const kpiActiveEl = document.getElementById('kds-kpi-active');
  const kpiActiveSub = document.getElementById('kds-kpi-active-sub');
  const dotMatrixEl = document.getElementById('kds-kpi-dot-matrix');
  if (kpiActiveEl) kpiActiveEl.textContent = String(orders.length);
  if (kpiActiveSub) {
    kpiActiveSub.textContent = activeCount > 0
      ? `${counts.preparing} cocinando · ${counts.pending + counts.received} en cola`
      : (counts.ready > 0 ? `${counts.ready} listos para entregar` : 'Sin espera en barra');
  }
  if (dotMatrixEl) {
    dotMatrixEl.innerHTML = buildAppleDotMatrixHTML(Math.min(7, orders.length > 0 ? Math.max(2, orders.length) : 0));
  }

  // KPI 3: Modalidades
  const modesEl = document.getElementById('kds-kpi-modes');
  if (modesEl) {
    modesEl.innerHTML = `
      <span class="channel-chip mesa">🍽️ ${mesaCnt} Mesa</span>
      <span class="channel-chip pickup">🛍️ ${pickupCnt} Pickup</span>
      <span class="channel-chip delivery">🛵 ${deliveryCnt} Envío</span>
    `;
  }

  // KPI 4: Pagadas Digital (Apple Pay / Stripe)
  const totalWithHistory = orders.length + completedOrders.length;
  const completedPaid = completedOrders.filter(o => o.paid).length;
  const totalPaid = paidCnt + completedPaid;
  const paidPct = totalWithHistory > 0 ? Math.min(100, Math.round((totalPaid / totalWithHistory) * 100)) : 0;

  const paidEl = document.getElementById('kds-kpi-paid');
  const paidPctEl = document.getElementById('kds-kpi-paid-pct');
  const paidBarEl = document.getElementById('kds-kpi-paid-bar');
  if (paidEl) paidEl.textContent = String(totalPaid);
  if (paidPctEl) paidPctEl.textContent = `${paidPct}%`;
  if (paidBarEl) paidBarEl.style.width = `${paidPct}%`;
}

function seedDemoLiveKdsOrders() {
  // Desactivado para producción: el KDS opera únicamente con órdenes reales
}

function setKDSFilter(filter, btn) {
  kdsFilter = filter;
  document.querySelectorAll('.kds-filter').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderKDS();
}

function renderKDS() {
  if (!kdsUnlocked) return;
  renderKDSLiveKPIs();

  const board = document.getElementById('kds-board');
  if (!board) return;

  let filtered = kdsFilter === 'all'
    ? orders
    : orders.filter(o => o.status === kdsFilter);

  if (kdsSearchQuery) {
    filtered = filtered.filter(o => {
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

  if (filtered.length === 0) {
    board.innerHTML = `
      <div class="kds-empty" id="kds-empty">
        <div class="kds-empty-icon">${kdsSearchQuery ? '⌕' : '🍽️'}</div>
        <p class="kds-empty-title">${kdsSearchQuery ? 'Sin resultados para tu búsqueda' : 'Sin comandas activas'}</p>
        <p class="kds-empty-sub">${kdsSearchQuery ? 'Prueba con otro número de mesa, cliente o limpia el filtro.' : 'Los pedidos entrantes de mesa, pickup y domicilio aparecerán al instante aquí.'}</p>
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
    const avatar = getAvatarInitialsAndTone(order.guestName, order.table);

    const payBadgeHtml = order.paid
      ? `<span class="kds-pay-badge">✓ Pagado · ${escapeHTML(order.paymentLabel || 'Apple Pay')}</span>`
      : `<span class="kds-unpaid-badge">En cuenta</span>`;

    let fulfillmentBannerHtml = '';
    if (fMode === 'pickup') {
      fulfillmentBannerHtml = `
        <div class="kds-fulfillment-banner mode-pickup">
          <span>🛍️ Pickup · ${escapeHTML(order.pickupTime || 'Lo antes posible')}</span>
          ${order.customerPhone ? `<span class="kds-fulfillment-sub">Tel: ${escapeHTML(order.customerPhone)}</span>` : ''}
        </div>
      `;
    } else if (fMode === 'delivery') {
      fulfillmentBannerHtml = `
        <div class="kds-fulfillment-banner mode-delivery">
          <span>🛵 A Domicilio (+$${order.deliveryFee || 25})</span>
          <span class="kds-fulfillment-sub">${escapeHTML(order.deliveryAddress || 'Sin dirección')}${order.deliveryNotes ? ` · ${escapeHTML(order.deliveryNotes)}` : ''}</span>
          ${order.customerPhone ? `<span class="kds-fulfillment-sub">Tel: ${escapeHTML(order.customerPhone)}</span>` : ''}
        </div>
      `;
    }

    const actionsBtns = (() => {
      if (order.status === 'pending') return `
        <button class="order-btn btn-primary-step" onclick="changeOrderStatus(${order.id}, 'received')">✓ Recibir</button>
        <button class="order-btn btn-delete" onclick="deleteOrder(${order.id})">Cancelar</button>
      `;
      if (order.status === 'received') return `
        <button class="order-btn btn-primary-step" onclick="changeOrderStatus(${order.id}, 'preparing')">▶ Preparar</button>
        <button class="order-btn" onclick="changeOrderStatus(${order.id}, 'pending')">↩ Atrás</button>
      `;
      if (order.status === 'preparing') return `
        <button class="order-btn btn-ready" onclick="changeOrderStatus(${order.id}, 'ready')">✓ Marcar Listo</button>
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
            ${order.viaMeseroAI ? `<span class="kds-ai-order-tag">✨ Mesero IA</span>` : ''}
            ${order.loyaltyDiscount > 0 ? `<span class="kds-loyalty-order-tag">⭐ Canje: ${escapeHTML(order.loyaltyRewardLabel || 'Recompensa')} (-$${order.loyaltyDiscount})</span>` : ''}
          </div>
        ` : ''}
        ${hasTableGroup ? `
          <div class="kds-table-group-pill">
            👥 ${escapeHTML(order.table)} · ${tableGroup.diners.length} ${tableGroup.diners.length === 1 ? 'comensal' : 'comensales'} · Mesa: ${formatMoney(tableGroup.tableTotal)}
          </div>
        ` : ''}

        <div class="order-items-list">
          ${order.items.map(it => `
            <div class="order-item-row">
              <span class="order-item-qty">${it.qty}×</span>
              <span class="order-item-name">${it.emoji || ''} ${escapeHTML(it.name)}</span>
            </div>`).join('')}
        </div>

        <div class="order-actions">${actionsBtns}</div>
      </div>`;
  }).join('');

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
  persistOrders();
  publishCloudSync('ORDER_STATUS', { id: orderId, status: newStatus, readyAt: order.readyAt || null });
  renderKDS();
  renderDailySales();
  renderKDSStockPanel();
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
      { label: 'Tacos', val: bd.tacos.qty },
      { label: 'Hot Dogs', val: bd.hotdogs.qty },
      { label: 'Jamaica', val: bd.aguas.jamaica },
      { label: 'Horchata', val: bd.aguas.horchata },
      { label: 'Coca-Cola', val: bd.cocas.qty },
      { label: 'Órdenes', val: allShiftOrders.length },
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
          Sin órdenes completadas en este turno. Las ventas completadas aparecerán aquí automáticamente.
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
    discount: 30,
    emoji: '🥤',
    title: 'Bebida Fría Gratis',
    subtitle: 'Descuento directo de $30 MXN (Coca-Cola o Agua Fresca)',
    minSubtotal: 25,
  },
  {
    id: 'reward_taco_180',
    pointsCost: 180,
    discount: 28,
    emoji: '🌮',
    title: 'Taco Gratis',
    subtitle: 'Descuento directo de $28 MXN (Bistec o Longaniza con todo)',
    minSubtotal: 28,
  },
  {
    id: 'reward_hotdog_220',
    pointsCost: 220,
    discount: 35,
    emoji: '🌭',
    title: 'Hot Dog Artesanal Gratis',
    subtitle: 'Descuento directo de $35 MXN en tu orden',
    minSubtotal: 35,
  },
  {
    id: 'reward_vip_300',
    pointsCost: 300,
    discount: 55,
    emoji: '⭐',
    title: 'Bono VIP $55 MXN',
    subtitle: 'Descuento de $55 MXN aplicable a toda tu cuenta',
    minSubtotal: 55,
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
  if (pts >= 600) return { name: 'Oro VIP', badge: '👑 Oro VIP', nextAt: 1000, tone: 'gold' };
  if (pts >= 200) return { name: 'Plata Frecuente', badge: '🥈 Plata Frecuente', nextAt: 600, tone: 'silver' };
  return { name: 'Miembro Club', badge: '⭐ Miembro Escandón', nextAt: 200, tone: 'warm' };
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
  return items.map(it => `${it.qty}× ${it.emoji || ''} ${it.name}`.trim()).join(' + ');
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
        emoji: it.emoji || '🌮',
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
      emoji: it.emoji || '🌮',
      price: Number(it.price) || 28,
      qty: Number(it.qty) || 1,
      station: it.station || 'taco',
    })),
  };
}

function getClientUsualCombo() {
  loadLoyaltyProfile();
  if (loyaltyProfile.usualCombo && Array.isArray(loyaltyProfile.usualCombo.items) && loyaltyProfile.usualCombo.items.length > 0) {
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
    emoji: it.emoji || '🌮',
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
      showToast('Agrega primero tus tacos, hot dogs o bebidas al carrito');
      return;
    }
  }
  loadLoyaltyProfile();
  const cleanItems = cartItems.map(it => ({
    key: it.key,
    name: it.name,
    emoji: it.emoji || '🌮',
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
  showToast('✨ Guardado como tu pedido "Lo de siempre"');
}

function loadComboItemsIntoCart(comboItems, { replaceCart = true } = {}) {
  if (!Array.isArray(comboItems) || comboItems.length === 0) return { addedCount: 0, skippedSoldOut: [] };
  if (replaceCart) cartItems = [];
  const skippedSoldOut = [];
  let addedCount = 0;

  comboItems.forEach(it => {
    // Verificar si algún ingrediente clave del artículo está agotado en Modo 86
    const key = String(it.key || '');
    if (it.station === 'drink' && isStockSoldOut(`drink:${key}`)) {
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
        name: it.name,
        emoji: it.emoji || '🌮',
        price: Number(it.price) || 28,
        qty: Number(it.qty) || 1,
        station: it.station || 'taco',
      });
    }
    addedCount += (Number(it.qty) || 1);
  });

  window._lastOrderViaMeseroAI = true;
  renderCart();
  return { addedCount, skippedSoldOut };
}

function orderUsualOneTap(sendImmediately = false) {
  let usual = getClientUsualCombo();
  if (!usual) {
    // Si aún no tiene historial, armar el favorito clásico Escandón y guardarlo
    const defaultItems = [
      {
        key: 'taco:sencilla:bistec:cebolla,cilantro,salsa_roja',
        name: 'Taco de Bistec (sencillo, con cilantro, cebolla y salsa roja)',
        emoji: '🌮',
        price: 28,
        qty: 2,
        station: 'taco',
      },
      {
        key: 'drink_coca',
        name: 'Coca-Cola (Retornable 500ml)',
        emoji: '🥤',
        price: 30,
        qty: 1,
        station: 'drink',
      },
    ];
    loyaltyProfile.usualCombo = {
      label: summarizeComboItems(defaultItems),
      total: 86,
      updatedAt: Date.now(),
      items: defaultItems,
    };
    persistLoyaltyProfile();
    usual = loyaltyProfile.usualCombo;
  }

  const res = loadComboItemsIntoCart(usual.items, { replaceCart: true });
  renderClientLoyaltyHeaderAndBanner();

  if (res.addedCount === 0) {
    showToast('⚠️ Los ingredientes de tu pedido habitual están agotados hoy');
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
    // Si ya tenemos mesa y nombre guardados en modo En Mesa, podemos abrir directo confirmación o enviar
    const savedTable = presetTableFromURL || readTenantStorage('last-table') || '';
    const savedGuest = currentGuestName || readTenantStorage('guest-name') || '';
    if (currentFulfillmentMode === 'dine_in' && savedTable && savedGuest) {
      const tableIn = document.getElementById('table-input');
      const guestIn = document.getElementById('guest-name-input');
      if (tableIn) tableIn.value = savedTable;
      if (guestIn) guestIn.value = savedGuest;
      submitOrder();
      showToast(`⚡ ¡"Lo de siempre" enviado directo a cocina (${savedTable})!`);
      return;
    }
    openOrderModalDirect();
    showToast('⚡ "Lo de siempre" listo · Confirma tu mesa o entrega');
  } else {
    showToast(`🛒 "Lo de siempre" cargado (${res.addedCount} artículos)`);
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
      <div class="usual-ai-card has-usual">
        <div class="usual-ai-top">
          <div class="usual-ai-badges">
            <span class="usual-ai-kicker">✨ MESERO IA · LO DE SIEMPRE</span>
            <span class="usual-loyalty-pill" onclick="openClientAILoyaltyModal('loyalty')">
              ⭐ ${loyaltyProfile.points} pts ${unlockedRewards.length > 0 ? `· 🎁 ${unlockedRewards.length} canjeable${unlockedRewards.length > 1 ? 's' : ''}` : ''}
            </span>
          </div>
        </div>

        <div class="usual-ai-body">
          <h3 class="usual-ai-greeting">
            ${displayGuest ? `¡Hola de nuevo, ${escapeHTML(displayGuest)}! 👋` : '¡Qué gusto verte de nuevo! 👋'}
            <span>¿Pedimos lo de siempre?</span>
          </h3>
          <div class="usual-combo-preview">
            <span class="usual-combo-items">${escapeHTML(usual.label)}</span>
            <span class="usual-combo-price">$${usual.total}</span>
          </div>
        </div>

        <div class="usual-ai-actions">
          <button type="button" class="btn-usual-primary" onclick="orderUsualOneTap(true)">
            <span>⚡ Pedir lo de siempre</span>
            <span class="btn-usual-pts">+${usual.total} pts</span>
          </button>
          <button type="button" class="btn-usual-secondary" onclick="orderUsualOneTap(false)" title="Cargar al carrito para editar">
            🛒 Al carrito
          </button>
          <button type="button" class="btn-usual-secondary" onclick="openClientAILoyaltyModal('ai')" title="Chatear con el Mesero IA">
            ✨ Mesero IA
          </button>
        </div>
      </div>
    `;
  } else {
    bannerEl.innerHTML = `
      <div class="usual-ai-card welcome-mode">
        <div class="usual-ai-top">
          <div class="usual-ai-badges">
            <span class="usual-ai-kicker">✨ MESERO IA &amp; CLUB ESCANDÓN</span>
            <span class="usual-loyalty-pill" onclick="openClientAILoyaltyModal('loyalty')">
              ${tier.badge} · ${loyaltyProfile.points} pts
            </span>
          </div>
        </div>
        <div class="usual-ai-body">
          <h3 class="usual-ai-greeting">
            ${displayGuest ? `¡Bienvenido, ${escapeHTML(displayGuest)}!` : 'Tu Mesero IA recuerda tus platillos'}
          </h3>
          <p class="usual-ai-desc">
            Escríbele <strong>"Pide lo de siempre"</strong> o arma tu orden por chat. Además acumulas <strong>1 punto por cada $1 MXN</strong> para canjear por tacos, bebidas y descuentos.
          </p>
        </div>
        <div class="usual-ai-actions">
          <button type="button" class="btn-usual-primary" onclick="openClientAILoyaltyModal('ai')">
            <span>✨ Abrir Mesero IA ("Pide lo de siempre")</span>
          </button>
          <button type="button" class="btn-usual-secondary" onclick="openClientAILoyaltyModal('loyalty')">
            ⭐ Puntos (${loyaltyProfile.points})
          </button>
        </div>
      </div>
    `;
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
        <span class="cart-loyalty-bal">⭐ <strong>${pts} pts</strong> disponibles</span>
        ${earnPts > 0 ? `<span class="cart-loyalty-earn">+${earnPts} pts con esta orden</span>` : ''}
      </div>
      ${baseFoodTotal > 0 ? `
        <div class="cart-rewards-scroll">${rewardsHtml}</div>
        ${loyaltyDiscount > 0 && activeRw ? `
          <div class="cart-loyalty-discount-line">
            <span>🎁 Canje: ${escapeHTML(activeRw.title)} (-${activeRw.pointsCost} pts)</span>
            <strong>-$${loyaltyDiscount} MXN</strong>
          </div>
        ` : ''}
        <div class="cart-save-usual-row">
          <button type="button" class="btn-save-cart-usual" onclick="saveCurrentCartAsUsual()">
            📌 Guardar este pedido como "Lo de siempre"
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
      : `¿Qué se te antoja hoy? Puedes escribir *"Pide lo de siempre"* o decirme qué tacos, hot dogs o bebidas quieres.`;
    appendClientAIMessage('assistant', `${greet} ${usualHint}`, usual ? [
      { label: '⚡ Pedir lo de siempre', action: "orderUsualOneTap(true)" },
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
  const isLoyalty = tab === 'loyalty';
  const tabAiBtn = document.getElementById('tab-client-ai');
  const tabLoyBtn = document.getElementById('tab-client-loyalty');
  const paneAi = document.getElementById('pane-client-ai');
  const paneLoy = document.getElementById('pane-client-loyalty');

  if (tabAiBtn) tabAiBtn.classList.toggle('active', !isLoyalty);
  if (tabLoyBtn) tabLoyBtn.classList.toggle('active', isLoyalty);
  if (paneAi) paneAi.classList.toggle('hidden', isLoyalty);
  if (paneLoy) paneLoy.classList.toggle('hidden', !isLoyalty);

  if (isLoyalty) {
    renderClientLoyaltyTabContent();
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
        <span class="lw-points-num">⭐ ${pts.toLocaleString('es-MX')}</span>
        <span class="lw-points-label">Puntos Escandón disponibles</span>
      </div>
      <div class="lw-progress-track">
        <div class="lw-progress-fill" style="width:${progressPct}%"></div>
      </div>
      <div class="lw-meta-row">
        <span>${pts >= nextReward.pointsCost ? `🎉 ¡Tienes recompensas listas para canjear!` : `Te faltan ${nextReward.pointsCost - pts} pts para ${nextReward.title}`}</span>
        <span>${loyaltyProfile.ordersCount} ${loyaltyProfile.ordersCount === 1 ? 'visita' : 'visitas'}</span>
      </div>
    </div>

    <div class="loyalty-section-block">
      <div class="loyalty-sec-head">
        <span class="step-label">TU PLATILLO HABITUAL ("LO DE SIEMPRE")</span>
        ${cartItems.length > 0 ? `<button type="button" class="btn-link-accent" onclick="saveCurrentCartAsUsual()">📌 Fijar carrito actual</button>` : ''}
      </div>
      ${usual ? `
        <div class="loyalty-usual-box">
          <div class="lub-info">
            <span class="lub-title">${escapeHTML(usual.label)}</span>
            <span class="lub-sub">Total habitual: $${usual.total} MXN · Acumula +${usual.total} pts</span>
          </div>
          <div class="lub-actions">
            <button type="button" class="btn-usual-primary compact" onclick="orderUsualOneTap(true)">⚡ Pedir en 1 toque</button>
          </div>
        </div>
      ` : `
        <div class="loyalty-usual-box empty">
          <span class="lub-sub">Tu primer pedido se guardará automáticamente como "Lo de siempre", o arma tu carrito y toca "Guardar como Lo de siempre".</span>
          <button type="button" class="btn-usual-secondary compact" onclick="orderUsualOneTap(false)">✨ Probar combo clásico Escandón</button>
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
                <span class="lrc-emoji">${rw.emoji}</span>
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

  segments.forEach(seg => {
    const qty = parseSpanishQtyFromSegment(seg);

    // 1. ¿Bebidas?
    if (/\b(jamaica)\b/.test(seg)) {
      const d = DRINKS_CONFIG.find(x => x.id === 'drink_jamaica');
      if (d) parsedItems.push({ key: d.id, name: d.name, emoji: d.emoji, price: d.price, qty, station: 'drink' });
      return;
    }
    if (/\b(horchata)\b/.test(seg)) {
      const d = DRINKS_CONFIG.find(x => x.id === 'drink_horchata');
      if (d) parsedItems.push({ key: d.id, name: d.name, emoji: d.emoji, price: d.price, qty, station: 'drink' });
      return;
    }
    if (/\b(coca|refresco|soda|chesco|cola)\b/.test(seg)) {
      const d = DRINKS_CONFIG.find(x => x.id === 'drink_coca');
      if (d) parsedItems.push({ key: d.id, name: d.name, emoji: d.emoji, price: d.price, qty, station: 'drink' });
      return;
    }

    // 2. ¿Hot Dog?
    if (/\b(hot\s*dog|hotdog|jocho|jochos|perro|dog|dogs)\b/.test(seg)) {
      let tops = ['ketchup', 'mayonesa', 'mostaza', 'chiles', 'tomate', 'cebolla'];
      if (/\b(natural|solo pan|sin nada|simple)\b/.test(seg)) {
        tops = [];
      } else {
        const mentioned = [];
        if (/\b(ketchup|catsup|capsup)\b/.test(seg) || seg.includes('ketchup_mostaza')) mentioned.push('ketchup');
        if (/\b(mayonesa|mayo)\b/.test(seg) || seg.includes('mayonesa_mostaza')) mentioned.push('mayonesa');
        if (/\b(mostaza)\b/.test(seg) || seg.includes('ketchup_mostaza') || seg.includes('mayonesa_mostaza')) mentioned.push('mostaza');
        if (/\b(chile|chiles|jalapeno)\b/.test(seg)) mentioned.push('chiles');
        if (/\b(tomate|jitomate)\b/.test(seg)) mentioned.push('tomate');
        if (/\b(cebolla)\b/.test(seg)) mentioned.push('cebolla');
        if (mentioned.length > 0 && !/\b(con todo|completo|completos)\b/.test(seg) && !/\bsin\b/.test(seg)) {
          tops = mentioned;
        }
      }
      if (/sin\s+cebolla/.test(seg)) tops = tops.filter(t => t !== 'cebolla');
      if (/sin\s+(chile|chiles|picante|jalapeno)/.test(seg)) tops = tops.filter(t => t !== 'chiles');
      if (/sin\s+(tomate|jitomate)/.test(seg)) tops = tops.filter(t => t !== 'tomate');
      if (/sin\s+(mayonesa|mayo)/.test(seg)) tops = tops.filter(t => t !== 'mayonesa');
      if (/sin\s+mostaza/.test(seg)) tops = tops.filter(t => t !== 'mostaza');
      if (/sin\s+(ketchup|catsup)/.test(seg)) tops = tops.filter(t => t !== 'ketchup');

      parsedItems.push(buildStandardHotdogItem({ toppings: tops, qty }));
      return;
    }

    // 3. ¿Tacos?
    if (/\b(taco|tacos|bistec|longaniza|campechano|asada|chorizo)\b/.test(seg)) {
      const tortilla = /\b(doble|copia|dos tortillas)\b/.test(seg) ? 'doble' : 'sencilla';
      let tops = ['cilantro', 'cebolla', 'salsa_roja'];

      if (/\b(natural|pura carne|solo carne|sin nada|sin verdura)\b/.test(seg)) {
        tops = [];
      } else {
        const specific = [];
        if (/\b(cilantro)\b/.test(seg) || seg.includes('cilantro_cebolla') || /\b(verdura)\b/.test(seg)) specific.push('cilantro');
        if (/\b(cebolla)\b/.test(seg) || seg.includes('cilantro_cebolla') || /\b(verdura)\b/.test(seg)) specific.push('cebolla');
        if (/\b(salsa)\b/.test(seg)) specific.push('salsa_roja');
        if (specific.length > 0 && !/\b(con todo|completo|completos)\b/.test(seg) && !/\bsin\b/.test(seg)) {
          tops = specific;
        }
      }

      if (/sin\s+cebolla/.test(seg)) tops = tops.filter(t => t !== 'cebolla');
      if (/sin\s+cilantro/.test(seg)) tops = tops.filter(t => t !== 'cilantro');
      if (/sin\s+(salsa|picante|chile)/.test(seg)) tops = tops.filter(t => t !== 'salsa_roja');

      if (seg.includes('campechano_mix') || /\b(campechano|surtido|surtidos)\b/.test(seg)) {
        const half1 = Math.ceil(qty / 2);
        const half2 = Math.max(1, qty - half1);
        parsedItems.push(buildStandardTacoItem({ protein: 'bistec', tortilla, toppings: tops, qty: half1 }));
        parsedItems.push(buildStandardTacoItem({ protein: 'longaniza', tortilla, toppings: tops, qty: half2 }));
      } else {
        const protein = /\b(longaniza|chorizo)\b/.test(seg) ? 'longaniza' : 'bistec';
        parsedItems.push(buildStandardTacoItem({ protein, tortilla, toppings: tops, qty }));
      }
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
    return 'No tengo el reporte del clima a la mano, pero aquí en Escandón los tacos salen recién hechos y calientitos. ¿Pedimos lo de siempre o te armo algo del menú?';
  }
  if (category === 'sports') {
    return 'Del partido no tengo el marcador, yo ando pendiente del comal y de tu mesa. ¿Te ayudo a pedir unos tacos, un hot dog o revisar tus puntos?';
  }
  if (category === 'creative') {
    return 'Lo mío es armar tacos y recordar tus platillos favoritos, no los chistes ni la poesía. ¿Qué se te antoja pedir hoy?';
  }
  return 'Esa se me escapa, porque solo conozco el menú y tus pedidos en Escandón. ¿Quieres pedir lo de siempre o armar una orden nueva?';
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
      { label: '⚡ Mandar a cocina', action: 'orderUsualOneTap(true)' },
      { label: '🛒 Ver carrito', action: 'closeClientAILoyaltyModal(); toggleCart(true);' },
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
      { label: '🚀 Mandar a cocina', action: 'closeClientAILoyaltyModal(); openOrderModal();' },
      { label: '📌 Guardar como "Lo de siempre"', action: 'saveCurrentCartAsUsual()' },
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
          { label: '🚀 Mandar a cocina', action: 'closeClientAILoyaltyModal(); openOrderModal();' },
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
        { label: '⚡ Pedir lo de siempre', action: 'orderUsualOneTap(true)' },
      ]);
    } else {
      appendClientAIMessage('assistant', '¡Hola! ¿Qué se te antoja hoy? Tenemos tacos de bistec o longaniza ($28), hot dogs ($35) y bebidas frías.');
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
      { label: '⚡ Mandar a cocina', action: 'orderUsualOneTap(true)' },
      { label: '🛒 Ver carrito', action: 'closeClientAILoyaltyModal(); toggleCart(true);' },
    ]);
    return;
  }

  // 2. Preguntas sobre el menú y precios
  if (/(que venden|que tienen|menu|carta|cuanto cuestan|cuanto cuesta|precio|precios|que bebidas|que tacos)/.test(norm) && !/(quiero|dame|ponme|agrega|pide)/.test(norm)) {
    clientAIMemory.offTopicStrikes = 0;
    if (/taco/.test(norm)) {
      appendClientAIMessage('assistant', 'Los tacos cuestan **$28 MXN** (tortilla sencilla o doble, bistec o longaniza, con cilantro, cebolla y salsa roja incluidos). ¿Cuántos te preparo?');
    } else if (/(hot\s*dog|jocho)/.test(norm)) {
      appendClientAIMessage('assistant', 'El Hot Dog artesanal cuesta **$35 MXN** e incluye ketchup, mayonesa, mostaza, tomate, cebolla y chiles curados al gusto. ¿Te agrego uno?');
    } else if (/(bebida|agua|coca|tomar)/.test(norm)) {
      appendClientAIMessage('assistant', 'De tomar tenemos Agua de Jamaica ($25), Agua de Horchata ($25) y Coca-Cola de 500 ml ($30). ¿Cuál te apetece?');
    } else {
      appendClientAIMessage('assistant', 'En el menú tenemos **Tacos** de bistec o longaniza ($28), **Hot Dogs** artesanales ($35), **Aguas Frescas** de jamaica y horchata ($25) y **Coca-Cola** ($30). ¿Qué te armo?');
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
        appendClientAIMessage('assistant', `Listo, apliqué tu **${best.emoji} ${best.title} (-$${best.discount})** a tu pedido.`);
        return;
      }
      clientAIMemory.pendingFollowUp = { type: 'apply_best_reward', rewardId: best.id };
      appendClientAIMessage('assistant', `Tienes **⭐ ${pts} Puntos Escandón**. Ya puedes canjear **${best.title} (-$${best.discount})**; ¿quieres que la aplique a tu carrito?`, unlocked.map(r => ({
        label: `🎁 Canjear ${r.title} (-$${r.discount})`,
        action: `toggleCartLoyaltyReward('${r.id}')`,
      })));
    } else {
      const missing = Math.max(0, 100 - pts);
      appendClientAIMessage('assistant', `Tienes **⭐ ${pts} Puntos Escandón** (ganas 1 punto por cada $1 MXN). Te faltan **${missing} pts** para tu primera bebida gratis.`);
    }
    return;
  }

  // 4. Mandar carrito a cocina
  if (/(manda.*cocina|enviar.*cocina|mandar.*comanda|enviar.*comanda|confirmar pedido|pedir ahora|ya pide)/.test(norm)) {
    clientAIMemory.offTopicStrikes = 0;
    if (cartItems.length === 0) {
      clientAIMemory.pendingFollowUp = { type: 'order_usual' };
      appendClientAIMessage('assistant', 'Tu carrito está vacío todavía. ¿Quieres que pidamos **lo de siempre** o dime qué te agrego?', [
        { label: '⚡ Pedir lo de siempre', action: 'orderUsualOneTap(true)' },
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
        { label: '📍 Ver rastreador', action: 'closeClientAILoyaltyModal(); openActiveTracker();' },
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
      { label: '🚀 Mandar a cocina', action: 'closeClientAILoyaltyModal(); openOrderModal();' },
      { label: '📌 Guardar como "Lo de siempre"', action: 'saveCurrentCartAsUsual()' },
    ]);
    return;
  }

  // 7. Fuera de contexto (Reorientación amable -> Delimitación estricta al 3er intento)
  const offCat = detectOffTopicCategory(norm);
  const offReply = buildClientOffTopicReply(offCat);
  appendClientAIMessage('assistant', offReply, clientAIMemory.offTopicStrikes < 3 ? [
    { label: '⚡ Pedir lo de siempre', action: 'orderUsualOneTap(true)' },
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

  if (drawer) drawer.classList.toggle('open', kitchenCopilotOpen);
  if (overlay) overlay.classList.toggle('open', kitchenCopilotOpen);
  if (navBtn) navBtn.classList.toggle('active', kitchenCopilotOpen);

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
  const bistecItem = inventoryItems.find(i => i.id === 'inv_bistec' || i.recipeLink === 'taco_bistec');
  const longanizaItem = inventoryItems.find(i => i.id === 'inv_longaniza' || i.recipeLink === 'taco_longaniza');
  const bistecServings = bistecItem ? (getEstimatedServings(bistecItem) || 0) : 0;
  const longServings = longanizaItem ? (getEstimatedServings(longanizaItem) || 0) : 0;
  const sales = calculateDailySales();

  strip.innerHTML = `
    <button type="button" class="copilot-tel-pill" onclick="runKitchenAIQuickPrompt('¿Qué comandas están activas ahorita?')">
      <span class="ct-dot ${activeCount > 0 ? 'live' : ''}"></span>
      <span><strong>${activeCount}</strong> activas</span>
    </button>
    <button type="button" class="copilot-tel-pill" onclick="runKitchenAIQuickPrompt('¿Cuánta carne queda?')">
      <span>🥩</span>
      <span>Carne: <strong>~${bistecServings + longServings} tacos</strong></span>
    </button>
    <button type="button" class="copilot-tel-pill" onclick="runKitchenAIQuickPrompt('¿Cuánto he vendido hoy?')">
      <span>💰</span>
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

function copilotNavigateTo(subView, stockTab = null) {
  setKDSSubView(subView);
  if (subView === 'stock' && stockTab) {
    setStockSubTab(stockTab);
  }
  showKDSToast(`✨ Abierto: ${subView === 'stock' ? 'Insumos & Stock' : (subView === 'sales' ? 'Dashboard de Ventas' : (subView === 'qrs' ? 'Códigos QR' : 'Tablero de Comandas'))}`);
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
    { label: '📦 Ver en Insumos', action: "copilotNavigateTo('stock', 'inventory')" },
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

// Calcula ventas cerradas + artículos en preparación en cocina por cada producto específico
function getLiveDetailedProductMetrics() {
  const closedStats = calculateDailySales();
  const readyMap = new Map();
  completedOrders.forEach(o => { if (o && o.id) readyMap.set(o.id, o); });
  orders.forEach(o => { if (o && o.id && o.status === 'ready') readyMap.set(o.id, o); });
  const closedList = Array.from(readyMap.values());
  const inProgressList = orders.filter(o => o && o.status !== 'ready');

  const countBucket = (orderList) => {
    const b = {
      tacos: { qty: 0, amt: 0 },
      bistec: { qty: 0, amt: 0 },
      longaniza: { qty: 0, amt: 0 },
      hotdogs: { qty: 0, amt: 0 },
      aguas: { qty: 0, amt: 0 },
      jamaica: { qty: 0, amt: 0 },
      horchata: { qty: 0, amt: 0 },
      cocas: { qty: 0, amt: 0 },
      bebidas: { qty: 0, amt: 0 },
      totalMoney: 0,
    };
    orderList.forEach(order => {
      b.totalMoney += Number(order.total) || 0;
      (order.items || []).forEach(it => {
        const qty = Number(it.qty) || 0;
        const amt = qty * (Number(it.price) || 0);
        const key = String(it.key || '').toLowerCase();
        const name = String(it.name || '').toLowerCase();
        const st = String(it.station || '').toLowerCase();
        if (st === 'taco' || key.startsWith('taco:') || name.startsWith('taco')) {
          b.tacos.qty += qty; b.tacos.amt += amt;
          if (key.includes('longaniza') || name.includes('longaniza')) { b.longaniza.qty += qty; b.longaniza.amt += amt; }
          else { b.bistec.qty += qty; b.bistec.amt += amt; }
        } else if (st === 'hotdog' || key.startsWith('hotdog:') || name.includes('hot dog') || name.includes('hotdog')) {
          b.hotdogs.qty += qty; b.hotdogs.amt += amt;
        } else if (key === 'drink_jamaica' || name.includes('jamaica')) {
          b.aguas.qty += qty; b.aguas.amt += amt;
          b.jamaica.qty += qty; b.jamaica.amt += amt;
          b.bebidas.qty += qty; b.bebidas.amt += amt;
        } else if (key === 'drink_horchata' || name.includes('horchata')) {
          b.aguas.qty += qty; b.aguas.amt += amt;
          b.horchata.qty += qty; b.horchata.amt += amt;
          b.bebidas.qty += qty; b.bebidas.amt += amt;
        } else if (key === 'drink_coca' || name.includes('coca')) {
          b.cocas.qty += qty; b.cocas.amt += amt;
          b.bebidas.qty += qty; b.bebidas.amt += amt;
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

// Revisa disponibilidad real de ingredientes para un platillo específico (o para todo el turno)
function runKitchenIngredientsReadinessCheck(product = 'all') {
  loadPersistedInventory();
  const pickByLinks = (links) => inventoryItems.filter(i => links.includes(i.recipeLink));

  if (product === 'tacos' || product === 'bistec' || product === 'longaniza') {
    const links = product === 'bistec'
      ? ['taco_bistec', 'taco_tortilla', 'taco_cilantro', 'taco_cebolla', 'taco_salsa_roja']
      : (product === 'longaniza'
        ? ['taco_longaniza', 'taco_tortilla', 'taco_cilantro', 'taco_cebolla', 'taco_salsa_roja']
        : ['taco_bistec', 'taco_longaniza', 'taco_tortilla', 'taco_cilantro', 'taco_cebolla', 'taco_salsa_roja']);
    const items = pickByLinks(links);
    const outItems = items.filter(i => Number(i.stock) <= 0);
    const lowItems = items.filter(i => { const h = getInventoryItemHealth(i); return h.status === 'low'; });
    const expItems = items.filter(i => { const h = getInventoryItemHealth(i); return h.needsExpiryAction; });

    const bistec = inventoryItems.find(i => i.recipeLink === 'taco_bistec');
    const longaniza = inventoryItems.find(i => i.recipeLink === 'taco_longaniza');
    const tortillas = inventoryItems.find(i => i.recipeLink === 'taco_tortilla');

    const parts = [];
    if (bistec && product !== 'longaniza') parts.push(`**${formatGramsAndKg(bistec.stock, bistec.unit)}** de bistec (~${getEstimatedServings(bistec)} tacos)`);
    if (longaniza && product !== 'bistec') parts.push(`**${formatGramsAndKg(longaniza.stock, longaniza.unit)}** de longaniza (~${getEstimatedServings(longaniza)} tacos)`);
    if (tortillas) parts.push(`**${formatGramsAndKg(tortillas.stock, tortillas.unit)}** de tortilla`);

    let msg = outItems.length > 0
      ? `Falta stock en: **${outItems.map(i => i.name).join(', ')}**. `
      : `Sí, tienes todos los ingredientes para ${product === 'tacos' ? 'tacos' : 'tacos de ' + product}: ${parts.join(', ')}.`;

    if (lowItems.length > 0) {
      msg += ` Bajo mínimo: **${lowItems.map(i => i.name).join(', ')}**.`;
    }
    if (expItems.length > 0) {
      msg += ` Solo ojo con la caducidad de **${expItems.map(i => `${i.name} (${getExpiryMeta(i.expiryDate).label.toLowerCase()})`).join(', ')}**.`;
    }
    kitchenCopilotMemory.pendingFollowUp = { type: 'open_inventory' };
    appendKitchenCopilotMessage('assistant', msg, [
      { label: '📦 Abrir Insumos', action: "copilotNavigateTo('stock', 'inventory')" },
    ]);
    return;
  }

  if (product === 'hotdogs') {
    const pan = inventoryItems.find(i => i.id === 'inv_pan_hotdog');
    const salch = inventoryItems.find(i => i.id === 'inv_salchicha');
    const maxDogs = Math.min(pan ? Number(pan.stock) : 0, salch ? Number(salch.stock) : 0);
    const lowSalch = salch && getInventoryItemHealth(salch).needsRestock;
    let msg = maxDogs > 0
      ? `Tienes insumos para preparar **${maxDogs} hot dogs** (${pan ? formatGramsAndKg(pan.stock, pan.unit) : '0'} de pan y ${salch ? formatGramsAndKg(salch.stock, salch.unit) : '0'} de salchicha).`
      : `Te falta pan o salchicha para preparar hot dogs ahorita.`;
    if (lowSalch) {
      msg += ` Ojo: **${salch.name}** está por debajo de tu stock mínimo (${salch.minStock} ${salch.unit}). ¿Quieres que abra el panel de insumos?`;
      kitchenCopilotMemory.pendingFollowUp = { type: 'open_inventory' };
    }
    appendKitchenCopilotMessage('assistant', msg, [
      { label: '📦 Ver en Insumos', action: "copilotNavigateTo('stock', 'inventory')" },
    ]);
    return;
  }

  if (['aguas', 'jamaica', 'horchata', 'cocas', 'bebidas'].includes(product)) {
    const links = product === 'cocas' ? ['drink_coca']
      : (product === 'jamaica' ? ['drink_jamaica']
        : (product === 'horchata' ? ['drink_horchata']
          : (product === 'aguas' ? ['drink_jamaica', 'drink_horchata'] : ['drink_jamaica', 'drink_horchata', 'drink_coca'])));
    const items = pickByLinks(links);
    const summary = items.map(i => `**${i.name}**: ${formatGramsAndKg(i.stock, i.unit)} (~${getEstimatedServings(i)} porciones)`).join(' · ');
    const low = items.filter(i => getInventoryItemHealth(i).needsRestock);
    let msg = `En bebidas tienes: ${summary}.`;
    if (low.length > 0) msg += ` Ojo: **${low.map(i => i.name).join(', ')}** está bajo el mínimo.`;
    appendKitchenCopilotMessage('assistant', msg, [
      { label: '📦 Abrir Insumos', action: "copilotNavigateTo('stock', 'inventory')" },
    ]);
    return;
  }

  // Revisión general de arranque de turno
  const lowItems = inventoryItems.filter(i => getInventoryItemHealth(i).needsRestock);
  const expItems = inventoryItems.filter(i => getInventoryItemHealth(i).needsExpiryAction);
  if (lowItems.length === 0 && expItems.length === 0) {
    appendKitchenCopilotMessage('assistant', 'Todo el inventario está en nivel óptimo y vigente. Estás listo para el turno.');
    return;
  }
  const bits = [];
  if (lowItems.length > 0) bits.push(`bajo stock: **${lowItems.map(i => `${i.name} (${formatGramsAndKg(i.stock, i.unit)})`).join(', ')}**`);
  if (expItems.length > 0) bits.push(`por caducar pronto: **${expItems.map(i => `${i.name} (${getExpiryMeta(i.expiryDate).label.toLowerCase()})`).join(', ')}**`);
  kitchenCopilotMemory.pendingFollowUp = { type: 'open_inventory' };
  appendKitchenCopilotMessage('assistant', `El menú está operando, pero revisa ${bits.join('; y ')}. ¿Te abro el panel de insumos?`, [
    { label: '📦 Ir a Insumos', action: "copilotNavigateTo('stock', 'inventory')" },
    { label: '📋 Copiar lista de compras', action: 'copyRestockShoppingList()' },
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
    ventas_turno_cerradas_mxn: sales.totalRevenue,
    ordenes_cerradas_count: sales.ordersCount,
    desglose_vendido_cerrado: {
      tacos: detailed.closed.tacos.qty,
      tacos_bistec: detailed.closed.bistec.qty,
      tacos_longaniza: detailed.closed.longaniza.qty,
      hotdogs: detailed.closed.hotdogs.qty,
      aguas_frescas: detailed.closed.aguas.qty,
      agua_jamaica: detailed.closed.jamaica.qty,
      agua_horchata: detailed.closed.horchata.qty,
      coca_colas: detailed.closed.cocas.qty,
    },
    en_preparacion_cocina: {
      comandas_pendientes_count: detailed.inProgressOrdersCount,
      dinero_en_cocina_mxn: detailed.active.totalMoney,
      tacos: detailed.active.tacos.qty,
      hotdogs: detailed.active.hotdogs.qty,
      aguas: detailed.active.aguas.qty,
      coca_colas: detailed.active.cocas.qty,
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
          actions.push({ label: wantMode86 ? '⚡ Ver Modo 86' : '📦 Ver Insumos & Stock', action: `copilotNavigateTo('stock', '${tab}')` });
          copilotNavigateTo('stock', tab);
        } else if (data.action === 'navegar_ventas') {
          actions.push({ label: '📊 Ir al Dashboard', action: "copilotNavigateTo('sales')" });
          copilotNavigateTo('sales');
        } else if (data.action === 'navegar_comandas') {
          actions.push({ label: '🍽️ Ir a Comandas', action: "copilotNavigateTo('comandas')" });
          copilotNavigateTo('comandas');
        } else if (data.action === 'navegar_qrs') {
          actions.push({ label: '🖨️ Ir a Códigos QR', action: "copilotNavigateTo('qrs')" });
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
        appendKitchenCopilotMessage('assistant',
          `Desglose del turno (**${formatMoney(s.totalRevenue)} MXN**): 🌮 ${s.breakdown.tacos.qty} Tacos (${formatMoney(s.breakdown.tacos.amount)}) · 🌭 ${s.breakdown.hotdogs.qty} Hot Dogs (${formatMoney(s.breakdown.hotdogs.amount)}) · 💧 ${s.breakdown.aguas.qty} Aguas (${formatMoney(s.breakdown.aguas.amount)}) · 🥤 ${s.breakdown.cocas.qty} Cocas (${formatMoney(s.breakdown.cocas.amount)}).`,
          [{ label: '📊 Abrir Dashboard', action: "copilotNavigateTo('sales')" }]
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
  // A) ACCIONES DIRECTAS DE INVENTARIO ("recarga 2 kg de bistec", "agrega 100 tortillas")
  // ─────────────────────────────────────────────────────────────────
  if (/\b(recarga|agrega|suma|abastece|anade|meter)\b/.test(norm) && /(bistec|longaniza|tortilla|cilantro|cebolla|salsa|pan|salchicha|jamaica|horchata|coca)/.test(norm)) {
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
        { label: '➕ Agregar Insumo', action: 'openInventoryModal()' },
        { label: '⚡ Modo 86 Rápido', action: "copilotNavigateTo('stock', 'mode86')" },
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
        { label: '📥 Exportar Excel', action: 'exportCurrentShiftOrMonthExcel()' },
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
    if (/(comanda|comandas|cocina|tablero)/.test(norm)) {
      kitchenCopilotMemory.offTopicStrikes = 0;
      kitchenCopilotMemory.pendingFollowUp = null;
      copilotNavigateTo('comandas');
      appendKitchenCopilotMessage('assistant', 'Listo, regresamos al tablero de **Comandas**.');
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

    // 1. ¿Pregunta por un producto específico? ("¿he vendido tacos?", "¿cuántas cocas van?", "¿vendimos hot dogs?")
    const productMatchers = [
      { key: 'bistec',    re: /\b(bistec|asada)\b/,          singular: 'taco de bistec',     plural: 'tacos de bistec',     offer: 'si tenemos bistec y tortillas listos' },
      { key: 'longaniza', re: /\b(longaniza|chorizo)\b/,     singular: 'taco de longaniza',  plural: 'tacos de longaniza',  offer: 'si tenemos longaniza y tortillas listos' },
      { key: 'tacos',     re: /\b(taco|tacos)\b/,            singular: 'taco',               plural: 'tacos',               offer: 'si tenemos bistec, longaniza y tortillas listos' },
      { key: 'hotdogs',   re: /\b(hot\s*dog|hotdog|jocho|jochos)\b/, singular: 'hot dog',    plural: 'hot dogs',            offer: 'cómo andamos de pan y salchichas' },
      { key: 'jamaica',   re: /\b(jamaica)\b/,               singular: 'agua de jamaica',    plural: 'aguas de jamaica',    offer: 'cuánta agua de jamaica queda' },
      { key: 'horchata',  re: /\b(horchata)\b/,              singular: 'agua de horchata',   plural: 'aguas de horchata',   offer: 'cuánta agua de horchata queda' },
      { key: 'aguas',     re: /\b(agua|aguas)\b/,            singular: 'agua fresca',        plural: 'aguas frescas',       offer: 'cuánta agua fresca queda en inventario' },
      { key: 'cocas',     re: /\b(coca|cocas|refresco|refrescos)\b/, singular: 'Coca-Cola',  plural: 'Coca-Colas',          offer: 'cuántas Coca-Colas quedan en enfriador' },
      { key: 'bebidas',   re: /\b(bebida|bebidas)\b/,        singular: 'bebida',             plural: 'bebidas',             offer: 'cómo estamos de inventario de bebidas' },
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
        `Sí, hoy van **${closedQty} ${labelClosed}** vendidos (**${formatMoney(closedAmt)} MXN**)${activeQty > 0 ? `, más **${activeQty} ${labelActive}** en preparación` : ''}.`
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
      const cats = [
        { name: 'Tacos', qty: s.breakdown.tacos.qty, amt: s.breakdown.tacos.amount },
        { name: 'Hot Dogs', qty: s.breakdown.hotdogs.qty, amt: s.breakdown.hotdogs.amount },
        { name: 'Aguas Frescas', qty: s.breakdown.aguas.qty, amt: s.breakdown.aguas.amount },
        { name: 'Coca-Colas', qty: s.breakdown.cocas.qty, amt: s.breakdown.cocas.amount },
      ].sort((a, b) => b.qty - a.qty);
      appendKitchenCopilotMessage('assistant', `Lo que más se ha vendido hoy son **${cats[0].name}** con **${cats[0].qty} unidades** (${formatMoney(cats[0].amt)} MXN).`);
      return;
    }

    // 3. ¿Pidió explícitamente el desglose?
    if (/\b(desglose|detalle|por producto|por categoria)\b/.test(norm)) {
      kitchenCopilotMemory.pendingFollowUp = null;
      if (s.totalRevenue === 0) {
        appendKitchenCopilotMessage('assistant', 'Aún no hay ventas cerradas en el turno ($0 MXN) para desglosar.');
        return;
      }
      appendKitchenCopilotMessage(
        'assistant',
        `Desglose del turno (**${formatMoney(s.totalRevenue)} MXN**): 🌮 ${s.breakdown.tacos.qty} Tacos (${formatMoney(s.breakdown.tacos.amount)}) · 🌭 ${s.breakdown.hotdogs.qty} Hot Dogs (${formatMoney(s.breakdown.hotdogs.amount)}) · 💧 ${s.breakdown.aguas.qty} Aguas (${formatMoney(s.breakdown.aguas.amount)}) · 🥤 ${s.breakdown.cocas.qty} Cocas (${formatMoney(s.breakdown.cocas.amount)}).`,
        [{ label: '📊 Abrir Dashboard', action: "copilotNavigateTo('sales')" }]
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
      [{ label: '📊 Ir al Dashboard', action: "copilotNavigateTo('sales')" }]
    );
    return;
  }

  // ─────────────────────────────────────────────────────────────────
  // F) INVENTARIO, CARNE, INGREDIENTES Y CADUCIDADES PEPS (CONCISO)
  // ─────────────────────────────────────────────────────────────────
  const asksReadyIngredients = /(ingredientes|hay todo|tenemos todo|listo para|alcanza para)/.test(norm);
  const asksMeat = /(cuanta carne|carne queda|proteina|proteinas|alcanza la carne)/.test(norm);
  const asksLowOrExp = /(bajo|bajos|agotado|agotados|falta comprar|reabastecer|por pedir|caduca|caducar|vence|vencer|alerta|alertas)/.test(norm);
  const specificIng = /(bistec|longaniza|tortilla|tortillas|cilantro|cebolla|salsa|pan|salchicha|salchichas|jamaica|horchata|coca|refresco|bebida|bebidas|tacos|hot\s*dog|hotdog)/.exec(norm);

  if (asksReadyIngredients && specificIng) {
    kitchenCopilotMemory.offTopicStrikes = 0;
    const kw = specificIng[1];
    if (/taco/.test(kw)) { runKitchenIngredientsReadinessCheck('tacos'); return; }
    if (/hot/.test(kw)) { runKitchenIngredientsReadinessCheck('hotdogs'); return; }
    if (/bistec/.test(kw)) { runKitchenIngredientsReadinessCheck('bistec'); return; }
    if (/longaniza/.test(kw)) { runKitchenIngredientsReadinessCheck('longaniza'); return; }
    if (/coca|refresco/.test(kw)) { runKitchenIngredientsReadinessCheck('cocas'); return; }
    if (/jamaica|horchata|bebida/.test(kw)) { runKitchenIngredientsReadinessCheck('bebidas'); return; }
  }

  if (asksMeat) {
    kitchenCopilotMemory.offTopicStrikes = 0;
    const bistec = inventoryItems.find(i => i.recipeLink === 'taco_bistec');
    const longaniza = inventoryItems.find(i => i.recipeLink === 'taco_longaniza');
    const bServ = bistec ? (getEstimatedServings(bistec) || 0) : 0;
    const lServ = longaniza ? (getEstimatedServings(longaniza) || 0) : 0;
    kitchenCopilotMemory.pendingFollowUp = { type: 'open_inventory' };
    appendKitchenCopilotMessage(
      'assistant',
      `Quedan **${bistec ? formatGramsAndKg(bistec.stock, bistec.unit) : '0 g'} de bistec** (~${bServ} tacos) y **${longaniza ? formatGramsAndKg(longaniza.stock, longaniza.unit) : '0 g'} de longaniza** (~${lServ} tacos), suficiente para unos **${bServ + lServ} tacos** en total. ¿Quieres que te abra el inventario?`,
      [{ label: '📦 Abrir Insumos', action: "copilotNavigateTo('stock', 'inventory')" }]
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
        const expNote = h.needsExpiryAction ? ` · ⚠️ ${h.expiry.label.toLowerCase()}` : '';
        const lowNote = h.status === 'out' ? ' · 🔴 agotado' : (h.status === 'low' ? ' · ⚠️ bajo mínimo' : '');
        return `**${item.name}**: **${formatGramsAndKg(item.stock, item.unit)}**${h.servings !== null ? ` (~${h.servings} porciones)` : ''}${lowNote}${expNote}`;
      }).join(' | ');
      kitchenCopilotMemory.pendingFollowUp = { type: 'open_inventory' };
      appendKitchenCopilotMessage('assistant', `${summary}.`, [
        { label: '📦 Ver en Insumos', action: "copilotNavigateTo('stock', 'inventory')" },
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
      { label: '🍽️ Ver Tablero', action: "copilotNavigateTo('comandas')" },
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

  const mesaParam = urlParams.get('mesa') || '';
  const modoParam = (urlParams.get('modo') || urlParams.get('mode') || '').toLowerCase();
  if (mesaParam) presetTableFromURL = mesaParam;

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
