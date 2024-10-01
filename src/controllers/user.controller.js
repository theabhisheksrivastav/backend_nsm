import { asyncHandler } from '../utils/asyncHandler.js'
import { apiError } from '../utils/apiError.js'
import { User } from '../models/user.model.js'
import { apiResponse } from '../utils/apiResponse.js'
import jwt from 'jsonwebtoken'
import { sendmail } from '../services/mail.service.js'
import { otpSendHtml, tooManyAttempts } from '../constant.js'


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
  const { username, fullname, email, password } = req.body

  if (
    [fullname, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new apiError(400, 'Please fill all the required fields')
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  })
  if (existedUser) {
    if (existedUser.isVerified) {
      return res.status(409).send({ success: false, message: 'Verified user already exists' });
    } else if (existedUser.otp.length > 4) {
      await User.findByIdAndDelete(existedUser._id);
      sendmail(email, tooManyAttempts, 'Too many verification attempts');
      return res.status(409).send({ success: false, message: 'Too many attempts please register after some time' });
    } else {
      const verificationCode = await verificationCodeMail(email);
      existedUser.otp.push(verificationCode);
      existedUser.otpExpires = Date.now() + 5 * 60 * 1000;
      console.log(existedUser.otp.length);
      await existedUser.save({ validateBeforeSave: true });
      return res.status(209).send({ success: true, message: 'User already exists', attempts: existedUser.otp.length });
    }
  }
  const verificationCode = await verificationCodeMail(email);
  await User.create({
    fullname,
    email,
    password,
    username,
    isVerified: false,
    otp: verificationCode,
    otpExpires: Date.now() + 5 * 60 * 1000,
  });
  return res.status(201).send({ success: true, message: 'User created successfully' });
})

const verifyUser = asyncHandler(async (req, res) => {
  const { username, fullname, email, password, otp } = req.body;

  if (!username || !fullname || !email || !password || !otp) {
    throw new apiError(400, 'Please fill all the required fields');
  }
  console.log('User not found line87 ');

  const user = await User.findOne({ $or: [{ username }, { email }] });

  if (!user) {
    console.log('User not found line 92');

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
});


const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body

  if (!(email || username)) {
    return res.status(201).send({ sucess: false, message: 'Plese fill all reaqured field' })
  }

  const user = await User.findOne({ $or: [{ username }, { email }] })

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



  return res.status(200).send({ success: true }).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new apiResponse(200, {
    user: loggedInUser,
    accessToken,
    refreshToken
  }
    , 'User logged in successfully'))
})

const logoutUser = asyncHandler(async (req, res) => {
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

})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  verifyUser

}