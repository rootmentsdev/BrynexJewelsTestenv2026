import Address from "../model/Address.js";

// Get all addresses for a user
export const getAddresses = async (req, res) => {
  try {
    const userId = req.query.userId || req.body.userId;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const addresses = await Address.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(addresses);
  } catch (error) {
    console.error("Error fetching addresses:", error);
    res.status(500).json({ message: "Error fetching addresses", error: error.message });
  }
};

// Create a new address
export const createAddress = async (req, res) => {
  try {
    const userId = req.body.userId;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const { attention, street1, street2, city, state, zip, country, phone } = req.body;

    if (!city || !country) {
      return res.status(400).json({ message: "City and Country are required" });
    }

    const address = new Address({
      attention: attention || "",
      street1: street1 || "",
      street2: street2 || "",
      city,
      state: state || "",
      zip: zip || "",
      country,
      phone: phone || "",
      userId,
    });

    const savedAddress = await address.save();
    res.status(201).json(savedAddress);
  } catch (error) {
    console.error("Error creating address:", error);
    res.status(500).json({ message: "Error creating address", error: error.message });
  }
};

// Update an address
export const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId;
    
    const { attention, street1, street2, city, state, zip, country, phone } = req.body;

    if (!city || !country) {
      return res.status(400).json({ message: "City and Country are required" });
    }

    const address = await Address.findOne({ _id: id, userId });

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    address.attention = attention || "";
    address.street1 = street1 || "";
    address.street2 = street2 || "";
    address.city = city;
    address.state = state || "";
    address.zip = zip || "";
    address.country = country;
    address.phone = phone || "";

    const updatedAddress = await address.save();
    res.status(200).json(updatedAddress);
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({ message: "Error updating address", error: error.message });
  }
};

// Delete an address
export const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId;

    const address = await Address.findOne({ _id: id, userId });

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    // Check if this is the last address
    const addressCount = await Address.countDocuments({ userId });
    if (addressCount <= 1) {
      return res.status(400).json({ message: "You must have at least one address" });
    }

    await Address.findByIdAndDelete(id);
    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ message: "Error deleting address", error: error.message });
  }
};

