# Sistema de Gestión de Citas Médicas - Neo4j

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

1. Clona este repositorio en tu equipo: