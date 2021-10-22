const express = require('express')
const PORT = process.env.PORT || 5000
const app = express()
const path = require('path')
const mongoose = require('mongoose');
const cors = require("cors");



//connect your mongodb Link
mongoose.connect('mongodb+srv://dbUser:User12345@cluster0.s4zcy.mongodb.net/myFirstDatabase?retryWrites=true&w=majority');

//making schema to register the user
const User = mongoose.model('User', {
    name: String,
    email: String,
    password: String,
    created: { type: Date, default: Date.now },
});


app.use(express.json())

//as we are using the backend and frontend on differennt servers so google wont allow us to do this
// to resolve this, we use Cors but we remove this in production
app.use(cors(["localhost:3000", "localhost:5000"]))

app.use('/', express.static(path.join(__dirname, './my-app/build')))


//for Login Request
app.post('/api/v1/login', (req, res) => {

    //checking for any empty field
    if (!req.body.email || !req.body.password) {
        console.log("required field missing");
        res.status(403).send("required field missing");

        //With this return , it won't run the remaining code and will get back.
        return;
    }

    console.log("req.body: ", req.body);

    //findOne will find the input value and if it's found it won't check remaining values
    User.findOne({ email: req.body.email }, (err, user) => {

        if (err) {
            res.status(500).send("error in getting database")
        } else {
            if (user) {
                if (user.password === req.body.password) {
                    res.send(user);

                } else {
                    res.send("Authentication fail");
                }

            } else {
                res.send("user not found");
            }
        }

    })
})


app.get('/api/v1/profile', (req, res) => {

    //checking for any empty field
    res.redirect('/profile')

})




//For SignUp request
app.post('/api/v1/signup', (req, res) => {

    //checking for any empty field
    if (!req.body.email || !req.body.password || !req.body.name) {
        console.log("required field missing");
        res.status(403).send("required field missing");
        return;
    } 
    
    else {
        console.log(req.body)

        let newUser = new User({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
        })

        
        newUser.save(() => {
            console.log("data saved")
            res.send('profile created')
        })
    }

})

app.delete('/api/v1/profile', (req, res) => {
    res.send('profile deleted')
})

app.listen(PORT, () => {
    console.log(`Example app listening at http://localhost:${PORT}`)
})