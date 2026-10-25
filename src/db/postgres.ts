/**
 * Hospital Residential Allocation & Management System
 * শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ
 * PostgreSQL Database Adapter & Connector
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Ensure .env is loaded
dotenv.config();

const { Pool } = pg;

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
}

export const getPostgresConfig = (): PostgresConfig => ({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'hospital_residential',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234'
});

const config = getPostgresConfig();

export const pool = new Pool({
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user,
  password: config.password,
  connectionTimeoutMillis: 2500,
  idleTimeoutMillis: 10000,
  max: 10
});

// Suppress unhandled error crash when PostgreSQL is temporarily unavailable
pool.on('error', (err) => {
  console.warn('[POSTGRESQL WARNING] Pool error (operating in resilient fallback mode):', err.message);
});

export interface ConnectionTestResult {
  success: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  message: string;
  timestamp?: string;
  serverVersion?: string;
}

/**
 * Tests the PostgreSQL connection
 */
export async function testPostgresConnection(): Promise<ConnectionTestResult> {
  const currentConfig = getPostgresConfig();
  try {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT NOW() as now, version() as version;');
      return {
        success: true,
        host: currentConfig.host,
        port: currentConfig.port,
        database: currentConfig.database,
        user: currentConfig.user,
        message: 'PostgreSQL ডাটাবেজ সফলভাবে সংযুক্ত হয়েছে (Connection Successful)।',
        timestamp: res.rows[0]?.now?.toISOString?.() || new Date().toISOString(),
        serverVersion: res.rows[0]?.version || 'PostgreSQL'
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      success: false,
      host: currentConfig.host,
      port: currentConfig.port,
      database: currentConfig.database,
      user: currentConfig.user,
      message: `PostgreSQL সংযোগ ব্যর্থ: ${err.message || 'কানেকশন টাইমআউট'} (লোকাল JSON ডাটাবেজ ব্যাকআপ সক্রিয়)।`
    };
  }
}

/**
 * Creates the required tables in PostgreSQL if they do not exist
 */
export async function initPostgresSchema(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        -- Central full snapshot table for instant persistence & failover
        CREATE TABLE IF NOT EXISTS hospital_central_state (
          id INT PRIMARY KEY DEFAULT 1,
          state_json JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Buildings Table
        CREATE TABLE IF NOT EXISTS hospital_buildings (
          id VARCHAR(100) PRIMARY KEY,
          code VARCHAR(50) NOT NULL,
          name_bn VARCHAR(255) NOT NULL,
          name_en VARCHAR(255),
          total_floors INT DEFAULT 1,
          maintenance_status VARCHAR(50) DEFAULT 'NORMAL',
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Rooms Table
        CREATE TABLE IF NOT EXISTS hospital_rooms (
          id VARCHAR(100) PRIMARY KEY,
          building_id VARCHAR(100) NOT NULL,
          room_number VARCHAR(50) NOT NULL,
          floor INT NOT NULL,
          category VARCHAR(50) NOT NULL,
          seat_type_label VARCHAR(100),
          status VARCHAR(50) NOT NULL,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Residents Table
        CREATE TABLE IF NOT EXISTS hospital_residents (
          id VARCHAR(100) PRIMARY KEY,
          resident_id_number VARCHAR(100),
          full_name VARCHAR(255) NOT NULL,
          designation VARCHAR(255) NOT NULL,
          department VARCHAR(255),
          mobile_number VARCHAR(50) NOT NULL,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Allocations Table
        CREATE TABLE IF NOT EXISTS hospital_allocations (
          id VARCHAR(100) PRIMARY KEY,
          allocation_number VARCHAR(100) NOT NULL,
          building_id VARCHAR(100) NOT NULL,
          room_id VARCHAR(100) NOT NULL,
          resident_id VARCHAR(100) NOT NULL,
          status VARCHAR(50) NOT NULL,
          official_order_no VARCHAR(255),
          start_date VARCHAR(50),
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Cancellations Table
        CREATE TABLE IF NOT EXISTS hospital_cancellations (
          id VARCHAR(100) PRIMARY KEY,
          tracking_number VARCHAR(100) NOT NULL,
          status VARCHAR(50) NOT NULL,
          allocation_id VARCHAR(100),
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Audit Logs Table
        CREATE TABLE IF NOT EXISTS hospital_audit_logs (
          id VARCHAR(100) PRIMARY KEY,
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(100) NOT NULL,
          entity_id VARCHAR(100),
          details TEXT,
          actor_id VARCHAR(100),
          actor_name VARCHAR(255),
          data JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      console.log('[POSTGRESQL] PostgreSQL schema tables initialized successfully.');
      return true;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('[POSTGRESQL] Schema init skipped (PostgreSQL not reachable, using local JSON replica):', err.message);
    return false;
  }
}

/**
 * Saves state directly into PostgreSQL
 */
export async function saveStateToPostgres(state: any): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO hospital_central_state (id, state_json, updated_at)
         VALUES (1, $1, NOW())
         ON CONFLICT (id) DO UPDATE
         SET state_json = EXCLUDED.state_json, updated_at = NOW();`,
        [JSON.stringify(state)]
      );
      return true;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('[POSTGRESQL] Could not persist state to PostgreSQL:', err.message);
    return false;
  }
}

/**
 * Loads state directly from PostgreSQL
 */
export async function loadStateFromPostgres(): Promise<any | null> {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT state_json FROM hospital_central_state WHERE id = 1 LIMIT 1;');
      if (res.rows.length > 0 && res.rows[0].state_json) {
        return res.rows[0].state_json;
      }
      return null;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('[POSTGRESQL] Could not load state from PostgreSQL:', err.message);
    return null;
  }
}
