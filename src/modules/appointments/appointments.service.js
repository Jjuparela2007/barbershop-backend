const { pool } = require('../../config/database');

// ── Calcular slots disponibles ─────────────────────────────────
async function getAvailableSlots(barberId, date, serviceDuration) {
  const dayOfWeek = new Date(date + 'T12:00:00').getDay();
  const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;

  const [scheduleRows] = await pool.query(
    `SELECT start_time, end_time, break_start, break_end
     FROM barber_schedules
     WHERE barber_id = ? AND day_of_week = ?`,
    [barberId, isoDay]
  );

  if (scheduleRows.length === 0) return [];

  const schedule = scheduleRows[0];

  const [fullDayBlock] = await pool.query(
    `SELECT id FROM barber_blocked_times
     WHERE barber_id = ? AND blocked_date = ?
       AND start_time IS NULL AND end_time IS NULL`,
    [barberId, date]
  );

  if (fullDayBlock.length > 0) return [];

  const [existingAppointments] = await pool.query(
    `SELECT start_time, end_time
     FROM appointments
     WHERE barber_id = ? AND appointment_date = ?
       AND status NOT IN ('cancelled', 'no_show')`,
    [barberId, date]
  );

  const [partialBlocks] = await pool.query(
    `SELECT start_time, end_time
     FROM barber_blocked_times
     WHERE barber_id = ? AND blocked_date = ?
       AND start_time IS NOT NULL`,
    [barberId, date]
  );

  const slots = [];
  const [startH, startM] = schedule.start_time.split(':').map(Number);
  const [endH,   endM]   = schedule.end_time.split(':').map(Number);

  let current = startH * 60 + startM;
  const end   = endH   * 60 + endM;

  // Fecha de hoy en Colombia UTC-5
  const nowUTC        = new Date();
  const nowColombia   = new Date(nowUTC.getTime() - 5 * 60 * 60 * 1000);
  const todayColombia = nowColombia.toISOString().split('T')[0];
  const nowMins       = nowColombia.getUTCHours() * 60 + nowColombia.getUTCMinutes();

  while (current + serviceDuration <= end) {
    const slotStart = current;
    const slotEnd   = current + serviceDuration;

    let isAvailable = true;

    // Verificar descanso
    if (schedule.break_start && schedule.break_end) {
      const [bsH, bsM] = schedule.break_start.split(':').map(Number);
      const [beH, beM] = schedule.break_end.split(':').map(Number);
      const breakStart = bsH * 60 + bsM;
      const breakEnd   = beH * 60 + beM;
      if (slotStart < breakEnd && slotEnd > breakStart) {
        isAvailable = false;
      }
    }

    // Verificar citas existentes
    if (isAvailable) {
      for (const appt of existingAppointments) {
        const [aH, aM] = appt.start_time.split(':').map(Number);
        const [bH, bM] = appt.end_time.split(':').map(Number);
        const apptStart = aH * 60 + aM;
        const apptEnd   = bH * 60 + bM;
        if (slotStart < apptEnd && slotEnd > apptStart) {
          isAvailable = false;
          break;
        }
      }
    }

    // Verificar bloqueos parciales
    if (isAvailable) {
      for (const block of partialBlocks) {
        const [bsH, bsM] = block.start_time.split(':').map(Number);
        const [beH, beM] = block.end_time.split(':').map(Number);
        const blockStart = bsH * 60 + bsM;
        const blockEnd   = beH * 60 + beM;
        if (slotStart < blockEnd && slotEnd > blockStart) {
          isAvailable = false;
          break;
        }
      }
    }

    // Verificar que no sea hora pasada si es hoy
    if (isAvailable && date === todayColombia) {
      if (slotStart <= nowMins + 30) {
        isAvailable = false;
      }
    }

    if (isAvailable) {
      const formatTime = (mins) => {
        const h = Math.floor(mins / 60).toString().padStart(2, '0');
        const m = (mins % 60).toString().padStart(2, '0');
        return `${h}:${m}`;
      };

      slots.push({
        start_time: formatTime(slotStart),
        end_time:   formatTime(slotEnd),
      });
    }

    current += 30;
  }

  return slots;
}

// ── Crear cita ─────────────────────────────────────────────────
async function create({ client_id, barber_id, service_id, appointment_date, start_time, notes }) {
  // Validar que la fecha no sea en el pasado
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const apptDate = new Date(appointment_date + 'T00:00:00');

  if (apptDate < today) {
    throw { status: 400, message: 'No puedes agendar citas en fechas pasadas' };
  }

  const [serviceRows] = await pool.query(
    'SELECT duration_minutes FROM services WHERE id = ? AND is_active = 1',
    [service_id]
  );

  if (!serviceRows[0]) {
    throw { status: 404, message: 'Servicio no encontrado' };
  }

  const duration = serviceRows[0].duration_minutes;

  const [h, m]  = start_time.split(':').map(Number);
  const endMins = h * 60 + m + duration;
  const endH    = Math.floor(endMins / 60).toString().padStart(2, '0');
  const endM    = (endMins % 60).toString().padStart(2, '0');
  const end_time = `${endH}:${endM}`;

  const slots = await getAvailableSlots(barber_id, appointment_date, duration);
  const isAvailable = slots.some(s => s.start_time === start_time);

  if (!isAvailable) {
    throw { status: 409, message: 'Ese horario no está disponible' };
  }

  const [result] = await pool.query(
    `INSERT INTO appointments 
     (client_id, barber_id, service_id, appointment_date, start_time, end_time, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [client_id, barber_id, service_id, appointment_date, start_time, end_time, notes || null]
  );

  await pool.query(
    `INSERT INTO appointment_status_log (appointment_id, changed_by, old_status, new_status)
     VALUES (?, ?, NULL, 'pending')`,
    [result.insertId, client_id]
  );

  return getById(result.insertId);
}

// ── Obtener cita por ID ────────────────────────────────────────
async function getById(id) {
  const [rows] = await pool.query(
    `SELECT 
       a.id, a.appointment_date, a.start_time, a.end_time, a.status, a.notes,
       u_client.name  AS client_name,  u_client.phone  AS client_phone,
       u_barber.name  AS barber_name,
       s.name         AS service_name, s.duration_minutes, s.price
     FROM appointments a
     JOIN users    u_client ON u_client.id = a.client_id
     JOIN users    u_barber ON u_barber.id = a.barber_id
     JOIN services s        ON s.id        = a.service_id
     WHERE a.id = ?`,
    [id]
  );

  if (!rows[0]) {
    throw { status: 404, message: 'Cita no encontrada' };
  }

  return rows[0];
}

// ── Citas de un cliente ────────────────────────────────────────
async function getByClient(clientId) {
  const [rows] = await pool.query(
    `SELECT 
       a.id, a.appointment_date, a.start_time, a.end_time, a.status,
       u_barber.name AS barber_name,
       s.name        AS service_name, s.price
     FROM appointments a
     JOIN users    u_barber ON u_barber.id = a.barber_id
     JOIN services s        ON s.id        = a.service_id
     WHERE a.client_id = ?
     ORDER BY a.appointment_date DESC, a.start_time DESC`,
    [clientId]
  );

  return rows;
}

// ── Citas de un barbero ────────────────────────────────────────
async function getByBarber(barberId, date) {
  let query = `
    SELECT 
      a.id, a.appointment_date, a.start_time, a.end_time, a.status, a.notes, a.is_walk_in,
      u_client.name  AS client_name, u_client.phone AS client_phone,
      u_client.is_active AS client_is_active,
      s.name         AS service_name, s.duration_minutes, s.price
    FROM appointments a
    JOIN users    u_client ON u_client.id = a.client_id
    JOIN services s        ON s.id        = a.service_id
    WHERE a.barber_id = ?
      AND u_client.is_active = 1`;

  const params = [barberId];

  if (date) {
    query += ' AND a.appointment_date = ?';
    params.push(date);
  }

  query += ' ORDER BY a.appointment_date ASC, a.start_time ASC';

  const [rows] = await pool.query(query, params);
  return rows;
}
// ── Citas de un barbero (solo citas normales, excluye walk-in) ─────
async function getByBarber(barberId, date) {
  let query = `
    SELECT 
      a.id, a.appointment_date, a.start_time, a.end_time, a.status, a.notes, a.is_walk_in,
      u_client.name  AS client_name, u_client.phone AS client_phone,
      u_client.is_active AS client_is_active,
      s.name         AS service_name, s.duration_minutes, s.price
    FROM appointments a
    JOIN users    u_client ON u_client.id = a.client_id
    JOIN services s        ON s.id        = a.service_id
    WHERE a.barber_id = ?
      AND u_client.is_active = 1
      AND (a.is_walk_in = 0 OR a.is_walk_in IS NULL)`;

  const params = [barberId];

  if (date) {
    query += ' AND a.appointment_date = ?';
    params.push(date);
  }

  query += ' ORDER BY a.appointment_date ASC, a.start_time ASC';

  const [rows] = await pool.query(query, params);
  return rows;
}

// ── Obtener solo ventas walk-in ─────────────────────────────────────
async function getWalkInSales(barberId, date) {
  const query = `
    SELECT 
      a.id, a.appointment_date, a.start_time, a.end_time, a.status, a.notes, a.is_walk_in,
      u_client.name  AS client_name, u_client.phone AS client_phone,
      s.name         AS service_name, s.duration_minutes, s.price
    FROM appointments a
    JOIN users    u_client ON u_client.id = a.client_id
    JOIN services s        ON s.id        = a.service_id
    WHERE a.barber_id = ?
      AND a.appointment_date = ?
      AND a.is_walk_in = 1
    ORDER BY a.start_time ASC`;

  const [rows] = await pool.query(query, [barberId, date]);
  return rows;
}
// ── Cambiar estado de una cita ─────────────────────────────────
async function updateStatus(id, newStatus, changedBy, reason) {
  const appt = await getById(id);

  await pool.query(
    'UPDATE appointments SET status = ?, cancellation_reason = ? WHERE id = ?',
    [newStatus, reason || null, id]
  );

  await pool.query(
    `INSERT INTO appointment_status_log (appointment_id, changed_by, old_status, new_status, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [id, changedBy, appt.status, newStatus, reason || null]
  );

  return getById(id);
}
// ── Venta directa — cliente sin cita previa ────────────────────
// ── Venta directa — cliente sin cita previa ────────────────────
async function createWalkIn({ barber_id, service_id, client_name, notes }) {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    // 1. Validar barbero
    const [barberRows] = await connection.query(
      'SELECT id FROM users WHERE id = ? AND role = "barber" AND is_active = 1',
      [barber_id]
    )
    if (!barberRows || barberRows.length === 0) {
      throw { status: 404, message: 'Barbero no encontrado o inactivo' }
    }

    // 2. Validar servicio
    const [serviceRows] = await connection.query(
      'SELECT id, duration_minutes, price, name FROM services WHERE id = ? AND is_active = 1',
      [service_id]
    )
    if (!serviceRows || serviceRows.length === 0) {
      throw { status: 404, message: 'Servicio no encontrado' }
    }

    const duration = serviceRows[0].duration_minutes

    // Hora Colombia
    const now         = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
    const year        = now.getFullYear()
    const month       = (now.getMonth() + 1).toString().padStart(2, '0')
    const day         = now.getDate().toString().padStart(2, '0')
    const date        = `${year}-${month}-${day}`
    const currentTime = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
    const endMins     = now.getHours() * 60 + now.getMinutes() + duration
    const end         = `${Math.floor(endMins / 60).toString().padStart(2,'0')}:${(endMins % 60).toString().padStart(2,'0')}`

    console.log('📅 Fecha:', date, '⏰ Hora:', currentTime, '🏁 Fin:', end)

    // 3. Verificar horario laboral
    const dayOfWeek = now.getDay()
    const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek

    const [schedule] = await connection.query(
      'SELECT start_time, end_time FROM barber_schedules WHERE barber_id = ? AND day_of_week = ?',
      [barber_id, dayNumber]
    )

    console.log('📋 Horario:', schedule)

    if (schedule && schedule.length > 0) {
      const startTime = schedule[0].start_time.slice(0, 5)
      const endTime   = schedule[0].end_time.slice(0, 5)
      console.log('⏰ Rango laboral:', startTime, '-', endTime, '| Ahora:', currentTime)
      if (currentTime < startTime || currentTime > endTime) {
        throw { status: 400, message: `Fuera de horario laboral (${startTime} - ${endTime})` }
      }
    }

    // 4. Verificar conflicto con citas activas
    const [conflict] = await connection.query(
      `SELECT id FROM appointments
       WHERE barber_id = ?
         AND appointment_date = ?
         AND status NOT IN ('cancelled', 'no_show')
         AND (
           (start_time <= ? AND end_time > ?) OR
           (start_time < ? AND end_time >= ?)
         )`,
      [barber_id, date, currentTime, currentTime, end, end]
    )

    console.log('⚠️ Conflictos:', conflict)

    if (conflict && conflict.length > 0) {
      throw { status: 409, message: 'El barbero ya tiene una cita activa en este horario' }
    }

    // 5. Verificar cliente genérico ID 1
    const [genericClient] = await connection.query(
      'SELECT id FROM users WHERE id = 1'
    )

    if (!genericClient || genericClient.length === 0) {
      await connection.query(
        `INSERT INTO users (id, name, email, password_hash, role, is_active)
         VALUES (1, 'Walk-in', 'walkin@barbershop.com', 'walkin', 'client', 1)`
      )
    }

    // 6. Insertar cita
    const [result] = await connection.query(
      `INSERT INTO appointments
       (client_id, barber_id, service_id, appointment_date, start_time, end_time, status, notes, is_walk_in)
       VALUES (1, ?, ?, ?, ?, ?, 'completed', ?, 1)`,
      [barber_id, service_id, date, currentTime, end,
       `Walk-in: ${client_name || 'sin nombre'}${notes ? ' - ' + notes : ''}`]
    )

    // 7. Log
    try {
      await connection.query(
        `INSERT INTO appointment_status_log (appointment_id, changed_by, old_status, new_status, notes)
         VALUES (?, ?, NULL, 'completed', 'Venta directa walk-in')`,
        [result.insertId, barber_id]
      )
    } catch (logError) {
      console.log('⚠️ Log no crítico:', logError.message)
    }

    await connection.commit()

    // 8. Retornar cita creada
    const [rows] = await connection.query(
      `SELECT a.id, a.appointment_date, a.start_time, a.end_time, a.status, a.notes, a.is_walk_in,
              s.name AS service_name, s.price
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       WHERE a.id = ?`,
      [result.insertId]
    )

    return rows[0]

  } catch (error) {
    await connection.rollback()
    console.error('💥 Error en createWalkIn:', error)
    throw error
  } finally {
    connection.release()
  }
}

module.exports = {
  getAvailableSlots,
  create,
  getById,
  getByClient,
  getByBarber,
  updateStatus,
  createWalkIn,
  getWalkInSales,
};