import express from 'express';
import { Login, SignUp, GetAllStores, GetAllUsers, UpdateUser, ResetPassword, DeleteUser } from '../controllers/LoginAndSignup.js';
import { CreatePayment, GetPayment } from '../controllers/TransactionController.js';
import { CloseController, GetAllCloseData, GetCloseController, getFinancialSummaryWithEdit } from '../controllers/CloseController.js';
import { editTransaction} from '../controllers/EditController.js';
import Transaction from '../model/Transaction.js';
import CloseTransaction from '../model/Closing.js';
import { propagateCashDiff } from '../utils/cashPropagation.js';
import {DownloadAttachment} from "../controllers/TransactionController.js";



const router = express.Router();


/**
 * @swagger
 * /signin:
 *   post:
 *     summary: Create a new user
 *     description: Endpoint to create/register a new user.
 *     responses:
 *       200:
 *         description: Successfully created a new user.
 *       400:
 *         description: Bad Request, validation errors.
 *       500:
 *         description: Internal server error.
 */
router.post('/signin', SignUp)



/**
 * @swagger
 * /login:
 *   post:
 *     summary: login a user
 *     description: Endpoint to login a new user.
 *     responses:
 *       200:
 *         description: Successfully login a user.
 *       400:
 *         description: Bad Request, validation errors.
 *       500:
 *         description: Internal server error.
 */
router.post('/login', Login)

/**
 * @swagger
 * /getAllStores:
 *   get:
 *     summary: Retrieve all stores
 *     description: Fetches all stores/users from the database.
 *     responses:
 *       200:
 *         description: Successfully retrieved stores.
 *       500:
 *         description: Internal server error.
 */
router.get('/getAllStores', GetAllStores)

/**
 * @swagger
 * /getAllUsers:
 *   get:
 *     summary: Retrieve all users with details
 *     description: Fetches all users from the database with full details (excluding passwords).
 *     responses:
 *       200:
 *         description: Successfully retrieved users.
 *       500:
 *         description: Internal server error.
 */
router.get('/getAllUsers', GetAllUsers)

/**
 * @swagger
 * /updateUser/{id}:
 *   put:
 *     summary: Update user details
 *     description: Updates user information including username, email, location code, address, and optionally password.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               locCode:
 *                 type: string
 *               address:
 *                 type: string
 *               power:
 *                 type: string
 *               password:
 *                 type: string
 *                 description: Optional - only include if changing password
 *     responses:
 *       200:
 *         description: User updated successfully.
 *       400:
 *         description: Bad Request, validation errors.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
router.put('/updateUser/:id', UpdateUser)
router.delete('/deleteUser/:id', DeleteUser)

/**
 * @swagger
 * /reset-password:
 *   post:
 *     summary: Reset user password (Admin only)
 *     description: Endpoint to reset a user's password. Admin users can reset any user's password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email of the user whose password needs to be reset
 *               newPassword:
 *                 type: string
 *                 description: New password for the user
 *     responses:
 *       200:
 *         description: Password reset successfully.
 *       400:
 *         description: Bad Request, validation errors.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
router.post('/reset-password', ResetPassword)


/**
 * @swagger
 * /createPayment:
 *   post:
 *     summary: Responsible for creating three transactions
 *     description: This endpoint creates three transaction records related to a payment process.
 *     responses:
 *       200:
 *         description: Successfully created three transactions.
 *       400:
 *         description: Bad Request, validation errors.
 *       500:
 *         description: Internal server error.
 */
router.post('/createPayment', CreatePayment)


/**
 * @swagger
 * /Getpayment:
 *   get:
 *     summary: Retrieve all payment transactions
 *     description: Fetches all created payment transaction records.
 *     responses:
 *       200:
 *         description: Successfully retrieved payment transactions.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       500:
 *         description: Internal server error.
 */
router.get('/Getpayment', GetPayment)


/**
 * @swagger
 * /saveCashBank:
 *   post:
 *     summary: Save cash and bank transaction data
 *     description: Saves the cash and bank closing balance or transaction information.
 *     responses:
 *       200:
 *         description: Successfully saved cash and bank data.
 *       400:
 *         description: Bad Request, validation errors.
 *       500:
 *         description: Internal server error.
 */
router.post('/saveCashBank', CloseController)


/**
 * @swagger
 * /getsaveCashBank:
 *   get:
 *     summary: Retrieve saved cash and bank data
 *     description: Fetches the saved cash and bank transaction or closing balance information.
 *     responses:
 *       200:
 *         description: Successfully retrieved cash and bank data.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       500:
 *         description: Internal server error.
 */
router.get('/getsaveCashBank', GetCloseController)

/**
 * @swagger
 * /AdminColseView:
 *   get:
 *     summary: Retrieve the branches close data
 *     description: Fetches  closing balance information.
 *     responses:
 *       200:
 *         description: Successfully retrieved cash and bank data.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       500:
 *         description: Internal server error.
 */
router.get('/AdminColseView', GetAllCloseData)



/**
 * @swagger
 * /getTransactions:
 *   get:
 *     summary: Retrieve transactions from MongoDB
 *     description: Fetches transactions stored in the MongoDB `transactions` collection, filtered by location code and date range.
 *     parameters:
 *       - in: query
 *         name: locCode
 *         required: true
 *         description: Location code of the branch
 *         schema:
 *           type: string
 *           example: "Zorucci-Kochi"
 *       - in: query
 *         name: dateFrom
 *         required: true
 *         description: Start date for filtering (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-06-01"
 *       - in: query
 *         name: dateTo
 *         required: true
 *         description: End date for filtering (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-06-11"
 *     responses:
 *       200:
 *         description: Successfully retrieved filtered transactions from database.
 *       400:
 *         description: Bad request or missing parameters.
 *       500:
 *         description: Internal server error.
 */
router.get('/getTransactions', async (req, res) => {
  const { locCode, dateFrom, dateTo } = req.query;
  const transactions = await Transaction.find({
    locCode,
    date: { $gte: new Date(dateFrom), $lte: new Date(dateTo) }
  });
  res.json({ data: transactions });
});




// routes/user.js
router.post('/syncTransaction', async (req, res) => {
  try {
    console.log("Incoming sync data:", req.body);
    
    const filter = { 
      invoiceNo: req.body.invoiceNo,
      locCode: req.body.locCode,
      type: req.body.type,
    };

    const existingTx = await Transaction.findOne(filter);
    // If existingTx is null, this is an initial sync of a TWS transaction.
    // The TWS cash amount is already included in the day's total cash, so cashDiff should be 0.
    const oldCash = existingTx ? (Number(existingTx.cash) || 0) : (Number(req.body.cash) || 0);
    const newCash = Number(req.body.cash) || 0;
    const cashDiff = newCash - oldCash;

    const updateData = {
      ...req.body,
      editedBy: req.body.editedBy || "sync",
      editedAt: new Date()
    };

    const propagateCloseDiff = async () => {
      if (cashDiff !== 0 && req.body.locCode && req.body.date) {
        await propagateCashDiff(req.body.locCode, req.body.date, cashDiff, true);
      }
    };

    // Try atomic upsert first (compound key: invoiceNo + locCode + type)
    try {
      const result = await Transaction.findOneAndUpdate(
        filter,
        { $set: updateData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      await propagateCloseDiff();
      const status = result ? 200 : 201;
      return res.status(status).json({ message: "Synced", data: result });
    } catch (upsertErr) {
      // If unique index on invoiceNo blocks the upsert (duplicate key), fall back to update-only
      if (upsertErr.code === 11000) {
        console.warn("⚠️ Duplicate key on invoiceNo — falling back to update by invoiceNo+locCode");
        const fallback = await Transaction.findOneAndUpdate(
          { invoiceNo: req.body.invoiceNo, locCode: req.body.locCode },
          { $set: updateData },
          { new: true }
        );
        if (fallback) {
          await propagateCloseDiff();
          return res.status(200).json({ message: "Updated (fallback)", data: fallback });
        }
        // If still not found, return the error
        return res.status(409).json({ error: "Duplicate invoiceNo — could not sync." });
      }
      throw upsertErr;
    }
  } catch (err) {
    console.error("Sync error:", err);
    return res.status(500).json({ error: err.message });
  }
});








router.put('/editTransaction/:id', editTransaction);



router.get("/transaction/:id/attachment", DownloadAttachment);

/**
 * @swagger
 * /financialSummaryWithEdit:
 *   get:
 *     summary: Get Financial Summary with Edit Support
 *     description: Retrieves financial summary data with individual transactions for editing
 *     parameters:
 *       - in: query
 *         name: locCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Location code
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *         description: Date in YYYY-MM-DD format
 *       - in: query
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *         description: User role (admin/super_admin)
 *     responses:
 *       200:
 *         description: Successfully retrieved financial summary with edit support
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Server error
 */
router.get('/financialSummaryWithEdit', getFinancialSummaryWithEdit);




export default router;