import mongoose, {Schema} from "mongoose";



const walletSchema = new Schema(
    {
        walletAddress: {
            type : String,
            
        },
        walletbal: {
            type : String,
            default:"0"
        },
        
    });



export const wallet = mongoose.model('Wallet', walletSchema);