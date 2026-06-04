import { query, pool } from './db';

// Helper to generate unique serial numbers for coins
function generateSerialNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `COIN-${date}-${rand}`;
}

// Helper to record audit logs
export async function logAudit(userId: string | null, action: string, details: string, isSuspicious: boolean = false, client?: any) {
  const id = 'audit_' + Math.random().toString(36).substring(2, 15);
  const executeQuery = client ? (sql: string, params: any[]) => client.query(sql, params) : query;
  await executeQuery(
    `INSERT INTO audit_logs (id, "userId", action, details, "isSuspicious") VALUES ($1, $2, $3, $4, $5)`,
    [id, userId, action, details, isSuspicious]
  );
}

// Mint new money into the Central Vault (owner = null)
export async function mintCoins(adminId: string, amount: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify admin
    const adminRes = await client.query('SELECT role, email FROM "user" WHERE id = $1', [adminId]);
    if (!adminRes.rows[0] || adminRes.rows[0].role !== 'admin') {
      throw new Error('Unauthorized: Only admins can mint coins.');
    }

    const txId = 'tx_' + Math.random().toString(36).substring(2, 15);
    const coinId = 'coin_' + Math.random().toString(36).substring(2, 15);
    const serial = generateSerialNumber();

    // 1. Insert mint transaction
    await client.query(
      `INSERT INTO transactions (id, "senderId", "receiverId", amount, fee, type, description)
       VALUES ($1, NULL, NULL, $2, 0.00, 'mint', $3)`,
      [txId, amount, `Minted ${amount.toFixed(2)} units into the System Reserve Vault.`]
    );

    // 2. Create the minted coin block (owned by System, i.e., ownerId = null)
    await client.query(
      `INSERT INTO coin_blocks (id, "serialNumber", amount, "ownerId", "parentBlockId", "createdByTransactionId", status)
       VALUES ($1, $2, $3, NULL, NULL, $4, 'active')`,
      [coinId, serial, amount, txId]
    );

    await client.query('COMMIT');
    await logAudit(adminId, 'MINT_COINS', `Minted ${amount.toFixed(2)} coins. Serial: ${serial}`, false, client);
    return { success: true, transactionId: txId, coinId, serial };
  } catch (error: any) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Admin deposits money into user's wallet
export async function depositCoins(adminId: string, username: string, amount: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify admin
    const adminRes = await client.query('SELECT role FROM "user" WHERE id = $1', [adminId]);
    if (!adminRes.rows[0] || adminRes.rows[0].role !== 'admin') {
      throw new Error('Unauthorized: Only admins can deposit coins.');
    }

    // 2. Find target user
    const userRes = await client.query('SELECT id, balance, username FROM "user" WHERE username = $1', [username]);
    if (!userRes.rows[0]) {
      throw new Error(`User with username "${username}" not found.`);
    }
    const user = userRes.rows[0];

    // 3. Find and spend coin blocks from the Central Vault (ownerId IS NULL) to back this deposit
    const vaultBlocksRes = await client.query(
      `SELECT id, amount FROM coin_blocks WHERE "ownerId" IS NULL AND status = 'active' ORDER BY "mintedAt" ASC`
    );

    let collectedAmount = 0;
    const spentBlockIds: string[] = [];
    for (const row of vaultBlocksRes.rows) {
      collectedAmount += parseFloat(row.amount);
      spentBlockIds.push(row.id);
      if (collectedAmount >= amount) break;
    }

    if (collectedAmount < amount) {
      throw new Error(
        `System Reserve Vault has insufficient balance (${collectedAmount.toFixed(2)}) to back this deposit of ${amount.toFixed(2)}. Admin must mint more coins first!`
      );
    }

    const txId = 'tx_' + Math.random().toString(36).substring(2, 15);

    // 4. Record deposit transaction
    await client.query(
      `INSERT INTO transactions (id, "senderId", "receiverId", amount, fee, type, description)
       VALUES ($1, NULL, $2, $3, 0.00, 'deposit', $4)`,
      [txId, user.id, amount, `Admin deposit of ${amount.toFixed(2)} to ${username}.`]
    );

    // 5. Spend vault blocks
    if (spentBlockIds.length > 0) {
      await client.query(
        `UPDATE coin_blocks SET status = 'spent', "spentAt" = NOW(), "spentByTransactionId" = $1 WHERE id = ANY($2)`,
        [txId, spentBlockIds]
      );
    }

    // 6. Create new coin block for user
    const newUserBlockId = 'coin_' + Math.random().toString(36).substring(2, 15);
    const newSerial = generateSerialNumber();
    await client.query(
      `INSERT INTO coin_blocks (id, "serialNumber", amount, "ownerId", "parentBlockId", "createdByTransactionId", status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
      [newUserBlockId, newSerial, amount, user.id, spentBlockIds[0] || null, txId]
    );

    // 7. If we took too much from the vault, return change to the vault
    if (collectedAmount > amount) {
      const changeAmount = collectedAmount - amount;
      const vaultChangeBlockId = 'coin_' + Math.random().toString(36).substring(2, 15);
      const vaultChangeSerial = generateSerialNumber();
      await client.query(
        `INSERT INTO coin_blocks (id, "serialNumber", amount, "ownerId", "parentBlockId", "createdByTransactionId", status)
         VALUES ($1, $2, $3, NULL, $4, $5, 'active')`,
        [vaultChangeBlockId, vaultChangeSerial, changeAmount, spentBlockIds[0] || null, txId]
      );
    }

    // 8. Update user balance
    await client.query(`UPDATE "user" SET balance = balance + $1 WHERE id = $2`, [amount, user.id]);

    await client.query('COMMIT');
    await logAudit(adminId, 'DEPOSIT_COINS', `Deposited ${amount.toFixed(2)} to ${username}. Transaction: ${txId}`, false, client);
    return { success: true, transactionId: txId };
  } catch (error: any) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Send money from user A to user B by username
export async function transferCoins(senderId: string, receiverUsername: string, amount: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get sender info
    const senderRes = await client.query(
      `SELECT id, balance, "overdraftLimit", username, role FROM "user" WHERE id = $1`,
      [senderId]
    );
    const sender = senderRes.rows[0];
    if (!sender) throw new Error('Sender not found.');

    if (sender.username === receiverUsername) {
      throw new Error('You cannot send money to yourself.');
    }

    // 2. Get receiver info
    const receiverRes = await client.query(
      `SELECT id, balance, "overdraftLimit", username FROM "user" WHERE username = $1`,
      [receiverUsername]
    );
    const receiver = receiverRes.rows[0];
    if (!receiver) throw new Error(`Recipient username "${receiverUsername}" not found.`);

    // 3. Calculate Fee (1% of amount, min 0.10, max 10.00)
    // No fees for admins to make testing easier
    const fee = sender.role === 'admin' ? 0 : Math.min(10.00, Math.max(0.10, amount * 0.01));
    const totalDeduction = amount + fee;

    const currentBalance = parseFloat(sender.balance);
    const overdraftLimit = parseFloat(sender.overdraftLimit);

    if (currentBalance + overdraftLimit < totalDeduction) {
      throw new Error(
        `Insufficient funds. Transfer cost is ${amount.toFixed(2)} + ${fee.toFixed(2)} fee = ${totalDeduction.toFixed(2)}. Your balance is ${currentBalance.toFixed(2)} and overdraft limit is ${overdraftLimit.toFixed(2)}.`
      );
    }

    // 4. Perform Coin Block Selection
    // Fetch sender's active coin blocks
    const senderBlocksRes = await client.query(
      `SELECT id, amount FROM coin_blocks WHERE "ownerId" = $1 AND status = 'active' ORDER BY "mintedAt" ASC`,
      [sender.id]
    );

    let collectedAmount = 0;
    const spentBlockIds: string[] = [];
    for (const row of senderBlocksRes.rows) {
      collectedAmount += parseFloat(row.amount);
      spentBlockIds.push(row.id);
      if (collectedAmount >= totalDeduction) break;
    }

    const txId = 'tx_' + Math.random().toString(36).substring(2, 15);

    // 5. Record transfer transaction first to satisfy foreign key constraints
    await client.query(
      `INSERT INTO transactions (id, "senderId", "receiverId", amount, fee, type, description)
       VALUES ($1, $2, $3, $4, $5, 'transfer', $6)`,
      [txId, sender.id, receiver.id, amount, fee, `Transfer to ${receiverUsername}.`]
    );

    // If sender didn't have enough active coin blocks, but has overdraft approved
    let overdraftNeeded = 0;
    const vaultSpentBlockIds: string[] = [];

    if (collectedAmount < totalDeduction) {
      overdraftNeeded = totalDeduction - collectedAmount;

      // Lend overdraft from the System Reserve Vault (ownerId IS NULL)
      const vaultBlocksRes = await client.query(
        `SELECT id, amount FROM coin_blocks WHERE "ownerId" IS NULL AND status = 'active' ORDER BY "mintedAt" ASC`
      );

      let vaultCollected = 0;
      for (const row of vaultBlocksRes.rows) {
        vaultCollected += parseFloat(row.amount);
        vaultSpentBlockIds.push(row.id);
        if (vaultCollected >= overdraftNeeded) break;
      }

      if (vaultCollected < overdraftNeeded) {
        throw new Error(
          `Overdraft failed: System Reserve Vault does not have enough active coins (${vaultCollected.toFixed(2)}) to back this overdraft of ${overdraftNeeded.toFixed(2)}. The admin must mint more coins!`
        );
      }

      // Mark vault blocks as spent
      await client.query(
        `UPDATE coin_blocks SET status = 'spent', "spentAt" = NOW(), "spentByTransactionId" = $1 WHERE id = ANY($2)`,
        [txId, vaultSpentBlockIds]
      );

      // If we took too much vault coins, return the change back to the vault
      if (vaultCollected > overdraftNeeded) {
        const vaultChange = vaultCollected - overdraftNeeded;
        const vaultChangeBlockId = 'coin_' + Math.random().toString(36).substring(2, 15);
        await client.query(
          `INSERT INTO coin_blocks (id, "serialNumber", amount, "ownerId", "parentBlockId", "createdByTransactionId", status)
           VALUES ($1, $2, $3, NULL, $4, $5, 'active')`,
          [vaultChangeBlockId, generateSerialNumber(), vaultChange, vaultSpentBlockIds[0], txId]
        );
      }
    }

    // Spend sender's blocks
    if (spentBlockIds.length > 0) {
      await client.query(
        `UPDATE coin_blocks SET status = 'spent', "spentAt" = NOW(), "spentByTransactionId" = $1 WHERE id = ANY($2)`,
        [txId, spentBlockIds]
      );
    }

    // 6. Record fee transaction (if fee > 0)
    if (fee > 0) {
      const feeTxId = 'fee_' + Math.random().toString(36).substring(2, 15);
      await client.query(
        `INSERT INTO transactions (id, "senderId", "receiverId", amount, fee, type, description)
         VALUES ($1, $2, NULL, $3, 0.00, 'fee_payment', $4)`,
        [feeTxId, sender.id, fee, `Transaction fee for transfer to ${receiverUsername}.`]
      );
    }

    // 7. Allocate Coin Blocks to receiver
    const receiverBlockId = 'coin_' + Math.random().toString(36).substring(2, 15);
    // Lineage points to sender's first spent block or vault block
    const parentBlockId = spentBlockIds[0] || vaultSpentBlockIds[0] || null;

    // Check if the receiver has an active overdraft debt.
    // If the receiver is in debt, any incoming coins are used to pay back the vault!
    const receiverBalance = parseFloat(receiver.balance);
    let finalReceiverAmount = amount;
    let debtRepaymentAmount = 0;

    if (receiverBalance < 0) {
      const debt = -receiverBalance;
      if (amount <= debt) {
        debtRepaymentAmount = amount;
        finalReceiverAmount = 0;
      } else {
        debtRepaymentAmount = debt;
        finalReceiverAmount = amount - debt;
      }
    }

    // Create block for receiver's actual wallet (if any remaining)
    if (finalReceiverAmount > 0) {
      await client.query(
        `INSERT INTO coin_blocks (id, "serialNumber", amount, "ownerId", "parentBlockId", "createdByTransactionId", status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
        [receiverBlockId, generateSerialNumber(), finalReceiverAmount, receiver.id, parentBlockId, txId]
      );
    }

    // Create block for debt repayment to Vault (ownerId = NULL) (if receiver was in debt)
    if (debtRepaymentAmount > 0) {
      const repaymentBlockId = 'coin_' + Math.random().toString(36).substring(2, 15);
      await client.query(
        `INSERT INTO coin_blocks (id, "serialNumber", amount, "ownerId", "parentBlockId", "createdByTransactionId", status)
         VALUES ($1, $2, $3, NULL, $4, $5, 'active')`,
        [repaymentBlockId, generateSerialNumber(), debtRepaymentAmount, parentBlockId, txId]
      );

      // Create an audit log/record of the auto-repayment
      await client.query(
        `INSERT INTO transactions (id, "senderId", "receiverId", amount, fee, type, description)
         VALUES ($1, $2, NULL, $3, 0.00, 'overdraft_fee', $4)`,
        ['repay_' + Math.random().toString(36).substring(2, 15), receiver.id, debtRepaymentAmount, `Auto-repayment of overdraft debt to Vault.`]
      );
    }

    // 8. Create Coin Block for Fee (owned by NULL / System Reserve, or a dedicated fee wallet)
    if (fee > 0) {
      const feeBlockId = 'coin_' + Math.random().toString(36).substring(2, 15);
      await client.query(
        `INSERT INTO coin_blocks (id, "serialNumber", amount, "ownerId", "parentBlockId", "createdByTransactionId", status)
         VALUES ($1, $2, $3, NULL, $4, $5, 'active')`,
        [feeBlockId, generateSerialNumber(), fee, parentBlockId, txId]
      );
    }

    // 9. If sender had remaining change (collectedAmount > totalDeduction), return change to sender
    if (collectedAmount > totalDeduction) {
      const changeAmount = collectedAmount - totalDeduction;
      const changeBlockId = 'coin_' + Math.random().toString(36).substring(2, 15);
      await client.query(
        `INSERT INTO coin_blocks (id, "serialNumber", amount, "ownerId", "parentBlockId", "createdByTransactionId", status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
        [changeBlockId, generateSerialNumber(), changeAmount, sender.id, parentBlockId, txId]
      );
    }

    // 10. Update balances in User table
    await client.query(`UPDATE "user" SET balance = balance - $1 WHERE id = $2`, [totalDeduction, sender.id]);
    await client.query(`UPDATE "user" SET balance = balance + $1 WHERE id = $2`, [amount, receiver.id]);

    await client.query('COMMIT');

    // Trigger suspicious transaction checks (e.g. amount > 5000 or self-circular transfers)
    const isSuspicious = amount > 5000;
    await logAudit(
      sender.id,
      'TRANSFER',
      `Transferred ${amount.toFixed(2)} to ${receiverUsername}. Fee: ${fee.toFixed(2)}. Tx: ${txId}`,
      isSuspicious,
      client
    );

    return { success: true, transactionId: txId, fee, amount };
  } catch (error: any) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Request Money
export async function createMoneyRequest(requesterId: string, payerUsername: string, amount: number, description: string) {
  const payerRes = await query('SELECT id FROM "user" WHERE username = $1', [payerUsername]);
  if (!payerRes.rows[0]) {
    throw new Error(`User "${payerUsername}" not found.`);
  }
  const payerId = payerRes.rows[0].id;

  const senderRes = await query('SELECT username FROM "user" WHERE id = $1', [requesterId]);
  const requesterUsername = senderRes.rows[0]?.username;

  if (requesterId === payerId) {
    throw new Error('You cannot request money from yourself.');
  }

  const requestId = 'req_' + Math.random().toString(36).substring(2, 15);
  await query(
    `INSERT INTO money_requests (id, "requesterId", "payerId", amount, description, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')`,
    [requestId, requesterId, payerId, amount, description || `Requested by ${requesterUsername}`]
  );

  await logAudit(requesterId, 'MONEY_REQUEST_CREATED', `Requested ${amount.toFixed(2)} from ${payerUsername}`);
  return { success: true, requestId };
}

// Approve / Decline Money Request
export async function handleRequestAction(requestId: string, userId: string, action: 'approve' | 'decline') {
  const reqRes = await query(
    `SELECT r.*, u.username as requester_username 
     FROM money_requests r 
     JOIN "user" u ON r."requesterId" = u.id 
     WHERE r.id = $1 AND r."payerId" = $2`,
    [requestId, userId]
  );
  const request = reqRes.rows[0];
  if (!request) {
    throw new Error('Request not found or you are not authorized to respond to it.');
  }

  if (request.status !== 'pending') {
    throw new Error('Request has already been processed.');
  }

  if (action === 'decline') {
    await query(`UPDATE money_requests SET status = 'declined', "updatedAt" = NOW() WHERE id = $1`, [requestId]);
    await logAudit(userId, 'MONEY_REQUEST_DECLINED', `Declined request of ${parseFloat(request.amount).toFixed(2)} from ${request.requester_username}`);
    return { success: true, action: 'declined' };
  }

  // Action is approve -> execute transfer
  const amount = parseFloat(request.amount);
  const transferRes = await transferCoins(userId, request.requester_username, amount);

  await query(`UPDATE money_requests SET status = 'approved', "updatedAt" = NOW() WHERE id = $1`, [requestId]);
  await logAudit(userId, 'MONEY_REQUEST_APPROVED', `Approved request of ${amount.toFixed(2)} from ${request.requester_username}`);
  return { success: true, action: 'approved', transfer: transferRes };
}

// Move money to Savings Account (and earn simulated interest)
export async function depositToSavings(userId: string, amount: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userRes = await client.query('SELECT balance, "savingsBalance" FROM "user" WHERE id = $1', [userId]);
    const user = userRes.rows[0];
    if (!user) throw new Error('User not found.');

    const balance = parseFloat(user.balance);
    if (balance < amount) {
      throw new Error(`Insufficient funds. Your active wallet balance is ${balance.toFixed(2)}.`);
    }

    const txId = 'tx_' + Math.random().toString(36).substring(2, 15);

    // 1. Record transaction
    await client.query(
      `INSERT INTO transactions (id, "senderId", "receiverId", amount, fee, type, description)
       VALUES ($1, $2, NULL, $3, 0.00, 'savings_deposit', $4)`,
      [txId, userId, amount, `Transferred ${amount.toFixed(2)} to savings.`]
    );

    // 2. Spend wallet coin blocks and recreate them owned by Savings (we can flag them or just keep standard coins)
    // To make it simple, savings is just a balance column in the database, but we keep the coin blocks in the active wallet.
    // Or we can mark the coin blocks as "spent" (transferred to savings) and then mint them back when withdrawing!
    // Let's make it easy: we spend user's active wallet blocks of size 'amount' and transfer them to the Vault,
    // and record the savings balance increase. When they withdraw, we transfer blocks back from the vault!
    // This maintains exact supply checks!
    const walletBlocks = await client.query(
      `SELECT id, amount FROM coin_blocks WHERE "ownerId" = $1 AND status = 'active' ORDER BY "mintedAt" ASC`,
      [userId]
    );

    let collected = 0;
    const spentIds: string[] = [];
    for (const row of walletBlocks.rows) {
      collected += parseFloat(row.amount);
      spentIds.push(row.id);
      if (collected >= amount) break;
    }

    if (collected < amount) {
      throw new Error('Coin tracing failure: Unable to find active coins matching balance.');
    }

    // Mark blocks as spent
    await client.query(
      `UPDATE coin_blocks SET status = 'spent', "spentAt" = NOW(), "spentByTransactionId" = $1 WHERE id = ANY($2)`,
      [txId, spentIds]
    );

    // Return change to sender if any
    if (collected > amount) {
      const change = collected - amount;
      await client.query(
        `INSERT INTO coin_blocks (id, "serialNumber", amount, "ownerId", "parentBlockId", "createdByTransactionId", status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
        ['coin_' + Math.random().toString(36).substring(2, 15), generateSerialNumber(), change, userId, spentIds[0], txId]
      );
    }

    // Transfer the principal amount to the System Vault (as backings)
    await client.query(
      `INSERT INTO coin_blocks (id, "serialNumber", amount, "ownerId", "parentBlockId", "createdByTransactionId", status)
       VALUES ($1, $2, $3, NULL, $4, $5, 'active')`,
      ['coin_' + Math.random().toString(36).substring(2, 15), generateSerialNumber(), amount, spentIds[0], txId]
    );

    // Update user balances
    await client.query(
      `UPDATE "user" SET balance = balance - $1, "savingsBalance" = "savingsBalance" + $1 WHERE id = $2`,
      [amount, userId]
    );

    await client.query('COMMIT');
    await logAudit(userId, 'SAVINGS_DEPOSIT', `Deposited ${amount.toFixed(2)} to savings.`, false, client);
    return { success: true };
  } catch (error: any) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Withdraw from Savings Account
export async function withdrawFromSavings(userId: string, amount: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userRes = await client.query('SELECT balance, "savingsBalance" FROM "user" WHERE id = $1', [userId]);
    const user = userRes.rows[0];
    if (!user) throw new Error('User not found.');

    const savingsBalance = parseFloat(user.savingsBalance);
    if (savingsBalance < amount) {
      throw new Error(`Insufficient savings funds. Your savings balance is ${savingsBalance.toFixed(2)}.`);
    }

    const txId = 'tx_' + Math.random().toString(36).substring(2, 15);

    // 1. Record transaction
    await client.query(
      `INSERT INTO transactions (id, "senderId", "receiverId", amount, fee, type, description)
       VALUES ($1, NULL, $2, $3, 0.00, 'savings_withdrawal', $4)`,
      [txId, userId, amount, `Withdrew ${amount.toFixed(2)} from savings.`]
    );

    // 2. Move coin blocks from Central Vault back to User's wallet
    const vaultBlocks = await client.query(
      `SELECT id, amount FROM coin_blocks WHERE "ownerId" IS NULL AND status = 'active' ORDER BY "mintedAt" ASC`
    );

    let collected = 0;
    const spentIds: string[] = [];
    for (const row of vaultBlocks.rows) {
      collected += parseFloat(row.amount);
      spentIds.push(row.id);
      if (collected >= amount) break;
    }

    if (collected < amount) {
      throw new Error('System Vault is out of active coins to back this savings withdrawal. Please try again later or contact an admin.');
    }

    // Mark vault blocks as spent
    await client.query(
      `UPDATE coin_blocks SET status = 'spent', "spentAt" = NOW(), "spentByTransactionId" = $1 WHERE id = ANY($2)`,
      [txId, spentIds]
    );

    // Recreate coin block for user
    await client.query(
      `INSERT INTO coin_blocks (id, "serialNumber", amount, "ownerId", "parentBlockId", "createdByTransactionId", status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
      ['coin_' + Math.random().toString(36).substring(2, 15), generateSerialNumber(), amount, userId, spentIds[0], txId]
    );

    // Recreate vault change if any
    if (collected > amount) {
      const change = collected - amount;
      await client.query(
        `INSERT INTO coin_blocks (id, "serialNumber", amount, "ownerId", "parentBlockId", "createdByTransactionId", status)
         VALUES ($1, $2, $3, NULL, $4, $5, 'active')`,
        ['coin_' + Math.random().toString(36).substring(2, 15), generateSerialNumber(), change, spentIds[0], txId]
      );
    }

    // Update balances
    await client.query(
      `UPDATE "user" SET balance = balance + $1, "savingsBalance" = "savingsBalance" - $1 WHERE id = $2`,
      [amount, userId]
    );

    await client.query('COMMIT');
    await logAudit(userId, 'SAVINGS_WITHDRAWAL', `Withdrew ${amount.toFixed(2)} from savings.`, false, client);
    return { success: true };
  } catch (error: any) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Interest simulation: Admin or User triggers a fast-forward interest calculation (e.g. 5% interest on Savings)
export async function simulateSavingsInterest(userId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userRes = await client.query('SELECT "savingsBalance" FROM "user" WHERE id = $1', [userId]);
    const user = userRes.rows[0];
    if (!user) throw new Error('User not found.');

    const savingsBalance = parseFloat(user.savingsBalance);
    if (savingsBalance <= 0) {
      throw new Error('You need a positive savings balance to earn interest.');
    }

    // 5% interest
    const interestEarned = savingsBalance * 0.05;
    if (interestEarned < 0.01) {
      throw new Error('Savings balance is too small to yield simulated interest.');
    }

    // Where does interest money come from? It must come from the Central Vault!
    const vaultBlocks = await client.query(
      `SELECT id, amount FROM coin_blocks WHERE "ownerId" IS NULL AND status = 'active' ORDER BY "mintedAt" ASC`
    );

    let collected = 0;
    const spentIds: string[] = [];
    for (const row of vaultBlocks.rows) {
      collected += parseFloat(row.amount);
      spentIds.push(row.id);
      if (collected >= interestEarned) break;
    }

    if (collected < interestEarned) {
      throw new Error('System Vault is depleted! Admin must mint more coins to back interest payments.');
    }

    const txId = 'tx_' + Math.random().toString(36).substring(2, 15);

    // 1. Record transaction
    await client.query(
      `INSERT INTO transactions (id, "senderId", "receiverId", amount, fee, type, description)
       VALUES ($1, NULL, $2, $3, 0.00, 'deposit', $4)`,
      [txId, userId, interestEarned, `Simulated 5% monthly interest on savings.`]
    );

    // 2. Spend vault blocks
    await client.query(
      `UPDATE coin_blocks SET status = 'spent', "spentAt" = NOW(), "spentByTransactionId" = $1 WHERE id = ANY($2)`,
      [txId, spentIds]
    );

    // 3. Create active block in user's savings (we'll credit it directly to their savingsBalance in db)
    // But since it's added to savings, we add the coin block to the Vault as backings (since it's saved)!
    // To make it correct, we recreate a vault block for interestEarned as active, and credit it to user savingsBalance.
    await client.query(
      `INSERT INTO coin_blocks (id, "serialNumber", amount, "ownerId", "parentBlockId", "createdByTransactionId", status)
       VALUES ($1, $2, $3, NULL, $4, $5, 'active')`,
      ['coin_' + Math.random().toString(36).substring(2, 15), generateSerialNumber(), interestEarned, spentIds[0], txId]
    );

    // Return change to vault
    if (collected > interestEarned) {
      const change = collected - interestEarned;
      await client.query(
        `INSERT INTO coin_blocks (id, "serialNumber", amount, "ownerId", "parentBlockId", "createdByTransactionId", status)
         VALUES ($1, $2, $3, NULL, $4, $5, 'active')`,
        ['coin_' + Math.random().toString(36).substring(2, 15), generateSerialNumber(), change, spentIds[0], txId]
      );
    }

    // Update savings balance
    await client.query(
      `UPDATE "user" SET "savingsBalance" = "savingsBalance" + $1 WHERE id = $2`,
      [interestEarned, userId]
    );

    await client.query('COMMIT');
    await logAudit(userId, 'SAVINGS_INTEREST', `Earned ${interestEarned.toFixed(2)} interest on savings.`, false, client);
    return { success: true, interestEarned };
  } catch (error: any) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
