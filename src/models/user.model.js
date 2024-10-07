import mongoose, {Schema} from "mongoose"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new Schema(
    {
       
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
        isVerified: {
            type : Boolean,
            default : false,
            required : true,
        },
        otp: {
            type : Array,
            required : false,
            trim : true,
        },
        otpExpires: {
            type : Date,
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

userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 8)
    }
    next()
})

userSchema.methods.isPasswordCorrect = async function(password) {
  return await bcrypt.compare(password, this.password)
}

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