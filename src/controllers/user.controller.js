import {asyncHandler} from '../utils/asyncHandler.js'
import {apiError} from '../utils/apiError.js'
import {User} from '../models/user.model.js' 
import {apiResponse} from '../utils/apiResponse.js'
import jwt from 'jsonwebtoken'
import mongoose, { set } from 'mongoose'


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
    throw new apiError(409, 'User already exists')
   }

  
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
    throw new apiError(500, 'Error in creating user')
  }
  return res.status(201).json(
    new apiResponse(201, 'User created successfully', createdUser)
  )

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
          throw new apiError(400, 'Please fill all the required fields')
        }

        const user = await User.findOne({ $or: [{ username }, { email }] })

        if (!user) {
          // res.status(400)
          throw new apiError(404, 'User does not exist')
        }

        const isPasswordValid = await user.isPasswordCorrect(password)

        if (!isPasswordValid) {
          // res.status(400)
          throw new apiError(400, 'Invalid password')
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



export { 
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  
  }