const mongoose=require('mongoose')
const User=new mongoose.Schema({
    email:{
        type:String
    },
    FullName:{
        type:String
    },
    Password:{
        type:String
    },
    phone:{
        type:String
    },
    myquiz:{
        type:mongoose.Schema.Types.Mixed
    }
})
const user=mongoose.model("User",User)
module.exports=user