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
