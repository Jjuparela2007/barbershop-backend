const { pool } = require('../../config/database');

// ── Dashboard — cifras generales ───────────────────────────────
async function getStats() {
  const [[clients]]  = await pool.query(
    "SELECT COUNT(*) AS total FROM users WHERE role = 'client' AND is_active = 1"
  );
  const [[barbers]]  = await pool.query(
    "SELECT COUNT(*) AS total FROM users WHERE role = 'barber' AND is_active = 1"
  );
  const [[appointments]] = await pool.query(
    "SELECT COUNT(*) AS total FROM appointments"
  );
  const [[revenue]] = await pool.query(
    `SELECT COALESCE(SUM(s.price), 0) AS total
     FROM appointments a
     JOIN services s ON s.id = a.service_id
     WHERE a.status = 'completed'`
  );
  const [[shopRevenue]] = await pool.query(
    `SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE status = 'completed'`
  );
  const [[pending]] = await pool.query(
    "SELECT COUNT(*) AS total FROM appointments WHERE status = 'pending'"
  );

  return {
    total_clients:        clients.total,
    total_barbers:        barbers.total,
    total_appointments:   appointments.total,
    total_revenue:        Number(revenue.total) + Number(shopRevenue.total),
    services_revenue:     Number(revenue.total),
    shop_revenue:         Number(shopRevenue.total),
    pending_appointments: pending.total,
  };
}

// ── Listar todos los usuarios ──────────────────────────────────
async function getAllUsers({ role, is_active } = {}) {
  let query = `
    SELECT id, name, email, role, phone, is_active, created_at, avatar_url
    FROM users
    WHERE 1=1`;

  const params = [];

  if (role) {
    query += ' AND role = ?';
    params.push(role);
  }

  if (is_active !== undefined) {
    query += ' AND is_active = ?';
    params.push(is_active);
  }

  query += ' ORDER BY created_at DESC';

  const [rows] = await pool.query(query, params);
  return rows;
}

// ── Activar, desactivar o eliminar usuario ─────────────────────
async function toggleUserStatus(userId, is_active) {
  const [rows] = await pool.query(
    'SELECT id, name, role, is_active FROM users WHERE id = ?',
    [userId]
  );

  if (!rows[0]) {
    throw { status: 404, message: 'Usuario no encontrado' };
  }

  const user = rows[0];

  // CASO 1: Reactivar usuario (de inactivo a activo)
  if (is_active === true && user.is_active === 0) {
    await pool.query('UPDATE users SET is_active = 1 WHERE id = ?', [userId]);
    return {
      id: userId,
      name: user.name,
      is_active: 1,
      message: 'Usuario reactivado correctamente',
    };
  }

  // CASO 2: Desactivar usuario (de activo a inactivo)
  if (is_active === false && user.is_active === 1) {
    // Obtener citas pendientes para cancelarlas
    const [pendingAppointments] = await pool.query(
      `SELECT id FROM appointments 
       WHERE (client_id = ? OR barber_id = ?) 
       AND status IN ('pending', 'confirmed')
       AND appointment_date >= CURDATE()`,
      [userId, userId]
    );

    // Si tiene citas pendientes, cancelarlas automáticamente
    if (pendingAppointments.length > 0) {
      const appointmentIds = pendingAppointments.map(a => a.id);
      const placeholders = appointmentIds.map(() => '?').join(',');
      
      // Cancelar todas las citas pendientes
      await pool.query(
        `UPDATE appointments 
         SET status = 'cancelled', 
             cancelled_at = NOW(),
             cancellation_reason = 'Usuario desactivado por el administrador'
         WHERE id IN (${placeholders})`,
        appointmentIds
      );
    }

    // Desactivar usuario
    await pool.query('UPDATE users SET is_active = 0 WHERE id = ?', [userId]);
    
    let message = 'Usuario desactivado correctamente';
    if (pendingAppointments.length > 0) {
      message += ` y se cancelaron ${pendingAppointments.length} cita(s) pendiente(s)`;
    }
    
    return {
      id: userId,
      name: user.name,
      is_active: 0,
      cancelled_appointments: pendingAppointments.length,
      message: message,
    };
  }

  // CASO 3: Eliminar usuario permanentemente (solo si ya está inactivo)
  if (is_active === false && user.is_active === 0) {
    // Verificar si tiene citas en el historial (incluyendo pasadas)
    const [hasAppointments] = await pool.query(
      `SELECT COUNT(*) AS count FROM appointments 
       WHERE client_id = ? OR barber_id = ?`,
      [userId, userId]
    );

    if (hasAppointments[0].count > 0) {
      // No eliminar, solo asegurar que esté desactivado
      throw { 
        status: 400, 
        message: `No se puede eliminar permanentemente porque tiene ${hasAppointments[0].count} cita(s) asociadas en el historial. El usuario permanecerá desactivado.` 
      };
    }

    // Si no tiene citas, se puede eliminar físicamente
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    return {
      id: userId,
      name: user.name,
      deleted: true,
      message: 'Usuario eliminado permanentemente',
    };
  }

  // CASO 4: Activar usuario que ya está activo (no hacer nada)
  if (is_active === true && user.is_active === 1) {
    return {
      id: userId,
      name: user.name,
      is_active: 1,
      message: 'El usuario ya está activo',
    };
  }

  // CASO 5: Desactivar usuario que ya está inactivo (no hacer nada)
  if (is_active === false && user.is_active === 0) {
    return {
      id: userId,
      name: user.name,
      is_active: 0,
      message: 'El usuario ya está desactivado',
    };
  }

  // Fallback - actualizar estado normalmente
  await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, userId]);
  return {
    id: userId,
    name: user.name,
    is_active: is_active ? 1 : 0,
    message: `Usuario ${is_active ? 'activado' : 'desactivado'} correctamente`,
  };
}

// ── Crear barbero desde el panel admin ────────────────────────
async function createBarber({ name, email, password, phone, bio, specialties, experience_years }) {
  const bcrypt = require('bcryptjs');

  const [existing] = await pool.query(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );

  if (existing.length > 0) {
    throw { status: 409, message: 'Este correo ya está registrado' };
  }

  const password_hash = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, phone)
     VALUES (?, ?, ?, 'barber', ?)`,
    [name, email, password_hash, phone || null]
  );

  const barberId = result.insertId;

  await pool.query(
    `INSERT INTO barber_profiles (barber_id, bio, specialties, experience_years)
     VALUES (?, ?, ?, ?)`,
    [barberId, bio || null, specialties || null, experience_years || 0]
  );

  const defaultSchedule = [
    [barberId, 1, '09:00', '18:00', '13:00', '14:00'],
    [barberId, 2, '09:00', '18:00', '13:00', '14:00'],
    [barberId, 3, '09:00', '18:00', '13:00', '14:00'],
    [barberId, 4, '09:00', '18:00', '13:00', '14:00'],
    [barberId, 5, '09:00', '18:00', '13:00', '14:00'],
    [barberId, 6, '09:00', '14:00', null,    null],
    [barberId, 7, '09:00', '14:00', null,    null],
  ]

  await pool.query(
    `INSERT INTO barber_schedules
     (barber_id, day_of_week, start_time, end_time, break_start, break_end)
     VALUES ?`,
    [defaultSchedule]
  )

  return { id: barberId, name, email, role: 'barber' }
}

// ── Todas las citas con filtros ────────────────────────────────
async function getAllAppointments({ status, barber_id, date } = {}) {
  let query = `
    SELECT
      a.id, a.appointment_date, a.start_time, a.end_time, a.status,
      u_client.name AS client_name, u_client.phone AS client_phone,
      u_barber.name AS barber_name,
      s.name        AS service_name, s.price
    FROM appointments a
    JOIN users    u_client ON u_client.id = a.client_id
    JOIN users    u_barber ON u_barber.id = a.barber_id
    JOIN services s        ON s.id        = a.service_id
    WHERE 1=1`;

  const params = [];

  if (status)    { query += ' AND a.status = ?';      params.push(status)    }
  if (barber_id) { query += ' AND a.barber_id = ?';   params.push(barber_id) }
  if (date)      { query += ' AND a.appointment_date = ?'; params.push(date) }

  query += ' ORDER BY a.appointment_date DESC, a.start_time ASC';

  const [rows] = await pool.query(query, params);
  return rows;
}

// ── Estadísticas de ingresos ───────────────────────────────────
async function getRevenueStats() {
  // Servicios hoy
  const [[svcDaily]] = await pool.query(`
    SELECT COALESCE(SUM(s.price), 0) AS total, COUNT(a.id) AS count
    FROM appointments a JOIN services s ON s.id = a.service_id
    WHERE a.status = 'completed' AND DATE(a.appointment_date) = CURDATE()
  `)
  // Tienda hoy
  const [[shopDaily]] = await pool.query(`
    SELECT COALESCE(SUM(total), 0) AS total, COUNT(id) AS count
    FROM orders WHERE status = 'completed' AND DATE(created_at) = CURDATE()
  `)

  // Servicios semana
  const [[svcWeekly]] = await pool.query(`
    SELECT COALESCE(SUM(s.price), 0) AS total, COUNT(a.id) AS count
    FROM appointments a JOIN services s ON s.id = a.service_id
    WHERE a.status = 'completed'
      AND YEARWEEK(a.appointment_date, 1) = YEARWEEK(CURDATE(), 1)
  `)
  // Tienda semana
  const [[shopWeekly]] = await pool.query(`
    SELECT COALESCE(SUM(total), 0) AS total, COUNT(id) AS count
    FROM orders WHERE status = 'completed'
      AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
  `)

  // Servicios mes
  const [[svcMonthly]] = await pool.query(`
    SELECT COALESCE(SUM(s.price), 0) AS total, COUNT(a.id) AS count
    FROM appointments a JOIN services s ON s.id = a.service_id
    WHERE a.status = 'completed'
      AND YEAR(a.appointment_date) = YEAR(CURDATE())
      AND MONTH(a.appointment_date) = MONTH(CURDATE())
  `)
  // Tienda mes
  const [[shopMonthly]] = await pool.query(`
    SELECT COALESCE(SUM(total), 0) AS total, COUNT(id) AS count
    FROM orders WHERE status = 'completed'
      AND YEAR(created_at) = YEAR(CURDATE())
      AND MONTH(created_at) = MONTH(CURDATE())
  `)

  // Por día semana
  const [byDay] = await pool.query(`
    SELECT
      DAYOFWEEK(a.appointment_date) AS day_num,
      DAYNAME(a.appointment_date)   AS day_name,
      COALESCE(SUM(s.price), 0)     AS total,
      COUNT(a.id)                   AS count
    FROM appointments a JOIN services s ON s.id = a.service_id
    WHERE a.status = 'completed'
      AND YEARWEEK(a.appointment_date, 1) = YEARWEEK(CURDATE(), 1)
    GROUP BY DAYOFWEEK(a.appointment_date), DAYNAME(a.appointment_date)
    ORDER BY day_num
  `)

  // Top servicios mes
  const [topServices] = await pool.query(`
    SELECT s.name, COUNT(a.id) AS count, SUM(s.price) AS total
    FROM appointments a JOIN services s ON s.id = a.service_id
    WHERE a.status = 'completed'
      AND YEAR(a.appointment_date) = YEAR(CURDATE())
      AND MONTH(a.appointment_date) = MONTH(CURDATE())
    GROUP BY s.id, s.name ORDER BY count DESC LIMIT 3
  `)

  // Top productos mes
  const [topProducts] = await pool.query(`
    SELECT p.name, SUM(oi.quantity) AS count, SUM(oi.quantity * oi.unit_price) AS total
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE o.status = 'completed'
      AND YEAR(o.created_at) = YEAR(CURDATE())
      AND MONTH(o.created_at) = MONTH(CURDATE())
    GROUP BY p.id, p.name ORDER BY count DESC LIMIT 3
  `)

  return {
    daily: {
      total:    Number(svcDaily.total) + Number(shopDaily.total),
      count:    svcDaily.count,
      services: Number(svcDaily.total),
      shop:     Number(shopDaily.total),
    },
    weekly: {
      total:    Number(svcWeekly.total) + Number(shopWeekly.total),
      count:    svcWeekly.count,
      services: Number(svcWeekly.total),
      shop:     Number(shopWeekly.total),
    },
    monthly: {
      total:    Number(svcMonthly.total) + Number(shopMonthly.total),
      count:    svcMonthly.count,
      services: Number(svcMonthly.total),
      shop:     Number(shopMonthly.total),
    },
    byDay,
    topServices,
    topProducts,
  }
}

// ── Ingresos netos descontando comisión de barberos (10%) ──────
async function getNetRevenue() {
  const BARBER_COMMISSION = 0.10

  const [[total]] = await pool.query(
    `SELECT
       COALESCE(SUM(s.price), 0)         AS gross_revenue,
       COALESCE(SUM(s.price * ?), 0)     AS barber_commission,
       COALESCE(SUM(s.price * ?), 0)     AS net_revenue,
       COUNT(*)                           AS total_completed
     FROM appointments a
     JOIN services s ON s.id = a.service_id
     WHERE a.status = 'completed'`,
    [BARBER_COMMISSION, 1 - BARBER_COMMISSION]
  )

  const [byBarber] = await pool.query(
    `SELECT
       u.name                         AS barber_name,
       COUNT(*)                       AS total_cuts,
       COALESCE(SUM(s.price), 0)     AS gross,
       COALESCE(SUM(s.price * ?), 0) AS commission
     FROM appointments a
     JOIN services s ON s.id = a.service_id
     JOIN users    u ON u.id = a.barber_id
     WHERE a.status = 'completed'
     GROUP BY a.barber_id, u.name
     ORDER BY gross DESC`,
    [BARBER_COMMISSION]
  )

  return {
    gross_revenue:     total.gross_revenue,
    barber_commission: total.barber_commission,
    net_revenue:       total.net_revenue,
    total_completed:   total.total_completed,
    commission_rate:   BARBER_COMMISSION * 100,
    by_barber:         byBarber,
  }
}

// ── Estadísticas de barberos ───────────────────────────────────
async function getBarberStats() {
  const [today] = await pool.query(`
    SELECT
      u.name AS barber_name,
      COUNT(a.id) AS cuts_today,
      COALESCE(SUM(s.price), 0) AS revenue_today
    FROM users u
    LEFT JOIN appointments a ON a.barber_id = u.id
      AND a.status = 'completed'
      AND DATE(a.appointment_date) = CURDATE()
    LEFT JOIN services s ON s.id = a.service_id
    WHERE u.role = 'barber' AND u.is_active = 1
    GROUP BY u.id, u.name
    ORDER BY cuts_today DESC
  `)

  const [weekly] = await pool.query(`
    SELECT
      u.name AS barber_name,
      COUNT(a.id) AS cuts_week,
      COALESCE(SUM(s.price), 0) AS revenue_week
    FROM users u
    LEFT JOIN appointments a ON a.barber_id = u.id
      AND a.status = 'completed'
      AND YEARWEEK(a.appointment_date, 1) = YEARWEEK(CURDATE(), 1)
    LEFT JOIN services s ON s.id = a.service_id
    WHERE u.role = 'barber' AND u.is_active = 1
    GROUP BY u.id, u.name
    ORDER BY cuts_week DESC
  `)

  const [monthly] = await pool.query(`
    SELECT
      u.name AS barber_name,
      COUNT(a.id) AS cuts_month,
      COALESCE(SUM(s.price), 0) AS revenue_month
    FROM users u
    LEFT JOIN appointments a ON a.barber_id = u.id
      AND a.status = 'completed'
      AND YEAR(a.appointment_date)  = YEAR(CURDATE())
      AND MONTH(a.appointment_date) = MONTH(CURDATE())
    LEFT JOIN services s ON s.id = a.service_id
    WHERE u.role = 'barber' AND u.is_active = 1
    GROUP BY u.id, u.name
    ORDER BY cuts_month DESC
  `)

  const barbers = today.map(t => {
    const w = weekly.find(x => x.barber_name === t.barber_name) || {}
    const m = monthly.find(x => x.barber_name === t.barber_name) || {}
    return {
      barber_name:   t.barber_name,
      cuts_today:    t.cuts_today,
      revenue_today: t.revenue_today,
      cuts_week:     w.cuts_week    || 0,
      revenue_week:  w.revenue_week || 0,
      cuts_month:    m.cuts_month   || 0,
      revenue_month: m.revenue_month || 0,
    }
  })

  return { barbers }
}

module.exports = {
  getStats,
  getAllUsers,
  toggleUserStatus,
  createBarber,
  getAllAppointments,
  getRevenueStats,
  getNetRevenue,
  getBarberStats,
}