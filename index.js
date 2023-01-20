const express = require('express')
const mongoose = require('mongoose')
const bodyparser = require('body-parser')
const cookieparser = require('cookie-parser')
const dotenv = require('dotenv').config()
const cors = require('cors')
const bcrypt = require('bcrypt')
const path = require('path');
const fs = require("fs");
const multer = require("multer");
const user = require("./Model/userModel")
const subjectModel=require("./Model/questionModel")
const app = express()
const port = process.env.PORT || 8005
const BASE_URL=process.env.BASE_URL
app.use(express.json())
app.use(bodyparser.json())
app.use(cookieparser())
app.use(cors()) 

mongoose.set('strictQuery', false)
mongoose.connect(process.env.MONGO_PATH, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log("Connected to Database"))
    .catch(err => console.log(err))

app.post("/Signin", async (req, res) => {
    try {
        let finduser = await user.findOne({ $or: [{ email: req.body.username }, { phone: req.body.username }] },{_id:0})
        if (finduser) {
            let compare = bcrypt.compareSync(req.body.password, finduser.Password)
            if(compare){
                         res.status(200).json({finduser})
                        
            }
            else{
                res.status(201).json({ message: "Password is Wrong" })
            }
        }
        else {
            res.status(203).json({ message: "User not registered" })
        }
    }
    catch (err) {
        res.status(500).json({ message: "Error from server" })
    }
})
app.post(`${BASE_URL}/SignUp`, async (req, res) => {

    try {

        let User = new user({
            email: req.body.email,
            FullName: req.body.name,
            phone: req.body.phone,
            Password: bcrypt.hashSync(req.body.password, 5),
            myquiz:[]
        })
        User.markModified('myquiz')
        let checkuser = await user.findOne({ $or: [{ email: req.body.email }, { phone: req.body.phone }] })
        if (checkuser) {
            res.status(302).json({ message: "User already Present,Please Login" })
        }
        else {
            User.save()
                .then(() => res.status(201).json({ message: "Registered SuccessFully" }))
                .catch(err => res.status(401).json({ message: "Error While SignUp" }))
           
        }
    }
    catch (err) {
        res.status(500).json({ message: "Error" })
    }
})


app.post(`${BASE_URL}/Questions`,async(req,res)=>{
    try{
        
         let subjects=new subjectModel({
            subject:req.body.subject,
            questions:req.body.questions
         })
        let findsubject=await subjectModel.findOne({subject:req.body.subject})
        if(findsubject){
            let newone=[
                ...findsubject.questions,
                ...req.body.questions
            ]
            let newqstn=await subjectModel.updateOne({subject:req.body.subject},{questions:newone})
            if(newqstn){res.status(201).json({message:"New Question Added Successfully"})}
            else{res.status(401).json({message:"Error while adding questions"})}
        }
        else{
            subjects.save()
            .then(()=>res.status(201).json({message:'Added Successfully'}))
            .catch(err=>res.status(401).json({message:"Error while inserting question"}))
        }
        
    }
    catch(err){
        res.status(401).json({message:"Error while connecting"})
    }
})

app.get(`${BASE_URL}/Quiz/:language`,async(req,res)=>{
    try{
              let findsubject=await subjectModel.findOne({subject:req.params.language})
              if(findsubject){res.status(200).json(findsubject.questions)}
              else{res.status(201).json({message:"No Questions Available for this Subject"})}
    }
    catch(err){
        res.status(401).json({message:"Error while fetching questions"})
    }
})


let storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  })
let upload = multer({ storage: storage })

app.post(`${BASE_URL}/Quiz/:language`,upload.single('v1'),async(req,res)=>{
    try{
        req.headers['content-type'] = 'multipart/form-data';
        res.setHeader("Content-Type", "multipart/form-data");
        let encoded=""
        if(req.file!==undefined){
           encoded=fs.readFileSync('uploads/'+req.file.filename) 
        } 
    let obj={
          language:req.body.language,
            type:req.body.type,
            point:req.body.point,
            answer:req.body.answer,
            qstn:req.body.qstn,
            Recording:encoded    
    }
    let finduser=await user.updateOne({email:req.body.email},{$push:{myquiz:obj}})
    if(finduser){
     res.status(201).json({message:"Added successfully"})
    }
    else{
     res.status(202).json({message:"error occured"})
    }
    }
    catch(err){
        res.status(401).json({message:err})
    }
})


app.post(`${BASE_URL}/Profile`,async(req,res)=>{
    try{
        let finduser=await user.findOne({email:req.body.email},{_id:0})
        if(finduser){
            res.status(200).json(finduser.myquiz)}
        else{res.status(201).json({message:"You not solve any Question"})}
    }
    catch(err){
        res.status(401).json({message:"Something is Wrong"})
    }
})

app.listen(port, () => {
    console.log("Server started")
})