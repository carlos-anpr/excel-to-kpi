# Plan de Desarrollo: Spreadsheet-to-AI Dashboard Replacer (MVP)

**Descripción del Proyecto:**
"Spreadsheet-to-AI Dashboard Replacer" es una aplicación web que permite a los usuarios subir hojas de cálculo (CSV, Excel), mapear el significado de sus columnas y generar automáticamente dashboards interactivos con gráficos, KPIs y alertas. El sistema busca simplificar el análisis de datos permitiendo visualizar información crítica y recibir notificaciones sobre umbrales específicos sin configuraciones complejas.

Este documento describe la hoja de ruta para construir el Producto Mínimo Viable (MVP) de la aplicación. El objetivo es tener una herramienta funcional lo antes posible, manteniendo el código limpio y modular para facilitar el crecimiento futuro, pero evitando la sobreingeniería inicial.

## Stack Tecnológico (MVP Simplificado)

Para esta primera versión, eliminamos la complejidad de infraestructura (Redis, Celery, Postgres, Cloud) y nos centramos en la funcionalidad local.

*   **Frontend:** React (Vite) + TypeScript.
    *   Estilos: Tailwind CSS.
    *   Gráficos: Recharts.
    *   UI Kit: Shadcn/UI (o componentes base simples).
*   **Backend:** Python + FastAPI.
    *   Procesamiento: Pandas.
*   **Base de Datos:** **SQLite**.
    *   *Por qué:* Es un archivo local, no requiere instalación de servidor, se integra nativamente con Python y SQLModel/SQLAlchemy, y es fácil de migrar a PostgreSQL después.
*   **Almacenamiento de Archivos:** Sistema de archivos local (carpeta `/uploads`).

---

## Fases de Desarrollo

### Fase 0: Estructura del Proyecto (Monorepo Simple)
Organización limpia separando responsabilidades.

```text
/project-root
  /backend
    /app
      /api          # Endpoints (Rutas)
      /core         # Configuraciones
      /models       # Modelos de Base de Datos (SQLite)
      /services     # Lógica de negocio (Pandas, Alertas)
      main.py
    /uploads        # Almacenamiento temporal
  /frontend
    /src
      /components   # UI Reutilizable
      /features     # Componentes específicos de negocio (Dashboard, Upload)
      /services     # Llamadas a la API
```

### Fase 1: Carga y Lectura de Datos (El "Core")
**Objetivo:** El usuario sube un Excel/CSV y ve los datos "crudos" en pantalla.

1.  **Backend:**
    *   Endpoint `POST /upload`: Recibe el archivo y lo guarda en disco con un ID único.
    *   Servicio `DataService`: Usa Pandas para leer el archivo (`read_csv` o `read_excel`), limpiar valores nulos básicos y convertir las primeras 5 filas a JSON para previsualización.
2.  **Frontend:**
    *   Componente `FileUploader`: Zona de "drag & drop".
    *   Vista `PreviewTable`: Tabla simple que muestra los datos devueltos por el backend.

### Fase 2: Mapeo de Columnas (La "Inteligencia")
**Objetivo:** El sistema entiende qué significan los datos (¿Cuál es la columna de fecha? ¿Cuál es la métrica de ventas?).

1.  **Backend:**
    *   Endpoint `POST /files/{id}/map`: Recibe la configuración del usuario (ej: `{"columna_A": "date", "columna_B": "metric"}`).
    *   Guardar esta configuración en SQLite asociada al archivo.
2.  **Frontend:**
    *   Interfaz de Mapeo: Muestra los nombres de las columnas detectadas y permite al usuario seleccionar el "Tipo de Dato" (Fecha, Categoría, Número/KPI) mediante selectores.

### Fase 3: Generación del Dashboard y Gestión de Archivos
**Objetivo:** Visualizar los datos basándose en el mapeo y permitir navegar entre archivos subidos.

1.  **Backend:**
    *   Endpoint `GET /files`: Devuelve la lista de archivos subidos con su estado (mapeado/no mapeado).
    *   Endpoint `GET /dashboard/{id}`: Lee el archivo original, aplica el mapeo guardado y calcula agregaciones simples con Pandas (ej: Suma de ventas por mes). Devuelve JSON listo para gráficos.
2.  **Frontend:**
    *   Vista "Mis Dashboards": Lista de tarjetas con los archivos disponibles para abrir.
    *   Componente `DashboardView`:
        *   Si hay una columna "Fecha" y una "Numérica" -> Renderiza un **LineChart**.
        *   Si hay una columna "Categoría" y una "Numérica" -> Renderiza un **BarChart**.
        *   Tarjetas de KPI (Suma total, Promedio).

### Fase 4: Alertas Simples (Sin colas de tareas complejas)
**Objetivo:** Notificar si un valor supera un límite.

*   *Simplificación:* En lugar de un proceso en segundo plano (Celery), verificaremos las alertas **en el momento de la carga o actualización manual** del dashboard.
1.  **Backend:**
    *   Modelo `AlertRule` en SQLite (ej: `column="ventas", threshold=1000, operator=">"`).
    *   Al procesar los datos para el dashboard, verificar si alguna fila cumple la condición.
    *   Devolver una lista de `alerts_triggered` junto con los datos del dashboard.
2.  **Frontend:**
    *   Panel de configuración de alertas.
    *   Notificación visual (Toast o Banner) si el backend devuelve alertas activadas.

---

## Backlog y Preguntas Abiertas (Para escalar)

Estas son las características que dejamos fuera deliberadamente para el MVP, pero que son el siguiente paso lógico.

### Mejoras Técnicas
*   [ ] **Base de Datos Real:** Migrar de SQLite a PostgreSQL cuando se necesite concurrencia real.
*   [ ] **Colas de Trabajo (Async):** Implementar Celery/Redis para procesar archivos gigantes (más de 100k filas) sin bloquear el servidor.
*   [ ] **Almacenamiento Cloud:** Mover `/uploads` a AWS S3 o Google Cloud Storage.

### Funcionalidades de Producto
*   [ ] **Sincronización Google Sheets:** ¿Cómo manejamos la autenticación OAuth2?
*   [ ] **Persistencia de Datos:** ¿Debemos guardar *todos* los datos del Excel en la BD o seguir leyéndolos del archivo cada vez? (Para MVP leemos del archivo, para escala necesitamos un Data Warehouse).
*   [ ] **Alertas Reales:** Envío de emails o Slack (requiere integración con servicios externos).
*   [ ] **Autenticación:** Sistema de usuarios (Login/Register) para que cada uno vea solo sus dashboards.

### Decisiones de Diseño (Respuestas a Preguntas Iniciales)
1.  **Tamaño de Archivos:** Para el MVP, se manejarán archivos de tamaño moderado. El procesamiento con Pandas en memoria es suficiente. La escalabilidad para archivos masivos se abordará en fases futuras.
2.  **Alertas:** Las alertas serán exclusivamente visuales en la interfaz (UI) por ahora. Se implementará un módulo de notificaciones externas (Email/Slack) en versiones posteriores para mantener la simplicidad inicial.
