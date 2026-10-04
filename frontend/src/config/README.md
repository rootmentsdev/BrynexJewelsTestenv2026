# Sales & Inventory Access Configuration

## Overview
This configuration controls which store users have access to the **Sales** and **Inventory** sections during the testing phase.

## Configuration File
`salesInventoryAccess.json`

## Current Allowed Stores (Testing Phase)
The following 4 stores currently have access:
1. **MG Road** - Suitorguymgroad@gmail.com
2. **Trivandrum** - suitorguy.trivandrum@gmail.com
3. **Kannur** - groomsweddinghubkannur@gmail.com
4. **Perinthalmanna** - groomsweddinghubperinthalmanna@gmail.com

## How to Add/Remove Stores

### To Add a New Store:
1. Open `frontend/src/config/salesInventoryAccess.json`
2. Add the store's email to the `allowedEmails` array
3. Save the file
4. Rebuild the frontend (if in production)

Example:
```json
{
  "allowedEmails": [
    "Suitorguymgroad@gmail.com",
    "suitorguy.trivandrum@gmail.com",
    "groomsweddinghubkannur@gmail.com",
    "groomsweddinghubperinthalmanna@gmail.com",
    "newstore@gmail.com"  // <- Add new email here
  ]
}
```

### To Remove a Store:
1. Open `frontend/src/config/salesInventoryAccess.json`
2. Remove the store's email from the `allowedEmails` array
3. Save the file
4. Rebuild the frontend (if in production)

### To Enable for All Stores:
When testing is complete and you want to enable Sales & Inventory for all stores:
1. Open `frontend/src/components/Nav.jsx`
2. Find the lines with `{hasSalesInventoryAccess && (`
3. Remove the condition wrapper, keeping only the inner content
4. Or set a flag in the config to enable for all

## Important Notes
- Email comparison is **case-insensitive** (Suitorguymgroad@gmail.com = suitorguymgroad@gmail.com)
- Changes require frontend rebuild in production
- In development, changes take effect after page refresh
- Users not in the list will NOT see Sales and Inventory menu items
- Admin users with `power: 'admin'` still see Purchase section regardless of this config

## Testing
To test if access control is working:
1. Login with an allowed email → Should see Sales & Inventory sections
2. Login with a non-allowed email → Should NOT see Sales & Inventory sections
3. Check browser console for any errors

## Rollout Plan
1. **Phase 1 (Current)**: 4 stores testing
2. **Phase 2**: Add more stores based on feedback
3. **Phase 3**: Enable for all stores after successful testing
