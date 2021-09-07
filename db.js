const Sequelize = require("sequelize");
const { STRING } = Sequelize;
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT; //this is the JWT we defined in package.JSON
const bcrypt = require("bcrypt");
const saltRounds = 10;

const config = {
  logging: false,
};

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

const Note = conn.define("note", {
  text: STRING,
});

Note.belongsTo(User);
User.hasMany(Note);

User.byToken = async (token) => {
  try {
    // const user = await User.findByPk(token);
    // if (user) {
    //   return user;
    // }
    // const error = Error("bad credentials");
    // error.status = 401;
    // throw error;
    const verifyGood = jwt.verify(token, SECRET_KEY);
    const user = await User.findByPk(verifyGood.userId);
    if (user) {
      return user;
    }
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
      // password,
    },
  });
  const verified = bcrypt.compare(password, user.password);

  if (verified) {
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
      },
      SECRET_KEY
    );
    return token;
  }
  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};

// User.beforeCreate(user => {
//   return bcrypt.hash(user.password, saltRounds)
//   .then(hash => user.password = hash)
//   .catch(error => console.log(error))
// })

User.beforeCreate(async (user, options) => {
  const hashedPassword = await bcrypt.hash(user.password, saltRounds);
  user.password = hashedPassword;
});

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];
  const notes = [
    { text: "HeeHee" },
    { text: "BANANA" },
    { text: "HELLO WORLD" },
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );
  const [note1, note2, note3] = await Promise.all(
    notes.map((note) => Note.create(note))
  );
  await lucy.setNotes(note1);
  await moe.setNotes([note2, note3]);
  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note,
  },
};
