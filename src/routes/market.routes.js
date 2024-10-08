import { Router } from "express";
import { 
    fetchAndSaveTopCryptos,
    fetchCryptoFromDatabase,
    fetchAllCryptosFromDatabase
 } from "../controllers/market.controller.js";

const router = Router();

router.route("/refresh-db").post(fetchAndSaveTopCryptos)
router.route("/checkcrypto").post(fetchCryptoFromDatabase)
router.route("/market").post(fetchAllCryptosFromDatabase)



export default router;