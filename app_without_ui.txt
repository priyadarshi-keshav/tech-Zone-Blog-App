var express = require('express')
var app = express()
var session = require("express-session")
var bodyParser = require("body-parser")
var cors = require("cors")
var bcrypt = require('bcryptjs');
var mongo = require("mongodb")
var mongodb = mongo.MongoClient
var port = process.env.PORT || 2600
const url = "mongodb://localhost:27017"
let db;
app.use(cors())
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

///use session
app.use(session({
    secret:'mytokensecert'
}));

//Register User
app.post('/register',(req,res)=>{
    let user = {
        name:req.body.name,
        email:req.body.email,
        // password:bcrypt.hashSync(req.body.password),
        password:req.body.password,
        role:req.body.role?req.body.role:'user',
        isActive:true
    }
    db.collection("users").find({email:user.email},(err,data)=>{
        if(data){return res.send("Please try new email, this is already in use")}
        else{
            db.collection("users").insert(user,(err,data)=>{
                if(err){
                    res.status(501).send("error while posting the data to database")
                }
                else{
                    return res.send(data)
                }
            })
        }
    })    
})

//login
app.post('/login',(req,res)=>{
    let user = {
        email : req.body.email,
        password : req.body.password
    }
    db.collection("users").findOne(user,(err,data)=>{
        if(err || !data){
            return res.send("Bad credential! please try again")
        }
        else{
            if(req.session.login === data.email){
                res.send("You are already logged in")
            }
            req.session.login = data
            return res.send(data)
        }
    })
})
app.get('/blogs',(req,res)=>{
    db.collection("blog").find().toArray((err,data)=>{
        if(err) throw err;
        res.send(data)
    })
})
app.post('/blog/addblog',(req,res)=>{
    let data = {
        title:req.body.title,
        description:req.body.description,
        createBy:req.body.name,
        createrId:req.body._id,
        isActive:true,
        tags:req.body.tags,
        date:new Date(Date.now()).toISOString(),
        lastupdatedate:new Date(Date.now()).toISOString()
    }
    db.collection("blog").insert(data,(err,data)=>{
        if(err) throw err;
        res.status(200).send("Your Blog is Added")
    })
})

app.put('/blog/edit/:id',(req,res)=>{
    const id = mongo.ObjectID(req.params.id)
    db.collection("blog").update(
        {_id:id},
        {
            $set:{
                title:req.body.title,
                description:req.body.description,
                tags:req.body.tags,
                lastupdatedate:new Date(Date.now()).toISOString()
            }
        },(err,data)=>{
            if(err) throw error;
            res.status(200).send("Your blog has been updated")
        })
})

app.delete('/blog/delete/:id',(req,res)=>{
    const id=mongo.ObjectID(req.params.id)
    db.collection("blog").deleteOne({_id:id},(err,result)=>{
        if(err) throw err;
        res.status(200).send("Your Blog is deleted")
    }) 
})

//logout
app.get('/logout',(req,res)=>{
    req.session.login = null
    return res.send("Logout successfully")
})
//get all registered user
app.get('/allUsers', (req,res)=>{
    console.log(req.session.login)
    db.collection("users").find().toArray((err,data)=>{
        if(err){
            res.status(500).send("error while using collections")
        }
        else{
            res.status(200).send(data)
        }
    })
})

app.get('/profile',(req,res)=>{
    return res.send(req.session.login)
})

app.listen(port, (err)=>{
    if (err) throw err
    console.log(`Server is running on port ${port}`)
})

mongo.connect(url,(err,connection)=>{
    if(err){
        res.status(501).send("error while connecting to database")
    }
    else{
        db = connection.db("blogData")
    }
})