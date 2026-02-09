import pool from "./db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export type SubscriptionStatus = "ACTIVE" | "CANCELED" | "EXPIRED";
export type OwnerType = "team" | "personal";

export interface Subscription {
  id: number;
  owner_id: number;
  owner_type: OwnerType;
  plan_id: number;
  status: SubscriptionStatus;
  started_at: Date;
  ended_at: Date | null;
  plan_name?: string;
  plan_price?: number;
}

export async function getSubscriptionsByOwnerId(
  ownerId: number,
  ownerType: OwnerType
): Promise<Subscription[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
      s.subscription_id as id,
      s.owner_id,
      s.owner_type,
      s.plan_id,
      s.status,
      s.started_at,
      s.ended_at,
      p.name as plan_name,
      p.price as plan_price
    FROM subscriptions s
    LEFT JOIN plans p ON s.plan_id = p.plan_id
    WHERE s.owner_id = ? AND s.owner_type = ?
    ORDER BY s.started_at DESC`,
    [ownerId, ownerType]
  );
  return rows as Subscription[];
}

export async function getActiveSubscriptionByOwner(
  ownerId: number,
  ownerType: OwnerType
): Promise<Subscription | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
      s.subscription_id as id,
      s.owner_id,
      s.owner_type,
      s.plan_id,
      s.status,
      s.started_at,
      s.ended_at,
      p.name as plan_name,
      p.price as plan_price
    FROM subscriptions s
    LEFT JOIN plans p ON s.plan_id = p.plan_id
    WHERE s.owner_id = ? AND s.owner_type = ? AND s.status = 'ACTIVE'
    ORDER BY s.started_at DESC
    LIMIT 1`,
    [ownerId, ownerType]
  );
  return rows.length > 0 ? (rows[0] as Subscription) : null;
}

export async function getSubscriptionById(
  subscriptionId: number
): Promise<Subscription | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
      s.subscription_id as id,
      s.owner_id,
      s.owner_type,
      s.plan_id,
      s.status,
      s.started_at,
      s.ended_at,
      p.name as plan_name,
      p.price as plan_price
    FROM subscriptions s
    LEFT JOIN plans p ON s.plan_id = p.plan_id
    WHERE s.subscription_id = ?`,
    [subscriptionId]
  );
  return rows.length > 0 ? (rows[0] as Subscription) : null;
}

export async function createSubscription(
  ownerId: number,
  ownerType: OwnerType,
  planId: number
): Promise<number> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 기존 ACTIVE 구독을 EXPIRED로 변경
    await connection.execute(
      `UPDATE subscriptions
       SET status = 'EXPIRED', ended_at = NOW()
       WHERE owner_id = ? AND owner_type = ? AND status = 'ACTIVE'`,
      [ownerId, ownerType]
    );

    // 새 구독 생성
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO subscriptions (owner_id, owner_type, plan_id, status, started_at)
       VALUES (?, ?, ?, 'ACTIVE', NOW())`,
      [ownerId, ownerType, planId]
    );

    await connection.commit();
    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateSubscriptionStatus(
  subscriptionId: number,
  status: SubscriptionStatus
): Promise<boolean> {
  const endedAt = status === "CANCELED" || status === "EXPIRED" ? "NOW()" : "NULL";

  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE subscriptions
     SET status = ?, ended_at = ${endedAt}
     WHERE subscription_id = ?`,
    [status, subscriptionId]
  );

  return result.affectedRows > 0;
}

export async function cancelSubscription(
  subscriptionId: number
): Promise<boolean> {
  return updateSubscriptionStatus(subscriptionId, "CANCELED");
}

export async function deleteSubscription(
  subscriptionId: number
): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM subscriptions WHERE subscription_id = ?`,
    [subscriptionId]
  );

  return result.affectedRows > 0;
}
