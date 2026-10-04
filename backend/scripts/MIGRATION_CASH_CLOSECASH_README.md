# Cash/Closecash Field Swap Migration

## Overview

This migration script fixes the swapped values in the `cash` and `Closecash` fields for all existing CloseTransaction documents in the database.

## Problem

Previously, the values were being saved incorrectly:
- `cash` field contained **physical cash count** (should contain calculated closing cash)
- `Closecash` field contained **calculated closing cash** (should contain physical cash count)

This caused issues because:
- The `cash` field is used as the next day's opening balance
- It should contain the calculated closing cash (RootFin total), not the physical count

## Solution

The migration script swaps the values:
- `cash` field ← `Closecash` value (calculated closing cash)
- `Closecash` field ← `cash` value (physical cash count)

## Which Database Will Be Affected?

The migration script connects to MongoDB based on your environment:

- **Development/Default**: Uses `MONGODB_URI_DEV` from `.env.development`
- **Production**: Uses `MONGODB_URI_PROD` from `.env.production` (when `NODE_ENV=production`)

### Check Which Database You'll Connect To

**Before running the migration, check which database it will connect to:**

```bash
cd backend
node scripts/check-database-connection.js
```

This will show you:
- Which environment is active
- Which database name and host
- Whether it's production or development
- Safety warnings

### Important Notes:

1. **By default**, the script runs in `development` mode
2. **Safety feature**: The script will ABORT if you try to connect to production DB from non-production environment
3. **To connect to production**: You must explicitly set `NODE_ENV=production`

## Usage

### Step 1: Check Database Connection
**First, verify which database you'll connect to:**

```bash
cd backend
node scripts/check-database-connection.js
```

### Step 2: Backup Your Database
**⚠️ IMPORTANT: Always backup your database before running migrations!**

```bash
# Example MongoDB backup command
mongodump --uri="your-mongodb-connection-string" --out=./backup-$(date +%Y%m%d)
```

### Step 3: Test with Dry Run
First, run in dry-run mode to see what will be changed:

```bash
cd backend
node scripts/fix-cash-closecash-swap.js --dry-run
```

This will:
- Show you how many documents will be updated
- Display sample changes
- **NOT make any actual changes**

### Step 4: Run the Migration
Once you've verified the dry-run output, run the actual migration:

```bash
cd backend
node scripts/fix-cash-closecash-swap.js --confirm
```

The `--confirm` flag is required to prevent accidental execution.

## What the Script Does

1. Connects to MongoDB (uses `.env.development` or `.env.production` based on NODE_ENV)
2. Fetches all CloseTransaction documents
3. Analyzes each document to determine if swap is needed
4. Swaps `cash` and `Closecash` values
5. Saves the updated documents
6. Provides a summary of changes

## Example Output

```
🔄 Starting Cash/Closecash Field Swap Migration
======================================================================

✅ MongoDB connected [development]

📊 Fetching all CloseTransaction documents...
   Found 150 documents

🔍 Analyzing documents...

📋 Migration Summary:
   Total documents: 150
   Documents to swap: 145
   Documents to skip: 5

📝 Sample changes (first 5 documents):
----------------------------------------------------------------------

1. locCode: 707, Date: 2026-01-17
   Before: cash=20600, Closecash=20602
   After:  cash=20602, Closecash=20600

2. locCode: 716, Date: 2026-01-09
   Before: cash=14421, Closecash=14421
   After:  cash=14421, Closecash=14421

...

🔄 Applying changes...

   ✅ Updated 100 documents...
   ✅ Updated 145 documents...

======================================================================
✅ Migration Complete!

   Successfully updated: 145 documents
   Skipped: 5 documents (no swap needed)
```

## Verification

After running the migration, verify the changes:

1. **Check a few records manually** in your database
2. **Test the Close Report** - opening balances should now be correct
3. **Test saving a new closing entry** - values should save correctly

## Rollback

If you need to rollback (swap the values back):

1. Restore from your database backup, OR
2. Run the script again (it will swap them back)

## Notes

- The script is safe to run multiple times (it will swap the values back and forth)
- Documents with both values as 0 are skipped
- The script includes safety checks to prevent connecting to production DB from non-production environment

## Troubleshooting

### Error: "MONGODB_URI is not defined"
- Make sure you have `.env.development` or `.env.production` file in the `backend` directory
- Check that `MONGODB_URI_DEV` or `MONGODB_URI_PROD` is set

### Error: "Trying to connect to production DB from non-production env"
- This is a safety feature
- Set `NODE_ENV=production` if you really want to connect to production
- Or use the production connection string in production environment

### Script runs but no changes
- Check if documents actually need swapping (some might already be correct)
- Verify the dry-run output to see what would be changed
