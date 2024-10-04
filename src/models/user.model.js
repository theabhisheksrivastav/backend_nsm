import mongoose, {Schema} from "mongoose"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"


//todo : add walletid, countryid, kycid, cryptowalletid, bankid
const userSchema = new Schema(
    {
        username: {
            type : String,
            required : true,
            unique : true,
            lowercase : true,
            trim : true,
            index : true
        },
        email: {
            type : String,
            required : true,
            unique : true,
            lowercase : true,
            trim : true,
        },
        fullname: {
            type : String,
            required : true,
            trim : true,
            index : true
        },
        password: {
            type : String,
            required : true,
            trim : true,
        },
        mobile: {
            type : String,
            required : true,
            trim : true,
        },
        twoFactorAuth: {
            type : string,
            required : false,
        },
        refreshToken : {
            type : String,
            required : false,
            trim : true,
        },
        }, {
        timestamps: true
        })


        // Hash the password before saving the user model
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 8)
    }
    next()
})
        // Check if the password is correct
userSchema.methods.isPasswordCorrect = async function(password) {
  return await bcrypt.compare(password, this.password)
}
        // Generate an auth token for the user
userSchema.methods.generateAuthToken = async function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullname
        }, 
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
        //  Generate a refresh token for the user
userSchema.methods.generateRefreshToken = async function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullname
        }, 
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model('User', userSchema)