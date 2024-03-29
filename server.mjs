//In Nodejs, version 16 ES6 is implemented due to which we have to switch to that, files will be with mjs extension
//Require will be replaced with import
//API should be pipeline formated, firstly written API will run first

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";

const __dirname = path.resolve();
import { stringToHash, varifyHash } from "bcrypt-inzi"; //helps to convert password into hash
import jwt from "jsonwebtoken"; //Helps in auth tokenization
import cookieParser from "cookie-parser";

const SECRET = process.env.SECRET || "12345";
const PORT = process.env.PORT || 5000;
const app = express();

// const express = require('express')
// const PORT = process.env.PORT || 5000
// const app = express()
// const path = require('path')
// const mongoose = require('mongoose');
// const cors = require("cors");

//connect your mongodb Link
mongoose.connect(
  "mongodb+srv://dbUser:User12345@cluster0.s4zcy.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"
);

//making schema to register the user
const User = mongoose.model("User", {
  name: String,
  email: String,
  password: String,
  created: { type: Date, default: Date.now },
});

//making schema for Post
const Post = mongoose.model("Post", {
  user: String,
  email: String,
  subject: String,
  description: String,
  img: String,
  created: { type: Date, default: Date.now },
});

// let users = [];

app.use(express.json());
app.use(cookieParser());

//as we are using the backend and frontend on differennt servers so google wont allow us to do this to resolve this, we use Cors but we remove this in production

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5000"],
    credentials: true,
  })
);

app.use("/", express.static(path.join(__dirname, "/web/build")));

// app.get("/", (req, res, next) => {
//     res.sendFile(path.join(__dirname, "/web/build/index.html"))
// })

//For SignUp request
app.post("/api/v1/signup", (req, res, next) => {
  //checking for any empty field
  if (!req.body.name || !req.body.password || !req.body.email) {
    console.log("required field missing");
    res.status(403).send("required field missing");
    return;
  } else {
    //checking if user exists or not
    User.findOne({ email: req.body.email }, (err, user) => {
      if (user) {
        res.send("user already exist");
      } else {
        console.log(req.body);

        stringToHash(req.body.password).then((passwordHash) => {
          console.log("hash: ", passwordHash);

          let newUser = new User({
            name: req.body.name,
            email: req.body.email,
            password: passwordHash,
          });

          newUser.save(() => {
            console.log("data saved");
            res.send("signup success");
          });
        });
      }
    });
  }
});

//for Login Request
app.post("/api/v1/login", (req, res, next) => {
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
      res.status(500).send("error in getting database");
    } else {
      if (user) {
        varifyHash(req.body.password, user.password)
          .then((result) => {
            if (result) {
              var token = jwt.sign(
                {
                  name: user.name,
                  email: user.email,
                  _id: user._id,
                },
                SECRET
              );

              res.cookie("token", token, {
                httpOnly: true,
                maxAge: 3000000,
              });

              res.send({
                name: user.name,
                email: user.email,
                _id: user._id,
                created: user.created,
              });
            } else {
              res.status(401).send("Authentication fail");
            }
          })
          .catch((e) => {
            console.log("error: ", e);
          });
      } else {
        res.send("user not found");
      }
    }
  });
});

// app.get('/api/v1/profile', (req, res) => {
//     res.send(users);
// })

// app won't proceed if it not gets the token
app.use((req, res, next) => {
  jwt.verify(req.cookies.token, SECRET, function (err, decoded) {
    req.body._decoded = decoded;

    console.log("decoded: ", decoded); // bar

    if (!err) {
      next();
    } else {
      res.status(401).send("Un-Authenticated");
    }
  });
});

app.get("/api/v1/profile", (req, res) => {
  User.findOne({ email: req.body._decoded.email }, (err, user) => {
    if (err) {
      res.status(500).send("error in getting database");
    } else {
      if (user) {
        res.send({
          name: user.name,
          email: user.email,
          _id: user._id,
        });
      } else {
        res.send("user not found");
      }
    }
  });
});

//For Post request
app.post("/api/v1/post", (req, res) => {
  console.log("Response Recieved -->", req.body);

  //checking for any empty field
  if (
    !req.body.user ||
    !req.body.subject ||
    !req.body.description ||
    !req.body.email ||
    !req.body.img
  ) {
    console.log("required field missing");
    res.status(403).send("required field missing");
    return;
  } else {
    // console.log(req.body)

    let newPost = new Post({
      user: req.body.user,
      email: req.body.email,
      subject: req.body.subject,
      description: req.body.description,
      img: req.body.img,
    });

    newPost.save(() => {
      console.log("data saved");
      io.emit("POSTS", {
        user: req.body.user,
        email: req.body.email,
        subject: req.body.subject,
        description: req.body.description,
        img: req.body.img,
      });
      res.send("Post created");
    });
  }
});

app.get("/api/v1/post", (req, res) => {
  Post.find({}, (err, data) => {
    if (err) {
      res.send(err);
    } else {
      res.send(data);
    }
  });
});

app.get("/api/v1/mypost", (req, res) => {
  Post.find({ email: req.body.email }, (err, data) => {
    if (err) {
      res.send(err);
    } else {
      res.send(data);
    }
  });
});

app.post("/api/v1/logout", (req, res, next) => {
  res.cookie("token", "", {
    httpOnly: true,
    // maxAge: 300000
  });
  res.send();
});

// app.get('/profile', (req, res) => {
//     res.redirect('http://localhost:5000/profile')
// })

// app.delete('/api/v1/profile', (req, res) => {
//     res.send('profile deleted')
// })

app.use("/**", (req, res) => {
  // res.redirect("/")
  res.sendFile(path.join(__dirname, "/web/build/index.html"));
});

// app.listen(PORT, () => {
//     console.log(`Example app listening at http://localhost:${PORT}`)
// })

const server = createServer(app);

const io = new Server(server, { cors: { origin: "*", methods: "*" } });

io.on("connection", (socket) => {
  console.log("New client connected with id: ", socket.id);

  // to emit data to a certain client
  socket.emit("topic 1", "some data");

  // collecting connected users in a array
  // connectedUsers.push(socket)

  socket.on("disconnect", (message) => {
    console.log("Client disconnected with id: ", message);
  });
});

setInterval(() => {
  // to emit data to all connected client
  // first param is topic name and second is json data
  io.emit("Test topic", { event: "ADDED_ITEM", data: "some data" });
  console.log("emiting data to all client");
}, 2000);

server.listen(PORT, function () {
  console.log("server is running on", PORT);
});
