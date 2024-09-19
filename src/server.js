require('dotenv').config();
var express = require("express");
var path = require("path");
var app = express();
var server = require("http").Server(app);
var bodyParser = require("body-parser");
var session = require("express-session");
const passport = require("passport");
const cookieSession = require("cookie-session");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

require("./passport");

const { SECRET, PORT } = require("./config") ;
let username;
let email = "";

var con = require("./database/db");

app.use(
  cookieSession({
    name: "google-auth-session",
    keys: ["key1", "key2"],
  })
);

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: SECRET,
  resave: false, // No guarda la sesión en cada solicitud si no ha habido cambios
  saveUninitialized: false, // No guarda sesiones nuevas sin modificar
}));

app.get("/", function (req, res) {
  authenticate(req, res);
});

function authenticate(req, res) {
  if (!req.session.user) {
    res.sendFile(__dirname + "/public/login.html");
  } else {
    username = req.session.user;
    res.sendFile(__dirname + "/public/dashboard.html");
  }
}

app.get("/logout", function (req, res) {
  delete req.session.user;
  req.session = null;
  res.redirect("/login");
});

app.get(
  "/google",
  passport.authenticate("google", { scope: ["email"] })
);

app.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/failed" }),
  function (req, res) {
    email = req.user.email;
    res.redirect("/success");
  }
);

app.get("/api/get-user-email", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Usuario no autenticado" });
  }
  res.json({ email: req.session.user });
});

app.get("/success", (req, res) => {
  const sql = "REPLACE INTO login (username , password) VALUES (?, 'oauth')";
  con.query(sql, [email], function (err) {
    if (err) throw err;
  });
  req.session.user = email;
  username = email;
  res.redirect("/dashboard");
});

function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  } else {
    res.redirect("/login");
  }
}

app.get("/dashboard", isAuthenticated, function (req, res) {
  res.sendFile(path.join(__dirname, "public/dashboard.html"));
});

app.get("/login", function (req, res) {
  authenticate(req, res);
});

app.post("/login", function (req, res) {
  login(req, res);
});

app.get("/api/get-products", (req, res) => {
  const query = "SELECT * FROM products";
  con.query(query, function (err, results) {
    if (err) throw err;
    res.json(results);
  });
});

app.post("/create-payment-intent", async (req, res) => {
  const { productId, email, productPrice } = req.body;
console.log(productId,email,productPrice);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'PEN',
            product_data: {
              name: `Product ${productId}`, // Nombre del producto, personaliza según sea necesario
            },
            unit_amount: productPrice * 100, // Precio en centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `http://localhost:${PORT}/payment-success?productId=${productId}&email=${email}&productPrice=${productPrice}`,
      cancel_url: `http://localhost:${PORT}/dashboard`,
      customer_email:email

    });

      res.send({ sessionId: session.id });

});




app.get("/payment-success", (req, res) => {
  const { productId, email, productPrice } = req.query;

  // Paso 1: Actualizar el estado del producto
  const sqlUpdateProduct = "UPDATE products SET status = 'pagado' WHERE id = ?";
  con.query(sqlUpdateProduct, [productId], function (err) {
    if (err) {
      console.error('Error al actualizar el producto:', err.message);
      return res.status(500).json({ error: err.message });
    }

    // Paso 2: Insertar un nuevo registro de pago
    const sqlInsertPayment = `
      INSERT INTO payments (product_id, user_email, amount, payment_status)
      VALUES (?, ?, ?, ?)
    `;
    con.query(sqlInsertPayment, [productId, email, productPrice, 'Pagado'], function (err) {
      if (err) {
        console.error('Error al insertar el pago:', err.message);
        return res.status(500).json({ error: err.message });
      }

      // Enviar el archivo de éxito al cliente
      res.sendFile(__dirname + "/public/success.html");
    });
  });
});


app.post("/refund", (req, res) => {
  const { productId, productPrice } = req.query;
console.log(productId);
  const sqlRefund = "INSERT INTO refunds (payment_id,refund_amount) VALUES (?,?)";
  con.query(sqlRefund, [productId, productPrice], function (err) {
    if (err) throw err;

    const sqlUpdateProduct = `
      UPDATE products SET status = 'devuelto'
      WHERE id = (SELECT product_id FROM payments WHERE id = ?)`;
    con.query(sqlUpdateProduct, [productId], function (err) {
      if (err) res.send({message:err,success:false});;
      res.send({message:"Producto devuelto y estado actualizado.",success:true});
    });
  });
});

function login(req, res) {
  const { user: username, password } = req.body;
  const sql = "SELECT * FROM login WHERE username = ?";
  con.query(sql, [username], function (err, result) {
    if (result.length === 1) {
      const user = result[0];
      if (user.password === password) {
        req.session.user = username;
        res.redirect("/dashboard");
      } else {
        res.redirect("/login");
      }
    } else {
      res.redirect("/login");
    }
  });
}

server.listen(PORT, function () {
  console.log(`Escuchando en el puerto ${PORT}`);
});
