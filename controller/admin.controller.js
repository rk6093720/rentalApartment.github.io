const jwt=require("jsonwebtoken");
const bcrypt = require('bcrypt');
const nodemailer=require("nodemailer");
const { AdminModal } = require("../modal/admin.modal");
const jwtSecret = process.env.JWTSECRET;
const Login = async (req, res) => {
  const { email, password } = req.body;
  try { 
      if (email === "admin@gmail.com") {
        const admin = await AdminModal.findOne({ email: "admin@gmail.com" });
        if (!admin) {
          const encrypt = await bcrypt.hash(password, 10);
          const newAdmin = await AdminModal({
            email,
            password: encrypt,
            userType: "SuperAdmin",
          });
          await newAdmin.save();
        }
      }
        const user = await AdminModal.findOne({ email });
        if (!user) {
          return res
            .status(401)
            .json({ status: "Error", msg: `${user.userType} not found` });
        }

        if (await bcrypt.compare(password, user.password)) {
          let expiresIn;
          if (email === "admin@gmail.com" && user.userType === "SuperAdmin") {
            expiresIn = "20m"; // Example: SuperAdmin token expires in 1 day
          } else if (user.userType === "Admin") {
            expiresIn = "20m";
          } else if (user.userType === "User") {
            expiresIn = "30m";
          } else {
            return res
              .status(401)
              .json({ status: "Error", msg: "Invalid user type" });
          }

          const token = jwt.sign(
            { email: user.email, role: user.userType },
            jwtSecret,
            { expiresIn }
          );
          const refresh = jwt.sign({email:user.email, role:user.userType},"refresh",{expiresIn:"20m"})
          user.refreshToken=refresh;
          const expiretoken = jwt.verify(token, jwtSecret);
          return res.status(200).json({
            status: "success",
            data: {
              token,
              refresh,
              role: user.userType,
              email: user.email,
              expiresIn: expiretoken.exp,
            },
            msg: `${user.userType} has logged in`,
          });
        } else {
          return res
            .status(401)
            .json({ status: "error", msg: "Invalid Password" });
        }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "Error", msg: "Something went wrong" });
  }
};

const OwnerSignUp= async(req,res)=>{
    const { email, password, userType } = req.body;
    try {
        const owner = await AdminModal.findOne({email});
        if(owner){
            return res.status(401).json({msg:"Email is Already present",status:"error"})
        }
        const hashed = await bcrypt.hash(password,10);
        const newOwner = await AdminModal({
          email,
          password: hashed,
          userType
        });
        await newOwner.save();
        return res.status(200).json({status:"success", data:{newOwner} ,msg:"Signup is Created Successfully"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({status:"error",msg:"Signup is not Created"})
    }
}
const forgetPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const oldUser = await AdminModal.findOne({ email });
        if (!oldUser) {
            return res.status(401).json({ status: "admin Not Exists!!" });
        }

        const secret = jwtSecret + oldUser.password;
        const token = jwt.sign({ email: oldUser.email, id: oldUser._id }, secret, {
            expiresIn: "15m",
        });

        const setUserToken = await AdminModal.findByIdAndUpdate(
            { _id: oldUser._id },
            { verifyToken: token, new: true }
        );

        const link = `http://localhost:3000/reset-password/${oldUser._id}/${token}`;
        const htmlcode = `http://127.0.0.1:5500/resetPassword.html/${oldUser._id}/${token}`
        if (setUserToken) {
            var transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: "rk6093720@gmail.com",
                    pass:process.env.PASS,
                },
                tls: {
                    rejectUnauthorized: false,
                },
            });

            var mailOptions = {
                from: "rk6093720@gmail.com",
                to: email,
                subject: "Password Reset",
                text: link,
            };

            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error);
                    return res.status(401).json({ message: "email not send" });
                } else {
                    // console.log("Email sent: " + info.response);
                    if(htmlcode){
                               return res.json({
                                 message: "email sent successfully",
                                 data: info.response,
                                 htmlcode,
                                 status: "success",
                               });

                    }else{
                               return res.json({
                                 message: "email sent successfully",
                                 data: info.response,
                                 link,
                                 status: "success",
                               });
                    }
                }
            });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ e: "do not sent on email", status: "error" });
    }
};

// get request for reset password 
const resetPassword= async(req,res)=>{
    const { id, token } = req.params;
    console.log(id,token);
    // console.log(req.params);
    const oldUser = await AdminModal.findOne({_id: id, verifyToken: token });
    if (!oldUser) {
        return res.status(401).json({ status: "Admin Not Exists!!" });
    }
    const secret = jwtSecret + oldUser.password;
    try {
        const verify = jwt.verify(token, secret);
     return    res.status(200).json({email:verify.email,id:verify._id,status:"verified"})
    } catch (error) {
     return   res.status(500).json({msg:"Not Verified"});
    } 
}
//post request of forget-password
const postResetPassword = async (req, res) => {
    const { id, token } = req.params;
    const { password } = req.body;
   const oldUser = await AdminModal.findOne({_id: id ,verifyToken:token});
    if (!oldUser) {
        return res.status(401).json({ status: "Admin Not Exists!!" });
    }
    const secret = jwtSecret + oldUser.password;
    try {
        const verify = jwt.verify(token, secret);
        const encryptedPassword = await bcrypt.hash(password, 10);
        await AdminModal.updateOne(
            {
                _id: id,
            },
            {
                $set: {
                    password: encryptedPassword,
                },
            }
        );

     return   res.status(200).json( { email: verify.email,verifyToken:verify.token,id:verify._id, status: "verified" });
    } catch (error) {
        console.log(error);
       return res.status(500).json({ status: "Something Went Wrong" });
    }
} 
const Logout = async (req, res) => {
    const { id } = req.params;

    try {
        // Assuming you have a UserSession model to track logout times
        const logoutTime = new Date();

        // Create a new UserSession document to record the logout time
        const userSession = new UserSession({
            id, // Assuming id is the user's ID
            logoutTime,
        });

        // Save the UserSession document to your database
        await userSession.save();

        return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Error logging out' });
    }
};


module.exports={
    Login,
   forgetPassword,
    resetPassword,
    postResetPassword,
    Logout,
    OwnerSignUp 
}