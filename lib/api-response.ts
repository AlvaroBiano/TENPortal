import { NextResponse } from 'next/server'

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status })
}

export function error(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

export function unauthorized(message = 'Não autenticado') {
  return error(message, 401)
}

export function forbidden(message = 'Acesso negado') {
  return error(message, 403)
}

export function notFound(message = 'Não encontrado') {
  return error(message, 404)
}

export function serverError(message = 'Erro interno') {
  return error(message, 500)
}
