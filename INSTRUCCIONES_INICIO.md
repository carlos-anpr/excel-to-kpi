# Guía de Inicio Rápido

Este proyecto utiliza un archivo `package.json` en la raíz para orquestar tanto el Backend (Python) como el Frontend (React), funcionando de manera similar a un `Makefile`.

## Prerrequisitos
1.  **Python 3.10+** instalado y agregado al PATH.
2.  **Node.js 18+** instalado.

## 1. Instalación Inicial (Setup)
Ejecuta este comando en la raíz del proyecto para crear el entorno virtual de Python, instalar dependencias de Python y dependencias de Node.js:

```bash
npm run setup
```

> **Nota:** Si falla la parte de Python, asegúrate de tener `python` en tu PATH.
> Este comando ejecuta internamente:
> 1. `setup:backend`: Crea `venv` e instala `requirements.txt`.
> 2. `setup:frontend`: Ejecuta `npm install` en la carpeta frontend.

## 2. Ejecutar los Servidores
Necesitarás dos terminales abiertas en la raíz del proyecto.

**Terminal 1: Backend**
```bash
npm run dev:backend
```
*   Inicia el servidor FastAPI en `http://localhost:8000`.
*   Documentación automática (Swagger) en `http://localhost:8000/docs`.

**Terminal 2: Frontend**
```bash
npm run dev:frontend
```
*   Inicia el servidor de desarrollo Vite en `http://localhost:5173`.

## Solución de Problemas Comunes

### "python no se reconoce..."
Asegúrate de que Python está instalado. En Windows, puedes probar si `py` funciona y editar el `package.json` cambiando `python` por `py`.

### Error de permisos en PowerShell
Si ves un error sobre "la ejecución de scripts está deshabilitada", abre PowerShell como Administrador y ejecuta:
```powershell
Set-ExecutionPolicy RemoteSigned
```
O usa `Command Prompt (cmd)` en lugar de PowerShell.
