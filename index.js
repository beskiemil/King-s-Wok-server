const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');

const app = express();

const secret = 'gf872iudh9827GGY*@#$(n89712h';

app.use(cors({ credentials: true, origin: 'http://localhost:5173' }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));
const multer = require('multer');
const upload = multer({ dest: 'uploads' });

mongoose.connect('mongodb://127.0.0.1:27017/Kings-Wok', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.post('/register', async (req, res) => {
  const { name, lastname, email, password } = req.body;
  const oldUser = await User.findOne({ email });
  if (oldUser) res.status(409).json({ email: 'Użytkownik już istnieje!' });
  else {
    const user = await User.create({
      name,
      lastname,
      email,
      role: 'user',
      password: bcrypt.hashSync(password, 10),
    });
    jwt.sign(
      {
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
        id: user._id,
      },
      secret,
      {},
      (err, token) => {
        if (err) throw err;
        res.cookie('token', token).json({
          name: user.name,
          lastname: user.lastname,
          email: user.email,
          id: user._id,
          role: user.role,
        });
      }
    );
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) res.status(401).json({ email: 'Nie ma takiego użytkownika' });
  else {
    const passwordCheck = bcrypt.compareSync(password, user.password);
    if (passwordCheck) {
      jwt.sign(
        {
          name: user.name,
          lastname: user.lastname,
          email: user.email,
          role: user.role,
          id: user._id,
        },
        secret,
        {},
        (err, token) => {
          if (err) throw err;
          res.cookie('token', token).json({
            name: user.name,
            lastname: user.lastname,
            email: user.email,
            role: user.role,
            id: user._id,
          });
        }
      );
    } else res.status(401).json({ password: 'Złe hasło' });
  }
});

app.post('/logout', (req, res) => {
  res.cookie('token', '').json('ok');
});

app.get('/profile', async (req, res) => {
  const { token } = req.cookies;

  if (token)
    jwt.verify(token, secret, {}, (err, userInfo) => {
      if (err) throw err;
      res.json(userInfo);
    });
});

app.post('/add_product', upload.single('image'), async (req, res) => {
  const { token } = req.cookies;

  jwt.verify(token, secret, {}, async (err, userInfo) => {
    if (err) throw err;

    if (userInfo.role === 'admin') {
      const { name, category, description, price } = req.body;

      const { originalname, path } = req.file;
      const parts = originalname.split('.');
      const extension = parts[parts.length - 1];
      const newImagePath = path + '.' + extension;
      fs.renameSync(path, newImagePath);

      const productDoc = await Product.create({
        name,
        category,
        description,
        price,
        image: newImagePath,
      });
      res.json(productDoc);
    } else res.status(401).json({ message: 'Nie masz uprawnien' });
  });
});

app.get('/products', async (req, res) => {
  const products = await Product.find({});
  res.json(products);
});
app.get('/products/:productId', async (req, res) => {
  const { productId } = req.params;
  const product = await Product.findById(productId);
  res.json(product);
});

app.listen(3000);
