# Sistema de Gestión de Citas Médicas - Neo4j-Base de Datos Migración Mongo DB Atlas

## Arquitectura y Stack Tecnológico del Backend

El sistema está estructurado bajo una arquitectura modular en Node.js, implementando una API REST segura para la gestión integral de citas médicas, autenticación de usuarios y control de accesos basado en roles.

### Tecnologías y Dependencias Principales (`package.json`)

* **Entorno de Ejecución:** Node.js[cite: 16]
* **Framework Web:** Express (`^4.19.2`) para la creación de rutas, middlewares y manejo de solicitudes HTTP[cite: 16].
* **Base de Datos NoSQL:** MongoDB Atlas mediante Mongoose (`^8.3.1`) para el modelado de datos y esquemas de documentos[cite: 16].
* **Autenticación y Seguridad:** 
  * JSON Web Tokens (`jsonwebtoken: ^9.0.2`) para la gestión de sesiones seguras y control de acceso por roles[cite: 16].
  * BcryptJS (`^2.4.3`) para el cifrado y encriptación de contraseñas de usuarios[cite: 16].
* **Utilidades y Configuración:** 
  * Cors (`^2.8.5`) para habilitar políticas de intercambio de recursos de origen cruzado[cite: 16].
  * Dotenv (`^16.4.5`) para la gestión segura de variables de entorno (puertos y cadenas de conexión)[cite: 16].

---

## Estructura del Servidor y Código Fuente (`src/`)

El proyecto sigue una organización limpia por capas para separar responsabilidades:

* **`src/index.js`** : Archivo principal de entrada. Configura la aplicación Express, middlewares globales (`cors`, `express.json()`, archivos estáticos en `public/`), inicializa las rutas del sistema y establece la conexión con MongoDB Atlas[cite: 17].
* **`src/routes/`** : Contiene los enrutadores de la API orientados a los distintos módulos:
  * `authRoutes.js` : Rutas de registro e inicio de sesión de usuarios.
  * `appointmentRoutes.js` : Endpoints para la creación, consulta y actualización de citas médicas.
  * `adminRoutes.js` : Rutas exclusivas para la administración del sistema.
* **`src/controllers/`** : Lógica de negocio que procesa las peticiones HTTP, interactúa con los modelos de Mongoose y devuelve las respuestas JSON correspondientes.
* **`src/models/`** : Esquemas de Mongoose que definen la estructura de los documentos en la base de datos (Usuarios, Roles, Citas).
* **`src/middlewares/`** : Funciones intermedias para la validación de tokens JWT y verificación de permisos por roles de usuario (Pacientes, Doctores, Administradores).
* **`public/`** : Interfaz web estática del cliente (paneles de control, vistas de inicio de sesión y gestión de citas en HTML/JS).


Este proyecto implementa un modelo de base de datos en grafo utilizando **Neo4j** para gestionar de forma eficiente la asignación de citas médicas, control de usuarios, roles y permisos de acceso institucional.

## Descripción del Proyecto

El sistema modela un entorno clínico en el cual interactúan pacientes, doctores y administradores. Mediante el uso de grafos, se establecen relaciones directas y seguras para agendar citas, verificar historiales y aplicar políticas de control de acceso basado en roles (RBAC).

## Tecnologías Utilizadas

* **Base de datos:** Neo4j (Instancia local Desktop v.2026.10.1)
* **Lenguaje de Consultas:** Cypher
* **Control de Versiones:** Git / GitHub (Organización: *Pollitos en Fuga ;)*)

## Arquitectura y Esquema del Grafo

El modelo de datos se compone de los siguientes nodos principales y sus respectivas relaciones:

| Nodo (Label) | Propiedades Principales | Descripción |
| :--- | :--- | :--- |
| `Usuario` | `id`, `nombre`, `email`, `especialidad` | Representa a los actores del sistema (Pacientes, Doctores). |
| `Rol` | `nombre` | Define el nivel de autoridad (`Paciente`, `Doctor`, `Administrador`). |
| `Permiso` | `nombre`, `descripcion` | Acciones atómicas permitidas (`CREAR_CITA`, `VER_HISTORIAL`, etc.). |
| `Cita` | `id`, `fecha`, `hora`, `estado` | Representa la cita médica agendada. |

### Relaciones Clave
* `(:Usuario)-[:TIENE_ROL]->(:Rol)`
* `(:Rol)-[:TIENE_PERMISO]->(:Permiso)`
* `(:Usuario)-[:SOLICITO]->(:Cita)`
* `(:Usuario)-[:ATIENDE]->(:Cita)`

## Estructura del Repositorio

* **`citas_script.cypher`** : Script automatizado en Cypher para la creación de la estructura, nodos, roles, permisos y relaciones de prueba.

## Instrucciones de Ejecución

Si deseas desplegar e inicializar este grafo localmente:

1. Clona este repositorio en tu equipo