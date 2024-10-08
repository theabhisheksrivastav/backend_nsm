import { Router } from "express";
import { 
    fetchAndSaveTopCryptos,
    fetchCryptoFromDatabase,
    fetchAllCryptosFromDatabase
 } from "../controllers/market.controller.js";

const router = Router();

router.route("/refresh-db").patch(fetchAndSaveTopCryptos)
router.route("/checkcrypto").get(fetchCryptoFromDatabase)
router.route("").get(fetchAllCryptosFromDatabase)



export default router;