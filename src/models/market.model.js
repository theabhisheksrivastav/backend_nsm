import mongoose, {Schema} from "mongoose";

const marketSchema = new Schema(
    {
        cryptoname: {
            type : String,
            required : true,
            unique : true,
            lowercase : true,
            trim : true,
            index : true
        },
        cryptoprice: {
            type : Number,
            required : true,
            trim : true,
        },
        isactive: {
            type : Boolean,
            required : true,
            default : false,
        },
    });



export const Market = mongoose.model('Market', marketSchema);