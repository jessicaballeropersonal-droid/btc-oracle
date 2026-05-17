# BTC Oracle — Documento Maestro del Proyecto
> **IMPORTANTE:** Este documento debe leerse completo antes de modificar cualquier parte del sistema. Contiene decisiones técnicas, reglas de negocio inamovibles y contexto acumulado que no debe perderse entre sesiones de desarrollo.

---

## 1. OBJETIVO DEL SISTEMA

BTC Oracle **no es un sistema de velocidad** — es un sistema de **eficiencia**.

El objetivo es operar **solo cuando las condiciones son óptimas**, no operar frecuentemente. Un pronóstico no generado es mejor que un pronóstico generado en malas condiciones.

**Principio rector:** La IA pondera TODAS las señales aunque contradigan la tendencia esperada. Evitar sesgo de confirmación es prioritario.

---

## 2. ARQUITECTURA TÉCNICA

### Stack actual
- **Frontend:** HTML/CSS/JS puro — un solo archivo `index.html`
- **Backend:** Vercel Serverless Functions (`api/markets.js`)
- **Base de datos:** Supabase (proyecto: VIGIA COLOMBIANO MINERO)
- **IA:** Claude API (`claude-sonnet-4-5`) con web search activado
- **Deploy:** Vercel → `https://btc-oracle-one.vercel.app`
- **Repositorio:** GitHub → `jessicaballeropersonal-droid/btc-oracle`

### Archivos del proyecto
```
btc-oracle/
├── index.html          # App completa (login + dashboard + motor)
├── manifest.json       # PWA para instalación en celular
├── vercel.json         # Configuración de Vercel
├── api/
│   └── markets.js      # Proxy Yahoo Finance (evita CORS)
└── CONTEXTO.md         # Este documento
```

### Fuentes de datos activas
| Fuente | Dato | Costo | Límite |
|---|---|---|---|
| Binance API | Precio BTC, velas, Order Book | Gratis | Sin límite |
| CoinGecko | Volumen global 600+ exchanges, ETH, BTC Dom | Gratis | 30 req/min |
| Yahoo Finance (proxy) | S&P500, NASDAQ, Oro, DXY, Petróleo | Gratis | Sin límite |
| Alternative.me | Fear & Greed Index | Gratis | Sin límite |
| Claude API | Pronósticos IA + web search | ~$0.04/pronóstico | $26 USD disponibles |
| Supabase | Login/autenticación | Gratis | Plan nano |

### Fuentes pendientes de integrar (Fase 2)
| Fuente | Dato | Costo |
|---|---|---|
| CoinGlass | Liquidaciones, Long/Short ratio, Open Interest | Gratis |
| Blockchain.com API | On-chain básico (mempool, hashrate) | Gratis |
| FRED API (Federal Reserve) | Tasas FED, M2 money supply, inflación | Gratis con registro |
| CryptoCompare | Sentimiento noticias, volumen social | Gratis 100k/mes |

---

## 3. SISTEMA DE AUTENTICACIÓN

### Cómo funciona
- Login verifica contra tabla `app_config` en Supabase (proyecto VIGIA COLOMBIANO MINERO)
- Tabla tiene 2 filas: `admin_user` y `admin_password`
- Sin Supabase configurado: credenciales demo `admin` / `btcoracle2024`
- Sesión guardada en `sessionStorage` — se borra al cerrar el navegador

### Cómo cambiar la contraseña
Supabase → VIGIA COLOMBIANO MINERO → Table Editor → `app_config` → editar valor de `admin_password`

### ⚠️ Limitación de seguridad conocida
Las credenciales de Claude API y Supabase están en el código fuente (visible en GitHub público). Esto es aceptable para uso personal con anon key de Supabase. Para uso multi-usuario o comercial, mover credenciales a variables de entorno de Vercel.

---

## 4. MOTOR DE PRONÓSTICO AUTOMÁTICO

### Sistema de puntuación 1-10
El motor evalúa condiciones cada 5 minutos. Solo dispara si el score supera el umbral de la franja activa.

| Variable | Condición | Puntos |
|---|---|---|
| Semáforo verde | Sistema en racha positiva | +3 |
| Semáforo amarillo | Sistema aceptable | +1 |
| RSI 40-60 | Zona neutral ideal | +2 |
| RSI 35-65 | Zona aceptable | +1 |
| Canal ≥3 toques | Canal confiable confirmado | +2 |
| Canal 1-2 toques | Canal en formación | +1 |
| Fear & Greed 35-65 | Sin extremos emocionales | +1 |
| Precio en piso/techo canal | Momento de decisión | +1 |
| Tiempo ≥90min desde último disparo | Evitar sobreanalizar | +1 |
| DXY bajando >0.2% | Dólar débil = favorable BTC | +1 |
| DXY subiendo >0.5% | Dólar fuerte = desfavorable BTC | -1 |
| S&P500 subiendo >0.3% | Riesgo ON = favorable BTC | +1 |
| S&P500 cayendo >0.8% | Riesgo OFF = desfavorable BTC | -1 |
| Oro estable <0.5% cambio | Contexto macro tranquilo | +1 |

**Score máximo teórico:** 13 puntos → normalizado a escala 0-10

### Franjas horarias (Hora Colombia UTC-5)
| Franja | Hora | Score mínimo | Confianza mínima | Razón |
|---|---|---|---|---|
| Pre-mercado | 8:00-9:29am | 8/10 | 70% | Sin confirmación institucional |
| Apertura NY ⭐ | 9:30-10:30am | 6/10 | 60% | Mayor liquidez del día |
| Media mañana | 10:30-12:00m | 5/10 | 60% | NY en apogeo |
| Mediodía | 12:00-1:00pm | 6/10 | 60% | Tendencia confirmada |
| Tarde | 1:00-3:00pm | 7/10 | 65% | Requiere señal fuerte |
| Cierre NY ⛔ | 3:00-6:00pm | BLOQUEADO | — | Volatilidad impredecible |
| Noche 💤 | 6:00pm-8:00am | BLOQUEADO | — | No gasta créditos |

### Reglas de disparo
- Máximo **4 pronósticos por día**
- Mínimo **90 minutos entre disparos**
- Semáforo ROJO = motor suspendido completamente
- Franjas bloqueadas = **cero consumo de créditos**
- Botón manual disponible siempre para forzar análisis

### Presupuesto calculado
- TRM referencia: $3,794 COP/USD
- Presupuesto: $100,000 COP = ~$26.35 USD
- Costo por pronóstico: ~$0.04 USD
- Con 4 disparos/día: $0.16 USD/día
- **Duración estimada: 164 días hábiles (~7 meses)**

---

## 5. SEMÁFORO DE RIESGO

**Ventana móvil de SIEMPRE los últimos 20 pronósticos — NUNCA se reinicia desde cero.**

| Estado | Condición | Acción |
|---|---|---|
| 🟢 Verde | ≥60% aciertos en últimos 20 | Operación normal, capital completo |
| 🟡 Amarillo | 55-59% aciertos | Capital reducido al 50% |
| 🔴 Rojo | <55% aciertos | Pausa completa, modo recalibración |

**En modo rojo:**
- Motor automático se suspende
- Acumular 20 nuevos pronósticos en seco (sin dinero)
- Notificar cuando vuelva a verde
- NUNCA override manual — es inamovible

---

## 6. KPIs DE RENDIMIENTO

Tres métricas siempre visibles en el dashboard:
- **KPI Verde:** aciertos cuando semáforo estaba verde / total pronósticos en verde
- **KPI Amarillo:** aciertos cuando semáforo estaba amarillo / total en amarillo
- **KPI Total:** suma combinada de ambos

Propósito: identificar si el sistema rinde mejor en verde o en amarillo y ajustar estrategia.

---

## 7. PSICOLOGÍA DEL TRADING — REGLAS INAMOVIBLES

Estas reglas **no tienen override manual bajo ninguna circunstancia:**

- Confianza mínima para operar: **≥60%** — sin excepciones
- Después de 2 pérdidas consecutivas: reducir tamaño de posición **50% automáticamente**
- Take Profit automático sin excepción
- Stop Loss automático sin excepción
- Mínimo **90 minutos entre operaciones** (configurable)
- Nunca arriesgar más del **2% del capital total** por operación
- Capital de reserva intocable: mínimo **30% del capital total siempre**
- Si drawdown llega al **20%**: parada completa y revisión del algoritmo
- **Regla del 3 tercios** por cada ganancia: 1/3 reinvierte, 1/3 reserva, 1/3 retiro

---

## 8. FUENTES DE NOTICIAS — CRITERIO ESTRICTO

### Alto peso (fuentes verificadas)
- Michael Saylor
- CoinDesk
- The Block
- Glassnode (reportes on-chain)
- Decisiones de la FED
- Movimientos ETFs institucionales (BlackRock, Fidelity)

### Peso medio
- Bloomberg Crypto
- Reuters Markets
- CryptoQuant
- Analistas con historial verificable público

### Ignorar completamente
- Influencers sin historial verificable
- Rumores sin fuente primaria
- Contenido sin fecha o autoría clara

**La IA debe citar qué fuente específica motivó cada pronóstico.**

---

## 9. RIESGOS TÉCNICOS DOCUMENTADOS (Fase 3)

Estos riesgos fueron identificados y documentados antes de construir el bot de trading real:

### Riesgo 1: Desconexión de internet
**Problema:** Stop loss guardado solo en la app desaparece si se cae el internet.
**Solución obligatoria:** Stop loss siempre enviado a Binance en el momento de la compra (stop loss en exchange), no guardado en el bot.

### Riesgo 2: Errores de código irreversibles
**Problema:** Una orden ejecutada en Binance no tiene Ctrl+Z.
**Solución obligatoria:** 
- Paper trading mínimo 8 semanas antes de dinero real
- Límite duro en código: ninguna orden puede superar 5% del capital
- Capital máximo primeros 30 días: $500 USD sin importar el capital disponible

### Riesgo 3: Suspensión de API keys de Binance
**Problema:** Binance puede suspender la key sin aviso durante una operación abierta.
**Solución obligatoria:**
- Stop loss siempre en exchange (resuelve esto también)
- Sistema de alertas críticas con notificación inmediata
- Monitoreo de estado de API cada 60 segundos cuando hay operaciones abiertas

### Riesgo 4: Slippage
**Problema:** El precio de ejecución real puede diferir del calculado, deteriorando el ratio riesgo/beneficio.
**Solución obligatoria:**
- Tolerancia máxima de slippage: 0.3% del precio calculado
- Si el slippage supera el límite, cancelar la orden automáticamente
- Ratio mínimo riesgo/beneficio 1:2 calculado con precio real de ejecución

---

## 10. CONDICIONES PARA PASAR ENTRE FASES

### De Fase 1 a Fase 2
- ✅ App desplegada en Vercel y funcionando
- ✅ Login con Supabase operativo
- ✅ Motor automático con franjas inteligentes activo
- ✅ KPIs de semáforo funcionando
- ✅ Yahoo Finance via proxy funcionando

### De Fase 2 a Fase 3 (bot real)
- [ ] Paper trading activo y funcional
- [ ] **Mínimo 8 semanas consecutivas** de paper trading rentable
- [ ] Win rate sostenido ≥62% por 8 semanas
- [ ] Drawdown máximo en simulación <12%
- [ ] Sharpe ratio positivo
- [ ] Todos los riesgos técnicos de la Sección 9 implementados
- [ ] Capital inicial Fase 3: máximo $500 USD primeros 30 días

---

## 11. DECISIONES TÉCNICAS Y SU RAZÓN

| Decisión | Razón |
|---|---|
| Un solo archivo HTML | Simplicidad de deploy, sin dependencias, sin build |
| Supabase proyecto VIGIA COLOMBIANO MINERO | Límite de 2 proyectos gratuitos, se reutilizó |
| Claude web search en lugar de Twitter API | Twitter API cuesta $100/mes, Claude web search es más inteligente y ya está integrado |
| Stooq como fallback de Yahoo Finance | Yahoo Finance bloquea CORS desde browser, Stooq no |
| Motor evalúa cada 5 minutos (no 30 segundos) | Balance entre reactividad y consumo de recursos |
| Score normalizado 0-10 (máximo teórico 13) | Escala intuitiva para el usuario |
| 90 minutos mínimo entre disparos | Evitar consumir todos los disparos diarios en rafaga |
| Máximo 4 disparos/día | Balance entre oportunidades y presupuesto de créditos |

---

## 12. ESTADO ACTUAL DEL PROYECTO

**Versión:** v3.0  
**Fase:** 1 completada  
**Fecha última actualización:** Mayo 2026  
**URL producción:** https://btc-oracle-one.vercel.app  
**Precisión validada:** Pendiente (sistema recién lanzado)  

### Próximos pasos — Fase 2
1. Integrar CoinGlass (liquidaciones + Long/Short ratio)
2. Integrar Blockchain.com API (on-chain gratuito)
3. Integrar FRED API (tasas FED + M2)
4. Canales multi-temporalidad (5m, 15m, 1h, 4h, 1d, 1w)
5. Paper trading con capital ficticio
6. Reporte PDF mensual automático
7. Análisis automático de pronósticos fallidos
8. Alertas: precio en canal, Fear & Greed, ballenas

---

## 13. PROMPT MAESTRO PARA NUEVAS SESIONES DE IA

Cuando inicies una nueva conversación con Claude para continuar el desarrollo, usa este prompt:

```
Soy el propietario de BTC Oracle, una app de pronósticos Bitcoin con IA.
El proyecto está en GitHub: jessicaballeropersonal-droid/btc-oracle
URL producción: https://btc-oracle-one.vercel.app
Stack: HTML puro + Vercel + Supabase + Claude API

Lee el archivo CONTEXTO.md del repositorio antes de cualquier modificación.
Actualmente estamos en [FASE X]. 

Lo que necesito hoy: [DESCRIPCIÓN DE LA TAREA]

REGLAS INAMOVIBLES que no puedes cambiar bajo ninguna circunstancia:
- Semáforo de riesgo con ventana móvil de 20 pronósticos
- Confianza mínima 60% para operar
- 2% máximo de capital por operación
- 30% de reserva intocable
- Stop loss siempre en exchange (no en el bot) a partir de Fase 3
- Paper trading mínimo 8 semanas antes de dinero real
```

---

*Documento generado automáticamente por BTC Oracle Development Session — Mayo 2026*
*No modificar manualmente sin actualizar la sección correspondiente*
