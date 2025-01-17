const { Router } = require("express");
const { Login, forgetPassword, Logout, resetPassword, postResetPassword, OwnerSignUp } = require("../controller/admin.controller");
const adminRoute = Router();

adminRoute.get("/",(req,res)=>{
      res.send("welcome to home page")
    console.log("welcome to home page")
})
// adminRoute.post("/signup",Register)
adminRoute.post("/login", Login);
// adminRoute.post("/owner-login", OwnerLogin);
adminRoute.post("/signup",OwnerSignUp);
// adminRoute.post("/user-login",UserLogin)
adminRoute.post("/forget-password",forgetPassword);
adminRoute.get("/reset-password/:id/:token",resetPassword);
adminRoute.post("/reset-password/:id/:token",postResetPassword);
// adminRoute.get("/superAdmin",adminData);
adminRoute.get("/logout",Logout);
module.exports={
    adminRoute
}