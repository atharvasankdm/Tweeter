const mongoose = require("mongoose");

const mongoURI = "mongodb://localhost:27017/tweeter";

const connectDB = async () => {
  try {
    mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const db = mongoose.connection;
    db.on("error", console.error.bind(console, "MongoDB connection error:"));
    db.once("open", () => {
      console.log("Connected to MongoDB successfully!");
    });
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1); // Exit the application with a failure status
  }
};

module.exports = connectDB;
