const mongoose=require('mongoose')
const userData=new mongoose.Schema({
      Email:{
            type:String
      },
      myquiz:{
            type:Array,
            item:{
                  type:Array,
                  item:[
                        {type:Object}
                  ]
            }
      }
})
const userDataModel=mongoose.model("UserData",userData)
module.exports=userDataModel