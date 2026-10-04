/**
 * Comprehensive mapping from login location names to warehouse names used in transfer orders
 * This ensures consistent matching between user login locations and warehouse names stored in the database
 */

export const mapLocNameToWarehouse = (locName) => {
  if (!locName) return "";
  
  // Comprehensive mapping for all stores - maps login location names to warehouse names
  const locationToWarehouseMapping = {
    // Trivandrum variations
    "SG-Trivandrum": "Grooms Trivandrum",
    "sg.tvm": "Grooms Trivandrum",
    "SG.TVM": "Grooms Trivandrum", 
    "sg-tvm": "Grooms Trivandrum",
    "SG.tvm": "Grooms Trivandrum",
    "sg.Tvm": "Grooms Trivandrum",
    "Grooms Trivandrum": "Grooms Trivandrum",
    "Grooms Trivandum": "Grooms Trivandrum",
    "Trivandrum Branch": "Grooms Trivandrum",
    
    // Palakkad variations
    "G.Palakkad": "Palakkad Branch",
    "G.Palakkad ": "Palakkad Branch",
    "GPalakkad": "Palakkad Branch",
    "Palakkad Branch": "Palakkad Branch",
    
    // Calicut variations
    "G.Calicut": "Calicut",
    "G.Calicut ": "Calicut",
    "GCalicut": "Calicut",
    "Calicut": "Calicut",
    
    // Manjeri/Manjery variations
    "G.Manjeri": "Manjery Branch",
    "G.Manjery": "Manjery Branch",
    "GManjeri": "Manjery Branch",
    "GManjery": "Manjery Branch",
    "Manjery Branch": "Manjery Branch",
    
    // Kannur variations
    "G.Kannur": "Kannur Branch",
    "GKannur": "Kannur Branch",
    "Kannur Branch": "Kannur Branch",
    
    // Edappal variations
    "G.Edappal": "Edappal Branch",
    "G-Edappal": "Edappal Branch",
    "GEdappal": "Edappal Branch",
    "Edappal Branch": "Edappal Branch",
    
    // Edapally variations
    "G.Edappally": "Edapally Branch",
    "G-Edappally": "Edapally Branch",
    "GEdappally": "Edapally Branch",
    "GEdapally": "Edapally Branch",
    "Edapally Branch": "Edapally Branch",
    
    // Kalpetta variations
    "G.Kalpetta": "Kalpetta Branch",
    "GKalpetta": "Kalpetta Branch",
    "Kalpetta Branch": "Kalpetta Branch",
    
    // Kottakkal variations
    "G.Kottakkal": "Kottakkal Branch",
    "GKottakkal": "Kottakkal Branch",
    "Kottakkal Branch": "Kottakkal Branch",
    "Z.Kottakkal": "Kottakkal Branch",
    
    // Perinthalmanna variations
    "G.Perinthalmanna": "Perinthalmanna Branch",
    "GPerinthalmanna": "Perinthalmanna Branch",
    "Perinthalmanna Branch": "Perinthalmanna Branch",
    "Z.Perinthalmanna": "Perinthalmanna Branch",
    
    // Chavakkad variations
    "G.Chavakkad": "Chavakkad Branch",
    "G-Chavakkad": "Chavakkad Branch",
    "GChavakkad": "Chavakkad Branch",
    "Chavakkad Branch": "Chavakkad Branch",
    
    // Thrissur variations
    "G.Thrissur": "Thrissur Branch",
    "GThrissur": "Thrissur Branch",
    "Thrissur Branch": "Thrissur Branch",
    
    // Perumbavoor variations
    "G.Perumbavoor": "Perumbavoor Branch",
    "GPerumbavoor": "Perumbavoor Branch",
    "Perumbavoor Branch": "Perumbavoor Branch",
    
    // Kottayam variations
    "G.Kottayam": "Kottayam Branch",
    "GKottayam": "Kottayam Branch",
    "Kottayam Branch": "Kottayam Branch",
    
    // MG Road variations
    "G.MG Road": "MG Road",
    "G.Mg Road": "MG Road",
    "G-MG Road": "MG Road",
    "G-Mg Road": "MG Road",
    "GMG Road": "MG Road",
    "GMg Road": "MG Road",
    
    "mg road": "MG Road",
    "g.mg road": "MG Road",
    "g.mg": "MG Road",
    "G.mg": "MG Road",
    "SuitorGuy MG Road": "MG Road",
    
    // Warehouse variations
    "Warehouse": "Warehouse",
    "warehouse": "Warehouse",
    "WAREHOUSE": "Warehouse",
    
    // Head Office variations
    "HEAD OFFICE01": "Head Office",
    "Head Office": "Head Office",
    
    // Z-stores (these are separate stores, not Warehouse)
    "Z-Edapally1": "Z-Edapally Branch",
    "Z-Edapally": "Z-Edapally Branch",
    "Z-Edappal": "Z-Edappal Branch",
    "Z- Edappal": "Z-Edappal Branch",
    "Z.Perinthalmanna": "Perinthalmanna Branch",
    "Z.Kottakkal": "Kottakkal Branch",
    
    // Vadakara variations
    "G.Vadakara": "Vadakara Branch",
    "G-Vadakara": "Vadakara Branch",
    "GVadakara": "Vadakara Branch",
    "Vadakara Branch": "Vadakara Branch",
    
    // Other locations
    "Production": "Production",
    "Office": "Office",
  };
  
  // Check exact match first (case-sensitive)
  if (locationToWarehouseMapping[locName]) {
    return locationToWarehouseMapping[locName];
  }
  
  // Check case-insensitive match
  const locNameLower = locName.toLowerCase().trim();
  for (const [key, value] of Object.entries(locationToWarehouseMapping)) {
    if (key.toLowerCase() === locNameLower) {
      return value;
    }
  }
  
  // Fallback: Remove prefixes like "G.", "Z.", "SG." ONLY if they exist
  let warehouse = locName;
  
  // Only remove prefix if it matches the pattern G., Z., SG., etc.
  if (/^[A-Z]{1,2}\./.test(locName)) {
    warehouse = locName.replace(/^[A-Z]{1,2}\.\s*/, "").trim();
    // Add "Branch" if not already present and not "Warehouse"
    if (warehouse && warehouse.toLowerCase() !== "warehouse" && !warehouse.toLowerCase().includes("branch")) {
      warehouse = `${warehouse} Branch`;
    }
  }
  
  return warehouse;
};
