const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
var cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

app.use(cors());
app.use(express.json());
require("dotenv").config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ddixua3.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    client.connect();
    const productsCollection = client.db("swiftshop").collection("products");
    const customersCollection = client.db("swiftshop").collection("customers");
    const ordersCollection = client.db("swiftshop").collection("orders");
    const usersCollection = client.db("swiftshop").collection("users");

    app.get("/products", async (req, res) => {
      const query = {};
      const cursor = productsCollection.find(query);
      const data = await cursor.toArray();
      res.send(data);
    });

    app.get("/product/:id", async (req, res) => {
      const productId = req.params.id;
      const productQuery = { _id: new ObjectId(productId) };
      const singleProduct = await productsCollection.findOne(productQuery);
      res.send(singleProduct);
    });

    app.delete("/product/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const product = await productsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(product);
    });
    app.get("/allOrders", verifyJWT, async (req, res) => {
      const query = {};
      const cursor = ordersCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });
    app.post("/order", verifyJWT, async (req, res) => {
      const order = req.body;
      let payload = {
        ...order,
        createdAt: new Date(),
      };
      const result = await ordersCollection.insertOne(payload);
      res.send(result);
    });
    app.get("/orders", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const order = await ordersCollection.find({ email: email }).toArray();
      res.send(order);
    });
    app.get("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await ordersCollection.findOne(query);
      res.send(order);
    });

    app.put("/order-quantity/:id", verifyJWT, async (req, res) => {
      const productId = req.params.id;
      const productQuantity = req.body;
      const filter = { _id: new ObjectId(productId) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          quantity: productQuantity.quantity,
        },
      };
      const updatedResult = await productsCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(updatedResult);
    });

    app.put("/order-status/:id", verifyJWT, async (req, res) => {
      try {
        const orderId = req.params.id;
        const { status } = req.body; // Assuming the request body contains the new status
        console.log({ status, orderId });
        // Update the order status in the database
        const filter = { _id: new ObjectId(orderId) };
        const updateDoc = {
          $set: { status: status },
        };
        const updatedOrder = await ordersCollection.updateOne(
          filter,
          updateDoc
        );

        if (updatedOrder.modifiedCount === 0) {
          return res.status(404).send({ message: "Order not found" });
        }

        res.send(updatedOrder);
      } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get("/customers", verifyJWT, async (req, res) => {
      const query = {};
      const cursor = customersCollection.find(query);
      const data = await cursor.toArray();
      res.send(data);
    });

    app.get("/customer/:id", verifyJWT, async (req, res) => {
      const customerId = req.params.id;
      const customerQuery = { _id: new ObjectId(customerId) };
      const singleCustomer = await customersCollection.findOne(customerQuery);
      res.send(singleCustomer);
    });

    app.get("/product/:id", async (req, res) => {
      const productId = req.params.id;
      const productQuery = { _id: new ObjectId(productId) };
      const singleProduct = await productsCollection.findOne(productQuery);
      res.send(singleProduct);
    });

    app.post("/customer", verifyJWT, async (req, res) => {
      const addData = req.body;
      const result = await customersCollection.insertOne(addData);
      res.send(result);
    });

    app.post("/product", verifyJWT, async (req, res) => {
      const addData = req.body;
      const result = await productsCollection.insertOne(addData);
      res.send(result);
    });

    app.get("/all-users", verifyJWT, async (req, res) => {
      const query = {};
      const cursor = usersCollection.find(query);
      const data = await cursor.toArray();
      res.send(data);
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
        expiresIn: "24h",
      });
      res.send({ result, token });
    });

    app.put("/user/admin/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const role = req.body.role;
      const adminRequest = req.decoded.email;

      console.log({ id, role, adminRequest });
      const adminRequestAccount = await usersCollection.findOne({
        email: adminRequest,
      });
      if (adminRequestAccount.role === "admin") {
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: { role },
        };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    });

    app.get("/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      const adminCheck = user.role === "admin";
      res.send({ admin: adminCheck });
    });
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
