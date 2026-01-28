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
