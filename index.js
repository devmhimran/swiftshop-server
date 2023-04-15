const express = require('express')
const app = express()
const port = process.env.PORT || 5000
var cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');


app.use(cors())
app.use(express.json())
require('dotenv').config()



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ddixua3.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        client.connect();
        const productsCollection = client.db('swiftshop').collection('products');
        const customersCollection = client.db('swiftshop').collection('customers');
        const ordersCollection = client.db('swiftshop').collection('orders');
        const usersCollection = client.db('swiftshop').collection('users');

        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productsCollection.find(query);
            const data = await cursor.toArray();
            res.send(data);
        });

        app.get('/orders', async (req, res) => {
            const query = {};
            const cursor = ordersCollection.find(query);
            const data = await cursor.toArray();
            res.send(data);
        });

        app.get('/customersCollection', async (req, res) => {
            const query = {};
            const cursor = customersCollection.find(query);
            const data = await cursor.toArray();
            res.send(data);
        });

        app.get('/product/:id', async (req, res) => {
            const productId = req.params.id;
            const productQuery = {  _id: new ObjectId(productId) };
            const singleProduct = await productsCollection.findOne(productQuery);
            res.send(singleProduct);
          });

        app.post('/customer', verifyJWT, async (req, res) => {
            const addData = req.body;
            const result = await customersCollection.insertOne(addData)
            res.send(result)
        })

        app.post('/product', verifyJWT, async (req, res) => {
            const addData = req.body;
            const result = await productsCollection.insertOne(addData)
            res.send(result)
        })

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '24h' });
            res.send({ result, token });
        })

    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})