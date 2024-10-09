import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())


//routes import
import userRouter from './routes/user.routes.js'
import marketRouter from './routes/market.routes.js'
import walletRouter from './routes/wallet.routes.js'


//routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/markets", marketRouter)
app.use("/api/v1/wallets", walletRouter) 

// http://localhost:8000/api/v1/wallets/FeatchWallet - Featch wallet api
//   http://localhost:8000/api/v1/wallets/UpdateBalence - updateBal



export { app }