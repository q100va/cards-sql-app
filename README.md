# CardsSqlApp - Greeting Cards Management App

**cards-sql-app** is a full-stack web application built *pro bono* for the charity foundation **“Starost v radost”** (Moscow, Russia).  
It supports the program **“Grandchildren by Correspondence: Send a Greeting Card,”** which enables volunteers to send birthday and holiday cards to nursing home residents.  
The application manages data about nursing homes, residents, volunteers, and staff, assigns greeting card requests to participants, and tracks confirmation and coverage.  
Reports provide insights into the number of requests, participants, and residents who received greetings.  

**Status:** Active, in development (pro bono)  

---

## 🔗 Live Demo
- Frontend:  
- API base URL:  
- Test user:  

⚠️ Do **not** publish real PII or production credentials in this repo. Use demo data only.

---

## 📸 Screenshots
- Dashboard  
- Resident profile  
- Request assignment flow  
- Reports  

---

## ✨ Features
- Manage nursing homes and their contact persons  
- Store and update data about residents, volunteers, and staff  
- Create and assign requests: lists of residents to be congratulated by a specific volunteer  
- Track confirmation status and ensure coverage of all residents  
- Generate reports on requests, participants, and congratulated residents  
- Provide role-based access for staff and volunteers  
- Responsive UI for both desktop and mobile  

**Planned:**  
- Authentication (JWT, sessions)  
- Email notifications / reminders  
- Advanced reporting & analytics

**Tech Debt items:**
- Add handling of err.fields on the frontend (automatic assignment of errors in FormGroup)

---

## 🧰 Tech Stack

**Frontend**  
- Angular 19, TypeScript, RxJS  
- Angular Material, PrimeNG  
- HTML5, CSS3  

**Backend**  
- Node.js, Express  
- PostgreSQL with Sequelize ORM  
- Zod (validation)  
- JWT authentication (planned)  
- Pino (logging)  

**Testing**  
- **Backend:**  
  - Jest (unit & integration tests)  
  - Supertest (API testing)  
- **Frontend:**  
  - Jasmine + Karma (unit/component tests with Angular CLI)  

**Tooling**  
- Git, GitHub  
- Concurrently (scripts)  
- Nodemon  
- Docker (planned)  

---

## 🏗️ Architecture
```
apps/
  src/     (Angular app)
  server/  (Express API)
  shared/  (shared types/utils)
```
  
**High level**  
- Angular consumes REST API from Express  
- Express uses Sequelize to access Postgres  
- Validation layer with Zod before controllers  
- Centralized error and logging middleware  

---

## 📦 API Overview
> Full OpenAPI/Swagger spec is planned.

**Roles**  
- `GET /get-roles` – list roles (id, name, description)  
- `PATCH /update-role-access` – toggle access flags for operations  
- `DELETE /delete-role/:id` – delete role by id  

**Users**  
- `GET /users`, `POST /users`, `PATCH /users/:id`  

**Operations**  
- `GET /operations`, `PATCH /operations/:id`  

---

## 🔐 Security & PII
- Do not log PII (emails, phones) — always mask: `+1 (*** ) ***-**11`, `q***@gmail.com`.  
- Use environment variables for secrets. Never commit `.env`.  
- Apply server-side validation (Zod) for all input.  
- Role-based access checks in middleware.  

---

## 🪵 Logging & Error Handling
- Centralized logger (Pino)  
- Levels: error, warn, info, debug  
- Retention: delete logs older than 180 days  
- Structured errors via middleware → consistent JSON shape  

---

## 🗄️ Database
- PostgreSQL with Sequelize  
- Migrations via sequelize-cli  

**Example env variables:**
```bash
DATABASE_URL=postgres://user:password@localhost:5432/cards

# or split vars:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cards
DB_USER=user
DB_PASS=password
```
## 🧪 Testing

- **Backend:**
  - Jest (unit & integration tests)
  - Supertest (API testing)

- **Frontend:**
  - Jasmine + Karma (unit/component tests with Angular CLI)

**Run tests:**
```bash
npm run test:server
npm run test   # frontend tests with Jasmine/Karma
```
## 🧑‍💻 Local Development

**Prerequisites**
- Node.js 18+
- npm or pnpm
- PostgreSQL running locally

**Environment**  
Create `app/.env`:  

**backend**  
```bash
PORT=3000
NODE_ENV=development
DATABASE_URL=...
```
**frontend**  
```bash
NG_PORT=4200  
API_BASE_URL=http://localhost:3000
```

**Install & Run (monorepo-style)**  
```bash
npm install
npm run build:shared
npm run server
npm run start
```
Or concurrently:  
{  
  "scripts": {  
    "build:shared": "tsc -p shared/tsconfig.json --watch",  
    "server": "nodemon ./server/app.js",  
    "start": "ng serve --port 56379",  
    "dev": "concurrently \"npm:build:shared\" \"npm:server\" \"npm:start\""  
  }  
}

---

## 🚀 Deployment
•	Frontend: Vercel/Netlify  
•	Backend: Render/Fly.io/Heroku, or VPS  
•	DB: Managed Postgres (Railway, Supabase, RDS)  

**Checklist:**
- [ ] Configure CORS
- [ ] Set NODE_ENV=production
- [ ] Apply DB migrations
- [ ] Set up log retention

---

## 🗺️ Roadmap
- [ ] Authentication & Authorization (JWT sessions, role-based access)  
- [ ] Email notifications and reminders for volunteers  
- [ ] Export data (CSV/Excel reports for admins)  
- [ ] Pagination and caching for large datasets  
- [ ] Accessibility improvements (WCAG compliance, keyboard navigation)  
- [ ] End-to-End tests (Cypress or Playwright)  
- [ ] Docker setup for local development and deployment  
- [ ] Continuous Integration (GitHub Actions: lint, test, build)  
- [ ] Continuous Deployment (auto-deploy to Vercel/Render)  
- [ ] OpenAPI/Swagger documentation for API  
- [ ] заменить subscribe() на Angular pipe где нужно
- [ ] из топонимов убрать жесткую привязку к 143 
- [ ] привести к единообразию тесты 
- [ ] решить вопрос двуязычности с типом орг-й, affiliation
- [ ] добавить возможность создавать дом и партнера из карточки партнера/дома
- [ ] добавить hint к тоггл close по интернатам "коорд-я становится недействит. и не восст автоматически"
- [ ] CREATE INDEX idx_seniors_birth_month ON "Seniors" (EXTRACT(MONTH FROM "birthDate"));


---

## 🤝 Contributing
Pro bono project for the charity foundation “Starost v radost.” Contributions welcome — please open an issue or PR.

---

## 📄 License
MIT (or specify different license if required by the foundation).

---

## 🙌 Acknowledgements
Thanks to the volunteers and contributors supporting this project.

