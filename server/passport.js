const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const User = require("./models/User");
const bcrypt = require("bcryptjs");

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (!user) return done(null, false, { message: "Incorrect email." });
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) return done(null, user);
        return done(null, false, { message: "Incorrect password." });
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    // const user = await User.findOne({ _id: id });
    const user = await User.findById(id);

    done(null, user);
  } catch (err) {
    done(err);
  }
});
