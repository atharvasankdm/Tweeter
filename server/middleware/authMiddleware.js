exports.isAuthenticated = (req, res, next) => {
  //   console.log(req);
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized. Please login." });
};
