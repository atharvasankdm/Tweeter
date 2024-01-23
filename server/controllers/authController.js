const bcrypt = require("bcryptjs");
const User = require("../models/User");

exports.register = async (req, res) => {
  const { email, password, username } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword, username });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to register user." });
  }
};

exports.login = (req, res) => {
  res.json({ message: "Logged in successfully!", user: req.user });
};

exports.logout = (req, res) => {
  req.logout(function (err) {
    if (err) {
      // Handle error if logout fails
      return res.status(500).json({ error: "Logout failed." });
    }
    // Logout successful
    return res.status(200).json({ message: "Logged out successfully." });
  });
};
