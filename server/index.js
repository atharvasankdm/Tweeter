const express = require("express");
const session = require("express-session");
const passport = require("passport");
var cors = require("cors");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");
const upload = require("./config/multerconfig.js"); // Import the multer configuration
const authRoutes = require("./routes/authRoutes.js");
const connectDB = require("./config/db");
const User = require("./models/User.js");
const Tweet = require("./models/Tweet.js");

const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 5000;

//db connection
connectDB();
// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use("/images", express.static(path.join(__dirname, "/images")));

// const storage = multer.diskStorage({
//   //destination of image save i.e the images file
//   destination: (req, file, cb) => {
//     cb(null, "images");
//   },

//   // null means koi error nahi hai and req.body.name is the name of the file

//   filename: (req, file, cb) => {
//     cb(null, req.body.name);
//   },
// });

// const upload = multer({ storage: storage });

app.use(
  session({
    secret: "atharvaLikesToGoToGym",
    resave: true,
    saveUninitialized: true,
  })
);

app.use(cookieParser("atharvaLikesToGoToGym"));

app.use(passport.initialize());
app.use(passport.session());
require("./passport");

app.post(
  "/api/update-user/:userId",
  upload.single("profilePic"),
  async (req, res) => {
    try {
      const { userId } = req.params;
      // const { filename } = req.file;
      const { name, bio, phone, email, password } = req.body;

      const updatedFields = {};

      // Check if the profilePic field is being updated
      if (req.file && req.file.filename) {
        updatedFields.profilePic = `/images/${req.file.filename}`;
      }

      // Check if other fields are being updated
      if (name) {
        updatedFields.username = name;
      }
      if (bio) {
        updatedFields.bio = bio;
      }
      if (phone) {
        updatedFields.phone = phone;
      }
      if (email) {
        updatedFields.email = email;
      }
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updatedFields.password = hashedPassword;
      }

      const user = await User.findByIdAndUpdate(
        userId,
        updatedFields,
        // {
        //   profilePic: `/images/${filename}`,
        // },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // user.profilePic = `/images/${filename}`;
      // const updatedUser = await user.save();
      res.status(200).json({
        message: "User updated successfully",
        user: user,
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: "Something went wrong" });
    }
  }
);

//get user
app.get("/api/post/user/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

//create post
app.post(
  "/api/post/create-post/:userId",
  upload.single("media"),
  async (req, res) => {
    const { userId } = req.params;
    const { text, access } = req.body;
    // console.log(req.file);
    try {
      const post = new Tweet({
        user: userId,
        text,
        media: `/images/${req?.file?.filename}`,
        access,
      });

      // Save the post to the database
      const savedPost = await post.save();

      res
        .status(201)
        .json({ message: "Post created successfully!", post: savedPost });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Something went wrong" });
    }
  }
);

//bookmark a post

// app.post("/api/post/save-post/:userId", async (req, res) => {
//   const { userId } = req.params;
//   const { postId } = req.body;

//   try {
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     if (user.savedPosts.includes(postId)) {
//       return res.status(409).json({ error: "Post already saved" });
//     }

//     user.savedPosts.push(postId);
//     await user.save();

//     res.status(200).json({ message: "Post saved successfully" });
//   } catch (err) {
//     console.error(error);
//     res.status(500).json({ error: "Something went wrong" });
//   }
// });

//get all public posts

app.get("/api/post/get-all-public", async (req, res) => {
  try {
    const publicPosts = await Tweet.find({ access: "public" }).populate("user");
    res.json(publicPosts);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

//get public + posts by users following
app.get("/api/post/get-user-posts/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Find the user by userId to get the users followed by the specific user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get the array of userIds that the specific user is following
    const followingIds = user.following;
    console.log(followingIds);

    // Find public posts and posts by users followed by the specific user
    const posts = await Tweet.find({
      $or: [
        { access: "public" }, // Public posts
        { user: { $in: [userId, ...followingIds] } }, // Posts by users followed by the specific user
      ],
    })
      .populate("user") // Populate the user field in the posts to get the user details
      .populate({
        path: "comments",
        populate: {
          path: "userId",
          model: "User",
        },
      })
      // .populate({
      //   path: "comments.userId",
      //   model: "User",
      // })
      .exec();

    console.log(posts);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

//add comment to a post
app.post(
  "/api/post/add-comment/:postId",
  upload.single("media"),
  async (req, res) => {
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req?.user?._id;
    // console.log(req?.user);
    try {
      // First, find the post by its ID
      const post = await Tweet.findById(postId);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Add the comment to the post's comments array
      post.comments.push({
        text,
        media: `/images/${req?.file?.filename}`,
        userId,
      });

      // Save the updated post with the new comment
      const updatedPost = await post.save();

      res.json(updatedPost);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

// //get comments of a post
// app.get("/api/post/get-comments/:postId", async (req, res) => {
//   const { postId } = req.params;

//   try {
//     const post = await Tweet.findById(postId).populate("comments");
//     if (!post) {
//       return res.status(404).json({ message: "Post not found" });
//     }

//     const postComments = await post.comments;
//     res.status(200).json(postComments);
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ message: "Server Error" });
//   }
// });

//follow a user
app.post("/api/user/follow-user/:userId", async (req, res) => {
  //userId is the user to be followed
  const { userId } = req.params;
  const { followerId } = req.body;

  try {
    // Find the user to be followed
    const userToBeFollowed = await User.findById(userId);
    if (!userToBeFollowed) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the follower user
    const followerUser = await User.findById(followerId);
    if (!followerUser) {
      return res.status(404).json({ message: "Follower not found" });
    }

    // Check if the follower is already following the user
    if (userToBeFollowed.followers.includes(followerId)) {
      return res.status(400).json({ message: "Already following this user" });
    }

    // Add the follower to the user's followers array
    userToBeFollowed.followers.push(followerId);
    await userToBeFollowed.save();

    // Add the user to the follower's following array
    followerUser.following.push(userId);
    await followerUser.save();

    res.json({ message: "Follower added successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

//like a post
app.post("/api/post/like-post/:postId", async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;

  try {
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the post
    const post = await Tweet.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if the post is already liked by the user
    const likedIndex = post.likes.indexOf(userId);
    if (likedIndex !== -1) {
      // If the user has already liked the post, remove the like (dislike)
      post.likes.splice(likedIndex, 1);
      await post.save();

      // Remove the post from the user's likedPosts array
      const likedPostIndex = user.likedPosts.indexOf(postId);
      if (likedPostIndex !== -1) {
        user.likedPosts.splice(likedPostIndex, 1);
        await user.save();
      }

      res.json({ message: "Post unliked successfully" });
    } else {
      // If the user has not liked the post, add the like
      post.likes.push(userId);
      await post.save();

      // Add the post to the user's likedPosts array
      user.likedPosts.push(postId);
      await user.save();

      res.json({ message: "Post liked successfully" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

//get liked posts by user
app.get("/api/posts/get-liked-posts/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Extract and send the posts liked by the user
    const likedPosts = user.likedPosts;
    res.json(likedPosts);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

//retweet a post
app.post("/api/post/retweet-post/:postId", async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;

  try {
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the post
    const post = await Tweet.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if the post is already liked by the user
    const retweetIndex = post.retweets.indexOf(userId);
    if (retweetIndex !== -1) {
      // If the user has already liked the post, remove the like (dislike)
      post.retweets.splice(retweetIndex, 1);
      await post.save();

      // Remove the post from the user's likedPosts array
      const retweetPostIndex = user.retweetPosts.indexOf(postId);
      if (retweetPostIndex !== -1) {
        user.retweetPosts.splice(retweetPostIndex, 1);
        await user.save();
      }

      res.json({ message: "retweet removed successfully" });
    } else {
      // If the user has not liked the post, add the like
      post.retweets.push(userId);
      await post.save();

      // Add the post to the user's likedPosts array
      user.retweetPosts.push(postId);
      await user.save();

      res.json({ message: "retweet added successfully" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

//bookmark a post
app.post("/api/post/bookmark-post/:postId", async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;

  try {
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the post
    const post = await Tweet.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if the post is already liked by the user
    const bookmarkIndex = post.bookmarks.indexOf(userId);
    if (bookmarkIndex !== -1) {
      // If the user has already liked the post, remove the like (dislike)
      post.bookmarks.splice(bookmarkIndex, 1);
      await post.save();

      // Remove the post from the user's likedPosts array
      const bookmarkPostIndex = user.bookmarkedPost.indexOf(postId);
      if (bookmarkPostIndex !== -1) {
        user.bookmarkedPost.splice(bookmarkPostIndex, 1);
        await user.save();
      }

      res.json({ message: "bookmark removed successfully" });
    } else {
      // If the user has not liked the post, add the like
      post.bookmarks.push(userId);
      await post.save();

      // Add the post to the user's likedPosts array
      user.bookmarkedPost.push(postId);
      await user.save();

      res.json({ message: "bookmark added successfully" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});
// app.get("api/get-user/:userId", async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const user = await User.findById(userId);
//   } catch (err) {
//     res.status(500).json({ error: "Something went wrong" });
//   }
// });
//routes
app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on PORT:${PORT}`);
});
