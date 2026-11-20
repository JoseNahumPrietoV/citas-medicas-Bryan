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
