# CityCare Hospital Token & Appointment System

A beginner-friendly full-stack college project for booking hospital appointments, issuing department-specific tokens, and managing the patient queue from an admin dashboard.

## Technologies

- HTML5, CSS3 and vanilla JavaScript
- Node.js and Express
- MySQL using `mysql2`
- `cors` and `dotenv`

## Folder structure

```text
hospital-token-system/
├── backend/
│   ├── controllers/appointmentController.js
│   ├── routes/appointmentRoutes.js
│   ├── db.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── css/style.css
│   ├── js/admin.js
│   ├── js/booking.js
│   ├── js/home.js
│   ├── index.html
│   ├── book-token.html
│   └── admin.html
├── database.sql
└── README.md
```

## Requirements

Install a current Node.js LTS release for Windows from [nodejs.org](https://nodejs.org/). The Node.js installer includes npm. MySQL is not included with this project and must be installed separately.

### Install MySQL on Windows

1. Download MySQL Installer from [dev.mysql.com/downloads/installer](https://dev.mysql.com/downloads/installer/).
2. Run the installer and select **MySQL Server** (Workbench is optional and useful for beginners).
3. Configure the server as a Windows service and set a root password. Remember that password for your local `.env` file.
4. Finish setup and make sure the MySQL service is running. The application does not bundle or install MySQL.

## Setup

Open Command Prompt in the project directory. Import the schema and sample appointments from the MySQL command-line client:

```cmd
mysql -u root -p < database.sql
```

Enter the root password you set during installation. Or open `database.sql` in MySQL Workbench and run the script. It creates `hospital_db`, the `appointments` table and three sample records. Sample rows use today's date so dashboard statistics can be seen immediately.

Create the backend environment file by copying the example:

```cmd
cd backend
copy .env.example .env
```

Edit `backend\.env` and set `DB_PASSWORD` to your local MySQL root password. Do not commit `.env` or put database credentials in frontend files.

Install dependencies and start the API:

```cmd
npm install
npm start
```

The API listens at `http://localhost:5000`. For development with auto-restart, use `npm run dev`.

Open `frontend\index.html` in a browser (double-click it or use **Open with**). Navigation connects the Home, Book Token and Admin Dashboard pages. The frontend sends requests to `http://localhost:5000/api`.

## Pages and CRUD

- **Home** (`frontend/index.html`) lists hospital departments and links to booking.
- **Book Token** (`frontend/book-token.html`) validates patient details, updates doctors when department changes, submits the appointment and shows the API's confirmation.
- **Admin Dashboard** (`frontend/admin.html`) shows counts and appointments, filters by status and department, marks waiting appointments complete, and deletes after confirmation.
- Create adds an appointment; Read displays/list-fetches appointments; Update changes status; Delete removes an appointment.

## Token generation

The backend assigns prefixes `A`, `N`, `O`, `G`, and `P` for Cardiology, Neurology, Orthopedics, General Medicine, and Pediatrics. It counts existing appointments for the selected department and date while holding a MySQL named lock for that pair, then inserts the next zero-padded token (for example `A-001`). A unique database key on department/date/token is an additional duplicate guard. Tokens restart for each department and date.

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/appointments` | Validate and create appointment/token |
| GET | `/api/appointments` | List appointments |
| GET | `/api/appointments/:id` | Fetch one appointment |
| PUT | `/api/appointments/:id/status` | Set status to Waiting or Completed |
| DELETE | `/api/appointments/:id` | Delete appointment |
| GET | `/api/dashboard/stats` | Return total, today, waiting and current token counts |
| GET | `/api/health` | Check that the API process is running |

Appointment routes return JSON. Inputs are validated and SQL values use parameterized queries. Database details are logged only on the server, and friendly errors are returned to the browser.

## Troubleshooting

- **`mysql` is not recognized:** Open MySQL Command Line Client from the Start menu, or add MySQL Server's `bin` folder to Windows PATH. You can also import `database.sql` using Workbench.
- **Database connection error:** Confirm the MySQL service is running and `backend\.env` has the correct host, user, password and database name.
- **Browser cannot connect:** Keep the backend terminal open, check `http://localhost:5000/api/health`, and use the page from the same computer.
- **Port 5000 is in use:** Change `PORT` in `.env` and update `API_BASE` in `frontend/js/booking.js` and `frontend/js/admin.js` to match.
- **No appointments:** Import the supplied SQL script. The dashboard shows “No appointments” when the database has no rows.
