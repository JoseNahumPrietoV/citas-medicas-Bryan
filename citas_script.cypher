// 1. Crear Permisos
CREATE (p1:Permiso {nombre: 'CREAR_CITA', descripcion: 'Permite agendar citas'});
CREATE (p2:Permiso {nombre: 'VER_HISTORIAL', descripcion: 'Permite consultar historial medico'});
CREATE (p3:Permiso {nombre: 'CANCELAR_CITA', descripcion: 'Permite cancelar citas existentes'});

// 2. Crear Roles
CREATE (r1:Rol {nombre: 'Paciente'});
CREATE (r2:Rol {nombre: 'Doctor'});
CREATE (r3:Rol {nombre: 'Administrador'});

// 3. Asignar Permisos a Roles
MATCH (r1:Rol {nombre: 'Paciente'}), (p1:Permiso {nombre: 'CREAR_CITA'}) CREATE (r1)-[:TIENE_PERMISO]->(p1);
MATCH (r1:Rol {nombre: 'Paciente'}), (p3:Permiso {nombre: 'CANCELAR_CITA'}) CREATE (r1)-[:TIENE_PERMISO]->(p3);
MATCH (r2:Rol {nombre: 'Doctor'}), (p1:Permiso {nombre: 'CREAR_CITA'}) CREATE (r2)-[:TIENE_PERMISO]->(p1);
MATCH (r2:Rol {nombre: 'Doctor'}), (p2:Permiso {nombre: 'VER_HISTORIAL'}) CREATE (r2)-[:TIENE_PERMISO]->(p2);
MATCH (r2:Rol {nombre: 'Doctor'}), (p3:Permiso {nombre: 'CANCELAR_CITA'}) CREATE (r2)-[:TIENE_PERMISO]->(p3);
MATCH (r3:Rol {nombre: 'Administrador'}), (p1:Permiso {nombre: 'CREAR_CITA'}) CREATE (r3)-[:TIENE_PERMISO]->(p1);
MATCH (r3:Rol {nombre: 'Administrador'}), (p2:Permiso {nombre: 'VER_HISTORIAL'}) CREATE (r3)-[:TIENE_PERMISO]->(p2);
MATCH (r3:Rol {nombre: 'Administrador'}), (p3:Permiso {nombre: 'CANCELAR_CITA'}) CREATE (r3)-[:TIENE_PERMISO]->(p3);

// 4. Crear Usuarios de prueba y asignarles su rol
CREATE (u1:Usuario {id: 1, nombre: 'Juan Perez', email: 'juan@example.com'});
CREATE (u2:Usuario {id: 2, nombre: 'Dra. Maria Lopez', especialidad: 'Cardiologia'});
MATCH (u1:Usuario {id: 1}), (r1:Rol {nombre: 'Paciente'}) CREATE (u1)-[:TIENE_ROL]->(r1);
MATCH (u2:Usuario {id: 2}), (r2:Rol {nombre: 'Doctor'}) CREATE (u2)-[:TIENE_ROL]->(r2);

// 5. Crear Cita Médica y relacionarla
CREATE (c1:Cita {id: 101, fecha: '2026-11-10', hora: '10:00', estado: 'Pendiente'});
MATCH (u1:Usuario {nombre: 'Juan Perez'}), (c1:Cita {id: 101}), (u2:Usuario {nombre: 'Dra. Maria Lopez'})
CREATE (u1)-[:SOLICITO]->(c1)
CREATE (u2)-[:ATIENDE]->(c1);