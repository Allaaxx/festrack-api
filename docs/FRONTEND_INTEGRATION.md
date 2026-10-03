# Festrack API — Frontend Integration Guide

This guide provides everything needed to connect a frontend application (React, Next.js, Vue, Vite, etc.) to the **Festrack API**.

---

## 1. Base Configuration

- **API Base URL (Development)**: `http://localhost:8080`
- **Interactive Swagger Docs**: [`http://localhost:8080/docs`](http://localhost:8080/docs)
- **OpenAPI 3.0 Spec JSON**: [`http://localhost:8080/docs/json`](http://localhost:8080/docs/json)

### CORS & Credentials

The backend is configured with `credentials: true`. Whenever sending requests from the browser:

- If using **Cookie authentication**, you must include credentials:
    - `fetch(url, { credentials: 'include', ... })`
    - `axios.create({ withCredentials: true, ... })`
- If using **Bearer token authentication**, send the header:
    - `Authorization: Bearer <session_token>`

---

## 2. Authentication (`better-auth`)

Authentication is powered by [Better Auth](https://www.better-auth.com/). You can use the official `@better-auth/client` library or standard `fetch`.

### Option A: Using Better Auth Client (Recommended)

```bash
npm install better-auth
```

```typescript
// src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient({
    baseURL: 'http://localhost:8080',
});
```

### Option B: Using Standard HTTP Requests

#### 1. Register with Email & Password

- **Endpoint**: `POST /api/auth/sign-up/email`
- **Body**:
    ```json
    {
        "email": "user@example.com",
        "password": "Password123!",
        "first_name": "John",
        "last_name": "Doe",
        "name": "John Doe"
    }
    ```
- **Response (200 OK)**:
    ```json
    {
        "token": "session_token_string",
        "user": {
            "id": "uuid",
            "email": "user@example.com",
            "name": "John Doe",
            "first_name": "John",
            "last_name": "Doe",
            "image": null
        }
    }
    ```

#### 2. Login with Email & Password

- **Endpoint**: `POST /api/auth/sign-in/email`
- **Body**:
    ```json
    {
        "email": "user@example.com",
        "password": "Password123!"
    }
    ```
- **Response (200 OK)**: Returns the user object and session token (and sets the HTTP-only session cookie).

#### 3. Get Current Session

- **Endpoint**: `GET /api/auth/get-session`
- **Headers**: `Authorization: Bearer <token>` or include cookies (`credentials: 'include'`).

#### 4. Sign Out

- **Endpoint**: `POST /api/auth/sign-out`

#### 5. Change Password (Settings)

- **Endpoint**: `POST /api/auth/change-password`
- **Headers**: Authenticated
- **Body**:
    ```json
    {
        "currentPassword": "OldPassword123!",
        "newPassword": "NewSecurePassword456!",
        "revokeOtherSessions": true
    }
    ```

#### 6. Change Email (Settings)

- **Endpoint**: `POST /api/auth/change-email`
- **Headers**: Authenticated
- **Body**:
    ```json
    {
        "newEmail": "newemail@example.com"
    }
    ```

#### 7. List Connected Accounts & Unlink Provider

Users can view and unlink external authentication providers or credentials (prevented if only a single account remains).

- **List Accounts**: `GET /api/users/me/accounts` (or Better Auth `GET /api/auth/list-accounts`)
    - **Headers**: Authenticated
    - **Response (200 OK)**:
        ```json
        [
            {
                "id": "acc-1",
                "providerId": "google",
                "accountId": "google-sub-123",
                "createdAt": "2026-10-01T00:00:00.000Z"
            },
            {
                "id": "acc-2",
                "providerId": "credential",
                "accountId": "user@example.com",
                "createdAt": "2026-10-01T00:00:00.000Z"
            }
        ]
        ```

- **Unlink Account**: `POST /api/users/me/accounts/unlink` (or Better Auth `POST /api/auth/unlink-account`)
    - **Headers**: Authenticated
    - **Body**:
        ```json
        {
            "providerId": "google"
        }
        ```
    - **Response (200 OK)**:
        ```json
        {
            "success": true
        }
        ```
    - **Response (400 Bad Request)**: When trying to unlink the only remaining provider:
        ```json
        {
            "message": "Cannot unlink the only remaining authentication provider for this user"
        }
        ```

---

## 3. User & Settings (`/api/users`)

All endpoints below require authentication.

### 1. Get Current User Profile

- **Endpoint**: `GET /api/users/me`
- **Response (200 OK)**:
    ```json
    {
        "id": "69f20dd9-b9d9-4d6d-8bc4-a4b5be3d9370",
        "name": "John Doe",
        "email": "user@example.com",
        "emailVerified": false,
        "image": "https://festrack-assets.s3.us-east-2.amazonaws.com/avatars/user-123.png",
        "first_name": "John",
        "last_name": "Doe",
        "createdAt": "2026-10-02T12:00:00.000Z",
        "updatedAt": "2026-10-02T12:00:00.000Z"
    }
    ```

### 2. Update Profile Name

- **Endpoint**: `PATCH /api/users/me`
- **Body**:
    ```json
    {
        "first_name": "Jane",
        "last_name": "Smith"
    }
    ```
- **Note**: Credential and password fields are strictly handled via Better Auth (`/api/auth/change-password`). Passing `password` here returns HTTP 400.

### 3. Upload Profile Avatar (S3 / Cloud Storage)

- **Endpoint**: `POST /api/users/me/avatar`
- **Content-Type**: `multipart/form-data`
- **Form Field**: `avatar` (File)
- **Allowed Formats**: `image/jpeg`, `image/png`, `image/webp`
- **Maximum Size**: 5 MB
- **Response (200 OK)**:
    ```json
    {
        "id": "69f20dd9-b9d9-4d6d-8bc4-a4b5be3d9370",
        "name": "Jane Smith",
        "email": "user@example.com",
        "image": "https://festrack-assets.s3.us-east-2.amazonaws.com/avatars/69f20dd9-...-1727958000000.png",
        "first_name": "Jane",
        "last_name": "Smith"
    }
    ```

#### Frontend Avatar Upload Example (React/TypeScript)

```typescript
async function uploadAvatar(file: File, token: string) {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch('http://localhost:8080/api/users/me/avatar', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            // Note: Do NOT set Content-Type header manually for FormData!
            // The browser will automatically set 'multipart/form-data; boundary=...'
        },
        credentials: 'include',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Avatar upload failed');
    }

    return await response.json(); // Returns updated user with new .image URL
}
```

### 4. Delete Account

- **Endpoint**: `DELETE /api/users/me`
- **Headers**: Authenticated
- **Body**:
    ```json
    {
        "password": "CurrentPassword123!"
    }
    ```
- **Response (200 OK)**: Returns the deleted user object. Cascades deletion across all events, transactions, sessions, and linked accounts, revoking all active authentication sessions immediately.
- **Response (400 Bad Request)**: When password is missing, invalid, or incorrect:
    ```json
    {
        "message": "Invalid password"
    }
    ```

### 5. Get Financial Balance Summary

- **Endpoint**: `GET /api/users/me/balance?from=YYYY-MM-DD&to=YYYY-MM-DD`
- **Query Params**:
    - `from`: ISO date format (`YYYY-MM-DD`)
    - `to`: ISO date format (`YYYY-MM-DD`)
- **Response (200 OK)**:
    ```json
    {
        "earnings": "5000.00",
        "expenses": "1500.00",
        "investments": "1000.00",
        "earningsPercentage": 66,
        "expensePercentage": 20,
        "investmentsPercentage": 13,
        "balance": "2500.00"
    }
    ```

---

## 4. Events (`/api/events`)

Manage events (e.g. Wedding, Birthday, Trip) tied to financial plans.

| Method   | Endpoint          | Description                     | Request Body                                                                                       |
| -------- | ----------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/events/me`  | List all events of current user | None                                                                                               |
| `POST`   | `/api/events/me`  | Create a new event              | `{ "name": string, "description"?: string, "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD" }` |
| `GET`    | `/api/events/:id` | Get event by ID                 | None                                                                                               |
| `PATCH`  | `/api/events/:id` | Update an existing event        | Partial fields (`name`, `description`, `start_date`, `end_date`)                                   |
| `DELETE` | `/api/events/:id` | Delete event                    | None                                                                                               |

---

## 5. Transactions (`/api/transactions`)

Track incomes, expenses, and investments.

| Method   | Endpoint                | Description                       | Request Body                                                                                                                      |
| -------- | ----------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/transactions/me`  | List transactions of current user | None                                                                                                                              |
| `POST`   | `/api/transactions/me`  | Create a transaction              | `{ "name": string, "date": "YYYY-MM-DD", "amount": number, "type": "EARNING" \| "EXPENSE" \| "INVESTMENT", "event_id"?: string }` |
| `GET`    | `/api/transactions/:id` | Get transaction by ID             | None                                                                                                                              |
| `PATCH`  | `/api/transactions/:id` | Update transaction                | Partial fields (`name`, `date`, `amount`, `type`, `event_id`)                                                                     |
| `DELETE` | `/api/transactions/:id` | Delete transaction                | None                                                                                                                              |

### Transaction Types

- `"EARNING"`: Income / Revenue
- `"EXPENSE"`: Costs / Expenses
- `"INVESTMENT"`: Financial allocations

---

## 6. TypeScript Types for Frontend

```typescript
export interface User {
    id: string;
    name: string;
    first_name: string;
    last_name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface UserBalance {
    earnings: string;
    expenses: string;
    investments: string;
    earningsPercentage: number;
    expensePercentage: number;
    investmentsPercentage: number;
    balance: string;
}

export interface Event {
    id: string;
    user_id: string;
    name: string;
    description?: string | null;
    start_date: string;
    end_date: string;
    createdAt: string;
    updatedAt: string;
}

export type TransactionType = 'EARNING' | 'EXPENSE' | 'INVESTMENT';

export interface Transaction {
    id: string;
    user_id: string;
    event_id?: string | null;
    name: string;
    date: string;
    amount: string | number;
    type: TransactionType;
    createdAt: string;
    updatedAt: string;
}
```

---

## 7. Error Handling Contract

When a request fails, the API responds with standardized error objects:

```json
{
    "message": "Descriptive error message"
}
```

Common status codes:

- `400 Bad Request`: Validation failure (missing required fields, invalid format, file > 5MB, etc.).
- `401 Unauthorized`: Missing or invalid session token / cookie.
- `403 Forbidden`: Attempting to access an event or transaction belonging to another user.
- `404 Not Found`: Entity with specified ID does not exist.
- `500 Internal Server Error`: Unexpected server issue.
