# Guía de Mapeo de Columnas (Ejemplo: Financial Sample)

Este documento detalla la estrategia de mapeo recomendada para el dataset de ejemplo "Financial Sample", con el objetivo de maximizar el valor de los dashboards generados automáticamente.

## 1. El Tiempo (Eje X)
*   **Campo:** `Date`
*   **Mapeo:** `Fecha (Eje X)`
*   **Justificación:** Permite generar gráficos de línea para visualizar tendencias temporales (ventas mensuales, evolución del beneficio).
*   **Nota:** Campos redundantes como `Month Number`, `Month Name` y `Year` pueden ser ignorados si `Date` está presente.

## 2. Las Métricas (KPIs)
*   **Campo:** `Sales`
*   **Mapeo:** `Número (Métrica/KPI)`
*   **Justificación:** Métrica principal de ingresos. Se usará para KPIs totales y gráficos de barras/líneas.

*   **Campo:** `Profit`
*   **Mapeo:** `Número (Métrica/KPI)`
*   **Justificación:** Métrica crítica de rentabilidad.

*   **Campo:** `Units Sold`
*   **Mapeo:** `Número (Métrica/KPI)`
*   **Justificación:** Permite analizar el volumen de movimiento de inventario.

## 3. Las Categorías (Agrupación)
*   **Campo:** `Country`
*   **Mapeo:** `Categoría (Agrupación)`
*   **Justificación:** Permite comparar el rendimiento geográfico (ej: Ventas por País).

*   **Campo:** `Segment`
*   **Mapeo:** `Categoría (Agrupación)`
*   **Justificación:** Permite analizar qué tipo de cliente es más rentable (Gobierno, Midmarket, etc.).

*   **Campo:** `Product`
*   **Mapeo:** `Categoría (Agrupación)`
*   **Justificación:** Permite identificar los productos estrella.

## 4. A Ignorar (Limpieza)
*   **Campo:** `Manufacturing Price`
*   **Mapeo:** `Ignorar`
*   **Justificación:** Precio unitario. Sumarlo en un gráfico general no aporta valor analítico directo.

*   **Campo:** `Sale Price`
*   **Mapeo:** `Ignorar`
*   **Justificación:** Igual que el anterior, es un valor unitario.

*   **Campo:** `Discount Band`
*   **Mapeo:** `Ignorar`
*   **Justificación:** A menos que se requiera un análisis específico de descuentos, añade ruido al dashboard general.

*   **Campo:** `Gross Sales`
*   **Mapeo:** `Ignorar` (Opcional: `Número`)
*   **Justificación:** Puede ser redundante si ya se analiza `Sales` y `Profit`.

*   **Campo:** `COGS`
*   **Mapeo:** `Ignorar` (Opcional: `Número`)
*   **Justificación:** Costo de bienes vendidos. Útil para análisis de márgenes profundos, pero secundario para un dashboard ejecutivo simple.
