// default app configuration
module.exports = {
    port: process.env.PORT || 4000,
    db: process.env.MONGOLAB_URI || process.env.MONGODB_URL || "mongodb://nodegoat:owasp@widmore.mongohq.com:10000/nodegoat",
    cookieSecret: "wands_up_harry",
    cryptoKey: "magic_peanuts",
    cryptoAlgo: "aes256",
    hostName: "localhost"
};
