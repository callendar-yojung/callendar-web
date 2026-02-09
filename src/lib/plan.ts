import pool from "./db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export interface Plan {
  id: number;
  name: string;
  price: number;
  max_members: number;
  max_storage_mb: number;
  paypal_plan_id?: string | null;
  paypal_product_id?: string | null;
  created_at: Date;
}

export async function getAllPlans(): Promise<Plan[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
      plan_id as id,
      name,
      price,
      max_members,
      max_storage_mb,
      paypal_plan_id,
      paypal_product_id,
      created_at
    FROM plans
    ORDER BY price ASC`
  );
  return rows as Plan[];
}

export async function getPlanById(planId: number): Promise<Plan | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
      plan_id as id,
      name,
      price,
      max_members,
      max_storage_mb,
      paypal_plan_id,
      paypal_product_id,
      created_at
    FROM plans
    WHERE plan_id = ?`,
    [planId]
  );
  return rows.length > 0 ? (rows[0] as Plan) : null;
}

export async function createPlan(
  name: string,
  price: number,
  maxMembers: number,
  maxStorageMb: number,
  paypalPlanId?: string,
  paypalProductId?: string
): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO plans (name, price, max_members, max_storage_mb, paypal_plan_id, paypal_product_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [name, price, maxMembers, maxStorageMb, paypalPlanId || null, paypalProductId || null]
  );
  return result.insertId;
}

export async function updatePlan(
  planId: number,
  name: string,
  price: number,
  maxMembers: number,
  maxStorageMb: number,
  paypalPlanId?: string,
  paypalProductId?: string
): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE plans
     SET name = ?, price = ?, max_members = ?, max_storage_mb = ?, paypal_plan_id = ?, paypal_product_id = ?
     WHERE plan_id = ?`,
    [name, price, maxMembers, maxStorageMb, paypalPlanId || null, paypalProductId || null, planId]
  );
  return result.affectedRows > 0;
}

export async function deletePlan(planId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM plans WHERE plan_id = ?`,
    [planId]
  );
  return result.affectedRows > 0;
}
