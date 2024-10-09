import { asyncHandler } from '../utils/asyncHandler.js'
import { apiError } from '../utils/apiError.js'
import { User } from '../models/user.model.js'
import { apiResponse } from '../utils/apiResponse.js'
import jwt from 'jsonwebtoken'
import { sendmail } from '../services/mail.service.js'
import { otpSendHtml } from '../constant.js'
import { v4 as uuidv4 } from 'uuid';


// import { sendMessage } from '../services/message.service.js'
import NodeCache from 'node-cache';
import { wallet } from '../models/wallet.model.js'

// const uuid = uuidv4()
// console.log(uuid);


const otpCache = new NodeCache({ stdTTL: 300, checkperiod: 320 });

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const verificationCodeMail = async (email) => {
  const verificationCode = generateVerificationCode();
  otpCache.set(email, verificationCode);
  const isMailSent = await sendmail(email, otpSendHtml(verificationCode), 'Your OTP Code - North Star Matrix')
  if (isMailSent) {
    return verificationCode;
  } else {
    throw new apiError(500, 'Something went wrong while sending OTP');
  }
}

// const verificationCodePhone = async (phoneNumber) => {
//   const verificationCode = generateVerificationCode();
//   otpCache.set(phoneNumber, verificationCode);
//   const isMailSent =  sendMessage(phoneNumber,verificationCode)
//   if (isMailSent) {
//     return verificationCode;
//   } else {
//     throw new apiError(500, 'Something went wrong while sending OTP');
//   }
// }

const verifyUser = (identifier, enteredOtp) => {
  try {
    const storedOtp = otpCache.get(identifier); // identifier could be email or phone
    
    if (storedOtp && storedOtp === enteredOtp) {
      otpCache.del(identifier); // OTP is valid, remove from cache
      return true;
    } else {
      return false;
    }
  } catch (error) {
    throw new apiError(500, 'Error in verifying user');
  }
}

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = await user.generateAuthToken()
    const refreshToken = await user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }
  } catch (error) {
    throw new apiError(500, 'Error in generating tokens')
  }

}

const registerUser = asyncHandler(async (req, res) => {
  try {
    const { fullname, email, mobile, password } = req.body
  
    if (
      [fullname, email, mobile, password].some((field) => field?.trim() === "")
    ) {
      throw new apiError(400, 'Please fill all the required fields')
    }
  
    const existedUser = await User.findOne({
      $or: [{ email }, { mobile }],
    })
    if (existedUser) {
      throw new apiError(400, 'User already exists')
    }

  const wallets =   await wallet.create({
      
      walletAddress:uuidv4(),

      
    });
    
   if (!wallets) {
    throw new apiError(400, 'internal server error from walletid')
   }
    

    await User.create({
      fullname,
      email,
      mobile,
      password,
      walletId:wallets._id
      
    });
    return res.status(201).send({ success: true, message: 'User created successfully' });
  } catch (error) {
    return res.status(500).send({ success: false, message: 'Error in registering user', error: error.message });
    
  }
})

const loginUser = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body
  
    if (!(email )) {
      return res.status(201).send({ sucess: false, message: 'Plese fill all reaqured field' })
    }
  
    const user = await User.findOne({ $or: [{ email }] })
  
    if (!user) {
      return res.status(404).send({ sucess: false, message: 'user does not exist' })
    }
  
    const isPasswordValid = await user.isPasswordCorrect(password)
  
    if (!isPasswordValid) {
      return res.status(400).send({ sucess: false, message: 'Invalid password' })
    }
  
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
  
    const loggedInUser = await User.findById(user._id).select('-password -refreshToken')
  
    const options = {
      httpOnly: true,
      secure: true
    }
  
  
  
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new apiResponse(200, { 
      user: loggedInUser,
      accessToken,
      refreshToken
    }, 'User logged in successfully'));
  } catch (error) {
    throw new apiError(500, 'Error in logging in user')
    
  }

})



const logoutUser = asyncHandler(async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $unset: {
        refreshToken: 1
      },
    })
  
    const options = {
      httpOnly: true,
      secure: true
    }
  
    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new apiResponse(200, 'User logged out successfully'))
  
  } catch (error) {
    throw new apiError(500, 'Error in logging out user')
    
  }

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
      httpOnly: true,
      secure: true
    }
    const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id)

    return res.status(200).cookie("accessToken", accessToken, option).cookie("refreshToken", newRefreshToken, option).json(new apiResponse(
      200, {
        accessToken,
      refreshToken: newRefreshToken
    },
      'Token refreshed successfully'))
  } catch (error) {
    throw new apiError(401, error?.message || 'Unauthorized Request')

  }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  try {
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
  
    await user.save({ validateBeforeSave: false })
  
    return res
      .status(200)
      .json(new apiResponse(200, {}, 'Password changed successfully'))
  } catch (error) {
    throw new apiError(500, 'Error in changing password')
    
  }


})

const getCurrentUser = asyncHandler(async (req, res) => {
  try {
    return res
      .status(200)
      .json(new apiResponse(200, req.user, 'User fetched succesfully'))
} catch (error) {
  throw new apiError(500, 'Error in fetching user')
  
}
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  verifyUser,
  verificationCodeMail,

  // verificationCodePhone

}