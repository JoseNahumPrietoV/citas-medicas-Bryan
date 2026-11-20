# Práctica 11 — RBAC con Built-in Roles en Neo4j

**Proyecto:** Sistema de Gestión de Citas Médicas  
**Fecha de ejecución:** 2026-11-20  
**Instancia utilizada:** Neo4j Enterprise local, `bolt://127.0.0.1:7687`, base de datos `neo4j`  
**Entregables:** `rbac_practica11.cypher`, `scripts/test_rbac_neo4j.js`, `rbac_practica11_results.json`, este manual.

---

## 1. Objetivo

Configurar control de acceso basado en roles (**RBAC**) en Neo4j usando tres **Built-in Roles** oficiales (`reader`, `editor`, `architect`), tres usuarios nativos distintos y un conjunto de querys de prueba sobre el modelo de citas médicas del proyecto.

Se valida que:

- Un usuario `reader` pueda **leer** el grafo pero no modificarlo ni administrar seguridad.
- Un usuario `editor` pueda **leer y escribir datos** pero no crear esquema ni usuarios.
- Un usuario `architect` pueda **leer, escribir y administrar índices/constraints** pero no administrar usuarios ni roles.
- Los comandos administrativos (`SHOW USERS`, `SHOW ROLES`, `SHOW USER ... PRIVILEGES`) funcionen con una cuenta `admin`.

> Los roles `Rol` del grafo (`Paciente`, `Doctor`, `Administrador`) en `citas_script.cypher` son **roles de dominio modelados como nodos**. Los roles de esta práctica son **roles nativos del DBMS Neo4j** y se gestionan con comandos Cypher de administración. No deben confundirse.

---

## 2. Marco teórico

### 2.1 RBAC en Neo4j

Neo4j Enterprise implementa RBAC mediante cuatro conceptos:

| Concepto | Descripción |
|---|---|
| Usuario | Identidad nativa creada con `CREATE USER`. |
| Rol | Conjunto de privilegios asignado con `GRANT ROLE`. |
| Privilegio | Permiso atómico sobre base de datos, grafo, esquema o DBMS. |
| `PUBLIC` | Rol implícito que recibe todo usuario. Aporta acceso base y ejecución de procedimientos/funciones. |

Los privilegios efectivos de un usuario son la **unión** de los privilegios de `PUBLIC` y de todos sus roles asignados.

Los Built-in Roles son jerárquicos:

```text
PUBLIC < reader < editor < publisher < architect < admin
```

Los roles integrados **no se crean**: ya existen en Neo4j Enterprise y son inmutables. La práctica solo los **asigna** con `GRANT ROLE`.

### 2.2 Roles utilizados

| Built-in Role | Capacidades principales | Restricciones relevantes para la práctica |
|---|---|---|
| `reader` | `ACCESS`, `MATCH` en nodos y relaciones, `SHOW INDEX`, `SHOW CONSTRAINT`. | No puede `WRITE`, no puede crear índices/constraints, no puede ver ni crear usuarios/roles. |
| `editor` | Todo lo de `reader` + `WRITE` sobre el grafo. | No puede crear nuevos labels, property keys ni relationship types; no puede administrar esquema ni seguridad. |
| `architect` | Todo lo de `editor` + `NAME MANAGEMENT` + `INDEX MANAGEMENT` + `CONSTRAINT MANAGEMENT`. | No puede administrar usuarios, roles, privileges ni bases de datos. |
| `admin` | Todas las capacidades anteriores + administración de DBMS, usuarios, roles y privilegios. | No se asigna a los tres usuarios de prueba; se usa solo para validación. |

> Esta práctica requiere **Neo4j Enterprise**. En Community Edition no existen roles nativos y todos los usuarios tienen privilegios administrativos implícitos, por lo que las pruebas de denegación no serían válidas.

---

## 3. Modelo de datos usado

Tomado de `citas_script.cypher`:

| Nodo | Propiedades principales |
|---|---|
| `Usuario` | `id`, `nombre`, `email`, `especialidad` |
| `Rol` | `nombre` |
| `Permiso` | `nombre`, `descripcion` |
| `Cita` | `id`, `fecha`, `hora`, `estado` |

Relaciones:

```text
(:Usuario)-[:TIENE_ROL]->(:Rol)
(:Rol)-[:TIENE_PERMISO]->(:Permiso)
(:Usuario)-[:SOLICITO]->(:Cita)
(:Usuario)-[:ATIENDE]->(:Cita)
```

Datos base semilla usados en las pruebas:

- `Juan Perez` → `SOLICITO` → `Cita {id: 101}`
- `Dra. Maria Lopez` → `ATIENDE` → `Cita {id: 101}`
- `Cita 101`: `2026-11-10`, `10:00`, `Confirmada`

---

## 4. Matriz de usuarios, roles y permisos

| Usuario nativo | Rol nativo asignado | Roles efectivos | Permisos clave | Restricciones verificadas |
|---|---|---|---|---|
| `usr_consulta_reader` | `reader` | `PUBLIC`, `reader` | Leer nodos/relaciones; ver índices y constraints. | `SET` sobre Cita → `Forbidden`; `SHOW USERS` → `Forbidden`. |
| `usr_agenda_editor` | `editor` | `PUBLIC`, `editor` | Leer y escribir datos; crear/actualizar/eliminar `Cita`. | `CREATE CONSTRAINT` → `Forbidden`; `CREATE USER` → `Forbidden`. |
| `usr_esquema_architect` | `architect` | `PUBLIC`, `architect` | Leer, escribir, `SHOW CONSTRAINTS`, `CREATE/DROP CONSTRAINT`. | `SHOW USERS` → `Forbidden`. |
| `neo4j` | `admin` | `PUBLIC`, `admin` | Administración completa; usado solo para validación. | No se usa para querys de negocio en la prueba. |

---

## 5. Requisitos previos

1. Neo4j **Enterprise** iniciado en `bolt://127.0.0.1:7687`.
2. Base de datos `neo4j` disponible.
3. Credenciales de un usuario con rol `admin`.
4. Node.js 18+ y el driver oficial:

```powershell
npm install neo4j-driver@^5 --save
```

5. Ejecutar primero `citas_script.cypher` o permitir que `rbac_practica11.cypher` cree los datos base con `MERGE`.

---

## 6. Script de configuración y validación

Archivo: `rbac_practica11.cypher`

> Las contraseñas que aparecen en el archivo son **valores de ejemplo**. Sustitúyelos por los de tu entorno antes de ejecutarlo. Durante la ejecución real se usaron contraseñas temporales mediante variables de entorno, sin guardarlas en el repositorio.

```cypher
CREATE USER usr_consulta_reader IF NOT EXISTS
SET PASSWORD 'Reader_Practica11_2026!'
CHANGE NOT REQUIRED;

CREATE USER usr_agenda_editor IF NOT EXISTS
SET PASSWORD 'Editor_Practica11_2026!'
CHANGE NOT REQUIRED;

CREATE USER usr_esquema_architect IF NOT EXISTS
SET PASSWORD 'Architect_Practica11_2026!'
CHANGE NOT REQUIRED;

GRANT ROLE reader TO usr_consulta_reader;
GRANT ROLE editor TO usr_agenda_editor;
GRANT ROLE architect TO usr_esquema_architect;

SHOW USERS;
SHOW ROLES;
SHOW POPULATED ROLES WITH USERS;
SHOW USER usr_consulta_reader PRIVILEGES AS COMMANDS;
SHOW USER usr_agenda_editor PRIVILEGES AS COMMANDS;
SHOW USER usr_esquema_architect PRIVILEGES AS COMMANDS;
SHOW ROLE reader PRIVILEGES AS COMMANDS;
SHOW ROLE editor PRIVILEGES AS COMMANDS;
SHOW ROLE architect PRIVILEGES AS COMMANDS;

MERGE (p1:Permiso {nombre: 'CREAR_CITA'})
  ON CREATE SET p1.descripcion = 'Permite agendar citas'
MERGE (p2:Permiso {nombre: 'VER_HISTORIAL'})
  ON CREATE SET p2.descripcion = 'Permite consultar historial medico'
MERGE (p3:Permiso {nombre: 'CANCELAR_CITA'})
  ON CREATE SET p3.descripcion = 'Permite cancelar citas existentes'
MERGE (r1:Rol {nombre: 'Paciente'})
MERGE (r2:Rol {nombre: 'Doctor'})
MERGE (r3:Rol {nombre: 'Administrador'})
MERGE (r1)-[:TIENE_PERMISO]->(p1)
MERGE (r1)-[:TIENE_PERMISO]->(p3)
MERGE (r2)-[:TIENE_PERMISO]->(p1)
MERGE (r2)-[:TIENE_PERMISO]->(p2)
MERGE (r2)-[:TIENE_PERMISO]->(p3)
MERGE (r3)-[:TIENE_PERMISO]->(p1)
MERGE (r3)-[:TIENE_PERMISO]->(p2)
MERGE (r3)-[:TIENE_PERMISO]->(p3)
MERGE (u1:Usuario {id: 1})
  ON CREATE SET u1.nombre = 'Juan Perez', u1.email = 'juan@example.com'
MERGE (u2:Usuario {id: 2})
  ON CREATE SET u2.nombre = 'Dra. Maria Lopez', u2.especialidad = 'Cardiologia'
MERGE (u1)-[:TIENE_ROL]->(r1)
MERGE (u2)-[:TIENE_ROL]->(r2)
MERGE (c1:Cita {id: 101})
  ON CREATE SET c1.fecha = '2026-11-10', c1.hora = '10:00', c1.estado = 'Pendiente'
MERGE (u1)-[:SOLICITO]->(c1)
MERGE (u2)-[:ATIENDE]->(c1);

MATCH (u:Usuario)-[rel]->(c:Cita)
RETURN u.nombre AS usuario, type(rel) AS relacion, c.id AS cita, c.estado AS estado
ORDER BY cita, usuario;

MATCH (c:Cita {id: 101})
SET c.estado = 'Confirmada'
RETURN c.id AS cita, c.estado AS estado;

CREATE (c:Cita {id: 901, fecha: '2026-12-01', hora: '11:00', estado: 'Pendiente'})
RETURN c.id AS cita, c.estado AS estado;

MATCH (c:Cita {id: 901})
DELETE c;

MATCH (c:Cita)
WITH c.id AS id, collect(c) AS citas
WHERE size(citas) > 1
FOREACH (c IN tail(citas) | DETACH DELETE c);

CREATE CONSTRAINT cita_id_unico IF NOT EXISTS
FOR (c:Cita) REQUIRE c.id IS UNIQUE;

SHOW CONSTRAINTS;

DROP CONSTRAINT cita_id_unico IF EXISTS;

MATCH (c:Cita {id: 101})
SET c.estado = 'Denegado por reader'
RETURN c;

CREATE (x:Cita {id: 902, fecha: '2026-12-02', hora: '12:00', estado: 'Pendiente'})
RETURN x;

CREATE CONSTRAINT cita_id_denegada IF NOT EXISTS
FOR (c:Cita) REQUIRE c.fecha IS UNIQUE;

CREATE USER usr_no_autorizado IF NOT EXISTS
SET PASSWORD 'NoAutorizado_Practica11_2026!'
CHANGE NOT REQUIRED;

SHOW USERS;
```

### 6.1 Matriz de querys del script

| ID | Usuario | Query | Resultado esperado |
|---|---|---|---|
| R-01 | `usr_consulta_reader` | Consultar `Cita` y relaciones | Permitida |
| R-02 | `usr_consulta_reader` | `SET c.estado` | `Neo.ClientError.Security.Forbidden` |
| R-03 | `usr_consulta_reader` | `SHOW USERS` | `Neo.ClientError.Security.Forbidden` |
| E-01 | `usr_agenda_editor` | Consultar paciente-doctor-cita | Permitida |
| E-02 | `usr_agenda_editor` | Crear `Cita {id: 901}` | Permitida |
| E-03 | `usr_agenda_editor` | `CREATE CONSTRAINT` | `Neo.ClientError.Security.Forbidden` |
| E-04 | `usr_agenda_editor` | `CREATE USER` | `Neo.ClientError.Security.Forbidden` |
| A-01 | `usr_esquema_architect` | `SHOW CONSTRAINTS` | Permitida |
| A-02 | `usr_esquema_architect` | Crear constraint sobre `Cita.id` | Permitida |
| A-03 | `usr_esquema_architect` | `SHOW USERS` | `Neo.ClientError.Security.Forbidden` |

---

## 7. Script automatizado de pruebas

Archivo: `scripts/test_rbac_neo4j.js`

El script:

- Abre una conexión Bolt distinta para cada uno de los 3 usuarios.
- Ejecuta 10 querys de la matriz anterior.
- Marca `PASS` cuando:
  - una query permitida termina sin error, o
  - una query restringida devuelve exactamente `Neo.ClientError.Security.Forbidden`.
- Ejecuta validaciones administrativas si se define `NEO4J_ADMIN_PASSWORD`.
- Detecta la edición del DBMS con `dbms.components()`.
- Limpia la cita `901` y el constraint `cita_id_unico`.
- Escribe el detalle en `rbac_practica11_results.json`.
- No guarda contraseñas en el reporte.

### 7.1 Variables de entorno

| Variable | Uso |
|---|---|
| `NEO4J_URI` | URI Bolt. Por defecto `bolt://127.0.0.1:7687`. |
| `NEO4J_DATABASE` | Base de datos de datos. Por defecto `neo4j`. |
| `NEO4J_ADMIN_USER` | Usuario admin para validación. Por defecto `neo4j`. |
| `NEO4J_ADMIN_PASSWORD` | Contraseña admin. Si falta, se omiten las validaciones. |
| `NEO4J_PASSWORD` | Atajo opcional usado para los 3 usuarios de práctica. |
| `NEO4J_READER_PASSWORD` | Contraseña de `usr_consulta_reader`. |
| `NEO4J_EDITOR_PASSWORD` | Contraseña de `usr_agenda_editor`. |
| `NEO4J_ARCHITECT_PASSWORD` | Contraseña de `usr_esquema_architect`. |

### 7.2 Ejecución

```powershell
$env:NEO4J_URI='bolt://127.0.0.1:7687'
$env:NEO4J_DATABASE='neo4j'
$env:NEO4J_ADMIN_USER='neo4j'
$env:NEO4J_ADMIN_PASSWORD='<tu-password-admin>'
$env:NEO4J_PASSWORD='<password-configurado-en-los-3-usuarios>'

node scripts/test_rbac_neo4j.js
```

### 7.3 Código

```javascript
const fs = require('fs');
const path = require('path');
const neo4j = require('neo4j-driver');

const URI = process.env.NEO4J_URI || 'bolt://127.0.0.1:7687';
const DATABASE = process.env.NEO4J_DATABASE || 'neo4j';
const ADMIN_USER = process.env.NEO4J_ADMIN_USER || 'neo4j';
const ADMIN_PASSWORD = process.env.NEO4J_ADMIN_PASSWORD || process.env.NEO4J_PASSWORD;
const FORBIDDEN_CODE = 'Neo.ClientError.Security.Forbidden';
const OUTPUT_FILE = path.join(__dirname, '..', 'rbac_practica11_results.json');

const USERS = [
  {
    key: 'reader',
    username: 'usr_consulta_reader',
    password: process.env.NEO4J_READER_PASSWORD || process.env.NEO4J_PASSWORD
  },
  {
    key: 'editor',
    username: 'usr_agenda_editor',
    password: process.env.NEO4J_EDITOR_PASSWORD || process.env.NEO4J_PASSWORD
  },
  {
    key: 'architect',
    username: 'usr_esquema_architect',
    password: process.env.NEO4J_ARCHITECT_PASSWORD || process.env.NEO4J_PASSWORD
  }
];

const TEST_CASES = [
  {
    id: 'R-01',
    role: 'reader',
    name: 'Consultar citas y sus relaciones',
    expected: 'allow',
    query: `MATCH (u:Usuario)-[rel]->(c:Cita)
RETURN u.nombre AS usuario, type(rel) AS relacion, c.id AS cita, c.estado AS estado
ORDER BY cita, usuario`
  },
  {
    id: 'R-02',
    role: 'reader',
    name: 'Intentar modificar el estado de una cita',
    expected: 'deny',
    query: `MATCH (c:Cita {id: 101})
SET c.estado = 'Intento reader'
RETURN c.id AS cita, c.estado AS estado`
  },
  {
    id: 'R-03',
    role: 'reader',
    name: 'Intentar listar usuarios del DBMS',
    expected: 'deny',
    query: 'SHOW USERS'
  },
  {
    id: 'E-01',
    role: 'editor',
    name: 'Consultar relaciones paciente-doctor-cita',
    expected: 'allow',
    query: `MATCH (paciente:Usuario)-[:SOLICITO]->(c:Cita)<-[:ATIENDE]-(doctor:Usuario)
RETURN paciente.nombre AS paciente, doctor.nombre AS doctor, c.id AS cita, c.estado AS estado`
  },
  {
    id: 'E-02',
    role: 'editor',
    name: 'Crear cita de prueba con id 901',
    expected: 'allow',
    query: `CREATE (c:Cita {id: 901, fecha: '2026-12-01', hora: '11:00', estado: 'Pendiente'})
RETURN c.id AS cita, c.estado AS estado`
  },
  {
    id: 'E-03',
    role: 'editor',
    name: 'Intentar crear constraint de esquema',
    expected: 'deny',
    query: `CREATE CONSTRAINT cita_id_denegada IF NOT EXISTS
FOR (c:Cita) REQUIRE c.fecha IS UNIQUE`
  },
  {
    id: 'E-04',
    role: 'editor',
    name: 'Intentar crear usuario del DBMS',
    expected: 'deny',
    query: `CREATE USER usr_creado_por_editor IF NOT EXISTS
SET PASSWORD 'NoAutorizado_Practica11_2026!'
CHANGE NOT REQUIRED`
  },
  {
    id: 'A-01',
    role: 'architect',
    name: 'Consultar constraints existentes',
    expected: 'allow',
    query: 'SHOW CONSTRAINTS'
  },
  {
    id: 'A-02',
    role: 'architect',
    name: 'Crear constraint de unicidad sobre Cita.id',
    expected: 'allow',
    query: `CREATE CONSTRAINT cita_id_unico IF NOT EXISTS
FOR (c:Cita) REQUIRE c.id IS UNIQUE`
  },
  {
    id: 'A-03',
    role: 'architect',
    name: 'Intentar listar usuarios del DBMS',
    expected: 'deny',
    query: 'SHOW USERS'
  }
];

const VALIDATION_COMMANDS = [
  { id: 'V-01', name: 'SHOW USERS', query: 'SHOW USERS' },
  { id: 'V-02', name: 'SHOW ROLES', query: 'SHOW ROLES' },
  { id: 'V-03', name: 'SHOW POPULATED ROLES WITH USERS', query: 'SHOW POPULATED ROLES WITH USERS' },
  { id: 'V-04', name: 'SHOW USER usr_consulta_reader PRIVILEGES', query: 'SHOW USER usr_consulta_reader PRIVILEGES AS COMMANDS' },
  { id: 'V-05', name: 'SHOW USER usr_agenda_editor PRIVILEGES', query: 'SHOW USER usr_agenda_editor PRIVILEGES AS COMMANDS' },
  { id: 'V-06', name: 'SHOW USER usr_esquema_architect PRIVILEGES', query: 'SHOW USER usr_esquema_architect PRIVILEGES AS COMMANDS' }
];

function createDriver(username, password) {
  return neo4j.driver(
    URI,
    neo4j.auth.basic(username, password),
    { disableLosslessIntegers: true }
  );
}

async function runQuery(driver, query, options = {}) {
  const session = driver.session(options.database ? { database: options.database } : {});
  try {
    const result = await session.run(query, options.params || {});
    return {
      records: result.records.map((record) => record.toObject()),
      updates: result.summary && result.summary.counters ? result.summary.counters.updates() : {}
    };
  } finally {
    await session.close();
  }
}

function errorInfo(error) {
  return {
    code: error.code || 'UNKNOWN',
    message: String(error.message || error).split('\n')[0]
  };
}

function evaluate(test, outcome) {
  const wasDenied = Boolean(outcome.error && outcome.error.code === FORBIDDEN_CODE);
  const expectedDeny = test.expected === 'deny';
  const status = expectedDeny ? wasDenied : !outcome.error;
  return {
    id: test.id,
    role: test.role,
    name: test.name,
    expected: expectedDeny ? 'Forbidden' : 'OK',
    actual: outcome.error ? outcome.error.code : 'OK',
    status: status ? 'PASS' : 'FAIL',
    rowCount: outcome.records ? outcome.records.length : 0,
    error: outcome.error || null,
    sample: outcome.records && outcome.records.length ? outcome.records[0] : null,
    query: test.query
  };
}

async function cleanup(drivers) {
  const cleanupActions = [
    {
      name: 'Eliminar cita de prueba id 901',
      role: 'editor',
      query: 'MATCH (c:Cita {id: 901}) DELETE c'
    },
    {
      name: 'Eliminar constraint de prueba cita_id_unico',
      role: 'architect',
      query: 'DROP CONSTRAINT cita_id_unico IF EXISTS'
    }
  ];
  const results = [];
  for (const action of cleanupActions) {
    const driver = drivers[action.role];
    if (!driver) {
      results.push({ name: action.name, status: 'SKIPPED', reason: 'Sin driver' });
      continue;
    }
    try {
      await runQuery(driver, action.query, { database: DATABASE });
      results.push({ name: action.name, status: 'OK' });
    } catch (error) {
      results.push({ name: action.name, status: 'FAIL', error: errorInfo(error) });
    }
  }
  return results;
}

async function main() {
  const missingPasswords = USERS.filter((user) => !user.password).map((user) => `NEO4J_${user.key.toUpperCase()}_PASSWORD`);
  if (missingPasswords.length) {
    throw new Error(`Faltan variables de entorno: ${missingPasswords.join(', ')}. Tambien puedes definir NEO4J_PASSWORD para los tres usuarios.`);
  }

  const drivers = {};
  for (const user of USERS) {
    drivers[user.key] = createDriver(user.username, user.password);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    uri: URI,
    database: DATABASE,
    adminUser: ADMIN_USER,
    edition: 'unknown',
    validation: [],
    tests: [],
    cleanup: []
  };

  try {
    if (ADMIN_PASSWORD) {
      const adminDriver = createDriver(ADMIN_USER, ADMIN_PASSWORD);
      try {
        try {
          const editionResult = await runQuery(
            adminDriver,
            'CALL dbms.components() YIELD edition RETURN edition LIMIT 1'
          );
          report.edition = editionResult.records.length ? editionResult.records[0].edition : 'unknown';
        } catch (error) {
          report.edition = `unknown (${errorInfo(error).code})`;
        }

        for (const command of VALIDATION_COMMANDS) {
          try {
            const outcome = await runQuery(adminDriver, command.query);
            report.validation.push({
              id: command.id,
              name: command.name,
              status: 'PASS',
              rowCount: outcome.records.length,
              sample: outcome.records.length ? outcome.records[0] : null
            });
          } catch (error) {
            report.validation.push({
              id: command.id,
              name: command.name,
              status: 'FAIL',
              error: errorInfo(error)
            });
          }
        }
      } finally {
        await adminDriver.close();
      }
    } else {
      report.validation.push({
        id: 'V-00',
        name: 'Validacion administrativa',
        status: 'SKIPPED',
        reason: 'Define NEO4J_ADMIN_PASSWORD para ejecutar SHOW USERS / SHOW ROLES / SHOW USER ... PRIVILEGES'
      });
    }

    for (const test of TEST_CASES) {
      try {
        const outcome = await runQuery(drivers[test.role], test.query, { database: DATABASE });
        report.tests.push(evaluate(test, outcome));
      } catch (error) {
        report.tests.push(evaluate(test, { error: errorInfo(error), records: [] }));
      }
    }

    report.cleanup = await cleanup(drivers);
  } finally {
    for (const driver of Object.values(drivers)) {
      await driver.close();
    }
  }

  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`URI: ${URI}`);
  console.log(`Edicion detectada: ${report.edition}`);
  console.log(`Resultados guardados en: ${OUTPUT_FILE}\n`);
  console.table(report.tests.map((test) => ({
    id: test.id,
    rol: test.role,
    prueba: test.name,
    esperado: test.expected,
    obtenido: test.actual,
    estado: test.status
  })));
  console.table(report.validation.map((item) => ({
    id: item.id,
    comando: item.name,
    estado: item.status,
    filas: item.rowCount === undefined ? '-' : item.rowCount
  })));

  const failed = report.tests.some((test) => test.status === 'FAIL')
    || report.validation.some((item) => item.status === 'FAIL')
    || report.cleanup.some((item) => item.status === 'FAIL');
  process.exitCode = failed ? 1 : 0;
}

main().catch((error) => {
  console.error(errorInfo(error).message);
  process.exitCode = 1;
});
```

---

## 8. Evidencia de ejecución real

La instancia estaba **encendida** y se confirmó edición **`enterprise`** mediante `dbms.components()`.

**Reporte crudo:** `rbac_practica11_results.json`  
**Timestamp:** `2026-11-20T06:07:57.994Z`

### 8.1 Validación de roles y privilegios

```text
URI: bolt://127.0.0.1:7687
Edicion detectada: enterprise
Resultados guardados en: C:\Users\pache\citas-medicas-Bryan\rbac_practica11_results.json
```

| ID | Comando | Estado | Filas |
|---|---|---|---|
| V-01 | `SHOW USERS` | PASS | 4 |
| V-02 | `SHOW ROLES` | PASS | 6 |
| V-03 | `SHOW POPULATED ROLES WITH USERS` | PASS | 8 |
| V-04 | `SHOW USER usr_consulta_reader PRIVILEGES` | PASS | 9 |
| V-05 | `SHOW USER usr_agenda_editor PRIVILEGES` | PASS | 10 |
| V-06 | `SHOW USER usr_esquema_architect PRIVILEGES` | PASS | 13 |

#### `SHOW USERS`

```json
[
  { "user": "neo4j",               "roles": ["admin", "PUBLIC"],     "passwordChangeRequired": false, "suspended": false, "home": null },
  { "user": "usr_agenda_editor",   "roles": ["editor", "PUBLIC"],    "passwordChangeRequired": false, "suspended": false, "home": null },
  { "user": "usr_consulta_reader", "roles": ["reader", "PUBLIC"],    "passwordChangeRequired": false, "suspended": false, "home": null },
  { "user": "usr_esquema_architect","roles": ["architect", "PUBLIC"],"passwordChangeRequired": false, "suspended": false, "home": null }
]
```

#### `SHOW ROLES`

```json
[
  { "role": "PUBLIC" },
  { "role": "admin" },
  { "role": "architect" },
  { "role": "editor" },
  { "role": "publisher" },
  { "role": "reader" }
]
```

#### `SHOW POPULATED ROLES WITH USERS`

```json
[
  { "role": "PUBLIC",    "member": "neo4j" },
  { "role": "PUBLIC",    "member": "usr_consulta_reader" },
  { "role": "PUBLIC",    "member": "usr_agenda_editor" },
  { "role": "PUBLIC",    "member": "usr_esquema_architect" },
  { "role": "admin",     "member": "neo4j" },
  { "role": "architect", "member": "usr_esquema_architect" },
  { "role": "editor",    "member": "usr_agenda_editor" },
  { "role": "reader",    "member": "usr_consulta_reader" }
]
```

### 8.2 Resultado de las 10 querys de prueba

| ID | Rol | Prueba | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|
| R-01 | reader | Consultar citas y sus relaciones | OK | OK | **PASS** |
| R-02 | reader | Intentar modificar el estado de una cita | Forbidden | `Neo.ClientError.Security.Forbidden` | **PASS** |
| R-03 | reader | Intentar listar usuarios del DBMS | Forbidden | `Neo.ClientError.Security.Forbidden` | **PASS** |
| E-01 | editor | Consultar relaciones paciente-doctor-cita | OK | OK | **PASS** |
| E-02 | editor | Crear cita de prueba con id 901 | OK | OK | **PASS** |
| E-03 | editor | Intentar crear constraint de esquema | Forbidden | `Neo.ClientError.Security.Forbidden` | **PASS** |
| E-04 | editor | Intentar crear usuario del DBMS | Forbidden | `Neo.ClientError.Security.Forbidden` | **PASS** |
| A-01 | architect | Consultar constraints existentes | OK | OK | **PASS** |
| A-02 | architect | Crear constraint de unicidad sobre `Cita.id` | OK | OK | **PASS** |
| A-03 | architect | Intentar listar usuarios del DBMS | Forbidden | `Neo.ClientError.Security.Forbidden` | **PASS** |

**Resultado global: 10/10 PASS.**

### 8.3 Mensajes reales de denegación

```text
R-02: Set property for property 'estado' on database 'neo4j' is not allowed for user 'usr_consulta_reader' with roles [PUBLIC, reader].

R-03: Permission has not been granted for SHOW USER. Try executing SHOW USER PRIVILEGES to determine the missing or denied privileges.

E-03: Schema operation 'create_constraint' on database 'neo4j' is not allowed for user 'usr_agenda_editor' with roles [PUBLIC, editor].

E-04: Permission has not been granted for CREATE USER. Try executing SHOW USER PRIVILEGES to determine the missing or denied privileges.

A-03: Permission has not been granted for SHOW USER. Try executing SHOW USER PRIVILEGES to determine the missing or denied privileges.
```

### 8.4 Muestras de filas correctas

```json
R-01 → { "usuario": "Dra. Maria Lopez", "relacion": "ATIENDE", "cita": 101, "estado": "Confirmada" }
E-01 → { "paciente": "Juan Perez", "doctor": "Dra. Maria Lopez", "cita": 101, "estado": "Confirmada" }
E-02 → { "cita": 901, "estado": "Pendiente" }
A-01 → 0 filas antes de crear el constraint de prueba
A-02 → constraint `cita_id_unico` creado correctamente
```

### 8.5 Limpieza posterior

```json
[
  { "name": "Eliminar cita de prueba id 901", "status": "OK" },
  { "name": "Eliminar constraint de prueba cita_id_unico", "status": "OK" }
]
```

---

## 9. Análisis

- `reader` cumplió el principio de **menor privilegio**: solo lectura. Sus intentos de `WRITE` y de consultar seguridad fueron rechazados con `Forbidden`.
- `editor` pudo manipular datos de citas, pero Neo4j bloqueó `CREATE CONSTRAINT` y `CREATE USER`. Esto confirma que `editor` no posee `CONSTRAINT MANAGEMENT` ni `USER MANAGEMENT`.
- `architect` pudo inspeccionar y crear esquema, pero no listar usuarios. Confirma que el rol administrativo `admin` no está implícito en `architect`.
- `PUBLIC` aparece en todos los usuarios, tal como lo define Neo4j Enterprise.
- La cuenta `neo4j` con rol `admin` fue necesaria únicamente para `SHOW USERS`, `SHOW ROLES` y `SHOW USER ... PRIVILEGES`.

---

## 10. Plantilla para pegar evidencia si Neo4j estuviera apagado

```text
Fecha:
Edición detectada:
URI:
Base de datos:

Validación:
- SHOW USERS: [PEGAR SALIDA]
- SHOW ROLES: [PEGAR SALIDA]
- SHOW USER usr_consulta_reader PRIVILEGES: [PEGAR SALIDA]
- SHOW USER usr_agenda_editor PRIVILEGES: [PEGAR SALIDA]
- SHOW USER usr_esquema_architect PRIVILEGES: [PEGAR SALIDA]

Pruebas:
- R-01 reader lectura: PASS/FAIL
- R-02 reader WRITE: Forbidden / otro
- R-03 reader SHOW USERS: Forbidden / otro
- E-01 editor lectura: PASS/FAIL
- E-02 editor CREATE Cita: PASS/FAIL
- E-03 editor CREATE CONSTRAINT: Forbidden / otro
- E-04 editor CREATE USER: Forbidden / otro
- A-01 architect SHOW CONSTRAINTS: PASS/FAIL
- A-02 architect CREATE CONSTRAINT: PASS/FAIL
- A-03 architect SHOW USERS: Forbidden / otro

Captura de consola:
[PEGAR AQUÍ]
```

---

## 11. Referencias

- Neo4j Operations Manual — Built-in roles and privileges: `https://neo4j.com/docs/operations-manual/current/authentication-authorization/built-in-roles/`
- Neo4j Operations Manual — Role-based access control: `https://neo4j.com/docs/operations-manual/current/authentication-authorization/manage-privileges/`
- Neo4j Operations Manual — Manage users: `https://neo4j.com/docs/operations-manual/current/authentication-authorization/manage-users/`
