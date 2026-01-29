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

// ================= USUÁRIOS =================
const users = [
  {
    id: 1,
    name: 'Administrador',
    email: 'admin@pdv.com',
    password: '123456',
    role: 'admin'
  }
]

// ================= PRODUTOS =================
let products = [
  { id: 1, name: 'Coca-Cola Lata', price: 5.5, stock: 100 },
  { id: 2, name: 'Salgado', price: 7.0, stock: 50 }
]

// ================= VENDAS =================
let sales = []

// ================= AUTH =================
function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header) return res.status(401).json({ error: 'Token ausente' })

  const [, token] = header.split(' ')
  if (!token) return res.status(401).json({ error: 'Token inválido' })

  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

// ================= ROTAS =================

// health
app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'PDV Backend' })
})

// login
app.post('/login', (req, res) => {
  const { email, password } = req.body
  const user = users.find(u => u.email === email && u.password === password)
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' })

  const token = jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  )

  res.json({ token })
})

// produtos
app.get('/products', auth, (req, res) => {
  res.json(products)
})

// vendas
app.post('/sales', auth, (req, res) => {
  const { items, paymentMethod } = req.body

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Itens inválidos' })
  }

  let total = 0

  for (const item of items) {
    const product = products.find(p => p.id === item.productId)
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' })
    if (product.stock < item.quantity) {
      return res.status(400).json({ error: `Estoque insuficiente: ${product.name}` })
    }
    total += product.price * item.quantity
  }

  // baixar estoque
  for (const item of items) {
    const product = products.find(p => p.id === item.productId)
    product.stock -= item.quantity
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

// ================= START =================
app.listen(PORT, HOST, () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`)
})
