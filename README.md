# Camera Deployment Tracker

This project is a web application designed to track camera deployments, providing insights into current and historical camera locations.

## Features

*   **View Current Camera Locations:** See all active camera deployments on an interactive map.
*   **Historical Location Mapping:** Explore past camera deployment locations on the map.
*   **Date Range Filtering:** Filter camera deployments by specific date ranges to analyze historical patterns.
*   **Deployment Statistics:** View key statistics such as total deployments, unique locations, average deployment duration, and the most frequent deployment locations.
*   **Email Subscriptions:** Users can subscribe to receive email notifications (Note: backend functionality for sending emails would need to be fully implemented if not already present).

## Technologies Used

*   **Frontend:** React, Vite, TypeScript, Tailwind CSS, Leaflet (for maps), Shadcn/ui (for UI components)
*   **Backend:** Node.js, Express.js, TypeScript
*   **Database:** PostgreSQL (inferred from `drizzle-kit` and `connect-pg-simple`)
*   **Other Key Libraries:** React Query (for data fetching), Zod (for validation), Cheerio (likely for scraping camera data)

## Project Structure

*   `client/`: Contains the React frontend application.
*   `server/`: Contains the Express.js backend server.
*   `shared/`: Contains shared code/types between the client and server (e.g., database schema).

## Setup and Running the Project

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    Make sure you have Node.js and npm (or yarn) installed.
    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Database Setup:**
    This project uses PostgreSQL. Ensure you have a PostgreSQL instance running and configure the connection details (likely in a `.env` file or environment variables, though the specific configuration method isn't detailed in `package.json`).
    Push the database schema:
    ```bash
    npm run db:push
    ```

4.  **Running in Development Mode:**
    This command starts the development server for both the client and server with hot reloading.
    ```bash
    npm run dev
    ```
    The application should typically be accessible at `http://localhost:5173` (Vite's default) or as specified in the console output.

5.  **Building for Production:**
    This command builds the frontend and backend for production.
    ```bash
    npm run build
    ```

6.  **Starting in Production Mode:**
    This command starts the application using the production build.
    ```bash
    npm run start
    ```

## Scripts Overview

*   `npm run dev`: Starts the development server.
*   `npm run build`: Builds the application for production.
*   `npm run start`: Starts the production server.
*   `npm run check`: Runs TypeScript checks.
*   `npm run db:push`: Pushes schema changes to the database using Drizzle Kit.
