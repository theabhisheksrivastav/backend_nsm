import { location } from "express/lib/response";
import mongoose, {Schema} from "mongoose";

const countrySchema = new Schema(
    {
        countryname: {
            type : String,
            required : true,
            unique : true,
            lowercase : true,
            trim : true,
            index : true
        },
        countrycode: {
            type : String,
            required : true,
            unique : true,
            lowercase : true,
            trim : true,
        },
        fiatcurrency: {
            type : String,
            required : true,
            lowercase : true,
            trim : true,
        },
        valueagainstusd: {
            type : Number,
            required : true,
            trim : true,
        },
    });

export const Country = mongoose.model('Country', countrySchema);