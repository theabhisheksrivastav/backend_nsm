import { asyncHandler } from '../utils/asyncHandler.js'
import { apiError } from '../utils/apiError.js'
import { User } from '../models/user.model.js'
import { apiResponse } from '../utils/apiResponse.js'
import jwt from 'jsonwebtoken'
import { sendmail } from '../services/mail.service.js'
import { otpSendHtml, tooManyAttempts } from '../constant.js'
import { sendMessage } from '../services/message.service.js'


function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const verificationCodeMail = async (email) => {
  const verificationCode = generateVerificationCode();
  const isMailSent = await sendmail(email, otpSendHtml(verificationCode), 'Your OTP Code - North Star Matrix')
  if (isMailSent) {
    return verificationCode;
  } else {
    throw new apiError(500, 'Something went wrong while sending OTP');
  }
}

const verificationCodePhone = async (phoneNumber) => {
  const verificationCode = generateVerificationCode();
  const isMailSent =  sendMessage(phoneNumber,verificationCode)
  if (isMailSent) {
    return verificationCode;
  } else {
    throw new apiError(500, 'Something went wrong while sending OTP');
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


//need to change add cache to store otp and check if the user has tried too many times, db already changed so will not work
const verifyUser = asyncHandler(async (req, res) => {
  try {
    const { type, token, otp } = req.body;
  
    if (!token || !type || !otp) {
      throw new apiError(400, 'Please fill all the required fields');
    }
    const user = await User.findOne({ $or: [ { token }] });
    if (!user) {
      throw new apiError(404, 'User not found');
    }
  
    if (user.isVerified) {
      return res.status(400).send({ success: false, message: 'User is already verified' });
    }
    const latestOtp = user.otp[user.otp.length - 1];
    if (latestOtp == otp && Date.now() < new Date(user.otpExpires).getTime()) {
      user.isVerified = true;
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save({ validateBeforeSave: false });
  
      return res.status(201).send({ success: true, message: 'User verified successfully' });
    } else {
      throw new apiError(400, 'Invalid or expired OTP');
    }
  } catch (error) {
    throw new apiError(500, 'Error in verifying user');
    
  }
});

const registerUser = asyncHandler(async (req, res) => {
  try {
    const { fullname, email, mobile, country, password } = req.body
  
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
    await User.create({
      fullname,
      email,
      mobile,
      country,
      password,
      
    });
    return res.status(201).send({ success: true, message: 'User created successfully' });
  } catch (error) {
    throw new apiError(500, 'Error in registering user')
    
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
<<<<<<< HEAD
=======
})

const updateAccountDetails = asyncHandler(async (req, res) => {

try {
  
    const { fullname, email } = req.body
  
    const user = await User.findByIdAndUpdate(req.user?._id,
      {
        $set: {
          fullname: fullname || req.user?.fullname,
          email: email || req.user?.email
        }
      },
      {
        new: true,
        runValidators: true
      }).select('-password -refreshToken')
    await user.save({ validateBeforeSave: false })
  
    return res
      .status(200)
      .json(new apiResponse(200, user, 'Account details updated successfully'))
} catch (error) {
  throw new apiError(500, 'Error in updating account details')
  
}

>>>>>>> d5f231aefdb435a8078bf16ef42dc459b92bf460
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
  verificationCodePhone

}