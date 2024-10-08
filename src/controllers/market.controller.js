import { asyncHandler } from '../utils/asyncHandler.js';
import { apiError } from '../utils/apiError.js';
import { Market } from '../models/market.model.js';
import { apiResponse } from '../utils/apiResponse.js';
import axios from 'axios';

const fetchAndSaveTopCryptos = asyncHandler(async (req, res) => {
    try {
        // Fetching data from CoinGecko API
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
            params: {
                vs_currency: 'usd',
                order: 'market_cap_desc',
                per_page: 10,  // Get top 10 cryptocurrencies
                page: 1,
                sparkline: false
            }
        });

        const cryptoData = response.data;

        for (const crypto of cryptoData) {
            const { id, current_price } = crypto;
            // Checking to see if the cryptocurrency already exists in the database
            let marketRecord = await Market.findOne({ cryptoname: id });

            if (marketRecord) {
                marketRecord.cryptoprice = current_price;
            } else {
                marketRecord = new Market({
                    cryptoname: id,
                    cryptoprice: current_price,
                    isactive: true // will change later if required
                });
            }

            // Saving the updated or new market record
            await marketRecord.save();
        }

        const marketData = await Market.find({});
        
        return res.status(200).json({
            success: true,
            marketData,
            message: 'Top cryptocurrencies fetched and saved successfully'
        });

    } catch (error) {
        console.error('Error fetching and saving top cryptocurrencies:', error);
        return res.status(500).json(new apiError(500, 'Error fetching and saving top cryptocurrencies'));
    }
});

const fetchCryptoFromDatabase = asyncHandler(async (req, res) => {
    try {
        const cryptoname = req.body.cryptoname; // Use body for POST request
    
        const marketRecord = await Market.findOne({ cryptoname });
        
        if (!marketRecord) {
            throw new apiError(404, 'Cryptocurrency not found');
        } else {
            return res.status(200).json(new apiResponse(200, marketRecord, 'Cryptocurrency fetched successfully'));
        }
    } catch (error) {
        console.error(error);
        return res.status(error.statusCode || 500).json(new apiError(error.statusCode || 500, error.message));
    }
});

const fetchAllCryptosFromDatabase = asyncHandler(async (req, res) => {
    try {
        const marketRecords = await Market.find();
    
        return res.status(200).json(new apiResponse(200, marketRecords, 'All cryptocurrencies fetched successfully'));
    } catch (error) {
        console.error(error);
        return res.status(error.statusCode || 500).json(new apiError(error.statusCode || 500, error.message));
    }
});

export {
    fetchAndSaveTopCryptos,
    fetchCryptoFromDatabase,
    fetchAllCryptosFromDatabase
};
