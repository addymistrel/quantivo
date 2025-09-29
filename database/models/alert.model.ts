import { Schema, model, models, type Document, type Model } from "mongoose";

export interface AlertItem extends Document {
  userId: string;
  symbol: string;
  company: string;
  alertType: "upper" | "lower";
  threshold: number; // price threshold
  createdAt: Date;
  isActive: boolean;
}

const AlertSchema = new Schema<AlertItem>(
  {
    userId: { type: String, required: true, index: true },
    symbol: { type: String, required: true, uppercase: true, trim: true },
    company: { type: String, required: true, trim: true },
    alertType: { type: String, enum: ["upper", "lower"], required: true },
    threshold: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: false }
);

AlertSchema.index({ userId: 1, symbol: 1, alertType: 1, threshold: 1 });

export const Alert: Model<AlertItem> =
  (models?.Alert as Model<AlertItem>) || model<AlertItem>("Alert", AlertSchema);
