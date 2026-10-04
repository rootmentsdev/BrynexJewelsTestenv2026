import Manufacturer from "../model/Manufacturer.js";

// Get all manufacturers
export const getManufacturers = async (req, res) => {
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
    
    const manufacturers = await Manufacturer.find(query)
      .sort({ name: 1 })
      .select("name displayName isActive createdAt updatedAt");
    
    // Return displayName if available, otherwise capitalize name
    const formattedManufacturers = manufacturers.map((m) => ({
      _id: m._id,
      name: m.displayName || m.name.charAt(0).toUpperCase() + m.name.slice(1),
      isActive: m.isActive,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));
    
    return res.status(200).json(formattedManufacturers);
  } catch (error) {
    console.error("Error fetching manufacturers:", error);
    return res.status(500).json({ message: "Failed to fetch manufacturers." });
  }
};

// Create a new manufacturer
export const createManufacturer = async (req, res) => {
  try {
    const { name } = req.body;
    const createdBy = req.body.createdBy || req.headers["x-user-name"] || "System";
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Manufacturer name is required." });
    }
    
    // Normalize name to lowercase for uniqueness check
    const normalizedName = name.trim().toLowerCase();
    
    // Check if manufacturer already exists
    const existing = await Manufacturer.findOne({ name: normalizedName });
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
          message: "Manufacturer reactivated.",
        });
      }
      return res.status(200).json({
        _id: existing._id,
        name: existing.displayName || existing.name.charAt(0).toUpperCase() + existing.name.slice(1),
        isActive: existing.isActive,
        message: "Manufacturer already exists.",
      });
    }
    
    // Create new manufacturer
    const manufacturer = await Manufacturer.create({
      name: normalizedName,
      displayName: name.trim(),
      createdBy: createdBy,
      updatedBy: createdBy,
    });
    
    return res.status(201).json({
      _id: manufacturer._id,
      name: manufacturer.displayName || manufacturer.name.charAt(0).toUpperCase() + manufacturer.name.slice(1),
      isActive: manufacturer.isActive,
      message: "Manufacturer created successfully.",
    });
  } catch (error) {
    console.error("Error creating manufacturer:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Manufacturer already exists." });
    }
    return res.status(500).json({ message: "Failed to create manufacturer." });
  }
};

// Update a manufacturer
export const updateManufacturer = async (req, res) => {
  try {
    const { manufacturerId } = req.params;
    const { name, isActive } = req.body;
    const updatedBy = req.body.updatedBy || req.headers["x-user-name"] || "System";
    
    if (!manufacturerId) {
      return res.status(400).json({ message: "Manufacturer ID is required." });
    }
    
    const manufacturer = await Manufacturer.findById(manufacturerId);
    if (!manufacturer) {
      return res.status(404).json({ message: "Manufacturer not found." });
    }
    
    const updateData = { updatedBy };
    
    if (name !== undefined && name.trim()) {
      const normalizedName = name.trim().toLowerCase();
      // Check if new name conflicts with existing manufacturer
      if (normalizedName !== manufacturer.name) {
        const existing = await Manufacturer.findOne({ name: normalizedName });
        if (existing && existing._id.toString() !== manufacturerId) {
          return res.status(400).json({ message: "Manufacturer name already exists." });
        }
        updateData.name = normalizedName;
        updateData.displayName = name.trim();
      }
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    
    const updatedManufacturer = await Manufacturer.findByIdAndUpdate(
      manufacturerId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    return res.status(200).json({
      _id: updatedManufacturer._id,
      name: updatedManufacturer.displayName || updatedManufacturer.name.charAt(0).toUpperCase() + updatedManufacturer.name.slice(1),
      isActive: updatedManufacturer.isActive,
      message: "Manufacturer updated successfully.",
    });
  } catch (error) {
    console.error("Error updating manufacturer:", error);
    return res.status(500).json({ message: "Failed to update manufacturer." });
  }
};

// Delete (deactivate) a manufacturer
export const deleteManufacturer = async (req, res) => {
  try {
    const { manufacturerId } = req.params;
    const updatedBy = req.body.updatedBy || req.headers["x-user-name"] || "System";
    
    if (!manufacturerId) {
      return res.status(400).json({ message: "Manufacturer ID is required." });
    }
    
    const manufacturer = await Manufacturer.findByIdAndUpdate(
      manufacturerId,
      { $set: { isActive: false, updatedBy } },
      { new: true }
    );
    
    if (!manufacturer) {
      return res.status(404).json({ message: "Manufacturer not found." });
    }
    
    return res.status(200).json({ message: "Manufacturer deactivated successfully." });
  } catch (error) {
    console.error("Error deleting manufacturer:", error);
    return res.status(500).json({ message: "Failed to delete manufacturer." });
  }
};

