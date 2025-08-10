# Logicarga WMS - Sistema de Gestión de Almacén

## 1. Descripción General

**Logicarga WMS** es una aplicación web a medida, diseñada para la gestión integral del almacén de la empresa Logicarga. El sistema está especializado en la manipulación y trazabilidad de dos tipos de productos principales: **rollos de tela** (medidos por metraje) y **tanques IBC de productos químicos** (medidos por peso).

Esta aplicación ha sido migrada desde un sistema de punto de venta genérico a un WMS funcional, reutilizando la base tecnológica pero adaptando toda la lógica de negocio a las operaciones específicas de un almacén de alto volumen.

---

## 2. Stack Tecnológico

*   **Frontend:** React, Vite, TypeScript
*   **UI/UX:** Tailwind CSS, shadcn/ui, Radix UI, Lucide (iconos)
*   **Gestión de Estado:** TanStack Query (React Query)
*   **Formularios:** React Hook Form con Zod para validación
*   **Backend y Base de Datos:** Supabase (PostgreSQL, Auth, Edge Functions, RPC Functions)

---

## 3. Puesta en Marcha del Proyecto

### Requisitos
*   Node.js (v18+)
*   `npm` o `bun`
*   Una cuenta de Supabase

### Pasos de Instalación

1.  **Clonar el Repositorio:**
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd logicarga-wms
    ```

2.  **Instalar Dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno:**
    Crea un archivo `.env` en la raíz del proyecto y añade las credenciales de tu proyecto de Supabase:
    ```env
    VITE_SUPABASE_URL=tu_url_de_supabase
    VITE_SUPABASE_ANON_KEY=tu_llave_anonima_de_supabase
    ```

4.  **Ejecutar el Servidor de Desarrollo:**
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:5173` (o el puerto que indique Vite).

### Configuración de la Base de Datos

La base de datos se configura ejecutando los scripts SQL en el **SQL Editor** de tu proyecto de Supabase. Es crucial ejecutarlos en el orden correcto:

1.  **Paso 1 - Tablas:** Ejecuta el script que crea la estructura principal de tablas y tipos.
2.  **Paso 2 - Índices y Funciones:** Ejecuta el script que añade los índices de rendimiento y las funciones auxiliares.
3.  **Paso 3 - Triggers:** Ejecuta el script que crea los disparadores para la automatización de la lógica de negocio.
4.  **Paso 4 - Seguridad y Datos:** Ejecuta el script final que habilita la Seguridad a Nivel de Fila (RLS) e inserta datos iniciales.
5.  **Funciones Adicionales:** Ejecuta los scripts para las funciones RPC (`move_inventory_item`, `create_dispatch`, `verify_and_place_item`) en el mismo editor.

---

## 4. Manual de Módulos del WMS

Esta sección detalla el propósito y funcionamiento de cada módulo principal del sistema.

### 4.1 Dashboard
Es la pantalla de inicio y ofrece una vista rápida del estado operativo del almacén. Las métricas clave incluyen:
*   **Items Disponibles:** El número total de items físicos listos para ser movidos o despachados.
*   **Items Pend. Verificación:** Items que se han cargado desde una packing list pero aún no tienen una ubicación física.
*   **Despachos de Hoy:** Un conteo de los despachos completados en el día actual.
*   **Ubicaciones Totales:** El número total de coordenadas definidas en el almacén.

### 4.2 Plantillas de Productos
Este módulo no gestiona el stock físico, sino las **plantillas** o productos maestros.
*   **Propósito:** Crear las definiciones base para los productos que maneja Logicarga (ej: "Rollo de Tela Algodón 1.5m", "Tanque IBC Químico X").
*   **Flujo:** Antes de poder ingresar inventario de un nuevo tipo de producto, primero debes crear su plantilla aquí, especificando su SKU, nombre, y tipo (Rollo de Tela o Tanque IBC).

### 4.3 Ubicaciones
Aquí se define la estructura física de tu almacén.
*   **Propósito:** Crear y gestionar todas las coordenadas donde se puede almacenar un item.
*   **Flujo:** Cada ubicación se define por `Pasillo`, `Estante`, `Nivel` y `Posición`. Opcionalmente, se puede asignar un `Código de Barras` único a cada ubicación para facilitar el escaneo durante la verificación.

### 4.4 Recepción de Mercancía (Flujo de Ingreso)
Este es un proceso de dos pasos que utiliza dos módulos diferentes.

#### Paso 1: Cargar Packing List
*   **Módulo:** `Packing Lists`
*   **Propósito:** Pre-registrar una gran cantidad de items que están por llegar al almacén.
*   **Flujo:**
    1.  Haz clic en "Cargar Packing List".
    2.  Sube un archivo `.csv` con las siguientes columnas: `serial_number`, `sku`, `meterage` (para rollos), `weight_kg` (para tanques).
    3.  El sistema procesará el archivo y creará todos los items en la base de datos con el estado **"en verificación"**.

#### Paso 2: Verificación y Ubicación
*   **Módulo:** `Verificación`
*   **Propósito:** Confirmar la recepción física de un item y asignarle su primera ubicación en el almacén.
*   **Flujo:**
    1.  El operador de almacén tiene un item físico en mano.
    2.  En la interfaz de "escaneo", introduce el `N/S del Item` (escaneado del código QR del producto).
    3.  Introduce el `C/B de la Ubicación` (escaneado del código de la estantería).
    4.  Al confirmar, el sistema cambia el estado del item a **"disponible"** y lo asocia a esa ubicación.

### 4.5 Inventario y Movimientos Internos
*   **Módulo:** `Inventario`
*   **Propósito:** Visualizar todo el inventario físico disponible y moverlo dentro del almacén.
*   **Flujo de Visualización:** La tabla principal muestra todos los items, su ubicación, estado y detalles (metraje/peso).
*   **Flujo de Movimiento:**
    1.  Haz clic en el botón "Mover" en la fila del item que deseas reubicar.
    2.  Se abrirá un formulario donde seleccionarás la nueva ubicación.
    3.  Al confirmar, el sistema actualiza la ubicación del item y deja un registro de auditoría en la tabla `inventory_movements`.

### 4.6 Despachos
*   **Módulo:** `Despachos`
*   **Propósito:** Gestionar la salida de mercancía para los clientes.
*   **Flujo:**
    1.  Crea un "Nuevo Despacho" y selecciona un cliente.
    2.  Usa el buscador de items para encontrar inventario **disponible**. El buscador prioriza los items más antiguos (FIFO).
    3.  Añade los items al despacho. Si es un rollo de tela, puedes especificar un **metraje parcial** a despachar.
    4.  Al confirmar, el sistema crea el despacho, actualiza el estado de los items y, en caso de un despacho parcial, crea un nuevo item con el metraje remanente.

---

## 5. Lógica de Backend (Supabase)

La automatización y seguridad del sistema se apoya en varias funciones de Supabase:

*   **Edge Function `upload-packing-list`:** Procesa los archivos CSV subidos.
*   **RPC `move_inventory_item`:** Garantiza que los movimientos internos se ejecuten de forma atómica (actualización y log).
*   **RPC `create_dispatch`:** Maneja la compleja lógica de creación de despachos, incluyendo los despachos parciales.
*   **RPC `verify_and_place_item`:** Finaliza el proceso de ingreso de mercancía.

---

## 6. Mejoras Futuras

*   **Trazabilidad Completa:** Desarrollar una vista que muestre el historial completo de un número de serie.
*   **Dashboard y Analítica:** Actualizar estas secciones para que muestren KPIs relevantes para el WMS (ej: rotación de inventario, capacidad de almacén).
*   **Detalles de Despacho:** Implementar la vista de detalle para mostrar qué items específicos se incluyeron en un despacho.
*   **Roles y Permisos:** Refinar las políticas de RLS para distintos tipos de usuario (operador, supervisor, administrador).