const { config } =require("dotenv");
config();

module.exports={
    PORT : process.env.PORT,
    SECRET : process.env.SECRET,
    CLIENTID : process.env.CLIENTID,
    CLIENTESECRET : process.env.CLIENTESECRET,
    CALLBACKURL : process.env.CALLBACKURL,
}

