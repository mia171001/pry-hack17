var mysql=require('mysql');

var con= mysql.createConnection({
    host:process.env.MYSQLHOST,
    user:process.env.MYSQLUSER,
    password:process.env.MYSQLPASS,
    database:process.env.MYSQLDB
});

con.connect(function(err){
    if(err) throw err;


// Tabla de login
var sql = "CREATE TABLE IF NOT EXISTS login (id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY, username VARCHAR(250) UNIQUE, password VARCHAR(250))";
con.query(sql, function (err, result) {
    if (err) throw err;
});

var sqlProducts = `
    CREATE TABLE IF NOT EXISTS products (
      id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(250),
      price DECIMAL(10, 2),
      status VARCHAR(50) DEFAULT 'pendiente'
    )`;
    con.query(sqlProducts, function (err, result) {
        if (err) throw err;

        // Insertar productos por defecto si la tabla está vacía
        var sqlCheckProducts = "SELECT COUNT(*) AS count FROM products";
        con.query(sqlCheckProducts, function (err, result) {
            if (err) throw err;
            if (result[0].count === 0) {
                var sqlInsertProducts = `
                INSERT INTO products (name, price, status) VALUES
                ('Smartphone A', 299.99, 'pendiente'),
                ('Tablet B', 199.99, 'pendiente'),
                ('Laptop C', 799.99, 'pendiente'),
                ('Smartwatch D', 149.99, 'pendiente'),
                ('Headphones E', 89.99, 'pendiente'),
                ('Charger F', 19.99, 'pendiente')
                `;
                con.query(sqlInsertProducts, function (err, result) {
                    if (err) throw err;
                    console.log("Productos por defecto insertados.");
                });
            }
        });
    });

 // Tabla de pagos
 var sqlPayments = `
 CREATE TABLE IF NOT EXISTS payments (
   id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
   product_id INT(6),
   user_email VARCHAR(250),
   amount DECIMAL(10, 2),
   payment_status VARCHAR(50),
   payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 )`;
 con.query(sqlPayments, function (err, result) {
     if (err) throw err;
 });

 // Tabla de devoluciones
 var sqlRefunds = `
 CREATE TABLE IF NOT EXISTS refunds (
   id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
   payment_id INT(6),
   refund_amount DECIMAL(10, 2),
   refund_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 )`;
 con.query(sqlRefunds, function (err, result) {
     if (err) throw err;
 });


});

module.exports=con;