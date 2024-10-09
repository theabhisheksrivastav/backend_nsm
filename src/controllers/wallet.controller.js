import { asyncHandler } from '../utils/asyncHandler.js';
import { apiError } from '../utils/apiError.js';
import { wallet } from '../models/wallet.model.js';
import { apiResponse } from '../utils/apiResponse.js';

const featchwalletdetails = asyncHandler(async (req, res) => {
  const { walletId } = req.body;

  console.log(walletId);

  try {
    // Find wallet details by walletId
    const walletDetails = await wallet.findOne({ _id: walletId });

    // Check if wallet details exist
    if (!walletDetails) {
      throw new apiError(404, 'Wallet not found');
    }

    // Send the wallet details as a response
    res.status(200).send({
      success: true,
      message: "Wallet details fetched successfully",
      data: walletDetails
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: 'Error fetching wallet details',
      error: error.message
    });
  }

});

const updateWalletBalance = asyncHandler(async (req, res) => {
    const { walletId, walletBal, isVerified } = req.body;
  
    try {
      // Check if the user is verified
      if (!isVerified) {
        return res.status(403).send({ success: false, message: 'User not verified. Permission denied to update wallet balance.' });
      }
  
      // Find wallet by walletId
      const walletDetails = await wallet.findOne({ _id: walletId });
  
      // If wallet not found, send an error response
      if (!walletDetails) {
        throw new apiError(404, 'Wallet not found');
      }
  
      // Update the wallet balance
      walletDetails.walletbal = walletBal;
  
      // Save the updated wallet details
      await walletDetails.save();
  
      // Send a success response
      res.status(200).send({
        success: true,
        message: 'Wallet balance updated successfully',
        data: walletDetails
      });
    } catch (error) {
      // Catch any errors and send error response
      res.status(500).send({
        success: false,
        message: 'Error updating wallet balance',
        error: error.message
      });
    }
  });
  

export {
     featchwalletdetails,
     updateWalletBalance
    }
