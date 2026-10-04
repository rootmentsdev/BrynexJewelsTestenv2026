import Brand from "../model/Brand.js";

// Get all brands
export const getBrands = async (req, res) => {
  try {
    const { search, isActive } = req.query;
    
    const query = {};
    
    // Filter by active status if provided
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }
    
    // Search by name if provided
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { displayName: { $regex: search.trim(), $options: "i" } },
      ];
    }
    
    const brands = await Brand.find(query)
      .sort({ name: 1 })
      .select("name displayName isActive createdAt updatedAt");
    
    // Return displayName if available, otherwise capitalize name
    const formattedBrands = brands.map((b) => ({
      _id: b._id,
      name: b.displayName || b.name.charAt(0).toUpperCase() + b.name.slice(1),
      isActive: b.isActive,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));
    
    return res.status(200).json(formattedBrands);
  } catch (error) {
    console.error("Error fetching brands:", error);
    return res.status(500).json({ message: "Failed to fetch brands." });
  }
};

// Create a new brand
export const createBrand = async (req, res) => {
  try {
    const { name } = req.body;
    const createdBy = req.body.createdBy || req.headers["x-user-name"] || "System";
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Brand name is required." });
    }
    
    // Normalize name to lowercase for uniqueness check
    const normalizedName = name.trim().toLowerCase();
    
    // Check if brand already exists
    const existing = await Brand.findOne({ name: normalizedName });
    if (existing) {
      // If inactive, reactivate it
      if (!existing.isActive) {
        existing.isActive = true;
        existing.updatedBy = createdBy;
        await existing.save();
        return res.status(200).json({
          _id: existing._id,
          name: existing.displayName || existing.name.charAt(0).toUpperCase() + existing.name.slice(1),
          isActive: existing.isActive,
          message: "Brand reactivated.",
        });
      }
      return res.status(200).json({
        _id: existing._id,
        name: existing.displayName || existing.name.charAt(0).toUpperCase() + existing.name.slice(1),
        isActive: existing.isActive,
        message: "Brand already exists.",
      });
    }
    
    // Create new brand
    const brand = await Brand.create({
      name: normalizedName,
      displayName: name.trim(),
      createdBy: createdBy,
      updatedBy: createdBy,
    });
    
    return res.status(201).json({
      _id: brand._id,
      name: brand.displayName || brand.name.charAt(0).toUpperCase() + brand.name.slice(1),
      isActive: brand.isActive,
      message: "Brand created successfully.",
    });
  } catch (error) {
    console.error("Error creating brand:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Brand already exists." });
    }
    return res.status(500).json({ message: "Failed to create brand." });
  }
};

// Update a brand
export const updateBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { name, isActive } = req.body;
    const updatedBy = req.body.updatedBy || req.headers["x-user-name"] || "System";
    
    if (!brandId) {
      return res.status(400).json({ message: "Brand ID is required." });
    }
    
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found." });
    }
    
    const updateData = { updatedBy };
    
    if (name !== undefined && name.trim()) {
      const normalizedName = name.trim().toLowerCase();
      // Check if new name conflicts with existing brand
      if (normalizedName !== brand.name) {
        const existing = await Brand.findOne({ name: normalizedName });
        if (existing && existing._id.toString() !== brandId) {
          return res.status(400).json({ message: "Brand name already exists." });
        }
        updateData.name = normalizedName;
        updateData.displayName = name.trim();
      }
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    
    const updatedBrand = await Brand.findByIdAndUpdate(
      brandId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    return res.status(200).json({
      _id: updatedBrand._id,
      name: updatedBrand.displayName || updatedBrand.name.charAt(0).toUpperCase() + updatedBrand.name.slice(1),
      isActive: updatedBrand.isActive,
      message: "Brand updated successfully.",
    });
  } catch (error) {
    console.error("Error updating brand:", error);
    return res.status(500).json({ message: "Failed to update brand." });
  }
};

// Delete (deactivate) a brand
export const deleteBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const updatedBy = req.body.updatedBy || req.headers["x-user-name"] || "System";
    
    if (!brandId) {
      return res.status(400).json({ message: "Brand ID is required." });
    }
    
    const brand = await Brand.findByIdAndUpdate(
      brandId,
      { $set: { isActive: false, updatedBy } },
      { new: true }
    );
    
    if (!brand) {
      return res.status(404).json({ message: "Brand not found." });
    }
    
    return res.status(200).json({ message: "Brand deactivated successfully." });
  } catch (error) {
    console.error("Error deleting brand:", error);
    return res.status(500).json({ message: "Failed to delete brand." });
  }
};

