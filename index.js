const express = require('express')
const mongoose = require('mongoose')
const bodyparser = require('body-parser')
const dotenv = require('dotenv').config()
const cors = require('cors')
const bcrypt = require('bcrypt')
const fs = require("fs");
const multer = require("multer")
const { GridFsStorage } = require("multer-gridfs-storage")
const jwt = require("jsonwebtoken")
const user = require("./Model/userModel")
const subjectModel = require("./Model/questionModel")
const userData = require("./Model/userData")
const app = express()
const port = process.env.PORT || 8005
mongoose.set('strictQuery', true)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(bodyparser.json())
app.use(cors())


mongoose.connect(process.env.MONGO_PATH, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log("Connected to Database"))
    .catch(err => console.log(err))

let bucket;
mongoose.connection.on("connected", () => {
    let db = mongoose.connections[0].db;
    bucket = new mongoose.mongo.GridFSBucket(db, {
        bucketName: "Recording"
    })
})

app.post("/Signin", async (req, res) => {

    try {
        let finduser = await user.findOne({ $or: [{ email: req.body.username }, { phone: req.body.username }] }, { _id: 0 })
        if (finduser) {
            let checkpass = bcrypt.compareSync(req.body.password, finduser.Password)
            if (checkpass) {
                let token = jwt.sign({ userid: finduser.email }, process.env.MY_SECRET, { expiresIn: "12h" })
                res.status(200).json({ Email: finduser.email, token })
            }
            else {
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
app.post("/SignUp", async (req, res) => {

    try {

        let User = new user({
            email: req.body.email,
            FullName: req.body.name,
            phone: req.body.phone,
            Password: bcrypt.hashSync(req.body.password, 5)
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


app.post("/Questions", async (req, res) => {
    try {

        let subjects = new subjectModel({
            subject: req.body.subject,
            questions: req.body.questions
        })
        let findsubject = await subjectModel.findOne({ subject: req.body.subject })
        if (findsubject) {
            let newone = [
                ...findsubject.questions,
                ...req.body.questions
            ]
            let newqstn = await subjectModel.updateOne({ subject: req.body.subject }, { questions: newone })
            if (newqstn) { res.status(201).json({ message: "New Question Added Successfully" }) }
            else { res.status(401).json({ message: "Error while adding questions" }) }
        }
        else {
            subjects.save()
                .then(() => res.status(201).json({ message: 'Added Successfully' }))
                .catch(err => res.status(401).json({ message: "Error while inserting question" }))
        }

    }
    catch (err) {
        res.status(401).json({ message: "Error while connecting" })
    }
})

app.get("/Quiz/:language", async (req, res) => {
    try {

        let findsubject = await subjectModel.findOne({ subject: req.params.language })
        if (findsubject) { res.status(200).json(findsubject.questions) }
        else { res.status(201).json({ message: "No Questions Available for this Subject" }) }
    }
    catch (err) {
        res.status(401).json({ message: "Error while fetching questions" })
    }
})


const storage = new GridFsStorage({
    url: process.env.MONGO_PATH,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            const filename = file.originalname;
            const fileInfo = {
                filename: filename,
                bucketName: "Recording"
            };
            resolve(fileInfo)
        })
    }
})
let upload = multer({ storage: storage })
app.post("/Quiz/:language", upload.array('v1', 15), async (req, res) => {
    try {
        let arr = [
            ...JSON.parse(req.body.data),
            { Date: JSON.parse(req.body.date) }

        ]
        console.log(JSON.parse(req.body.data))
        let userexist = await userData.findOne({ Email: req.body.email })
        if (userexist) {
            let finduser = await userData.updateOne({ Email: req.body.email }, { $push: { myquiz: arr } })
            if (finduser) {
                res.status(201).json({ message: "Added successfully1" })
            }
            else {
                res.status(401).send("An error occured")
            }
        }
        else {
            const userdata = new userData({
                Email: req.body.email,
                myquiz: [arr]
            })
            userdata.save()
                .then(() => res.status(201).json({ message: "Added successfully2" }))
                .catch((err) => res.status(202).json({ message: err }))

        }

    }
    catch (err) {
        res.status(401).json({ message: err })
    }
})

app.get("/fileinfo", (req, res) => {
    const file = bucket
        .find({
            filename: req.body.filename
        })
        .toArray((err, files) => {
            if (!files || files.length === 0) {
                return res.status(404)
                    .json({
                        err: "no files exist"
                    });
            }
            bucket.openDownloadStreamByName(req.body.filename)
                .pipe(res);
        });
});


app.post("/Profile", async (req, res) => {
    try {
        let finduser = await user.findOne({ email: req.body.email }, { _id: 0 })
        if (finduser) {
            res.status(200).json(finduser.myquiz)
        }
        else { res.status(201).json({ message: "You not solve any Question" }) }
    }
    catch (err) {
        res.status(401).json({ message: "Something is Wrong" })
    }
})

app.listen(port, () => {
    console.log("Server started")
})