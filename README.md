# Davenport Traffic Camera Alerts

This project is a web application designed to monitor and notify users about the locations of mobile and fixed traffic cameras in Davenport, Iowa. It scrapes data from the official City of Davenport website and provides users with timely updates via email.

## Key Features

*   **Automated Scraping:** Regularly scrapes the official city website for the latest traffic camera locations.
*   **Email Notifications:** Subscribers receive email alerts when camera locations are updated.
*   **Subscription Management:** Users can subscribe, unsubscribe, and manage their notification preferences.
*   **Location Display:** Shows the current list of known camera locations.
*   **API Endpoints:** Provides API for fetching camera data and managing subscriptions.

## Tech Stack

*   **Backend:** Node.js, Express.js, TypeScript
*   **Frontend:** React, Vite, TypeScript, Tailwind CSS
*   **Database:** PostgreSQL (using NeonDB serverless)
*   **ORM:** Drizzle ORM
*   **Email Service:** SendGrid
*   **Scheduling:** node-cron

## Project Structure

*   `/client`: Contains the frontend React application.
*   `/server`: Contains the backend Express application, including API routes, services, and database logic.
*   `/shared`: Contains shared code/types between client and server, like Zod schemas.

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the `server` directory or set environment variables directly. Key variables include:

    *   `DATABASE_URL`: Connection string for your PostgreSQL database (e.g., from NeonDB).
    *   `SENDGRID_API_KEY`: Your API key for SendGrid (for sending emails).
    *   `FROM_EMAIL`: The email address from which notifications will be sent (must be a verified sender in SendGrid).
    *   `NODE_ENV`: Set to `development` or `production`.

4.  **Database Migrations:**
    Apply database schema changes using Drizzle Kit:
    ```bash
    npm run db:push
    ```
    *(This command typically pushes the schema defined in `shared/schema.ts` to your database).*

## Running the Application

*   **Development Mode:**
    Starts both the backend and frontend servers with hot reloading.
    ```bash
    npm run dev
    ```
    The application will typically be available at `http://localhost:5000`.

*   **Build for Production:**
    Builds the frontend and backend for production.
    ```bash
    npm run build
    ```
    This will create optimized assets in `dist` (for the server) and `client/dist` (for the client).

*   **Start in Production:**
    Runs the built application.
    ```bash
    npm run start
    ```

## API Endpoints

The backend exposes several API endpoints under the `/api` prefix, including:

*   `GET /api/camera-locations`: Fetches current camera locations.
*   `POST /api/subscribe`: Creates a new email subscription.
*   `POST /api/subscription/lookup`: Looks up an existing subscription by email.
*   `PUT /api/subscription/:id`: Updates subscription preferences.
*   `DELETE /api/subscription/:id`: Unsubscribes (marks as inactive).
*   `POST /api/refresh-locations`: Manually triggers a scrape for new locations.
*   `GET /api/stats`: Retrieves basic statistics.

Refer to `server/routes.ts` for more details on the API.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
