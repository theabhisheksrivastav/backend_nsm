import mongoose, { Schema } from "mongoose";

const kycSchema = new Schema(
    {
        document: {
            type: Schema.Types.ObjectId,
            ref: "Document",
            required: true,
        },
        country: {
            type: Schema.Types.ObjectId,
            ref: "Country",
            required: true,
        },
        isverified: {
            type: Boolean,
            required: true,
            default: false,
        }
    },
    { timestamps: true }
);

export const Kyc = mongoose.model("Kyc", kycSchema);