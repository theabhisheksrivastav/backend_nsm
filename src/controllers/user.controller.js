import {asyncHandler} from '../utils/asyncHandler.js'
import {apiError} from '../utils/apiError.js'
import nodemailer from 'nodemailer';
import {User} from '../models/user.model.js' 
import {apiResponse} from '../utils/apiResponse.js'
import jwt from 'jsonwebtoken'
import mongoose, { set } from 'mongoose'

let otpStorage = {}; // Object to store OTPs in memory
const name = {}

const generateAccessAndRefreshToken = async (userId) => 
{ 
    try {
const user =  await User.findById(userId)
const accessToken = await user.generateAuthToken()
const refreshToken = await user.generateRefreshToken()

user.refreshToken = refreshToken
await user.save({validateBeforeSave : false})

return {accessToken, refreshToken}
    } catch (error) {
        throw new apiError(500, 'Error in generating tokens')
    }

}

const registerUser = asyncHandler(async (req, res) => {
  // res.status(200).json({ message: 'Hello Abhishek' })

  /*
    1. Get user data (username, Fullname, email, password, avatarImg, CoverImg) from req.body{Check if required feillds are not empty}
    2. Check if user already exists in the database
    3. Hash the password, Upload images to Cloudinary and get the URL
    4. Create a new user Object {create entry in DB}
    *5. Generate JWT token and send it to the user
    5. remove password and refresh token from repsonse
    6. check for user creation response and send the response to the user
    7. Return the response to the user
    */
  const { username, fullname, email, password } = req.body

  if (
    [fullname, username, email, password].some((field) => field?.trim() === "")
  ) {
    // res.status(400)
    throw new apiError(400, 'Please fill all the required fields')
  }
    
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
   })
 res.status(400)
   if (existedUser) {
   
    return res.status(201).send({sucess:false,message:'user alrredy exiest'})
   }

  
  // const passwordHash = await bcrypt.hash(password, 10)

  const ans = await sendmail(email)
  if (ans) {
    return res.status(200).send({sucess:true,message:'OTP send succesfully'})
  }else{
    return res.status(200).send({sucess:true,message:'Something went wrong'})
  }

  // const user = await User.create({
  //   fullname,
  //   email,
  //   password,
  //   username
  // })

  // const createdUser = await User.findById(user._id).select('-password -refreshToken')

  // if (!createdUser) {
  //   // res.status(500)
  //   return res.status(500).send({sucess:false,message:'internal server error'})
  // }
  // return res.status(201).send({sucess:true,message:'user saved'})

})

const loginUser = asyncHandler(async (req, res) => {
  /*
  1. Get user data (email, password) from req.body{Check if required feillds are not empty}
  2. Check if user already exists in the database
  3. Check if password is correct
  4. Generate JWT token and send it to the user
  5. send cookies to the user
  6. Return the response to the user
  */

const { username, email, password } = req.body

        if (!(email || username)) {
          // res.status(400)
          return res.status(201).send({sucess:false,message:'Plese fill all reaqured field'})
        }

        const user = await User.findOne({ $or: [{ username }, { email }] })

        if (!user) {
          // res.status(400)
          return res.status(404).send({sucess:false,message:'user does not exist'})
        }

        const isPasswordValid = await user.isPasswordCorrect(password)

        if (!isPasswordValid) {
          // res.status(400)
          return res.status(400).send({sucess:false,message:'Invalid password'})
        }

        const {accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

        const loggedInUser = await User.findById(user._id).select('-password -refreshToken')

        const options = {
          httpOnly : true,
          secure : true
        }

     
      
        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new apiResponse(200, {
          user : loggedInUser,
          accessToken,
          refreshToken
        }
        , 'User logged in successfully'))
      

      
     
     

       

})

const logoutUser = asyncHandler(async (req, res) => {
  /*
  1. Clear cookies
  2. Return the response to the user
  */
  User.findByIdAndUpdate(req.user._id, {
    $unset: {
      refreshToken: 1
    },
  })

  const options = {
    httpOnly : true,
    secure : true
  }

  return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new apiResponse(200, 'User logged out successfully')) 

 
})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
    throw new apiError(401, 'Unauthorized Request')
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
  
    const user = await User.findById(decodedToken?._id)
  
    if (!user) {
      throw new apiError(401, 'Unauthorized Request')
    }
  
    if (user?.refreshToken !== incomingRefreshToken) {
      throw new apiError(401, 'Unauthorized Request')
    }
  
    const option = {
      httpOnly : true,
      secure : true
    }
  
    const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
    return res.status(200).cookie("accessToken", accessToken, option).cookie("refreshToken", newRefreshToken, option).json(new apiResponse(
      200,{accessToken,
      refreshToken : newRefreshToken},
      'Token refreshed successfully'))
  } catch (error) {
    throw new apiError(401, error?.message || 'Unauthorized Request')
    
  }


})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confPassword } = req.body

  if (newPassword !== confPassword) {
    throw new apiError(400, 'Passwords do not match')
  }

  if (!currentPassword || !newPassword) {
    throw new apiError(400, 'Please fill all the required fields')
  }

  const user = await User.findById(req.user?._id)
  const isPasswordValid = await user.isPasswordCorrect(currentPassword)
  if (!isPasswordValid) {
    throw new apiError(400, 'Invalid password')
  }
  user.password = newPassword

  await user.save({validateBeforeSave : false})

  return res
  .status(200)
  .json(new apiResponse(200, {}, 'Password changed successfully'))


})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
  .status(200)
  .json(new apiResponse(200, req.user, 'User fetched succesfully'))
})

const updateAccountDetails = asyncHandler(async (req, res) => {

  
  const { fullname, email } = req.body

  const user = await User.findByIdAndUpdate(req.user?._id, 
  {
    $set : {
      fullname : fullname || req.user?.fullname,
      email :  email || req.user?.email
    }
  },
  {
    new : true,
    runValidators : true
  }).select('-password -refreshToken')

  // if (username) {
  //   user.username = username
  // }
  // if (fullname) {
  //   user.fullname = fullname
  // }
  // if (email) {
  //   user.email = email
  // }
  // if (avatar) {
  //   user.avatar = avatar
  // }
  // if (coverImage) {
  //   user.coverImage = coverImage
  // }

  await user.save({validateBeforeSave : false})

  return res
  .status(200)
  .json(new apiResponse(200, user, 'Account details updated successfully'))

})

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail', // or any other email service provider
  auth: {
    user: process.env.EMAIL, // Your email address
    pass: process.env.PASSWARD, // Your email password
  },
});


const sendmail = async (email)=>{

 
  const verificationCode = generateVerificationCode();
  console.log(email);
  

  if (!email) {
    return  false;
  }

  console.log(email);
  

  // Create a verification code using JWT
  
  otpStorage[email] = {
    verificationCode,
    expiresAt: Date.now() + 5 * 60 * 1000 // Expire in 5 minutes
  };

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: 'Your OTP Code - North Star Matrix',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 10px;">
        <h2 style="text-align: center; color: #0044cc;">North Star Matrix</h2>
        <p>Hello,</p>
        <p>We have received a request to verify your identity. Please use the following OTP to complete your verification process:</p>
        <p style="font-size: 24px; font-weight: bold; color: #0044cc; text-align: center; padding: 10px; border: 1px solid #0044cc; border-radius: 8px; display: inline-block;">
          ${verificationCode}
        </p>
        <p>This code is valid for <strong>5 minutes</strong>.</p>
        <p>If you did not request this OTP, please contact our support team immediately at <a href="mailto:support@northstarmatrix.com" style="color: #0044cc; text-decoration: none;">support@northstarmatrix.com</a>.</p>
        <p>Thank you,<br>North Star Matrix Team</p>
        <hr style="border: none; border-top: 1px solid #ddd;" />
        <p style="font-size: 12px; color: #888888; text-align: center;">
          © 2024 North Star Matrix. All rights reserved.
        </p>
      </div>
    `,
  };
console.log("upper error");
   transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      
      return  false;
    }
     return true;
  });

  return true

}

const varifyOTP = asyncHandler (async (req,res)=>{

 console.log("riched");
 
  
 try {
  const { username, fullname, email, password, otp } = req.body


  // Check if OTP exists and is valid
  console.log(otp,email,username,fullname,password);
  console.log(otpStorage[email]);
  
  
  if (
    otpStorage[email] &&
    otpStorage[email].verificationCode === otp &&
    Date.now() < otpStorage[email].expiresAt
  ) {
    // OTP is valid
    delete otpStorage[email];
    // const passwordHash = await bcrypt.hash(password, 10)
  
    
  
    const user = await User.create({
      fullname,
      email,
      password,
      username
    })
  
    const createdUser = await User.findById(user._id).select('-password -refreshToken')
  
    if (!createdUser) {
      // res.status(500)
      return res.status(500).send({sucess:false,message:'internal server error'})
    }
    return res.status(201).send({sucess:true,message:'user saved'})


     // OTP can be deleted after successful verification
    return res.status(200).send({sucess:true,message:'OTP verified successfully'});
  }

 res.status(400).send({sucess:false,message:'Inavalid and expire'});
  

  
 } catch (error) {
  console.log(error);
  
 }
    
   
   
   

})


//get user wallet details


export { 
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  varifyOTP
  
  }