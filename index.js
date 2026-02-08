const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ================= CONFIG =================
const PORT = 3001;
const HOST = '0.0.0.0';
const JWT_SECRET = 'pdv_super_secreto';

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const CLIENTS_FILE = path.join(DATA_DIR, 'clients.json');
const SALES_FILE = path.join(DATA_DIR, 'sales.json');

// ================= HELPERS =================
const loadData = (file, defaultData) => {
  try {
    if (!fs.existsSync(file)) return defaultData;
    const data = fs.readFileSync(file, 'utf-8');
    if (!data) return defaultData;
    return JSON.parse(data);
  } catch (err) {
    console.error('Erro ao ler', file, err);
    return defaultData;
  }
};

const saveData = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// ================= DATA =================
let users = [
  { id: 1, name: 'Administrador', email: 'admin@pdv.com', password: '123456', role: 'admin' },
];

let products = loadData(PRODUCTS_FILE, []);
if (!Array.isArray(products)) products = [];

let clients = loadData(CLIENTS_FILE, []);
if (!Array.isArray(clients)) clients = [];

let sales = loadData(SALES_FILE, []);
if (!Array.isArray(sales)) sales = [];

// ================= AUTH =================
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token ausente' });

  const [, token] = header.split(' ');
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// ================= ROTAS =================

// health
app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'PDV Backend' });
});

// login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// me
app.get('/me', auth, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

// ================= PRODUTOS =================

app.get('/products', auth, (req, res) => {
  res.json(products);
});

app.get('/products/:id', auth, (req, res) => {
  const product = products.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json(product);
});

app.post('/products', auth, (req, res) => {
  const {
    sku,
    barcode,
    description,
    category,
    brand,
    costPrice,
    salePrice,
    stock,
    minStock,
    unit,
    active
  } = req.body;

  if (!description || salePrice == null) {
    return res.status(400).json({ error: 'Descrição e preço de venda são obrigatórios' });
  }

  const newProduct = {
    id: products.length ? Math.max(...products.map(p => p.id)) + 1 : 1,
    sku: sku || '',
    barcode: barcode || '',
    description,
    category: category || '',
    brand: brand || '',
    costPrice: Number(costPrice) || 0,
    salePrice: Number(salePrice) || 0,
    stock: Number(stock) || 0,
    minStock: Number(minStock) || 0,
    unit: unit || 'un',
    active: active !== false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  products.push(newProduct);
  saveData(PRODUCTS_FILE, products);

  res.status(201).json(newProduct);
});

app.put('/products/:id', auth, (req, res) => {
  const product = products.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

  const {
    sku,
    barcode,
    description,
    category,
    brand,
    costPrice,
    salePrice,
    stock,
    minStock,
    unit,
    active
  } = req.body;

  if (sku !== undefined) product.sku = sku;
  if (barcode !== undefined) product.barcode = barcode;
  if (description !== undefined) product.description = description;
  if (category !== undefined) product.category = category;
  if (brand !== undefined) product.brand = brand;
  if (costPrice !== undefined) product.costPrice = Number(costPrice);
  if (salePrice !== undefined) product.salePrice = Number(salePrice);
  if (stock !== undefined) product.stock = Number(stock);
  if (minStock !== undefined) product.minStock = Number(minStock);
  if (unit !== undefined) product.unit = unit;
  if (active !== undefined) product.active = active;

  product.updatedAt = new Date().toISOString();

  saveData(PRODUCTS_FILE, products);
  res.json(product);
});

app.delete('/products/:id', auth, (req, res) => {
  const index = products.findIndex(p => p.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Produto não encontrado' });

  const removed = products.splice(index, 1)[0];
  saveData(PRODUCTS_FILE, products);

  res.json(removed);
});

// ================= CLIENTES =================
app.get('/clients', auth, (req, res) => res.json(clients));

app.post('/clients', auth, (req, res) => {
  const { name, email, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

  const newClient = {
    id: clients.length ? Math.max(...clients.map(c => c.id)) + 1 : 1,
    name,
    email: email || '',
    phone: phone || ''
  };

  clients.push(newClient);
  saveData(CLIENTS_FILE, clients);

  res.status(201).json(newClient);
});

// ================= VENDAS =================
app.get('/sales', auth, (req, res) => res.json(sales));

app.get('/sales/:id', auth, (req, res) => {
  const sale = sales.find(s => s.id === Number(req.params.id));
  if (!sale) return res.status(404).json({ error: 'Venda não encontrada' });
  res.json(sale);
});

app.post('/sales', auth, (req, res) => {
  const { items, paymentMethod, clientId } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Itens inválidos' });
  }

  let total = 0;
  const saleItems = [];

  for (const item of items) {
    const product = products.find(p => p.id === item.productId);

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    if (product.stock < item.quantity) {
      return res.status(400).json({ error: `Estoque insuficiente: ${product.description}` });
    }

    const unitPrice = Number(product.salePrice || 0);
    const lineTotal = unitPrice * item.quantity;

    total += lineTotal;

    saleItems.push({
      productId: product.id,
      description: product.description,
      unitPrice,
      quantity: item.quantity,
      total: lineTotal
    });
  }

  // Baixa de estoque
  saleItems.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    product.stock -= item.quantity;
  });

  const sale = {
    id: sales.length ? Math.max(...sales.map(s => s.id)) + 1 : 1,
    items: saleItems,
    total,
    paymentMethod: paymentMethod || 'dinheiro',
    clientId: clientId || null,
    createdAt: new Date().toISOString(),
  };

  sales.push(sale);

  saveData(PRODUCTS_FILE, products);
  saveData(SALES_FILE, sales);

  res.status(201).json(sale);
});

// ================= START =================
app.listen(PORT, HOST, () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
});
