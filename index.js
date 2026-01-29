const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')

const app = express()

app.use(cors())
app.use(express.json())

// ================= CONFIG =================
const PORT = 3001
const HOST = '0.0.0.0'
const JWT_SECRET = 'pdv_super_secreto'

// ================= USUÁRIOS (TEMPORÁRIO) =================
const users = [
  {
    id: 1,
    name: 'Administrador',
    email: 'admin@pdv.com',
    password: '123456',
    role: 'admin'
  }
]

// ================= PRODUTOS (TEMPORÁRIO) =================

let products = [
  {
    id: 1,
    name: 'Coca-Cola Lata',
    price: 5.5,
    stock: 100
  },
  {
    id: 2,
    name: 'Salgado',
    price: 7.0,
    stock: 50
  }
]

// ================= PRODUTOS =================

// listar produtos
app.get('/products', auth, (req, res) => {
  res.json(products)
})

// criar produto
app.post('/products', auth, (req, res) => {
  const { name, price, stock } = req.body

  if (!name || price == null || stock == null) {
    return res.status(400).json({ error: 'Dados inválidos' })
  }

  const newProduct = {
    id: products.length + 1,
    name,
    price,
    stock
  }

  products.push(newProduct)
  res.status(201).json(newProduct)
})

// também responder em PT-BR
app.get('/produtos', auth, (req, res) => {
  res.json(products)
})

// ================= VENDAS (TEMPORÁRIO) =================

let sales = []

// ================= VENDAS =================

// criar venda
app.post('/vendas', auth, (req, res) => {
  const { items, paymentMethod } = req.body

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Itens da venda inválidos' })
  }

  let total = 0

  // baixar estoque
  for (const item of items) {
    const product = products.find(p => p.id === item.productId)

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' })
    }

    if (product.stock < item.quantity) {
      return res.status(400).json({
        error: `Estoque insuficiente para ${product.name}`
      })
    }

    product.stock -= item.quantity
    total += product.price * item.quantity
  }

  const sale = {
    id: sales.length + 1,
    items,
    total,
    paymentMethod: paymentMethod || 'dinheiro',
    createdAt: new Date()
  }

  sales.push(sale)

  res.status(201).json(sale)
})

// listar vendas
app.get('/vendas', auth, (req, res) => {
  res.json(sales)
})



// ================= VENDAS (TEMPORÁRIO) =================

// criar venda
app.post('/sales', auth, (req, res) => {
  const { items } = req.body
  /*
    items = [
      { productId: 1, qty: 2 },
      { productId: 2, qty: 1 }
    ]
  */

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Itens inválidos' })
  }

  let total = 0

  for (const item of items) {
    const product = products.find(p => p.id === item.productId)

    if (!product) {
      return res.status(404).json({ error: `Produto ${item.productId} não encontrado` })
    }

    if (product.stock < item.qty) {
      return res.status(400).json({
        error: `Estoque insuficiente para ${product.name}`
      })
    }

    total += product.price * item.qty
  }

  // baixa estoque
  for (const item of items) {
    const product = products.find(p => p.id === item.productId)
    product.stock -= item.qty
  }

  const sale = {
    id: sales.length + 1,
    items,
    total,
    userId: req.user.id,
    createdAt: new Date()
  }

  sales.push(sale)

  res.status(201).json(sale)
})

// listar vendas
app.get('/sales', auth, (req, res) => {
  res.json(sales)
})



// ================= MIDDLEWARE AUTH =================
function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header) return res.status(401).json({ error: 'Token ausente' })

  const [, token] = header.split(' ')
  if (!token) return res.status(401).json({ error: 'Token inválido' })

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

// ================= ROTAS =================

app.get('/products', auth, (req, res) => {
  res.json(products)
})

// health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'PDV Backend' })
})

// LOGIN
app.post('/login', (req, res) => {
  const { email, password } = req.body

  const user = users.find(
    u => u.email === email && u.password === password
  )

  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' })
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  )

  res.json({ token })
})

// PERFIL
app.get('/me', auth, (req, res) => {
  const user = users.find(u => u.id === req.user.id)
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  })
})

// ================= START =================
app.listen(PORT, HOST, () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`)
})
