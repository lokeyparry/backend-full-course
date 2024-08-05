import { asyncHandler } from '../utils/asynchandler.js'
import {ApiError} from "../utils/ApiError.js"
import { User } from '../models/user.models.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'



const generateAccessTokenAndRefreshToken = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        return{accessToken,refreshToken}


    } catch (error) {
        throw new ApiError(500,"Somthig went wrong while generating refresh and acc token.")
    }
}

const registerUser = asyncHandler(async(req, res) => {
    
        const { fullName, email, username, password } = req.body 
        // if(fullName === ""){
        //     throw new ApiError(400,"Full name is required")
        // }or
        if (
            [fullName, email, username, password].some((field)=>field?.trim()==="")
        ) {
            throw new ApiError(400,"All field are required")
        }
        const existedUser=await User.findOne({
            $or:[{username},{email}]
        })
        if(existedUser){
            throw new ApiError(409,"User with email or username already existed.")
        }
        const avatarLocalPath=req.files?.avatar[0]?.path;
        // const coverImageLocalPath=req.files?.coverImage[0]?.path;
        if(!avatarLocalPath){
            throw new ApiError(400,"avatar are required")
        }
        let coverImageLocalPath;
        if(req.files&&Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0){
            coverImageLocalPath = req.files.coverImage[0].path
        }
        const avatar = await uploadOnCloudinary(avatarLocalPath)
        const coverImage = await uploadOnCloudinary(coverImageLocalPath)
        if (!avatar) {
            throw new ApiError(400,"avatar are required") 
        }

        const user = await User.create({
            fullName,
            avatar:avatar.url,
            coverImage:coverImage?.url || "",
            email,
            password,
            username:username.toLowerCase()
        })
        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )
        if (!createdUser) {
            throw new ApiError(500, "Somthig went wrong! while register the user.")
        }

        return res.status(201).json(
            new ApiResponse(200, createdUser,"User registered successfully.")
        )


})
const loginUser = asyncHandler(async(req,res)=>{
    const {email,username,password} =req.body
    if(!username || !email){
        throw new ApiError(400,"username or email is required.")
    }
    const user = await User.findOne({
        $or:[{username},{email}]
    })
    if(!user){
        throw new ApiError(400,"User does not exist.")
    }
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials.")
    }
    const {accessToken,refreshToken}=await generateAccessTokenAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-pasword -refreshToken")

    const options = {
        httpOnly:true,
        secure:true
    }
    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User logged in successfully. "
        )
    )

})
const logOutUser =asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken:undefined
            }
        },{
            new:true
        }
    )
    const options = {
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"))
})


export { registerUser, loginUser,logOutUser }