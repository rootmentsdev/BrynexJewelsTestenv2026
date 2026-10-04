import CloseTransaction from "../model/Closing.js";
import Transaction from "../model/Transaction.js";
import { propagateCashDiff } from "../utils/cashPropagation.js";

export const CloseController = async (req, res) => {
    try {
        // ✅ CORRECT FIELD MAPPING:
        // The frontend sends:
        // - totalCash = calculated closing cash (RootFin total, shown as "Closing Cash" in UI) = 20602
        // - totalAmount = physical cash from denominations (shown as "Physical Cash" in UI) = 20600
        // 
        // We need to save:
        // - cash field = calculated closing cash (totalCash) = 20602 - used as next day's opening balance
        // - Closecash field = physical cash count (totalAmount) = 20600
        //
        // The mapping is correct - totalCash → cash, totalAmount → Closecash
        const { totalBankAmount: bank, totalAmount: Closecash, locCode, date, totalCash: cash, email } = req.body;
        
        console.log("💰 Saving close data:", {
            receivedTotalCash: req.body.totalCash,
            receivedTotalAmount: req.body.totalAmount,
            savingAsCash: cash,
            savingAsClosecash: Closecash,
            note: "cash = calculated closing (next day opening), Closecash = physical count"
        });

        console.log(bank, cash, Closecash, email, locCode, date);

        if (bank === undefined || Closecash === undefined || !locCode || !date) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }
        

        console.log("Provided Date:", date);

        // Convert date from "DD-MM-YYYY" to valid Date object
        let formattedDate;
        if (date.includes("-") && date.split("-")[0].length === 2) {
            const [day, month, year] = date.split("-");
            formattedDate = new Date(`${year}-${month}-${day}`);
        } else {
            formattedDate = new Date(date);
        }

        if (isNaN(formattedDate.getTime())) {
            return res.status(400).json({
                message: "Invalid date format. Use DD-MM-YYYY or a valid date string.",
            });
        }

        // Check if an entry already exists for the given date and locCode
        const existingClose = await CloseTransaction.findOne({ locCode, date: formattedDate });

        if (existingClose) {
            const oldCash = Number(existingClose.cash) || 0;
            const newCash = Number(cash) || 0;
            const cashDiff = newCash - oldCash;

            // Update existing document
            existingClose.bank = bank;
            existingClose.cash = cash;
            existingClose.Closecash = Closecash;
            existingClose.email = email;

            await existingClose.save();

            // Propagate difference to next day and beyond
            if (cashDiff !== 0) {
                await propagateCashDiff(locCode, formattedDate, cashDiff, false);
            }

            return res.status(200).json({
                message: "Cash and bank details updated successfully",
                data: existingClose,
            });
        } else {
            // Create new document
            const CloseCashBank = new CloseTransaction({
                bank,
                Closecash,
                cash,
                locCode,
                date: formattedDate,
                email
            });

            await CloseCashBank.save();

            // Propagate calculated cash to next day and beyond
            await propagateCashDiff(locCode, formattedDate, cash, false);

            return res.status(201).json({
                message: "Cash and bank details saved successfully",
                data: CloseCashBank,
            });
        }
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({
            message: "An error occurred while saving the data.",
            error: error.message,
        });
    }
};




export const GetCloseController = async (req, res) => {
    try {
        const { date, locCode } = req.query;
        if (!date || !locCode) {
            return res.status(400).json({
                message: "date and locCode are required"
            });
        }

        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

        const data = await CloseTransaction.findOne({
            locCode,
            date: {
                $gte: startOfDay,
                $lt: endOfDay
            }
        });

        if (!data) {
            return res.status(200).json({
                message: "No Data Found",
                data: null
            });
        }

        // Convert to plain object to ensure all fields are accessible
        const dataObj = data.toObject ? data.toObject() : (data._doc || data);
        
        // ✅ Return cash field (calculated closing) as the opening balance for next day
        // This is the value that should be used as next day's opening
        console.log(`📊 GetCloseController for ${locCode} on ${date}:`, {
            cash: dataObj.cash,
            Closecash: dataObj.Closecash,
            note: "cash field (calculated closing) will be used as next day's opening balance"
        });

        res.status(200).json({
            message: "data Found",
            data: dataObj
        });
    } catch (error) {
        console.error("GetCloseController error:", error);
        res.status(500).json({
            message: "Internal server Error"
        });
    }
}


export const GetAllCloseData = async (req, res) => {
    try {
        const { date, role } = req.query;

        if (role !== 'admin') {
            return res.status(401).json({ message: "You are not a Admin" });
        }

        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const endOfDay   = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

        const manualCloseData = await CloseTransaction.find({
            date: { $gte: startOfDay, $lt: endOfDay }
        }).lean();

        res.status(200).json({ data: manualCloseData });

    } catch (error) {
        console.error("GetAllCloseData error:", error);
        res.status(500).json({ message: "Internal server Error" });
    }
}

// Get Financial Summary with Edit Support
export const getFinancialSummaryWithEdit = async (req, res) => {
    try {
        const { date, locCode, role } = req.query;

        if (!date || !locCode) {
            return res.status(400).json({
                message: "Date and locCode are required"
            });
        }

        // Parse the date to match the format
        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

        // Get MongoDB transactions for this location and date
        const mongoTransactions = await Transaction.find({
            locCode: locCode,
            date: {
                $gte: startOfDay,
                $lt: endOfDay
            }
        }).sort({ createdAt: -1 });

        // Fetch external API data (like Financial Summary)
        const twsBase = "https://rentalapi.rootments.live/api/GetBooking";
        const dateStr = date; // Use the date parameter directly
        
        let externalBank = 0;
        let externalUPI = 0;
        let externalCash = 0;
        let externalRbl = 0;

        try {
            // Fetch booking data
            const bookingResponse = await fetch(`${twsBase}/GetBookingList?LocCode=${locCode}&DateFrom=${dateStr}&DateTo=${dateStr}`);
            const bookingData = await bookingResponse.json();
            
            if (bookingData?.dataSet?.data) {
                bookingData.dataSet.data.forEach(item => {
                    externalBank += parseInt(item.bookingBankAmount || 0);
                    externalUPI += parseInt(item.bookingUPIAmount || 0);
                    externalCash += parseInt(item.bookingCashAmount || 0);
                    externalRbl += parseInt(item.rblRazorPay || 0);
                });
            }

            // Fetch rentout data
            const rentoutResponse = await fetch(`${twsBase}/GetRentoutList?LocCode=${locCode}&DateFrom=${dateStr}&DateTo=${dateStr}`);
            const rentoutData = await rentoutResponse.json();
            
            if (rentoutData?.dataSet?.data) {
                rentoutData.dataSet.data.forEach(item => {
                    externalBank += parseInt(item.rentoutBankAmount || 0);
                    externalUPI += parseInt(item.rentoutUPIAmount || 0);
                    externalCash += parseInt(item.rentoutCashAmount || 0);
                    externalRbl += parseInt(item.rblRazorPay || 0);
                });
            }

            // Fetch return data
            const returnResponse = await fetch(`${twsBase}/GetReturnList?LocCode=${locCode}&DateFrom=${dateStr}&DateTo=${dateStr}`);
            const returnData = await returnResponse.json();
            
            if (returnData?.dataSet?.data) {
                returnData.dataSet.data.forEach(item => {
                    const returnRblAmount = parseInt(item.rblRazorPay || 0);
                    
                    // Only process bank/UPI if no RBL value (RBL prevention logic)
                    if (returnRblAmount === 0) {
                        externalBank -= Math.abs(parseInt(item.returnBankAmount || 0));
                        externalUPI -= Math.abs(parseInt(item.returnUPIAmount || 0));
                    }
                    externalCash -= Math.abs(parseInt(item.returnCashAmount || 0));
                    externalRbl -= Math.abs(returnRblAmount);
                });
            }

            // Fetch delete data
            const deleteResponse = await fetch(`${twsBase}/GetDeleteList?LocCode=${locCode}&DateFrom=${dateStr}&DateTo=${dateStr}`);
            const deleteData = await deleteResponse.json();
            
            if (deleteData?.dataSet?.data) {
                deleteData.dataSet.data.forEach(item => {
                    const deleteRblAmount = parseInt(item.rblRazorPay || 0);
                    
                    // Only process bank/UPI if no RBL value (RBL prevention logic)
                    if (deleteRblAmount === 0) {
                        externalBank -= Math.abs(parseInt(item.deleteBankAmount || 0));
                        externalUPI -= Math.abs(parseInt(item.deleteUPIAmount || 0));
                    }
                    externalCash -= Math.abs(parseInt(item.deleteCashAmount || 0));
                    externalRbl -= Math.abs(deleteRblAmount);
                });
            }

        } catch (error) {
            console.error(`Error fetching external data for ${locCode}:`, error);
        }

        // Calculate Bank + UPI total from MongoDB transactions
        let mongoBank = 0;
        let mongoUPI = 0;
        let mongoCash = 0;

        console.log(`Processing ${mongoTransactions.length} MongoDB transactions for locCode: ${locCode}`);
        
        mongoTransactions.forEach((transaction, index) => {
            const bankAmount = parseInt(transaction.bank) || 0;
            const cashAmount = parseInt(transaction.cash) || 0;
            const upiAmount = parseInt(transaction.upi) || 0;

            console.log(`MongoDB Transaction ${index + 1}: Bank=${bankAmount}, UPI=${upiAmount}, Cash=${cashAmount}`);

            mongoBank += bankAmount;
            mongoUPI += upiAmount;
            mongoCash += cashAmount;
        });

        // Combine MongoDB + External API data (like Financial Summary)
        const totalBank = mongoBank + externalBank;
        const totalUPI = mongoUPI + externalUPI;
        const totalCash = mongoCash + externalCash;
        const calculatedBankUPI = totalBank + totalUPI;
        
        console.log(`External API for ${locCode}: Bank=${externalBank}, UPI=${externalUPI}, RBL=${externalRbl}, Cash=${externalCash}`);
        console.log(`MongoDB Total for ${locCode}: Bank=${mongoBank}, UPI=${mongoUPI}, Cash=${mongoCash}`);
        console.log(`Combined Total for ${locCode}: Bank=${totalBank}, UPI=${totalUPI}, RBL=${externalRbl}, Bank+UPI=${calculatedBankUPI}, Cash=${totalCash}`);

        // Get closing data if exists
        const closingData = await CloseTransaction.findOne({
            locCode,
            date: {
                $gte: startOfDay,
                $lt: endOfDay
            }
        });

        res.status(200).json({
            success: true,
            data: {
                locCode,
                date: dateStr,
                transactions: mongoTransactions, // Include individual transactions for editing
                summary: {
                    mongoBank,
                    mongoUPI,
                    mongoCash,
                    externalBank,
                    externalUPI,
                    externalCash,
                    externalRbl,
                    totalBank,
                    totalUPI,
                    totalCash,
                    calculatedBankUPI,
                    totalTransactions: mongoTransactions.length
                },
                closingData: closingData || null,
                canEdit: role === 'admin' || role === 'super_admin' // Add edit permission flag
            }
        });

    } catch (error) {
        console.error("getFinancialSummaryWithEdit error:", error);
        res.status(500).json({
            message: "Internal server Error",
            error: error.message
        });
    }
};