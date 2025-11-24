# pinscore.xyz-backend

## Project Overview

This backend application, built with Node.js and Express.js, serves as the API for the pinscore.xyz platform. It provides authentication, user management, and other essential functionalities.

## Key Features & Benefits

-   **Authentication:** Secure user registration and login using JWT (JSON Web Tokens).
-   **User Management:** API endpoints for managing user profiles and data.
-   **Social Authentication:**  Integrates with social platforms like Google and Facebook.
-   **Cloudinary Integration:** Image uploading and management via Cloudinary.
-   **Database Integration:** Uses MongoDB for data persistence.
-   **RESTful API:**  Well-defined API endpoints for easy integration with the frontend.

## Prerequisites & Dependencies

Before you begin, ensure you have the following installed:

-   **Node.js:** Version 14 or higher
-   **npm:** Node Package Manager (comes with Node.js)
-   **MongoDB:**  A MongoDB database instance

## Installation & Setup Instructions

Follow these steps to set up the backend:

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/pinscore/pinscore.xyz-backend.git
    cd pinscore.xyz-backend
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Configure environment variables:**

    -   Create a `.env` file in the root directory based on `.env.example` (if provided, otherwise create manually).

    -   Add the following environment variables:

        ```
        PORT=3000  # Or any other port you prefer
        MONGO_URI=YOUR_MONGODB_CONNECTION_STRING
        JWT_SECRET=YOUR_JWT_SECRET_KEY
        CLOUDINARY_CLOUD_NAME=YOUR_CLOUDINARY_CLOUD_NAME
        CLOUDINARY_API_KEY=YOUR_CLOUDINARY_API_KEY
        CLOUDINARY_API_SECRET=YOUR_CLOUDINARY_API_SECRET
        GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
        GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
        FACEBOOK_APP_ID=YOUR_FACEBOOK_APP_ID
        FACEBOOK_APP_SECRET=YOUR_FACEBOOK_APP_SECRET
        SESSION_SECRET=YOUR_SESSION_SECRET
        ```

        Replace the placeholder values with your actual credentials.

4.  **Run the application:**

    ```bash
    npm start
    ```

    This will start the server, and you should see a message indicating that the server is running.

## Usage Examples & API Documentation

### API Endpoints

The API provides the following endpoints:

| Method | Endpoint              | Description                     |
| :----- | :-------------------- | :------------------------------ |
| POST   | `/api/auth/register`  | Register a new user             |
| POST   | `/api/auth/login`     | Log in an existing user         |
| GET    | `/api/auth/google`   | Google Authentication         |
| GET    | `/api/auth/google/callback`   | Google Authentication Callback         |
| GET    | `/api/auth/facebook`   | Facebook Authentication         |
| GET    | `/api/auth/facebook/callback`   | Facebook Authentication Callback         |
| GET    | `/api/users/me`        | Get the current user's profile |

### Example: Register a new user

```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

## Configuration Options

The application can be configured using environment variables. Refer to the "Installation & Setup Instructions" section for a list of available configuration options.  These variables control database connections, API keys, authentication secrets, and other settings.

## Contributing Guidelines

We welcome contributions to this project! To contribute:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes.
4.  Submit a pull request with a clear description of your changes.

Please ensure that your code adheres to the existing code style and includes appropriate tests.

## License Information

This project does not specify a license. All rights are reserved by the owner.

## Acknowledgments

-   [Express.js](https://expressjs.com/)
-   [Node.js](https://nodejs.org/)
-   [MongoDB](https://www.mongodb.com/)
-   [Cloudinary](https://cloudinary.com/)
