const mongoose=require('mongoose')
const subjects=new mongoose.Schema({
    subject:{
        type:String
    },
    questions:{
             type:mongoose.Schema.Types.Mixed
    }
})
const subjectModel=mongoose.model("Question",subjects)
module.exports=subjectModel