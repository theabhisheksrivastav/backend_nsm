import mongoose, { Schema } from "mongoose";

const documentSchema = new Schema(
    {
        document: {
            type: [String],
            required: true 
        }
    },
    { timestamps: true }
);


export const Document = mongoose.model("Document", documentSchema);