var express = require('express')
var app = express()
var session = require("express-session")
var bodyParser = require("body-parser")
var cors = require("cors")
var bcrypt = require('bcryptjs');

var mongo = require("mongodb")
var mongodb = mongo.MongoClient
var port = process.env.PORT || 2600
// const url = "mongodb://localhost:27017"
const url = "mongodb+srv://kp_13:kuj166@cluster0.nckbm.mongodb.net/kp?retryWrites=true&w=majority"
let db;
app.use(cors())
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

///use session
app.use(session({
    secret:'mytokensecert'
}));

app.use(express.static(__dirname+'/public'))
app.set('views', './views')
app.set('view engine', 'ejs')

app.listen(port, (err)=>{
    if (err) throw err
    console.log(`Server is running on port ${port}`)
})

mongo.connect(url,(err,connection)=>{
    if(err){
        console.log("error while connecting to database")
        // res.status(501).send("error while connecting to database")
    }
    else{
        db = connection.db("blogData")
    }
})

// Frontend routes starts
app.get('/', function(req,res){
    res.render("login", {errmessage:req.query.errmessage,succmessage:req.query.succmessage})
})

app.get('/register',(req,res)=>{
    res.render('register',{message:req.query.message})
})

app.get('/allUsers', (req,res)=>{
    if(!req.session.login){return res.redirect("/?errmessage= No Session found! Please login first")}
    if(req.session.login.role!=="admin"){return res.redirect("/?errmessage=You are not an admin! Please login as Admin")}
    db.collection("users").find().toArray((err,data)=>{
        if(err){
            res.status(500).send("error while using collections")
        }
        else{
            res.render('adminPage',{data, userdata:req.session.login})
        }
    })
})

app.get('/blog',(req,res)=>{
    if(!req.session.login){return res.redirect("/?errmessage= No Session found! Please login first")}
    db.collection("blog").find().toArray((err,data)=>{
        if(err) throw err;
        res.render('blogPage',{postdata:data,userdata:req.session.login,succmessage:req.query.succmessage?req.query.succmessage:""})
    })
})

app.get('/blog_details/:id',(req,res)=>{
    if(!req.session.login){return res.redirect("/?errmessage= No Session found! Please login first")}
    const id=mongo.ObjectID(req.params.id)
    db.collection("blog").findOne({_id:id},(err,data)=>{
        if(err) throw err;
        res.render('blogDetails', {postdata:data,userdata:req.session.login,succmessage:req.query.succmessage?req.query.succmessage:""})
    })
})

app.get('/blog/addblog',(req,res)=>{
    if(!req.session.login){res.redirect("/?errmessage=No session Found! Login first")}
    res.render('addblog',{userdata:req.session.login, errmessage:req.query.errmessage})
})

app.get('/editblog/:id',(req,res)=>{
    if(!req.session.login){return res.redirect("/?errmessage= No Session found! Please login first")}
    const id = mongo.ObjectID(req.params.id)
    db.collection("blog").findOne({_id:id},(err,data)=>{
        if(err) throw err
        res.render('editblog',{userdata:req.session.login,data})
    })
})

app.get('/profile',(req,res)=>{
    if(!req.session.login){return res.redirect("/?errmessage= No Session found! Please login first")}
    return res.send(req.session.login)
})

app.get('/logout',(req,res)=>{
    req.session.login = null
    return res.redirect("/?succmessage=Logout successfully")
})
// Frontend routes ends


// Backend routes starts
//Register User
app.post('/register',(req,res)=>{
    let user = {
        name:req.body.name,
        email:req.body.email,
        password:bcrypt.hashSync(req.body.password),
        // password:req.body.password,
        role:req.body.role?req.body.role:'user',
        isActive:true
    }
    console.log(user)
    db.collection("users").findOne({email:user.email},(err,data)=>{
        if(data){return res.redirect("/register?message=Please try new email, this is already in use")}
        else{
            db.collection("users").insert(user,(err,data)=>{
                if(err){
                    res.status(501).send("error while posting the data to database")
                }
                else{
                    return res.redirect("/?succmessage=Successfully Registered")
                }
            })
        }
    })    
})

//login
app.post('/login',(req,res)=>{
    db.collection("users").findOne({email:req.body.email},(err,data)=>{
        if(err){return res.redirect("/?errmessage=There is a problem! please try again")}
        if(!data){return res.redirect("/?errmessage=No such user found, Please register first.")}
        const matchPassword = bcrypt.compareSync(req.body.password, data.password)
        if(!matchPassword){res.redirect("/?errmessage=Invalid Password")}
        else{
            if(req.session.login){
                res.redirect("/?errmessage=You already are in a session")
            }
            else{
                req.session.login = data
                return res.redirect('/blog')
            }
        }
    })
})

app.post('/blog/addblog',(req,res)=>{
    if(!req.session.login){return res.redirect("/?errmessage= No Session found! Please login first")}
    let data = {
        title:req.body.title,
        description:req.body.description,
        createdBy:req.session.login.name,
        createrId:req.session.login._id,
        isActive:true,
        tags:req.body.tags,
        date:new Date(Date.now()).toISOString(),
        lastUpdate:new Date(Date.now()).toISOString()
    }
    db.collection("blog").insert(data,(err,data)=>{
        if(err) throw err;
        res.redirect("/blog?succmessage=your blog is added")
    })
})

app.post('/blog/edit/:id',(req,res)=>{
    if(!req.session.login){return res.redirect("/?errmessage= No Session found! Please login first")}
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
            res.redirect('/blog')
        })
})

app.get('/blog/delete/:id',(req,res)=>{
    if(!req.session.login){return res.redirect("/?errmessage= No Session found! Please login first")}
    const id=mongo.ObjectID(req.params.id)
    db.collection("blog").remove({_id:id},(err,result)=>{
        if(err) throw err;
        res.redirect('/blog')
    }) 
})

app.post('/comments',(req,res)=>{
   console.log(req.body)
   const comment_id = mongo.ObjectId()
   db.collection("blog").update(
        {_id:mongo.ObjectID(req.body.id)},
        {
            $push:{
                comments:{
                    _id:comment_id,
                    commentedBy:req.body.username,
                    comment:req.body.comment,
                    date: new Date()
                }
            }
        },(err,data)=>{
            if(err) throw err;
            res.redirect(`/blog_details/${req.body.id}`)
        }
   )
})
// Backend routes end


