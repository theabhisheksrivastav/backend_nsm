import { Router } from "express";

import { featchwalletdetails , updateWalletBalance} from "../controllers/wallet.controller.js";

const router = Router();

router.route("/FeatchWallet").get(featchwalletdetails)
router.route("/UpdateBalence").post(updateWalletBalance)

export default router