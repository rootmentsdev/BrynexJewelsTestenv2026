import mongoose from "mongoose";

const ItemGroupSchema = new mongoose.Schema(
  {
    groupId: {
      type: String,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
    },
    itemType: {
      type: String,
      enum: ["goods", "service"],
      default: "goods",
    },
    description: {
      type: String,
      trim: true,
    },
    returnable: {
      type: Boolean,
      default: false,
    },
    unit: {
      type: String,
      trim: true,
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ["shirt", "shoe", "other"],
      default: "other",
      trim: true,
    },
    taxPreference: {
      type: String,
      enum: ["taxable", "non-taxable"],
      default: "taxable",
    },
    intraStateTaxRate: {
      type: String,
      trim: true,
    },
    interStateTaxRate: {
      type: String,
      trim: true,
    },
    inventoryValuationMethod: {
      type: String,
      trim: true,
    },
    createAttributes: {
      type: Boolean,
      default: true,
    },
    attributeRows: [
      {
        attribute: {
          type: String,
          trim: true,
        },
        options: [{
          type: String,
          trim: true,
        }],
      },
    ],
    sellable: {
      type: Boolean,
      default: true,
    },
    purchasable: {
      type: Boolean,
      default: true,
    },
    trackInventory: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    items: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        sku: {
          type: String,
          trim: true,
        },
        itemCode: {
          type: String,
          trim: true,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        returnable: {
          type: Boolean,
          default: null, // null means inherit from group
        },
        costPrice: {
          type: Number,
          default: 0,
        },
        sellingPrice: {
          type: Number,
          default: 0,
        },
        mrp: {
          type: Number,
          default: 0,
        },
        upc: {
          type: String,
          trim: true,
        },
        hsnCode: {
          type: String,
          trim: true,
        },
        isbn: {
          type: String,
          trim: true,
        },
        reorderPoint: {
          type: String,
          trim: true,
        },
        sac: {
          type: String,
          trim: true,
        },
        stock: {
          type: Number,
          default: 0,
        },
        attributeCombination: [{
          type: String,
        }],
        warehouseStocks: [{
          warehouse: {
            type: String,
            trim: true,
          },
          openingStock: {
            type: Number,
            default: 0,
          },
          openingStockValue: {
            type: Number,
            default: 0,
          },
          stockOnHand: {
            type: Number,
            default: 0,
          },
          committedStock: {
            type: Number,
            default: 0,
          },
          availableForSale: {
            type: Number,
            default: 0,
          },
          // Physical stock fields - independent from accounting stock
          physicalOpeningStock: {
            type: Number,
            default: 0,
          },
          physicalStockOnHand: {
            type: Number,
            default: 0,
          },
          physicalCommittedStock: {
            type: Number,
            default: 0,
          },
          physicalAvailableForSale: {
            type: Number,
            default: 0,
          },
          // Monthly opening stock tracking (format: "YYYY-MM")
          monthlyOpeningStock: [{
            month: {
              type: String,
              trim: true, // Format: "YYYY-MM" (e.g., "2024-01")
            },
            openingStock: {
              type: Number,
              default: 0,
            },
            openingStockValue: {
              type: Number,
              default: 0,
            },
            closingStock: {
              type: Number,
              default: 0,
            },
            closingStockValue: {
              type: Number,
              default: 0,
            },
            sales: {
              type: Number,
              default: 0,
            },
            createdAt: {
              type: Date,
              default: Date.now,
            },
            updatedAt: {
              type: Date,
              default: Date.now,
            },
          }],
        }],
        image: {
          type: String,
          trim: true,
        },
        images: [{
          type: String,
        }],
      },
    ],
    stock: {
      type: Number,
      default: 0,
    },
    reorder: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    images: [{
      type: String,
    }],
    createdBy: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Performance Indexes
ItemGroupSchema.index({ name: 1 });
ItemGroupSchema.index({ sku: 1 });
ItemGroupSchema.index({ category: 1 });
ItemGroupSchema.index({ brand: 1 });
ItemGroupSchema.index({ manufacturer: 1 });
ItemGroupSchema.index({ createdAt: -1 });

const ItemGroup = mongoose.model("ItemGroup", ItemGroupSchema);

export default ItemGroup;

