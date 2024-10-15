import mongoose, {Schema} from "mongoose"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"


        //todo : add walletid, countryid, kycid, cryptowalletid, bankid
const userSchema = new Schema(
    {
       
        email: {
            type : String,
            required : true,
            unique : true,
            lowercase : true,
            match : [ /^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com)$/, "Please use a proper email"]
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
            type : String,
            required : false,
        },
        country: {
            type : Schema.Types.ObjectId,
            ref : "Country"
        },
        kyc: {
            type : Schema.Types.ObjectId,
            ref : "Kyc"
        },
        refreshToken : {
            type : String,
            required : false,
            trim : true,
        },
        }, {
        timestamps: true
        })

        // Hash the password & 2FA key before saving the user model
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 8)
    }
    if (this.isModified('twoFactorAuth')) {
        this.twoFactorAuth = await bcrypt.hash(this.twoFactorAuth, 8)
    }
    next()
})
        // Check if the password is correct
userSchema.methods.isPasswordCorrect = async function(password) {
  return await bcrypt.compare(password, this.password)
}

        // Check if the 2FA key is correct
userSchema.methods.isTwoFactorAuthCorrect = async function(twoFactorAuth) {
    return await bcrypt.compare(twoFactorAuth, this.twoFactorAuth)
}
// right now dont have the 2fa setup will change as we setup 2fa


        // Generate an auth token for the user
userSchema.methods.generateAuthToken = async function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
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
            fullname: this.fullname
        }, 
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model('User', userSchema)
