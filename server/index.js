const {
  client,
  createTables,
  createUser,
  createProduct,
  fetchUsers,
  fetchProducts,
  createFavorite,
  destroyFavorite,
  fetchFavorites,
  authenticate,
  findUserWithToken,
} = require("./db");


const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const path = require("path");
app.use(express.json());

const secret = process.env.JWT || "shhhhlocal";

app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "../client/dist/index.html"))
);
app.use(
  "/assets",
  express.static(path.join(__dirname, "../client/dist/assets"))
);

const isLoggedIn = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      const error = Error("not authorized");
      error.status = 401;
      throw error;
    }
    req.user = await findUserWithToken(token);
    next();
  } catch (error) {
    next(error);
  }
};

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const token = await authenticate(req.body);
    res.send({ token });
  } catch (ex) {
    next(ex);
  }
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const user = await createUser(req.body);
    const token = jwt.sign({ id: user.id }, secret);
    res.send({ token });
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/auth/me", isLoggedIn, async (req, res, next) => {
  try {
    res.send(req.user);
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/users", async (req, res, next) => {
  try {
    res.send(await fetchUsers());
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/users/:id/favorites", isLoggedIn, async (req, res, next) => {
  try {
    if (req.user.id === req.params.id) {
      res.send(await fetchFavorites(req.params.id));
    } else {
      const error = Error("not authorized");
      error.status = 401;
      throw error;
    }
  } catch (ex) {
    next(ex);
  }
});

app.post("/api/users/:id/favorites", isLoggedIn, async (req, res, next) => {
  try {
    if (req.user.id === req.params.id) {
      res.status(201).send(
        await createFavorite({
          user_id: req.params.id,
          product_id: req.body.product_id,
        })
      );
    } else {
      const error = Error("not authorized");
      error.status = 401;
      throw error;
    }
  } catch (ex) {
    next(ex);
  }
});

app.delete(
  "/api/users/:user_id/favorites/:id",
  isLoggedIn,
  async (req, res, next) => {
    try {
      if (req.user.id === req.params.user_id) {
        await destroyFavorite({
          user_id: req.params.user_id,
          id: req.params.id,
        });
        res.sendStatus(204);
      } else {
        const error = Error("not authorized");
        error.status = 401;
        throw error;
      }
    } catch (ex) {
      next(ex);
    }
  }
);

app.get("/api/products", async (req, res, next) => {
  try {
    res.send(await fetchProducts());
  } catch (ex) {
    next(ex);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .send({ error: err.message ? err.message : err });
});

const init = async () => {
  const port = process.env.PORT || 3000;
  await client.connect();
  console.log("connected to database");

  await createTables();
  console.log("tables created");

  const [moe, lucy, ethyl, curly, foo, bar, bazz, quq, fip] = await Promise.all(
    [
      createUser({ username: "moe", password: "m_pw" }),
      createUser({ username: "lucy", password: "l_pw" }),
      createUser({ username: "ethyl", password: "e_pw" }),
      createUser({ username: "curly", password: "c_pw" }),
      createProduct({ name: "foo" }),
      createProduct({ name: "bar" }),
      createProduct({ name: "bazz" }),
      createProduct({ name: "quq" }),
      createProduct({ name: "fip" }),
    ]
  );

  console.log(await fetchUsers());
  console.log(await fetchProducts());

  app.listen(port, () => console.log(`listening on port ${port}`));
};

init();