'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    cpf: ''
  })

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      })

      const data = await res.json()

      if (!data.ok) {
        setError(data.error)
        return
      }

      // Redireciona baseado no role
      const role = data.data?.user?.role
      if (role === 'admin') {
        router.push('/admin')
      } else if (role === 'affiliate') {
        router.push('/afiliado')
      } else {
        router.push('/aluno')
      }
    } catch {
      setError('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await res.json()

      if (!data.ok) {
        setError(data.error)
        return
      }

      setSuccess(data.error || 'Cadastro realizado! Aguarde a aprovação pelo administrador.')
      setTimeout(() => setIsRegister(false), 3000)
    } catch {
      setError('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>WORKSHOP<span>Portal</span></div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${!isRegister ? styles.active : ''}`}
            onClick={() => setIsRegister(false)}
          >
            Entrar
          </button>
          <button
            className={`${styles.tab} ${isRegister ? styles.active : ''}`}
            onClick={() => setIsRegister(true)}
          >
            Cadastrar
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        {!isRegister ? (
          <form onSubmit={handleLogin} className={styles.form}>
            <div className={styles.field}>
              <label>E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com.br"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className={styles.field}>
              <label>Senha (CPF)</label>
              <input
                type="password"
                placeholder="Seu CPF (só números)"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : 'ENTRAR'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className={styles.form}>
            <div className={styles.field}>
              <label>Nome completo</label>
              <input
                type="text"
                placeholder="Seu nome completo"
                value={form.fullName}
                onChange={e => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </div>
            <div className={styles.field}>
              <label>E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com.br"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className={styles.field}>
              <label>CPF (será sua senha temporária)</label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={e => setForm({ ...form, cpf: e.target.value })}
                maxLength={14}
                required
              />
            </div>
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : 'CADASTRAR'}
            </button>
          </form>
        )}

        <div className={styles.footer}>
          <a href="/">Voltar ao workshop</a>
        </div>
      </div>
    </div>
  )
}
