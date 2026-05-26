# TENPortal — Portal de Membros

## 1. Conceito & Visão

Plataforma de membros estilo Netflix para os produtos do Método TEN. Dois públicos:
- **Aluno** — área de consumo de conteúdo comprados com progress tracking
- **Administrador** — gestão completa de alunos, produtos e sistema de afiliados

A experiência visual herda a identidade premium do workshop "Sucesso e Mentalidade Financeira":
paleta dourada sobre fundo escuro, tipografia elegante (Playfair Display), animações suaves.

## 2. Design Language

### Paleta de cores
```
--gold:        #D4AF37
--gold-light:  #E8C547
--gold-dark:   #A8892C
--cream:       #F5F0E1
--black:       #1A1A1A
--dark:        #0D0D0D
--white:       #FFFFFF
--gray:        #6B6B6B
--gray-light:  #E5E5E5
--success:     #2ECC71
--danger:      #E74C3C
--warning:     #F39C12
```

### Tipografia
- **Display:** Playfair Display (headings, valores, badges)
- **Corpo:** Inter (todo restante)
- **Tamanhos:** clamp() para responsividade

### Motion
- fadeInUp em scroll (IntersectionObserver)
- goldGlow pulsante nos botões CTA
- hover lift (-translateY) em cards
- skeleton loading em estados de busca

### Responsividade
- Mobile-first, breakpoints: 640px / 768px / 1024px / 1280px
- Mobile: sidebar colapsável (hamburger)
- Smart TV: foco em navegação por setas (próximo passo)

## 3. Stack Técnica

```
Frontend:   Next.js 14 (App Router, TypeScript)
UI:         CSS Modules + CSS Variables (sem Tailwind)
Backend:    Supabase (PostgreSQL, Auth, Storage, RLS)
Hospedagem: Netlify (mesma conta TENLife)
Storage:    Supabase Storage (bucket para mídias e PDFs)
Deploy:     GitHub Actions → Netlify (auto-deploy em push)
Migração:   Troca de supabase-project → Docker (fácil)
```

### Autenticação
- Email + senha (fornecido pelo admin na aprovação)
- Fingerprint do navegador via FingerprintJS + fallback de hash de características
- Bind de até 2 dispositivos por aluno logado
- Admin pode liberar binds extras com descrição

## 4. Modelo de Dados (Supabase / PostgreSQL)

### Tabelas

**`profiles`** (extensão do auth.users)
```sql
id uuid PK → auth.users.id
email text UNIQUE NOT NULL
full_name text NOT NULL
cpf text UNIQUE NOT NULL
role enum('student', 'affiliate', 'admin')
created_at timestamptz
updated_at timestamptz
```

**`devices`** (dispositivos autorizados)
```sql
id uuid PK
profile_id uuid FK → profiles.id
device_hash text NOT NULL
device_name text
bind_count int DEFAULT 1
is_active boolean DEFAULT true
last_used_at timestamptz
created_at timestamptz
```

**`products`** (cursos, livros, workshops)
```sql
id uuid PK
title text NOT NULL
slug text UNIQUE NOT NULL
description text
cover_image_url text
product_type enum('course', 'book', 'workshop')
content_type enum('video_embed', 'video_youtube', 'video_uploaded', 'pdf', 'audio')
created_at timestamptz
is_active boolean DEFAULT true
```

**`modules`** (módulos dentro de um produto)
```sql
id uuid PK
product_id uuid FK → products.id
title text NOT NULL
description text
sort_order int DEFAULT 0
```

**`lessons`** (aulas/dentro de módulo)
```sql
id uuid PK
module_id uuid FK → modules.id
title text NOT NULL
content_url text (link Vimeo, YouTube,Supabase Storage)
lesson_type enum('video_embed','video_youtube','pdf','audio')
duration_seconds int
sort_order int DEFAULT 0
is_free boolean DEFAULT false
```

**`enrollments`** (matrículas — acesso do aluno)
```sql
id uuid PK
profile_id uuid FK → profiles.id
product_id uuid FK → products.id
enrolled_at timestamptz
progress_percent int DEFAULT 0
last_lesson_id uuid
```

**`progress`** (progresso por aula)
```sql
id uuid PK
enrollment_id uuid FK → enrollments.id
lesson_id uuid FK → lessons.id
completed boolean DEFAULT false
completed_at timestamptz
```

**`affiliates`** (cadastro de afiliado)
```sql
id uuid PK
profile_id uuid FK → profiles.id
commission_percent numeric(5,2) DEFAULT 30.00
referral_code text UNIQUE NOT NULL
is_active boolean DEFAULT true
created_at timestamptz
```

**`commissions`** (comissões de afiliados)
```sql
id uuid PK
affiliate_id uuid FK → affiliates.id
enrollment_id uuid FK → enrollments.id
amount numeric(10,2) NOT NULL
status enum('pending','approved','paid') DEFAULT 'pending'
created_at timestamptz
paid_at timestamptz
```

**`waiting_list`** (alunos aguardando aprovação)
```sql
id uuid PK
email text NOT NULL
full_name text NOT NULL
cpf text NOT NULL
affiliate_id uuid FK → affiliates.id
referral_code text
notes text
created_at timestamptz
```

### Row Level Security (RLS)
- `profiles`: aluno só vê seu próprio perfil; admin vê/edita tudo
- `enrollments`: aluno só vê seus próprios; admin vê/edita tudo
- `products`: leitura pública; escrita só admin
- `devices`: aluno só vê/adiciona seus próprios; admin gerencia
- `affiliates`: aluno só vê seu próprio; admin vê/edita
- `waiting_list`: só admin读写
- `commissions`: afiliado vê só suas; admin vê/edita tudo

## 5. Páginas e Funcionalidades

### Área Pública
- `/` — Landing page do workshop (já existente, redireciona para portal)

### Autenticação
- `/login` — Página de login com email + senha + fingerprint
- `/register` — (desabilitado inicialmente, só admin cria)

### Área do Aluno
- `/aluno` — Dashboard estilo Netflix: grid de cursos comprados com capa e barra de progresso
- `/aluno/[slug]` — Player do curso: lista de aulas com "continuar de onde parou"
- `/aluno/perfil` — Perfil do aluno, dispositivos vinculados, configurações

### Área do Administrador
- `/admin` — Dashboard:overview com métricas
- `/admin/alunos` — Lista de alunos aguardando + aprovados (fila de aprovação)
- `/admin/alunos/[id]` — Detalhe do aluno: dados, dispositivos, histórico
- `/admin/produtos` — CRUD de produtos
- `/admin/produtos/[id]` — Editor de produto: módulos, aulas, conteúdo
- `/admin/afiliados` — Lista de afiliados e comissões
- `/admin/afiliados/[id]` — Detalhe do afiliado e comissões
- `/admin/vendas` — Histórico de enrollments (origem de cada venda)

### Fluxo: Aprovação de Aluno via Admin
1. Aluno se cadastra via waiting_list
2. Admin vê na fila `/admin/alunos?status=waiting`
3. Confirma pagamento, clica "Aprovar" e o sistema:
   - Move da waiting_list → profiles (cria login real)
   - Cria enrollment para os produtos comprados
   - Gera hash do dispositivo do admin (primeiro bind)
   - Envia email com credenciais (email = login, cpf = senha temporária)

### Fluxo: Sistema de Afiliados
1. Admin cadastra afiliado em `/admin/afiliados`
2. Afiliado acessa com suas credenciais (role=affiliate)
3. Afiliado gera link: `tenportal.com/register?ref=CODIGO`
4. Aluno novo que compra com esse link gera:
   - waiting_list com affiliate_id preenchido
   - commission row com status 'pending'
5. Admin aprova o aluno e a commission fica 'approved' (calcula valor)

## 6. Identidade Visual das Páginas Internas

### Layout Base
- Header fixo: logo "TENPortal" + avatar do usuário + menu hamburguer (mobile)
- Sidebar fixa à esquerda (desktop) com navegação
- Área de conteúdo principal com padding generoso
- Mesma paleta e tipografia da landing page (design system unificado)

### Componentes
- `GoldButton` — botão CTA com gradiente dourado e glow
- `Card` — card de curso com capa, título e barra de progresso
- `Sidebar` — navegação lateral com ícones e labels
- `Modal` — mesmo modal do site, unificado
- `Table` — tabela administrative com ações inline
- `Badge` — status pill com cores contextuais
- `ProgressBar` — barra de progresso dourada
- `VideoPlayer` — iframe Vimeo/YouTube responsivo
- `FileViewer` — preview para PDFs

## 7. Segurança

- **CSRF:** proteção nativa do Next.js
- **XSS:** sanitização de inputs + CSP headers
- **RLS Supabase:** proteção no nível do banco (mesmo se API key vazar)
- **Fingerprint:** proteção contra compartilhamento de conta
- **Senhas:** hash com bcrypt via Supabase Auth
- **Admin:** páginas `/admin/*` verificadas por server-side role check
- **Variaveis de ambiente:** `.env.local` (jamais commitado) + `.env.example`

## 8. Cronograma de Desenvolvimento

### Fase 1 — Fundação [Atual]
- [x] SPEC.md
- [ ] Repo + Next.js setup + Supabase config
- [ ] Modelo de dados no Supabase (SQL migrations)
- [ ] Auth + fingerprint device binding
- [ ] Identity / layout base + login page

### Fase 2 — Área do Aluno
- Dashboard Netflix grid
- Player de curso com continueWatching
- Perfil + gestão de dispositivos

### Fase 3 — Área Administrativa
- Fila de aprovação
- CRUD de produtos (sem editor de vídeo — upload via Supabase)
- CRUD de módulos e aulas
- Overview com métricas

### Fase 4 — Afiliados
- Cadastro e gestão de afiliados
- Link de referência com tracking
- Sistema de comissões

### Fase 5 — Polimento
- Notificações por email (Supabase Edge Functions)
- Skeleton loading states
- SEO e meta tags
- Migração para VPS (playbook Docker)
