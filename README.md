[README.md](https://github.com/user-attachments/files/35119039/README.md)
# RestaurantOS — Sistema Operativo para Restaurantes

Plataforma SaaS para restaurantes con soporte Multi-Tenant, comanda digital para comensales en tiempo real, terminal KDS de cocina, división de cuentas (*Split-Bill*), exportación ejecutiva a Excel estilizado y checkout digital multi-modal (*En Mesa*, *Pickup* y *A Domicilio*).

---

## 🚀 Características Principales

1. **Multi-Tenant Nativo:**
   - Aislamiento completo de menú, configuración, moneda y cuentas por restaurante mediante `tenantId` (e.g. `escandon`, `tacosrey`, `pescaderia`).
   - Switcher en vivo para demostraciones corporativas.

2. **Comanda del Comensale (Dine-in, Pickup & Delivery):**
   - Personalización granular de platillos (bases, proteínas, salsas, complementos y bebidas).
   - Selector interactivo de cantidad `[ - ] 1 [ + ]` con retención de ingredientes configurados.
   - Presencia de comensales en mesa en tiempo real con avatares individuales.
   - Enrutamiento directo mediante parámetros URL:
     - En Mesa: `?vista=cliente&mesa=Mesa+4`
     - Pickup: `?vista=cliente&modo=pickup`
     - Domicilio: `?vista=cliente&modo=domicilio`

3. **Cobro y Checkout Digital:**
   - Selección de propinas dinámica (0%, 10%, 15%, 20%).
   - Desglose transparente con tarifa de envío para pedidos a domicilio.
   - Pago obligatorio anticipado para pedidos para llevar o entrega.
   - Integración con Stripe Elements y simulación de Apple Pay Wallet con Face ID.
   - División de cuentas en vivo: *"Pagar Mi Cuenta"* vs *"Pagar Toda la Mesa"*.
   - Aislamiento por cuenta conectada (`acct_id`) listo para Stripe Connect.

4. **KDS de Cocina en Tiempo Real:**
   - Protección por código PIN de seguridad (`12345`).
   - Diferenciación visual de pedidos (Mesa, Pickup en azul, Domicilio en morado).
   - Insignias de `✓ PAGADO` y alertas sonoras de comandas nuevas.
   - Motor de exportación ejecutiva a Excel (`xlsx-js-style`) con encabezados azul marino, bordes contables esmeralda y formatos de moneda `$#,##0.00`.

---

## 📂 Estructura de Archivos

```
├── index.html        # Estructura semántica, vistas de cliente, KDS, modales y checkout
├── style.css         # Sistema de diseño de alta gama, tipografías, glassmorphism y temas
├── app.js            # Lógica reactiva de estado, ledger contable, KDS y checkout
└── README.md         # Documentación del proyecto
```

---

## 💻 Ejecución Local

Para levantar el servidor web localmente en cualquier máquina:

```bash
# Con Python 3:
python3 -m http.server 8085
```

Luego abre tu navegador en:
- **Vista Principal / Switcher:** `http://localhost:8085/`
- **Comanda en Mesa:** `http://localhost:8085/?vista=cliente&mesa=Mesa+4`
- **Pickup:** `http://localhost:8085/?vista=cliente&modo=pickup`
- **Domicilio:** `http://localhost:8085/?vista=cliente&modo=domicilio`
- **KDS Cocina:** `http://localhost:8085/?vista=cocina` *(PIN: `12345`)*
