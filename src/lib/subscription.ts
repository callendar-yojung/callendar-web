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
  next_payment_date: Date | null;
  billing_key_member_id: number | null;
  retry_count: number;
  plan_name?: string;
  plan_price?: number;
}

const SELECT_COLUMNS = `
  s.subscription_id as id,
  s.owner_id,
  s.owner_type,
  s.plan_id,
  s.status,
  s.started_at,
  s.ended_at,
  s.next_payment_date,
  s.billing_key_member_id,
  s.retry_count,
  p.name as plan_name,
  p.price as plan_price
`;

export async function getSubscriptionsByOwnerId(
  ownerId: number,
  ownerType: OwnerType
): Promise<Subscription[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ${SELECT_COLUMNS}
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
    `SELECT ${SELECT_COLUMNS}
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
    `SELECT ${SELECT_COLUMNS}
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
  planId: number,
  createdBy?: number,
  billingKeyMemberId?: number
): Promise<number> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 기존 ACTIVE 구독을 EXPIRED로 변경
    await connection.execute(
      `UPDATE subscriptions
       SET status = 'EXPIRED', ended_at = NOW(), next_payment_date = NULL
       WHERE owner_id = ? AND owner_type = ? AND status = 'ACTIVE'`,
      [ownerId, ownerType]
    );

    // 새 구독 생성 (next_payment_date = 1개월 뒤)
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO subscriptions
        (owner_id, owner_type, plan_id, status, started_at, created_by,
         next_payment_date, billing_key_member_id, retry_count)
       VALUES (?, ?, ?, 'ACTIVE', NOW(), ?, DATE_ADD(NOW(), INTERVAL 1 MONTH), ?, 0)`,
      [
        ownerId,
        ownerType,
        planId,
        createdBy ?? ownerId,
        billingKeyMemberId ?? createdBy ?? ownerId,
      ]
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
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE subscriptions
     SET status = 'CANCELED', ended_at = NOW(), next_payment_date = NULL
     WHERE subscription_id = ?`,
    [subscriptionId]
  );

  return result.affectedRows > 0;
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

/**
 * 결제일이 도래한 활성 구독 목록 조회
 * (next_payment_date <= NOW() AND status = 'ACTIVE')
 */
export async function getDueSubscriptions(): Promise<Subscription[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ${SELECT_COLUMNS}
    FROM subscriptions s
    LEFT JOIN plans p ON s.plan_id = p.plan_id
    WHERE s.status = 'ACTIVE'
      AND s.next_payment_date IS NOT NULL
      AND s.next_payment_date <= NOW()
    ORDER BY s.next_payment_date ASC`
  );
  return rows as Subscription[];
}

/**
 * 다음 결제일을 1개월 연장 + retry_count 리셋
 */
export async function advancePaymentDate(
  subscriptionId: number
): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE subscriptions
     SET next_payment_date = DATE_ADD(next_payment_date, INTERVAL 1 MONTH),
         retry_count = 0
     WHERE subscription_id = ?`,
    [subscriptionId]
  );

  return result.affectedRows > 0;
}

/**
 * 재시도 횟수 증가
 */
export async function incrementRetryCount(
  subscriptionId: number
): Promise<number> {
  await pool.execute<ResultSetHeader>(
    `UPDATE subscriptions
     SET retry_count = retry_count + 1
     WHERE subscription_id = ?`,
    [subscriptionId]
  );

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT retry_count FROM subscriptions WHERE subscription_id = ?`,
    [subscriptionId]
  );

  return rows.length > 0 ? (rows[0] as { retry_count: number }).retry_count : 0;
}
